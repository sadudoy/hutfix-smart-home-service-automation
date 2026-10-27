// Server-Sent Events service for real-time tracking updates

const clients = new Map();

function addClient(requestId, res) {
    const id = parseInt(requestId, 10);
    if (!clients.has(id)) {
        clients.set(id, new Set());
    }
    clients.get(id).add(res);
}

function removeClient(requestId, res) {
    const id = parseInt(requestId, 10);
    if (clients.has(id)) {
        clients.get(id).delete(res);
        if (clients.get(id).size === 0) {
            clients.delete(id);
        }
    }
}

function broadcast(requestId, data) {
    const id = parseInt(requestId, 10);
    const clientSet = clients.get(id);
    if (clientSet) {
        const payload = `data: ${JSON.stringify(data)}\n\n`;
        for (const res of clientSet) {
            try {
                res.write(payload);
            } catch (err) {
                // Ignore socket write errors
            }
        }
    }
}

module.exports = {
    addClient,
    removeClient,
    broadcast
};
