const path = require('path');
const dotenv = require('dotenv');

// Load .env from repository root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const PORT = parseInt(process.env.PORT, 10) || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me-please';

if (!DATABASE_URL) {
    throw new Error('FATAL: DATABASE_URL is not defined in environment variables. Please check your .env file.');
}

module.exports = {
    PORT,
    NODE_ENV,
    DATABASE_URL,
    JWT_SECRET
};
