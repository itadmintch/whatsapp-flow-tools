/** Indonesian month names for date formatting */
const INDONESIAN_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

// =============================================================================
// DATA FILTERING AND UTILITY FUNCTIONS
// =============================================================================

/**
 * Efficiently filters array of objects to only include specified keys
 * @param {Array} array - Array of objects to filter
 * @param {Array} allowedKeys - Keys to keep in each object
 * @returns {Array} Filtered array with only allowed keys
 */
function pickFieldsFromArrayHelper(array, allowedKeys) {
  if (!Array.isArray(array)) return [];

  // Use Set for faster key lookup
  const keySet = new Set(allowedKeys);

  return array.map((item) => {
    const filtered = {};
    for (const key in item) {
      if (keySet.has(key)) {
        filtered[key] = item[key];
      }
    }
    return filtered;
  });
}

// =============================================================================
// DATE GENERATION UTILITIES
// =============================================================================

/**
 * Formats a Date object to YYYY-MM-DD string
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string
 */
function formatDateIdHelper(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/**
 * Formats a Date object to Indonesian date format
 * @param {Date} date - Date to format
 * @returns {string} Indonesian formatted date string
 */
function formatDateTitleHelper(date) {
    const d = String(date.getDate()).padStart(2, "0");
    const monthName = INDONESIAN_MONTHS[date.getMonth()];
    const y = date.getFullYear();
    return `${d} ${monthName} ${y}`;
}

/**
 * Generates a random integer between min and max (inclusive)
 * @param {number} minInclusive - Minimum value
 * @param {number} maxInclusive - Maximum value
 * @returns {number} Random integer
 */
function randomIntHelper(minInclusive, maxInclusive) {
    return Math.floor(Math.random() * (maxInclusive - minInclusive + 1)) + minInclusive;
}

module.exports = {
  INDONESIAN_MONTHS,
  pickFieldsFromArrayHelper,
  formatDateIdHelper,
  formatDateTitleHelper,
  randomIntHelper
};
