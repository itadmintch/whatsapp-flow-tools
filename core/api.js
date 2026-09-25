const axios = require('axios');

// =============================================================================
// API HELPER FUNCTIONS
// =============================================================================

/**
 * Makes an API call with error handling and consistent structure
 * @param {string} url - API endpoint URL
 * @param {Object} payload - Data to send
 * @returns {Promise<Object>} API response or error
 */
async function makeApiCall(url, payload) {
    const config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: url,
        headers: {
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(payload)
    };

    try {
        const response = await axios.request(config);
        return {
            success: response.status === 200,
            data: response.data,
            status: response.status
        };
    } catch (error) {
        console.error('API call failed:', error);
        return {
            success: false,
            error: error.response?.data?.error_message || 'Network error occurred',
            status: error.response?.status || 500
        };
    }
}

module.exports = { makeApiCall };
