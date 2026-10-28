const { pool } = require('../config/db');

async function notify(client, { userId, requestId, kind, title, body, link }) {
    if (!userId) {
        return null;
    }
    const dbClient = client || pool;
    let targetLink = link || null;
    if (!targetLink) {
        if (kind === 'request_created' || kind === 'request_cancelled') {
            targetLink = 'provider-requests.html';
        } else if (requestId) {
            targetLink = `customer-track.html?id=${requestId}`;
        } else if (kind === 'ticket_reply' || kind === 'ticket_created') {
            targetLink = 'customer-bookings.html';
        }
    }
    const query = `
        INSERT INTO notifications (user_id, request_id, kind, title, body, link)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
    `;
    const res = await dbClient.query(query, [
        userId,
        requestId || null,
        kind,
        title,
        body || null,
        targetLink
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
