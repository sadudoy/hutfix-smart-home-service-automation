const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { pool } = require('../config/db');

const GIGS_DIR = path.join(__dirname, '..', 'uploads', 'gigs');
fs.mkdirSync(GIGS_DIR, { recursive: true });

const gigStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, GIGS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `gig-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    }
});

const uploadGigBanner = multer({
    storage: gigStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
        cb(ok ? null : new Error('only jpeg/png/webp/gif allowed'), ok);
    }
}).single('banner');

const uploadGigBannerMiddleware = (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
        uploadGigBanner(req, res, (err) => {
            if (err) return res.status(400).json({ ok: false, error: err.message });
            next();
        });
    } else {
        next();
    }
};


const PROVIDERS_DIR = path.join(__dirname, '..', 'uploads', 'providers');
fs.mkdirSync(PROVIDERS_DIR, { recursive: true });

const providerStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, PROVIDERS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${file.fieldname}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    }
});

const uploadMediaMiddleware = multer({
    storage: providerStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
        cb(ok ? null : new Error('only jpeg/png/webp/gif allowed'), ok);
    }
}).fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 }
]);

async function uploadMedia(req, res, next) {
    try {
        const provRes = await pool.query('SELECT id, logo_url, banner_url FROM providers WHERE user_id = $1;', [req.user.id]);
        if (provRes.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'provider not found' });
        }
        const provider = provRes.rows[0];

        let logo_url = provider.logo_url;
        let banner_url = provider.banner_url;

        if (req.files && req.files.logo && req.files.logo[0]) {
            logo_url = `/uploads/providers/${req.files.logo[0].filename}`;
        }
        if (req.files && req.files.banner && req.files.banner[0]) {
            banner_url = `/uploads/providers/${req.files.banner[0].filename}`;
        }

        const updateRes = await pool.query(
            `UPDATE providers
             SET logo_url = $1, banner_url = $2
             WHERE id = $3
             RETURNING id, logo_url, banner_url;`,
            [logo_url, banner_url, provider.id]
        );

        return res.status(200).json({
            ok: true,
            provider: updateRes.rows[0],
            logo_url,
            banner_url
        });
    } catch (err) {
        return next(err);
    }
}

async function getProviderId(userId) {
    const res = await pool.query('SELECT id FROM providers WHERE user_id = $1;', [userId]);
    return res.rows.length > 0 ? res.rows[0].id : null;
}

async function getAvailability(req, res, next) {
    try {
        const providerId = await getProviderId(req.user.id);
        if (!providerId) return res.status(404).json({ ok: false, error: 'provider not found' });

        const result = await pool.query(
            'SELECT id, weekday, start_minute, end_minute FROM provider_availability WHERE provider_id = $1 ORDER BY weekday ASC, start_minute ASC;',
            [providerId]
        );
        return res.status(200).json({ ok: true, availability: result.rows });
    } catch (err) {
        return next(err);
    }
}

async function updateAvailability(req, res, next) {
    const client = await pool.connect();
    try {
        const providerId = await getProviderId(req.user.id);
        if (!providerId) {
            client.release();
            return res.status(404).json({ ok: false, error: 'provider not found' });
        }

        const items = Array.isArray(req.body) ? req.body : (req.body?.availability || []);

        await client.query('BEGIN');
        await client.query('DELETE FROM provider_availability WHERE provider_id = $1;', [providerId]);

        for (const item of items) {
            const weekday = parseInt(item.weekday, 10);
            const startMin = parseInt(item.start_minute, 10);
            const endMin = parseInt(item.end_minute, 10);
            if (!isNaN(weekday) && !isNaN(startMin) && !isNaN(endMin) && startMin < endMin) {
                await client.query(
                    'INSERT INTO provider_availability (provider_id, weekday, start_minute, end_minute) VALUES ($1, $2, $3, $4);',
                    [providerId, weekday, startMin, endMin]
                );
            }
        }

        await client.query('COMMIT');
        client.release();

        return res.status(200).json({ ok: true, message: 'Availability updated', count: items.length });
    } catch (err) {
        await client.query('ROLLBACK');
        client.release();
        return next(err);
    }
}

async function getBlackouts(req, res, next) {
    try {
        const providerId = await getProviderId(req.user.id);
        if (!providerId) return res.status(404).json({ ok: false, error: 'provider not found' });

        const result = await pool.query(
            'SELECT id, blackout_date, reason, created_at FROM provider_blackouts WHERE provider_id = $1 ORDER BY blackout_date ASC;',
            [providerId]
        );
        return res.status(200).json({ ok: true, blackouts: result.rows });
    } catch (err) {
        return next(err);
    }
}

async function createBlackout(req, res, next) {
    try {
        const providerId = await getProviderId(req.user.id);
        if (!providerId) return res.status(404).json({ ok: false, error: 'provider not found' });

        const { blackout_date, reason } = req.body || {};
        if (!blackout_date) {
            return res.status(400).json({ ok: false, error: 'blackout_date is required' });
        }

        const result = await pool.query(
            `INSERT INTO provider_blackouts (provider_id, blackout_date, reason)
             VALUES ($1, $2, $3)
             ON CONFLICT (provider_id, blackout_date) DO UPDATE SET reason = EXCLUDED.reason
             RETURNING *;`,
            [providerId, blackout_date, reason || null]
        );

        return res.status(200).json({ ok: true, blackout: result.rows[0] });
    } catch (err) {
        return next(err);
    }
}

async function removeBlackout(req, res, next) {
    try {
        const providerId = await getProviderId(req.user.id);
        if (!providerId) return res.status(404).json({ ok: false, error: 'provider not found' });

        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ ok: false, error: 'invalid blackout id' });

        const delRes = await pool.query(
            'DELETE FROM provider_blackouts WHERE id = $1 AND provider_id = $2 RETURNING id;',
            [id, providerId]
        );
        if (delRes.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'blackout not found' });
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        return next(err);
    }
}

async function getPayouts(req, res, next) {
    try {
        const providerId = await getProviderId(req.user.id);
        if (!providerId) return res.status(404).json({ ok: false, error: 'provider not found' });

        const result = await pool.query(
            'SELECT * FROM payout_requests WHERE provider_id = $1 ORDER BY created_at DESC;',
            [providerId]
        );

        const earnedRes = await pool.query(
            'SELECT COALESCE(SUM(subtotal), 0)::numeric AS total_earned FROM invoices WHERE provider_id = $1;',
            [providerId]
        );
        const paidRes = await pool.query(
            "SELECT COALESCE(SUM(amount), 0)::numeric AS total_paid FROM payout_requests WHERE provider_id = $1 AND status IN ('completed', 'pending');",
            [providerId]
        );

        const totalEarned = parseFloat(earnedRes.rows[0].total_earned);
        const totalPaid = parseFloat(paidRes.rows[0].total_paid);
        const availableBalance = Math.max(0, totalEarned - totalPaid);

        return res.status(200).json({
            ok: true,
            payouts: result.rows,
            total_earned: totalEarned,
            available_balance: availableBalance
        });
    } catch (err) {
        return next(err);
    }
}

async function createPayout(req, res, next) {
    try {
        const providerId = await getProviderId(req.user.id);
        if (!providerId) return res.status(404).json({ ok: false, error: 'provider not found' });

        const { amount } = req.body || {};
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) {
            return res.status(400).json({ ok: false, error: 'valid positive amount is required' });
        }

        // Calculate available balance from invoices and existing payouts
        const earnedRes = await pool.query(
            'SELECT COALESCE(SUM(subtotal), 0)::numeric AS total_earned FROM invoices WHERE provider_id = $1;',
            [providerId]
        );
        const paidRes = await pool.query(
            "SELECT COALESCE(SUM(amount), 0)::numeric AS total_paid FROM payout_requests WHERE provider_id = $1 AND status IN ('completed', 'pending');",
            [providerId]
        );

        const totalEarned = parseFloat(earnedRes.rows[0].total_earned);
        const totalPaid = parseFloat(paidRes.rows[0].total_paid);
        const availableBalance = Math.max(0, totalEarned - totalPaid);

        if (totalEarned > 0 && amt > availableBalance) {
            return res.status(400).json({
                ok: false,
                error: 'Requested amount exceeds available balance',
                available_balance: availableBalance
            });
        }

        const insertRes = await pool.query(
            "INSERT INTO payout_requests (provider_id, amount, status) VALUES ($1, $2, 'pending') RETURNING *;",
            [providerId, amt]
        );

        return res.status(200).json({
            ok: true,
            payout: insertRes.rows[0],
            available_balance: availableBalance - amt
        });
    } catch (err) {
        return next(err);
    }
}


async function getServices(req, res, next) {
    try {
        const providerId = await getProviderId(req.user.id);
        if (!providerId) return res.status(404).json({ ok: false, error: 'provider not found' });

        const result = await pool.query(`
            SELECT ps.id, ps.category_id, sc.slug AS category_slug, sc.name AS category_name, ps.price,
                   ps.title, ps.description, ps.duration_minutes, ps.banner_url
            FROM provider_services ps
            JOIN service_categories sc ON sc.id = ps.category_id
            WHERE ps.provider_id = $1
            ORDER BY ps.id ASC;
        `, [providerId]);
        return res.status(200).json({ ok: true, services: result.rows });
    } catch (err) {
        return next(err);
    }
}

async function createService(req, res, next) {
    try {
        const providerId = await getProviderId(req.user.id);
        if (!providerId) return res.status(404).json({ ok: false, error: 'provider not found' });

        const { category_id, category_slug, price, title, description, duration_minutes } = req.body || {};
        const priceNum = parseFloat(price);
        if (isNaN(priceNum) || priceNum <= 0) {
            return res.status(400).json({ ok: false, error: 'valid price is required' });
        }

        let catId = parseInt(category_id, 10);
        let categoryName = 'Service';
        if (isNaN(catId) && category_slug) {
            const catRes = await pool.query('SELECT id, name FROM service_categories WHERE slug = $1;', [category_slug]);
            if (catRes.rows.length > 0) {
                catId = catRes.rows[0].id;
                categoryName = catRes.rows[0].name;
            }
        } else if (!isNaN(catId)) {
            const catRes = await pool.query('SELECT name FROM service_categories WHERE id = $1;', [catId]);
            if (catRes.rows.length > 0) categoryName = catRes.rows[0].name;
        }

        if (!catId) {
            return res.status(400).json({ ok: false, error: 'valid category is required' });
        }

        const gigTitle = (title && title.trim()) ? title.trim() : categoryName;
        const gigDesc = (description && description.trim()) ? description.trim() : `Professional ${categoryName} service with guaranteed parts and verified workmanship.`;
        const durMin = parseInt(duration_minutes, 10) || 60;

        let bannerUrl = null;
        if (req.file) {
            bannerUrl = `/uploads/gigs/${req.file.filename}`;
        } else if (req.body && req.body.banner_url) {
            bannerUrl = req.body.banner_url;
        }

        const insertRes = await pool.query(`
            INSERT INTO provider_services (provider_id, category_id, price, title, description, duration_minutes, banner_url)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        `, [providerId, catId, priceNum, gigTitle, gigDesc, durMin, bannerUrl]);

        return res.status(201).json({ ok: true, service: insertRes.rows[0] });
    } catch (err) {
        return next(err);
    }
}

async function updateService(req, res, next) {
    try {
        const providerId = await getProviderId(req.user.id);
        if (!providerId) return res.status(404).json({ ok: false, error: 'provider not found' });

        const serviceId = parseInt(req.params.id, 10);
        if (isNaN(serviceId)) return res.status(400).json({ ok: false, error: 'invalid service id' });

        const currentRes = await pool.query('SELECT * FROM provider_services WHERE id = $1 AND provider_id = $2;', [serviceId, providerId]);
        if (currentRes.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'service not found or unauthorized' });
        }
        const current = currentRes.rows[0];

        const { price, title, description, duration_minutes } = req.body || {};
        const priceNum = price != null ? parseFloat(price) : current.price;
        if (isNaN(priceNum) || priceNum <= 0) {
            return res.status(400).json({ ok: false, error: 'valid price is required' });
        }

        const newTitle = title !== undefined && title.trim() ? title.trim() : current.title;
        const newDesc = description !== undefined ? description.trim() : current.description;
        const newDur = duration_minutes != null ? (parseInt(duration_minutes, 10) || current.duration_minutes) : current.duration_minutes;

        let bannerUrl = current.banner_url;
        if (req.file) {
            bannerUrl = `/uploads/gigs/${req.file.filename}`;
        } else if (req.body && req.body.banner_url !== undefined) {
            bannerUrl = req.body.banner_url || null;
        }

        const updateRes = await pool.query(`
            UPDATE provider_services
            SET price = $1, title = $2, description = $3, duration_minutes = $4, banner_url = $5
            WHERE id = $6 AND provider_id = $7
            RETURNING *;
        `, [priceNum, newTitle, newDesc, newDur, bannerUrl, serviceId, providerId]);

        return res.status(200).json({ ok: true, service: updateRes.rows[0] });
    } catch (err) {
        return next(err);
    }
}

async function deleteService(req, res, next) {
    try {
        const providerId = await getProviderId(req.user.id);
        if (!providerId) return res.status(404).json({ ok: false, error: 'provider not found' });

        const serviceId = parseInt(req.params.id, 10);
        if (isNaN(serviceId)) return res.status(400).json({ ok: false, error: 'invalid service id' });

        const gigRes = await pool.query(
            'SELECT id, category_id FROM provider_services WHERE id = $1 AND provider_id = $2;',
            [serviceId, providerId]
        );

        if (gigRes.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'service not found or unauthorized' });
        }

        const categoryId = gigRes.rows[0].category_id;

        // Check for active service requests for this provider and category
        const activeCheck = await pool.query(`
            SELECT id FROM service_requests
            WHERE assigned_provider_id = $1
              AND category_id = $2
              AND status IN ('requested', 'accepted', 'on_the_way', 'in_progress')
            LIMIT 1;
        `, [providerId, categoryId]);

        if (activeCheck.rows.length > 0) {
            return res.status(400).json({
                ok: false,
                error: 'Cannot delete a gig with active bookings. Please complete or cancel them first.'
            });
        }

        const deleteRes = await pool.query(`
            DELETE FROM provider_services
            WHERE id = $1 AND provider_id = $2
            RETURNING id;
        `, [serviceId, providerId]);

        return res.status(200).json({ ok: true, deleted_id: serviceId });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    uploadGigBannerMiddleware,
    getServices,
    createService,
    updateService,
    deleteService,
    getAvailability,
    updateAvailability,
    getBlackouts,
    createBlackout,
    removeBlackout,
    getPayouts,
    createPayout,
    uploadMediaMiddleware,
    uploadMedia
};
