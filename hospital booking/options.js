const {
  ADMISSION_OPTIONS,
  DOKTER_LIST_MIN,
  DOKTER_BY_KLINIK,
  DATES_BY_DOKTER_ID
} = require('./data');

// =============================================================================
// OPTION LOOKUP FUNCTIONS
// =============================================================================

/**
 * Gets available doctors for a specific clinic
 * @param {string|null} klinikId - Clinic ID to filter by
 * @returns {Array} List of doctors for the clinic
 */
function getDokterOptionsForKlinik(klinikId) {
  if (klinikId == null) return DOKTER_LIST_MIN;
  const key = String(klinikId);
  return DOKTER_BY_KLINIK[key] || [];
}

/**
 * Gets available dates for a specific doctor
 * @param {string|null} dokterId - Doctor ID to filter by
 * @returns {Array} List of available dates
 */
function getDateOptionsForDokterHelper(dokterId) {
  if (dokterId == null) return [];

  const idStr = String(dokterId);

  // Check if dates are in ADMISSION_OPTIONS first
  if (Array.isArray(ADMISSION_OPTIONS.date) && ADMISSION_OPTIONS.date.length > 0) {
    const first = ADMISSION_OPTIONS.date[0];
    if (first && Object.prototype.hasOwnProperty.call(first, 'dokter_id')) {
      return ADMISSION_OPTIONS.date
        .filter((d) => String(d.dokter_id) === idStr)
        .map((d) => ({ id: d.id, title: d.title }));
    }
  }

  // Fallback to generated dates
  return (DATES_BY_DOKTER_ID[idStr] || []).map((d) => ({ id: d.id, title: d.title }));
}

/**
 * Gets available time slots for a doctor on a specific date
 * @param {string|null} dokterId - Doctor ID
 * @param {string|null} dateId - Date ID
 * @returns {Array} List of available time slots
 */
function getTimeOptionsForDokterAndDateHelper(dokterId, dateId) {
  if (dokterId == null || dateId == null) return [];

  // For now, return all time options since there's no specific filtering logic needed
  // In the future, you could add filtering based on dokter availability for specific dates
  return ADMISSION_OPTIONS.time.map((t) => ({
    id: t.id,
    title: t.title,
    enabled: t.enabled ?? true
  }));
}

/**
 * Gets patient type options
 * @returns {Array} List of patient types
 */
function getTipePasienOptionsHelper() {
  return ADMISSION_OPTIONS.tipe_pasien.map((t) => ({ id: t.id, title: t.title }));
}

/**
 * Gets payment method options
 * @returns {Array} List of payment methods
 */
function getPembayaranOptionsHelper() {
  return ADMISSION_OPTIONS.pembayaran.map((p) => ({ id: p.id, title: p.title }));
}

module.exports = {
  getDokterOptionsForKlinik,
  getDateOptionsForDokterHelper,
  getTimeOptionsForDokterAndDateHelper,
  getTipePasienOptionsHelper,
  getPembayaranOptionsHelper
};
