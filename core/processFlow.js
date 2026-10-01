const { FlowEndpointException } = require('./errors');
const { PASSPHRASE, PRIVATE_KEY, decryptRequest, encryptResponse } = require('./crypto');

// =============================================================================
// MAIN EXECUTION BLOCK
// =============================================================================

/**
 * Main execution function that handles the entire request-response cycle
 * 1. Decrypts the incoming WhatsApp Flow request
 * 2. Processes the request and determines the next screen
 * 3. Encrypts and returns the response
 *
 * @param {Object} input - Encrypted request body from WhatsApp
 * @param {Function} getNextScreen - Flow-specific handler: (decryptedBody) => Promise<screenResponse>
 */
async function processFlowRequest(input, getNextScreen) {
  let decryptedRequest;

  if (!input || typeof input !== 'object') {
    return {
      code: 400,
      message: 'Missing request body.'
    };
  }

  // Step 1: Decrypt the incoming request
  try {
    decryptedRequest = decryptRequest(input, PRIVATE_KEY, PASSPHRASE);
  } catch (err) {
    console.error('❌ Decryption error:', err);

    if (err instanceof FlowEndpointException) {
      return {
        code: err.statusCode,
        message: err.message
      };
    }

    return {
      code: 500,
      message: 'Internal Server Error'
    };
  }

  const { aesKeyBuffer, initialVectorBuffer, decryptedBody } = decryptedRequest;
  // console.log("💬 Decrypted Request:", JSON.stringify(decryptedBody, null, 2));

  // Step 2: Process the request and get the screen response
  let screenResponse;
  try {
    screenResponse = await getNextScreen(decryptedBody);
    // console.log("👉 Response to Encrypt:", JSON.stringify(screenResponse, null, 2));
  } catch (err) {
    console.error('❌ Screen processing error:', err);

    // Return error screen or fallback response
    screenResponse = {
      screen: 'ERROR',
      data: {
        error_message: 'Terjadi kesalahan sistem. Silakan coba lagi.'
      }
    };
  }

  // Step 3: Encrypt and return the response
  try {
    const encryptedResponse = encryptResponse(screenResponse, aesKeyBuffer, initialVectorBuffer);

    return {
      decryptedRequest: decryptedRequest,
      decryptedBody: decryptedBody,
      screenResponse: screenResponse,
      response: encryptedResponse
    };
  } catch (err) {
    console.error('❌ Encryption error:', err);
    return {
      code: 500,
      message: 'Failed to encrypt response'
    };
  }
}

module.exports = { processFlowRequest };
