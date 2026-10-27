const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { PORT, NODE_ENV } = require('./config/env');
const { pool } = require('./config/db');
const healthRouter = require('./routes/health.routes');
const authRouter = require('./routes/auth.routes');
const servicesRouter = require('./routes/services.routes');
const requestsRouter = require('./routes/requests.routes');
const providersRouter = require('./routes/providers.routes');
const providerRouter = require('./routes/provider.routes');
const providerOpsRouter = require('./routes/provider-ops.routes');
const invoicesRouter = require('./routes/invoices.routes');
const ratingsRouter = require('./routes/ratings.routes');
const notificationsRouter = require('./routes/notifications.routes');
const adminRouter = require('./routes/admin.routes');
const addressesRouter = require('./routes/addresses.routes');
const gigsRouter = require('./routes/gigs.routes');
const errorHandler = require('./middleware/error');

const app = express();

// Security and middleware
app.use(helmet({
    contentSecurityPolicy: false // Allow CDN assets in development/testing
}));
app.use(cors({ origin: true, credentials: true }));
app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Uploads static directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/services', servicesRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/providers', providersRouter);
app.use('/api/provider', providerRouter);
app.use('/api/provider', providerOpsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/ratings', ratingsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/addresses', addressesRouter);
app.use('/api/gigs', gigsRouter);

// Static frontend serving
app.use(express.static(path.join(__dirname, '..', 'client')));

// Centralized error handler
app.use(errorHandler);

// Server startup and DB connectivity verification
async function startServer() {
    try {
        await pool.query('SELECT 1;');
        console.log('DB: connected');

        const server = app.listen(PORT, () => {
            console.log(`Server ready: http://localhost:${PORT}`);
        });

        return server;
    } catch (err) {
        console.error('Database connection failed on startup:', err.message);
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
