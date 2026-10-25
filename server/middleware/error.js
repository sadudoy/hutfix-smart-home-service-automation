const { NODE_ENV } = require('../config/env');

function errorHandler(err, req, res, next) {
    const statusCode = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    if (NODE_ENV === 'development') {
        console.error('[server error]', err.stack || err);
    } else {
        console.error('[server error]', message);
    }

    res.status(statusCode).json({
        ok: false,
        error: message,
        ...(NODE_ENV === 'development' && { stack: err.stack })
    });
}

module.exports = errorHandler;
