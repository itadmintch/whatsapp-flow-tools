// =============================================================================
// CUSTOM ERROR CLASSES
// =============================================================================

/**
 * Custom error class for Flow endpoint exceptions
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 */
class FlowEndpointException extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
  }
}

module.exports = { FlowEndpointException };
