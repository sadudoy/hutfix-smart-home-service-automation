const { pool } = require('../config/db');

function haversine(lat1, lon1, lat2, lon2) {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
        return null;
    }
    const toRad = deg => (deg * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

async function matchProviders({
    category_slug,
    preferred_date,
    preferred_start_minute,
    preferred_end_minute,
    urgency,
    latitude,
    longitude
}) {
    // 1. Look up category_id from category_slug
    const catRes = await pool.query(
        'SELECT id, name FROM service_categories WHERE slug = $1;',
        [category_slug]
    );

    if (catRes.rows.length === 0) {
        const err = new Error('category not found');
        err.status = 404;
        throw err;
    }
    const category_id = catRes.rows[0].id;

    // 2. Compute weekday (0=Sun, 1=Mon, ..., 6=Sat)
    const weekday = new Date(preferred_date + 'T00:00:00Z').getUTCDay();

    // 3. Query candidate providers with availability and day's workload
    const query = `
        SELECT p.id AS provider_id, u.full_name AS name, u.phone,
               p.headline, p.bio, p.rating, p.rating_count,
               p.latitude, p.longitude, p.address, p.years_experience,
               ps.price,
               COALESCE(w.day_bookings, 0) AS day_bookings
        FROM providers p
        JOIN users u ON u.id = p.user_id
        JOIN provider_services ps ON ps.provider_id = p.id
        LEFT JOIN (
          SELECT provider_id, COUNT(*) AS day_bookings
          FROM provider_bookings
          WHERE slot_date = $2
          GROUP BY provider_id
        ) w ON w.provider_id = p.id
        WHERE p.is_active = TRUE
          AND ps.category_id = $1
          AND EXISTS (
            SELECT 1 FROM provider_availability pa
            WHERE pa.provider_id = p.id
              AND pa.weekday = $3
              AND pa.start_minute <= $4
              AND pa.end_minute >= $5
          );
    `;

    const candidatesRes = await pool.query(query, [
        category_id,
        preferred_date,
        weekday,
        preferred_start_minute,
        preferred_end_minute
    ]);

    const candidates = candidatesRes.rows;
    if (candidates.length === 0) {
        return [];
    }

    // Busy-day filter: before scoring, exclude providers whose total provider_bookings on requested date >= 4
    const availableCandidates = candidates.filter(c => {
        const slotsUsed = parseInt(c.day_bookings, 10) || 0;
        return !(slotsUsed >= 4);
    });

    if (availableCandidates.length === 0) {
        return [];
    }

    // 4. Calculate price min and max across candidate set
    const prices = availableCandidates.map(c => parseFloat(c.price));
    const min_price = Math.min(...prices);
    const max_price = Math.max(...prices);

    const scoredCandidates = availableCandidates.map(provider => {
        const pPrice = parseFloat(provider.price);
        const pRating = parseFloat(provider.rating) || 0;
        const pDayBookings = parseInt(provider.day_bookings, 10) || 0;

        // Distance & score
        const distance_km = haversine(
            latitude != null ? parseFloat(latitude) : null,
            longitude != null ? parseFloat(longitude) : null,
            provider.latitude != null ? parseFloat(provider.latitude) : null,
            provider.longitude != null ? parseFloat(provider.longitude) : null
        );

        const distance_score = distance_km == null ? 0.5 : Math.max(0, 1 - Math.min(distance_km, 20) / 20);
        const rating_score = Math.min(1.0, Math.max(0, pRating / 5.0));
        const workload_score = Math.max(0, 1 - Math.min(pDayBookings, 5) / 5);
        const price_score = max_price === min_price ? 1.0 : 1 - (pPrice - min_price) / (max_price - min_price);
        const availability_score = 1.0;

        // Weighted base score
        const base =
            0.30 * availability_score +
            0.25 * rating_score +
            0.20 * distance_score +
            0.15 * price_score +
            0.10 * workload_score;

        const urgency_mult = (urgency === 'urgent' || urgency === 'high') ? 1.10 : 1.0;
        const finalScore = Math.min(1.0, base * urgency_mult);
        const score = Math.round(finalScore * 10000) / 10000;

        return {
            provider: {
                id: provider.provider_id,
                name: provider.name,
                rating: Number(provider.rating),
                rating_count: parseInt(provider.rating_count, 10) || 0,
                address: provider.address,
                headline: provider.headline,
                years_experience: parseInt(provider.years_experience, 10) || 0,
                distance_km: distance_km !== null ? Math.round(distance_km * 10) / 10 : null,
                price: Number(provider.price),
                workload_slots_used: pDayBookings
            },
            score,
            breakdown: {
                availability: Number(availability_score.toFixed(4)),
                rating: Number(rating_score.toFixed(4)),
                distance: Number(distance_score.toFixed(4)),
                price: Number(price_score.toFixed(4)),
                workload: Number(workload_score.toFixed(4))
            }
        };
    });

    // Sort descending by score and return top 5
    scoredCandidates.sort((a, b) => b.score - a.score);
    return scoredCandidates.slice(0, 5);
}

module.exports = {
    haversine,
    matchProviders
};
