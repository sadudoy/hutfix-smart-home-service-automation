const { pool } = require('../config/db');

function formatSlotLabel(startMinute, endMinute) {
    const pad = (n) => String(n).padStart(2, '0');
    const startH = pad(Math.floor(startMinute / 60));
    const startM = pad(startMinute % 60);
    const endH = pad(Math.floor(endMinute / 60));
    const endM = pad(endMinute % 60);
    return `${startH}:${startM}–${endH}:${endM}`;
}

async function getSlots(providerId, dateStr, categorySlug) {
    // 1. Look up provider and category-specific price
    const providerQuery = `
        SELECT p.id, u.full_name AS name, p.rating, p.rating_count, p.headline, p.address, ps.price
        FROM providers p
        JOIN users u ON u.id = p.user_id
        JOIN provider_services ps ON ps.provider_id = p.id
        JOIN service_categories sc ON sc.id = ps.category_id
        WHERE p.id = $1 AND sc.slug = $2 AND p.is_active = TRUE;
    `;
    const providerRes = await pool.query(providerQuery, [providerId, categorySlug]);

    if (providerRes.rows.length === 0) {
        const err = new Error('provider not found or does not serve category');
        err.status = 404;
        throw err;
    }

    const providerData = {
        id: providerRes.rows[0].id,
        name: providerRes.rows[0].name,
        rating: Number(providerRes.rows[0].rating),
        rating_count: parseInt(providerRes.rows[0].rating_count, 10) || 0,
        headline: providerRes.rows[0].headline,
        address: providerRes.rows[0].address,
        price: Number(providerRes.rows[0].price)
    };

    // 2. Compute weekday (0=Sun, ..., 6=Sat)
    const weekday = new Date(dateStr + 'T00:00:00Z').getUTCDay();

    // 3. Fetch provider availability for weekday
    const availRes = await pool.query(`
        SELECT start_minute, end_minute
        FROM provider_availability
        WHERE provider_id = $1 AND weekday = $2
        ORDER BY start_minute ASC;
    `, [providerId, weekday]);

    if (availRes.rows.length === 0) {
        return {
            provider: providerData,
            date: dateStr,
            slots: []
        };
    }

    // 4. Query existing bookings for this day
    const bookingsRes = await pool.query(`
        SELECT start_minute
        FROM provider_bookings
        WHERE provider_id = $1 AND slot_date = $2;
    `, [providerId, dateStr]);

    const taken = new Set(bookingsRes.rows.map(r => parseInt(r.start_minute, 10)));

    // 5. Generate 1-hour slots from start_minute to end_minute
    const rawSlots = [];
    const seenStarts = new Set();

    for (const row of availRes.rows) {
        const startMin = parseInt(row.start_minute, 10);
        const endMin = parseInt(row.end_minute, 10);

        for (let s = startMin; s + 60 <= endMin; s += 60) {
            if (!seenStarts.has(s)) {
                seenStarts.add(s);
                rawSlots.push({
                    start_minute: s,
                    end_minute: s + 60,
                    available: !taken.has(s),
                    label: formatSlotLabel(s, s + 60)
                });
            }
        }
    }

    rawSlots.sort((a, b) => a.start_minute - b.start_minute);

    return {
        provider: providerData,
        date: dateStr,
        slots: rawSlots
    };
}

async function getSuggestions(providerId, dateStr, categorySlug, excludeStartMinute, limit = 3) {
    const suggestions = [];

    // 1. Check same day
    try {
        const dayResult = await getSlots(providerId, dateStr, categorySlug);
        const availableSameDay = dayResult.slots.filter(
            s => s.available && s.start_minute !== parseInt(excludeStartMinute, 10)
        );

        for (const s of availableSameDay) {
            suggestions.push({
                date: dateStr,
                start_minute: s.start_minute,
                end_minute: s.end_minute,
                label: s.label
            });
            if (suggestions.length >= limit) {
                return suggestions;
            }
        }
    } catch (_) {}

    // 2. Scan next 7 days forward if limit not reached
    for (let dayOffset = 1; dayOffset <= 7 && suggestions.length < limit; dayOffset++) {
        const d = new Date(dateStr + 'T00:00:00Z');
        d.setUTCDate(d.getUTCDate() + dayOffset);
        const nextDateStr = d.toISOString().split('T')[0];

        try {
            const nextResult = await getSlots(providerId, nextDateStr, categorySlug);
            const availableSlots = nextResult.slots.filter(s => s.available);

            for (const s of availableSlots) {
                suggestions.push({
                    date: nextDateStr,
                    start_minute: s.start_minute,
                    end_minute: s.end_minute,
                    label: s.label
                });
                if (suggestions.length >= limit) break;
            }
        } catch (_) {}
    }

    return suggestions.slice(0, limit);
}

async function isSlotAvailable(providerId, dateStr, startMinute, endMinute) {
    const weekday = new Date(dateStr + 'T00:00:00Z').getUTCDay();

    const availRes = await pool.query(`
        SELECT 1 FROM provider_availability
        WHERE provider_id = $1 AND weekday = $2 AND start_minute <= $3 AND end_minute >= $4;
    `, [providerId, weekday, startMinute, endMinute]);

    if (availRes.rows.length === 0) return false;

    const bookingRes = await pool.query(`
        SELECT 1 FROM provider_bookings
        WHERE provider_id = $1 AND slot_date = $2 AND start_minute = $3;
    `, [providerId, dateStr, startMinute]);

    return bookingRes.rows.length === 0;
}

module.exports = {
    getSlots,
    getSuggestions,
    isSlotAvailable,
    formatSlotLabel
};
