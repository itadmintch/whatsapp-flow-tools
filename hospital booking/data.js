const {
  pickFieldsFromArrayHelper,
  formatDateIdHelper,
  formatDateTitleHelper,
  randomIntHelper
} = require('../core/utils');

// =============================================================================
// STATIC DATA CONFIGURATIONS
// =============================================================================

/**
 * Main admission options for the booking flow
 * Contains all available clinics, doctors, dates, times, patient types, and payment methods
 */
const ADMISSION_OPTIONS = Object.freeze({
    klinik: [
      { "id": "Anak-Imunisasi Anak", "title": "Anak - Imunisasi Anak" },
      { "id": "Anak-Pediatric", "title": "Anak / Pediatric" },
      { "id": "Anestesi-Anaesthesiology", "title": "Anestesi / Anaesthesiology" },
      { "id": "Bedah-Anak", "title": "Bedah Anak" },
      { "id": "Bedah-Digestif", "title": "Bedah Digestif" },
      { "id": "Bedah-Onkologi", "title": "Bedah Onkologi" },
      { "id": "Bedah-Plastik", "title": "Bedah Plastik" },
      { "id": "Bedah-Saraf", "title": "Bedah Saraf" },
      { "id": "Bedah Saraf Kortek", "title": "Bedah Saraf Kortek" },
      { "id": "Bedah Thorax Vaskuler", "title": "Bedah Thorax Vaskuler" },
      { "id": "Bedah Umum-Surgery", "title": "Bedah Umum / Surgery" },
      { "id": "Dermatologi-Anak", "title": "Dermatologi Anak" },
      { "id": "Gigi-Dentistry", "title": "Gigi / Dentistry" },
      { "id": "Gigi-Anak", "title": "Gigi Anak" },
      { "id": "Gigi-Spesialis", "title": "Gigi Spesialis" }
    ],
    /** Available doctors with their clinic associations */
    dokter: [
        { "id": "dr. Sarah Wijaya, M.Sc, Sp.A", "title": "dr. Sarah Wijaya, M.Sc, Sp.A", "klinik_id": "Anak-Imunisasi Anak" , "image": ""},
        { "id": "dr. Maria Indriati, Sp.An-KIC", "title": "dr. Maria Indriati, Sp.An-KIC", "klinik_id": "Anak-Pediatric" , "image": ""},
        { "id": "Ahmad Prasetyo, S.ST., RD", "title": "Ahmad Prasetyo, S.ST., RD", "klinik_id": "Anestesi-Anaesthesiology" , "image": ""},
        { "id": "dr. Budi Santoso, Sp.JP", "title": "dr. Budi Santoso, Sp.JP", "klinik_id": "Bedah-Anak" , "image": ""}
    ],
    /** Available appointment dates mapped to specific doctors */
    date: [
        { "id": "2025-09-20", "title": "20 September 2025", "dokter_id": "dr. Sarah Wijaya, M.Sc, Sp.A" },
        { "id": "2025-09-21", "title": "21 September 2025", "dokter_id": "dr. Sarah Wijaya, M.Sc, Sp.A" },
        { "id": "2025-09-22", "title": "22 September 2025", "dokter_id": "dr. Sarah Wijaya, M.Sc, Sp.A" },
        { "id": "2025-09-23", "title": "23 September 2025", "dokter_id": "dr. Maria Indriati, Sp.An-KIC" },
        { "id": "2025-09-24", "title": "24 September 2025", "dokter_id": "dr. Maria Indriati, Sp.An-KIC" },
        { "id": "2025-09-25", "title": "25 September 2025", "dokter_id": "Ahmad Prasetyo, S.ST., RD" },
        { "id": "2025-09-19", "title": "19 September 2025", "dokter_id": "Ahmad Prasetyo, S.ST., RD" },
        { "id": "2025-09-20", "title": "20 September 2025", "dokter_id": "Ahmad Prasetyo, S.ST., RD" },
        { "id": "2025-09-21", "title": "21 September 2025", "dokter_id": "Ahmad Prasetyo, S.ST., RD" },
        { "id": "2025-09-24", "title": "24 September 2025", "dokter_id": "dr. Budi Santoso, Sp.JP" },
        { "id": "2025-09-25", "title": "25 September 2025", "dokter_id": "dr. Budi Santoso, Sp.JP" },
        { "id": "2025-09-27", "title": "27 September 2025", "dokter_id": "dr. Budi Santoso, Sp.JP" }
    ],
    /** Available appointment time slots */
    time: [
        { "id": "10:30", "title": "10:30" },
        { "id": "11:00", "title": "11:00", "enabled": false },
        { "id": "11:30", "title": "11:30" },
        { "id": "12:00", "title": "12:00", "enabled": false },
        { "id": "12:30", "title": "12:30" }
    ],
    /** Patient type options (new/existing) */
    tipe_pasien: [
        { "id": "Pasien Baru", "title": "Pasien Baru" },
        { "id": "Pasien Lama", "title": "Pasien Lama" }
    ],
    /** Payment method options */
    pembayaran: [
        { "id": "Pribadi", "title": "Pribadi" },
        { "id": "Asuransi", "title": "Asuransi" }
    ]
});

