const crypto = require('crypto');
const { FlowEndpointException } = require('./errors');

// Load environment variables
require('dotenv').config();

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

/** RSA decryption passphrase for encrypted AES key */
const PASSPHRASE = process.env.RSA_PASSPHRASE;

/** RSA private key for decrypting the AES key from WhatsApp */
const PRIVATE_KEY = process.env.RSA_PRIVATE_KEY;

// =============================================================================
// ENCRYPTION/DECRYPTION UTILITIES
// =============================================================================

/**
 * Decrypts the incoming WhatsApp Flow request
 *
 * WhatsApp sends encrypted data using hybrid encryption:
 * 1. AES key is encrypted with RSA public key
 * 2. Flow data is encrypted with AES-128-GCM
 *
 * @param {Object} body - Request body containing encrypted data
 * @param {string} privatePem - RSA private key in PEM format
 * @param {string} passphrase - Private key passphrase
 * @returns {Object} Decrypted data and encryption keys
 */
function decryptRequest(body, privatePem, passphrase) {
  const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;

    if (!encrypted_aes_key || !encrypted_flow_data || !initial_vector) {
        throw new FlowEndpointException(
            400,
            "Invalid request payload. Required fields: encrypted_aes_key, encrypted_flow_data, initial_vector."
        );
    }

  // Step 1: Decrypt the AES key using RSA private key
    let privateKey;
    try {
        privateKey = crypto.createPrivateKey({ key: privatePem, passphrase });
    } catch (error) {
        throw new FlowEndpointException(
            421,
            "Failed to load private key. Please verify RSA_PRIVATE_KEY and RSA_PASSPHRASE."
        );
    }
  let decryptedAesKey = null;

  try {
    decryptedAesKey = crypto.privateDecrypt(
      {
        key: privateKey,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256",
      },
      Buffer.from(encrypted_aes_key, "base64")
    );
  } catch (error) {
    throw new FlowEndpointException(
      421,
      "Failed to decrypt the request. Please verify your private key."
    );
  }

  // Step 2: Decrypt the flow data using AES-128-GCM
  const flowDataBuffer = Buffer.from(encrypted_flow_data, "base64");
  const initialVectorBuffer = Buffer.from(initial_vector, "base64");

  const TAG_LENGTH = 16;
  const encrypted_flow_data_body = flowDataBuffer.subarray(0, -TAG_LENGTH);
  const encrypted_flow_data_tag = flowDataBuffer.subarray(-TAG_LENGTH);

  const decipher = crypto.createDecipheriv(
    "aes-128-gcm",
    decryptedAesKey,
    initialVectorBuffer
  );
  decipher.setAuthTag(encrypted_flow_data_tag);

  const decryptedJSONString = Buffer.concat([
    decipher.update(encrypted_flow_data_body),
    decipher.final(),
  ]).toString("utf-8");

  return {
    decryptedBody: JSON.parse(decryptedJSONString),
    aesKeyBuffer: decryptedAesKey,
    initialVectorBuffer,
  };
}

/**
 * Encrypts the response back to WhatsApp using the same AES key
 *
 * @param {Object} response - Response object to encrypt
 * @param {Buffer} aesKeyBuffer - AES key from decryption
 * @param {Buffer} initialVectorBuffer - IV from decryption
 * @returns {string} Base64 encoded encrypted response
 */
function encryptResponse(response, aesKeyBuffer, initialVectorBuffer) {
  // WhatsApp requires flipping the IV bits for response encryption
  const flipped_iv = [];
  for (const pair of initialVectorBuffer.entries()) {
    flipped_iv.push(~pair[1]);
  }

  const cipher = crypto.createCipheriv(
    "aes-128-gcm",
    aesKeyBuffer,
    Buffer.from(flipped_iv)
  );

  return Buffer.concat([
    cipher.update(JSON.stringify(response), "utf-8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString("base64");
}

/**
 * Builds safe diagnostics for private/public key pair readiness.
 * Never returns key material or passphrase.
 * @returns {{keyLoadable: boolean, publicKeyFingerprintSha256: string|null, error: string|null}}
 */
function getCryptoDiagnostics() {
    try {
        const privateKey = crypto.createPrivateKey({ key: PRIVATE_KEY, passphrase: PASSPHRASE });
        const publicKey = crypto.createPublicKey(privateKey);
        const publicKeyDer = publicKey.export({ type: 'spki', format: 'der' });
        const fingerprint = crypto
            .createHash('sha256')
            .update(publicKeyDer)
            .digest('hex');

        return {
            keyLoadable: true,
            publicKeyFingerprintSha256: fingerprint,
            error: null
        };
    } catch (error) {
        return {
            keyLoadable: false,
            publicKeyFingerprintSha256: null,
            error: error?.message || 'Unknown key error'
        };
    }
}

module.exports = {
  PASSPHRASE,
  PRIVATE_KEY,
  decryptRequest,
  encryptResponse,
  getCryptoDiagnostics
};
