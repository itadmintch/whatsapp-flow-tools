const { SCREEN_RESPONSES } = require('./data');
const {
  getDokterOptionsForKlinik,
  getDateOptionsForDokterHelper,
  getTimeOptionsForDokterAndDateHelper,
  getTipePasienOptionsHelper,
  getPembayaranOptionsHelper
} = require('./options');
const {
  handleRegistration,
  handleSignIn,
  handleBookingSubmission
} = require('./services');

// =============================================================================
// MAIN SCREEN NAVIGATION LOGIC
// =============================================================================


/**
 * Main function to determine the next screen based on current state and user input
 * Handles the flow: INIT → ADMISSION → REGISTRATION/PASIEN → KONFIRMASI → COMPLETE
 *
 * @param {Object} decryptedBody - Decrypted request data from WhatsApp
 * @returns {Promise<Object>} Next screen response
 */
async function getNextScreen(decryptedBody) {
  const { screen, data, action, flow_token } = decryptedBody;
  const currentScreen = screen;

  // Handle health check
  if (action === "ping") {
    return { data: { status: "active" } };
  }

  // Handle client error notifications
  if (data?.error) {
    console.warn("⚠️ Client error received:", data);
    return { data: { acknowledged: true } };
  }

  // Handle initial flow start → show ADMISSION screen
  if (action === "INIT") {
    return getInitialAdmissionScreen(data);
  }

  // Some clients send INIT inside data.trigger during data_exchange
  if (action === "data_exchange" && String(data?.trigger || "").toUpperCase() === "INIT") {
    return getInitialAdmissionScreen(data);
  }

  // Handle data exchange actions
  if (action === "data_exchange") {
    return await handleDataExchange(currentScreen, data, flow_token);
  }

  console.error("🚨 Unhandled request:", decryptedBody);
  throw new Error("Unhandled endpoint request.");
}

/**
 * Returns the initial admission screen with empty or filtered data
 * @param {Object} data - Initial data (may contain pre-selected clinic)
 * @returns {Object} Initial admission screen response
 */
function getInitialAdmissionScreen(data) {
    const dokterListForInit = getDokterOptionsForKlinik(data?.klinik);
    return {
      ...SCREEN_RESPONSES.ADMISSION,
      data: {
        ...SCREEN_RESPONSES.ADMISSION.data,
        dokter: dokterListForInit,
        date: [],
        is_dokter_enabled: false,
        is_date_enabled: false,
        is_time_enabled: false,
      },
    };
}

/**
 * Handles data exchange logic and screen transitions
 * @param {string} currentScreen - Current screen name
 * @param {Object} data - Form data from user
 * @param {string} flow_token - Flow token for session
 * @returns {Promise<Object>} Next screen response
 */
async function handleDataExchange(currentScreen, data, flow_token) {
    // Check if all required admission fields are selected
    const admissionComplete = checkAdmissionComplete(data);

    // Handle navigation after admission completion
    if (admissionComplete && data.trigger === "continue_selected") {
        return handleAdmissionCompletion(data);
    }

    // Route to specific screen handlers
    switch (currentScreen?.toUpperCase()) {
        case "ADMISSION":
            return handleAdmissionScreen(data);
        case "REGISTRATION":
            return await handleRegistrationScreen(data);
        case "PASIEN":
            return await handlePasienScreen(data);
        case "KONFIRMASI":
            return await handleKonfirmasiScreen(data);
        case "SUCCESS":
            return {
                ...SCREEN_RESPONSES.SUCCESS,
                data: {
                    extension_message_response: {
                        params: { flow_token },
                    },
                },
            };
        default:
            return {
                response: 'default',
                screen: currentScreen,
                decryptedBody: { screen: currentScreen, data }
            };
    }
}

/**
 * Checks if all required admission fields are completed
 * @param {Object} data - Form data
 * @returns {boolean} True if admission is complete
 */
function checkAdmissionComplete(data) {
    return Boolean(
        data.klinik &&
        data.dokter &&
        data.date &&
        data.time &&
        data.tipe_pasien &&
        data.pembayaran
    );
}

/**
 * Handles navigation after admission form completion
 * @param {Object} data - Admission data
 * @returns {Object} Next screen based on patient type
 */
