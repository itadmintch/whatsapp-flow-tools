// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

/**
 * Validate that all required environment variables are present
 * @param {Array<string>} requiredEnvVars - Names of the required environment variables
 */
function validateEnvironment(requiredEnvVars) {
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

module.exports = { validateEnvironment };