/**
 * Registration form options for new patients
 */
const REGISTRATION_OPTIONS = Object.freeze({
    /** ID card type options */
    tipe_kartu: [
        { "id": "KTP", "title": "KTP" },
        { "id": "KIA", "title": "KIA" },
        { "id": "KK", "title": "KK" },
        { "id": "Passport", "title": "Passport" }
    ],
    /** Gender options */
    jenis_kelamin: [
        { "id": "Laki-Laki", "title": "Laki-Laki" },
        { "id": "Perempuan", "title": "Perempuan" }
    ]
});

// =============================================================================
// DERIVED DATA STRUCTURES (Pre-computed for efficiency)
// =============================================================================

/** Minimal doctor list (id and title only) for initial display */
const DOKTER_LIST_MIN = Object.freeze(
    pickFieldsFromArrayHelper(ADMISSION_OPTIONS.dokter, ["id", "title"])
);

/** Doctors grouped by clinic ID for efficient lookup */
const DOKTER_BY_KLINIK = Object.freeze(
    ADMISSION_OPTIONS.dokter.reduce((acc, dokter) => {
        const key = String(dokter.klinik_id);
        if (!acc[key]) acc[key] = [];
        acc[key].push({ id: dokter.id, title: dokter.title });
        return acc;
    }, {})
);

/**
 * Generates 2-3 random future dates for a doctor's availability
 * @param {string} dokterId - Doctor ID
 * @returns {Array} Array of date objects with id, title, and dokter_id
 */
function generateRandomDatesForDokterHelper(dokterId) {
    const count = randomIntHelper(2, 3);
    const usedDays = new Set();
    const result = [];

    for (let i = 0; i < count; i += 1) {
        let dayOffset;
        do {
            dayOffset = randomIntHelper(1, 30); // 1-30 days from today
        } while (usedDays.has(dayOffset));
        usedDays.add(dayOffset);

        const date = new Date();
        date.setDate(date.getDate() + dayOffset);

        result.push({
            id: formatDateIdHelper(date),
            title: formatDateTitleHelper(date),
            dokter_id: String(dokterId),
        });
    }

    // Sort ascending by id (YYYY-MM-DD) for stable order
    result.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    return Object.freeze(result);
}

/** Pre-computed dates for each doctor (for performance) */
const DATES_BY_DOKTER_ID = Object.freeze(
    ADMISSION_OPTIONS.dokter.reduce((acc, dokter) => {
        acc[String(dokter.id)] = generateRandomDatesForDokterHelper(dokter.id);
        return acc;
    }, {})
);

// =============================================================================
// SCREEN RESPONSE TEMPLATES
// =============================================================================

/**
 * Predefined screen responses for WhatsApp Flow navigation
 * Each screen represents a step in the booking process
 */

const SCREEN_RESPONSES = Object.freeze({
    /** Initial admission screen with clinic/doctor/date/time selection */
    ADMISSION: {
        "screen": "ADMISSION",
        "data": {
            ...ADMISSION_OPTIONS,
            "is_dokter_enabled": true,
            "is_date_enabled": true,
            "is_time_enabled": true
        }
    },
    /** Registration form for new patients */
    REGISTRATION: {
      "screen": "REGISTRATION",
      "data": {
        ...REGISTRATION_OPTIONS
      }
    },
    /** Sign-in form for existing patients */
    PASIEN: {
        "screen": "PASIEN",
        "data": {
          "nama": "Example",
          "tanggal_lahir": "Example",
          "tempat_lahir": "Example",
          "tipe_kartu": "Example",
          "nomor_kartu": "Example",
          "jenis_kelamin": "Example",
          "klinik": "Example",
          "dokter": "Example",
          "date": "Example",
          "time": "Example",
          "tipe_pasien": "Example",
          "pembayaran": "Example"
        }
    },
    /** Booking confirmation screen */
    KONFIRMASI: {
      "screen": "KONFIRMASI",
      "data": {}
    },
    /** Final success screen with booking completion */
    SUCCESS: {
        "screen": "SUCCESS",
        "data": {
            "extension_message_response": {
                "params": {
                    "flow_token": "REPLACE_FLOW_TOKEN",
                    "some_param_name": "PASS_CUSTOM_VALUE"
                }
            }
        }
    },
});

module.exports = {
  ADMISSION_OPTIONS,
  REGISTRATION_OPTIONS,
  DOKTER_LIST_MIN,
  DOKTER_BY_KLINIK,
  DATES_BY_DOKTER_ID,
  SCREEN_RESPONSES
};
