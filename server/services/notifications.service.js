const { pool } = require('../config/db');

async function notify(client, { userId, requestId, kind, title, body }) {
    if (!userId) {
        return null;
    }
    const dbClient = client || pool;
    const query = `
        INSERT INTO notifications (user_id, request_id, kind, title, body)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    const res = await dbClient.query(query, [
        userId,
        requestId || null,
        kind,
        title,
        body || null
    ]);
    return res.rows[0];
}

async function notifyMany(client, userIds, payload) {
    if (!Array.isArray(userIds) || userIds.length === 0) {
        return [];
    }
    const results = [];
    for (const userId of userIds) {
        const item = await notify(client, { ...payload, userId });
        if (item) {
            results.push(item);
        }
    }
    return results;
}

module.exports = {
    notify,
    notifyMany
};