function handleAdmissionCompletion(data) {
    if (String(data.tipe_pasien) === "Pasien Lama") {
        return {
            screen: "PASIEN",
            data: {}
        };
    } else if (String(data.tipe_pasien) === "Pasien Baru") {
        return {
            screen: "REGISTRATION",
            data: {
                ...SCREEN_RESPONSES.REGISTRATION.data
            }
        };
    }
}

/**
 * Handles admission screen logic with dynamic field enabling
 * @param {Object} data - Current form data
 * @returns {Object} Updated admission screen
 */
function handleAdmissionScreen(data) {
    const hasKlinik = Boolean(data.klinik);
    const hasDokter = Boolean(data.dokter);
    const hasDate = Boolean(data.date);

    // Get options based on current selections
    const dokterOptions = getDokterOptionsForKlinik(data.klinik);
    const dokterOptionsEmpty = (!dokterOptions || dokterOptions.length === 0);
    const dateOptions = hasDokter ? getDateOptionsForDokterHelper(data.dokter) : [];
    const timeOptions = (hasDate && hasDokter) ? getTimeOptionsForDokterAndDateHelper(data.dokter, data.date) : [];
    const tipePasienOptions = getTipePasienOptionsHelper();
    const pembayaranOptions = getPembayaranOptionsHelper();

    // Generate error message if no doctors available
    const errorMessage = hasKlinik && dokterOptionsEmpty ?
        "Tidak ada dokter tersedia. Silakan pilih klinik lain." : "";

    return {
        screen: "ADMISSION",
        data: {
            ...SCREEN_RESPONSES.ADMISSION.data,
            ...(errorMessage ? { error_message: errorMessage } : {}),
            is_dokter_enabled: hasKlinik,
            is_date_enabled: hasKlinik && hasDokter,
            is_time_enabled: hasKlinik && hasDokter && hasDate,
            dokter: dokterOptions,
            date: dateOptions,
            time: timeOptions,
            tipe_pasien: tipePasienOptions,
            pembayaran: pembayaranOptions
        },
    };
}

/**
 * Handles registration screen and form submission
 * @param {Object} data - Registration form data
 * @returns {Promise<Object>} Registration result or form
 */
async function handleRegistrationScreen(data) {
    if (data.trigger === "submit_registration") {
        const result = await handleRegistration(data);

        if (result.success) {
            return {
                screen: "KONFIRMASI",
                data: {
                    user_id: result.data?.user_id
                }
            };
        } else {
            return {
                screen: "REGISTRATION",
                data: {
                    ...SCREEN_RESPONSES.REGISTRATION.data,
                    error_message: result.error
                }
            };
        }
    }

    return {
        screen: "REGISTRATION",
        data: {
            ...SCREEN_RESPONSES.REGISTRATION.data
        },
    };
}

/**
 * Handles existing patient sign-in screen
 * @param {Object} data - Sign-in form data
 * @returns {Promise<Object>} Sign-in result or form
 */
async function handlePasienScreen(data) {
    if (data.trigger === "sign_in") {
        const result = await handleSignIn(data);

        if (result.success) {
            return {
                screen: "KONFIRMASI",
                data: {
                    user_id: result.data?.user_id
                }
            };
        } else {
            return {
                screen: "PASIEN",
                data: {
                    error_message: result.error
                }
            };
        }
    }

    return {
        screen: "PASIEN",
        data: {}
    };
}

/**
 * Handles booking confirmation and final submission
 * @param {Object} data - Complete booking data
 * @returns {Promise<Object>} Booking result
 */
async function handleKonfirmasiScreen(data) {
    if (data.trigger === "submit_booking") {
        const result = await handleBookingSubmission(data);

        if (result.success) {
            return {
                screen: "COMPLETE",
                data: {
                    user_id: result.data?.user_id,
                    booking_qr_code: result.data?.booking_qr_code,
                    booking_code: result.data?.booking_code,
                    nama: result.data?.nama,
                    dokter: result.data?.dokter,
                    ruang: result.data?.ruang,
                    antrian: result.data?.antrian
                }
            };
        } else {
            return {
                screen: "KONFIRMASI",
                data: {
                    error_message: result.error
                }
            };
        }
    }

    return {
        screen: "KONFIRMASI",
        data: {}
    };
}

module.exports = { getNextScreen };
