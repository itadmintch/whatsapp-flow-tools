/**
 * WhatsApp Flow Endpoint for Hospital Booking System
 *
 * This endpoint handles encrypted WhatsApp Flow interactions for:
 * - Patient registration (new/existing patients)
 * - Doctor appointment booking
 * - Payment method selection
 * - Booking confirmation
 *
 * Flow: ADMISSION → REGISTRATION/PASIEN → KONFIRMASI → COMPLETE
 *
 * Module layout:
 * - config.js   → environment validation, API endpoints, demo mocks
 * - data.js     → static options and screen response templates
 * - options.js  → dropdown/radio option lookups
 * - services.js → registration, sign-in and booking API calls
 * - screens.js  → screen navigation logic (getNextScreen)
 * - ../core/    → shared encryption, request processing and helpers
 */

// Supports n8n code-node ($json) and server execution.
const n8nInput = globalThis.$json?.body ?? null;

// Load environment variables
require('dotenv').config();

// Validates environment on startup
require('./config');

const { processFlowRequest: processEncryptedFlowRequest } = require('../core/processFlow');
const { getCryptoDiagnostics } = require('../core/crypto');
const { getNextScreen } = require('./screens');

/**
 * Processes an encrypted WhatsApp Flow request for the booking flow
 * @param {Object} input - Encrypted request body from WhatsApp
 */
async function processFlowRequest(input) {
    return processEncryptedFlowRequest(input, getNextScreen);
}

async function main() {
    return processFlowRequest(n8nInput);
}

// Execute only when running as a standalone Node script.
if (require.main === module) {
    main()
        .then((result) => {
            console.log(JSON.stringify(result, null, 2));
        })
        .catch((error) => {
            console.error("❌ Fatal error:", error);
            process.exitCode = 1;
        });
}

module.exports = { main, processFlowRequest, getCryptoDiagnostics };
