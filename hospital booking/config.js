const { validateEnvironment } = require('../core/env');

// Load environment variables
require('dotenv').config();

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

/** Required environment variables */
const REQUIRED_ENV_VARS = [
  'RSA_PASSPHRASE',
  'RSA_PRIVATE_KEY',
  'API_BASE_URL',
  'API_SIGNUP_ENDPOINT',
  'API_SIGNIN_ENDPOINT',
  'API_BOOKING_ENDPOINT'
];

// Validate environment on startup
validateEnvironment(REQUIRED_ENV_VARS);

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

/** API endpoints for external services */
const API_ENDPOINTS = {
  SIGNUP: `${process.env.API_BASE_URL}${process.env.API_SIGNUP_ENDPOINT}`,
  SIGN_IN: `${process.env.API_BASE_URL}${process.env.API_SIGNIN_ENDPOINT}`,
  SUBMIT_BOOKING: `${process.env.API_BASE_URL}${process.env.API_BOOKING_ENDPOINT}`
};

/** Global demo switch for local/demo mocking behavior */
const DEMO_MODE = String(process.env.DEMO_MODE || 'false').toLowerCase() === 'true';

/** Optional demo-only sign-in mock configuration */
const SIGNIN_MOCK_CONFIG = {
    nameOrPhone: process.env.SIGNIN_MOCK_NAME_OR_PHONE || '',
    birthDate: process.env.SIGNIN_MOCK_BIRTH_DATE || '',
    userId: process.env.SIGNIN_MOCK_USER_ID || 'demo-user-001'
};

/** Optional demo-only booking submit mock configuration */
const BOOKING_MOCK_CONFIG = {
    userIdMatch: process.env.BOOKING_MOCK_USER_ID_MATCH || '',
    bookingCode: process.env.BOOKING_MOCK_CODE || 'DEMO-BOOK-001',
    bookingQrCode: process.env.BOOKING_MOCK_QR || 'https://example.com/qr/demo-book-001',
    antrian: process.env.BOOKING_MOCK_QUEUE || 'A-001',
    ruang: process.env.BOOKING_MOCK_ROOM || 'Ruang Demo 1'
};

module.exports = {
  REQUIRED_ENV_VARS,
  API_ENDPOINTS,
  DEMO_MODE,
  SIGNIN_MOCK_CONFIG,
  BOOKING_MOCK_CONFIG
};
