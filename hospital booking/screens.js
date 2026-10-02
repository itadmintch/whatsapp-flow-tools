const { SCREEN_RESPONSES } = require('./data');
const {
  getDokterOptionsForKlinik,
  getDateOptionsForDokterHelper,
  getTimeOptionsForDokterAndDateHelper,
  getTipePasienOptionsHelper,
  getPembayaranOptionsHelper
} = require('./options');
const { handleRegistration, handleSignIn, handleBookingSubmission } = require('./services');
const axios = require('axios');

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
  if (action === 'ping') {
    return { data: { status: 'active' } };
  }

  // Handle client error notifications
  if (data?.error) {
    console.warn('⚠️ Client error received:', data);
    return { data: { acknowledged: true } };
  }

  // Handle initial flow start → show ADMISSION screen
  if (action === 'INIT') {
    return getInitialAdmissionScreen(data);
  }

  // Some clients send INIT inside data.trigger during data_exchange
  if (action === 'data_exchange' && String(data?.trigger || '').toUpperCase() === 'INIT') {
    return getInitialAdmissionScreen(data);
  }

  // Handle data exchange actions
  if (action === 'data_exchange') {
    return await handleDataExchange(currentScreen, data, flow_token);
  }

  console.error('🚨 Unhandled request:', decryptedBody);
  throw new Error('Unhandled endpoint request.');
}

// Fetch klinik from Iris
const fetchKlinik = async () => {
  try {
    const irisResponse = await axios.post('http://tchirisapi.tzuchihospital.co.id/sp/fetch', {
      className: 'Custom.IDTC.Reports.StoredProc.Qontak.FlowClinic',
      methodName: 'GetClinicJSON',
      args: []
    });

    // console.log('Fetched klinik from Iris API:', irisResponse.data.result);
    if (irisResponse.data.result instanceof Array) {
      return irisResponse.data.result;
    } else {
      console.error('Invalid response format from Iris API:', irisResponse.data);
      throw new Error('Invalid response format from Iris API: expected an array.');
    }
  } catch (error) {
    console.error('Failed to fetch klinik from Iris API:', error);
    throw new Error('Failed to fetch klinik from Iris API: ' + error.message);
  }
};

// Fetch dokter by klinik from Iris
const fetchDokterByKlinik = async (klinikId) => {
  try {
    if (!klinikId) {
      console.warn('No klinikId provided for fetching dokter. Returning empty list.');
      return [];
    }

    const irisResponse = await axios.post('http://tchirisapi.tzuchihospital.co.id/sp/fetch', {
      className: 'Custom.IDTC.Reports.StoredProc.Qontak.FlowDoctor',
      methodName: 'GetDoctorByClinicJSON',
      args: [klinikId]
    });

    // console.log(`Fetched dokter for klinik ${klinikId} from Iris API:`, irisResponse.data.result);
    if (irisResponse.data.result instanceof Array) {
      return irisResponse.data.result;
    } else {
      console.error('Invalid response format from Iris API:', irisResponse.data);
      throw new Error('Invalid response format from Iris API: expected an array.');
    }
  } catch (error) {
    console.error(`Failed to fetch dokter for klinik ${klinikId} from Iris API:`, error);
    throw new Error(`Failed to fetch dokter for klinik ${klinikId} from Iris API: ` + error.message);
  }
};

// Fetch available dates for a specific dokter from Iris
const fetchDatesByDokter = async (dokterId) => {
  try {
    if (!dokterId) {
      console.warn('No dokterId provided for fetching dates. Returning empty list.');
      return [];
    }

    const irisResponse = await axios.post('http://tchirisapi.tzuchihospital.co.id/sp/fetch', {
      className: 'Custom.IDTC.Reports.StoredProc.Qontak.FlowSchedule',
      methodName: 'GetScheduleByDoctorJSON',
      args: [dokterId]
    });

    // console.log(`Fetched dates for dokter ${dokterId} from Iris API:`, irisResponse.data.result);
    if (irisResponse.data.result instanceof Object) {
      return irisResponse.data.result || [];
    } else {
      console.error('Invalid response format from Iris API:', irisResponse.data);
      throw new Error('Invalid response format from Iris API: expected an array.');
    }
  } catch (error) {
    console.error(`Failed to fetch dates for dokter ${dokterId} from Iris API:`, error);
    throw new Error(`Failed to fetch dates for dokter ${dokterId} from Iris API: ` + error.message);
  }
};

const fetchSession = async (dokterId, date) => {
  try {
    const irisResponse = await axios.post('http://tchirisapi.tzuchihospital.co.id/sp/fetch', {
      className: 'Custom.IDTC.Reports.StoredProc.Qontak.FlowSession',
      methodName: 'GetSessionByDate',
      args: [dokterId, date]
    });

    console.log('Test Fetched Iris API:', irisResponse.data);
    return irisResponse.data.result || [];
  } catch (error) {
    console.error('Failed to fetch klinik from Iris API:', error);
    throw new Error('Failed to fetch klinik from Iris API: ' + error.message);
  }
};

/**
 * Returns the initial admission screen with empty or filtered data
 * @param {Object} data - Initial data (may contain pre-selected clinic)
 * @returns {Object} Initial admission screen response
 */
async function getInitialAdmissionScreen(data) {
  //   const dokterListForInit = getDokterOptionsForKlinik(data?.klinik);
  return {
    ...SCREEN_RESPONSES.ADMISSION,
    data: {
      ...SCREEN_RESPONSES.ADMISSION.data,
      klinik: await fetchKlinik(),
      dokter: [],
      date: {},
      is_dokter_enabled: false,
      is_date_enabled: false,
      is_time_enabled: false
    }
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
  if (admissionComplete && data.trigger === 'continue_selected') {
    return handleAdmissionCompletion(data);
  }

  // Route to specific screen handlers
  switch (currentScreen?.toUpperCase()) {
    case 'ADMISSION':
      return handleAdmissionScreen(data);
    case 'REGISTRATION':
      return await handleRegistrationScreen(data);
    case 'PASIEN':
      return await handlePasienScreen(data);
    case 'KONFIRMASI':
      return await handleKonfirmasiScreen(data);
    case 'SUCCESS':
      return {
        ...SCREEN_RESPONSES.SUCCESS,
        data: {
          extension_message_response: {
            params: { flow_token }
          }
        }
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
  return Boolean(data.klinik && data.dokter && data.date && data.time && data.tipe_pasien && data.pembayaran);
}

/**
 * Handles navigation after admission form completion
 * @param {Object} data - Admission data
 * @returns {Object} Next screen based on patient type
 */
function handleAdmissionCompletion(data) {
  if (String(data.tipe_pasien) === 'Pasien Lama') {
    return {
      screen: 'PASIEN',
      data: {}
    };
  } else if (String(data.tipe_pasien) === 'Pasien Baru') {
    return {
      screen: 'REGISTRATION',
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
async function handleAdmissionScreen(data) {
  const hasKlinik = Boolean(data.klinik);
  const hasDokter = Boolean(data.dokter);
  const hasDate = Boolean(data.date);

  console.log('Handling ADMISSION screen with data:', data);

  // Get options based on current selections
  const dokterOptions = await fetchDokterByKlinik(data.klinik);
  
  //   ]; // Placeholder for actual dokter options
  const dokterOptionsEmpty = !dokterOptions || dokterOptions.length === 0;
  const dateOptions = hasDokter ? await fetchDatesByDokter(data.dokter) : {};
  //   const timeOptions = hasDate && hasDokter ? getTimeOptionsForDokterAndDateHelper(data.dokter, data.date) : [];
  const timeOptions = hasDate && hasDokter ? await fetchSession(data.dokter, data.date) : [];
  const tipePasienOptions = getTipePasienOptionsHelper();
  const pembayaranOptions = getPembayaranOptionsHelper();

  // Generate error message if no doctors available
  const errorMessage = hasKlinik && dokterOptionsEmpty ? 'Tidak ada dokter tersedia. Silakan pilih klinik lain.' : '';

  return {
    screen: 'ADMISSION',
    data: {
      ...SCREEN_RESPONSES.ADMISSION.data,
      ...(errorMessage ? { error_message: errorMessage } : {}),
      is_dokter_enabled: hasKlinik,
      is_date_enabled: hasKlinik && hasDokter,
      is_time_enabled: hasKlinik && hasDokter && hasDate,
      // TODO Implement TTL Caching for klinik and dokter options to reduce API calls
      klinik: await fetchKlinik(),
      dokter: dokterOptions,
      date: dateOptions,
      time: timeOptions,
      tipe_pasien: tipePasienOptions,
      pembayaran: pembayaranOptions
    }
  };
}

/**
 * Handles registration screen and form submission
 * @param {Object} data - Registration form data
 * @returns {Promise<Object>} Registration result or form
 */
async function handleRegistrationScreen(data) {
  if (data.trigger === 'submit_registration') {
    const result = await handleRegistration(data);

    if (result.success) {
      return {
        screen: 'KONFIRMASI',
        data: {
          user_id: result.data?.user_id || '', // Fallback to empty string, since no real API hits to TrakCare
          pasien_nama: '', // Clear the name field from existing patient form
          nama_lengkap: result.data?.nama_lengkap || ''
        }
      };
    } else {
      return {
        screen: 'REGISTRATION',
        data: {
          ...SCREEN_RESPONSES.REGISTRATION.data,
          error_message: result.error
        }
      };
    }
  }

  return {
    screen: 'REGISTRATION',
    data: {
      ...SCREEN_RESPONSES.REGISTRATION.data
    }
  };
}

/**
 * Handles existing patient sign-in screen
 * @param {Object} data - Sign-in form data
 * @returns {Promise<Object>} Sign-in result or form
 */
async function handlePasienScreen(data) {
  if (data.trigger === 'sign_in') {
    const result = await handleSignIn(data);

    if (result.success) {
      return {
        screen: 'KONFIRMASI',
        data: {
          user_id: result.data?.user_id || '', // Fallback to empty string, since no real API hits to TrakCare
          nama_lengkap: '', // Clear the name field from new patient form
          pasien_nama: data.pasien_nama || ''
        }
      };
    } else {
      return {
        screen: 'PASIEN',
        data: {
          error_message: result.error
        }
      };
    }
  }

  return {
    screen: 'PASIEN',
    data: {}
  };
}

/**
 * Handles booking confirmation and final submission
 * @param {Object} data - Complete booking data
 * @returns {Promise<Object>} Booking result
 */
async function handleKonfirmasiScreen(data) {
  if (data.trigger === 'submit_booking') {
    const result = await handleBookingSubmission(data);

    if (result.success) {
      return {
        screen: 'COMPLETE',
        data: {
          success_image:
            '/9j/4AAQSkZJRgABAQEBLAEsAAD/4QESRXhpZgAASUkqAAgAAAADAA4BAgDIAAAAMgAAABoBBQABAAAA+gAAABsBBQABAAAAAgEAAAAAAABHcmVlbiByZWNvbW1lbmRlZCBsYWJlbCB3aXRoIHRodW1iIHVwLiBXZWIgYnV0dG9uIGZvciBvbmxpbmUgc2hvcC4gQ2lyY2xlIHZlY3RvciBiYW5uZXIgc29jaWFsIG1lZGlhIGxpa2Ugb3IgcmVjb21tZW5kZWQgd2l0aCBtYW4gaGFuZCB0aHVtYnMgdXAuIEdvb2QgY2hvaWNlIHJlY29tbWVuZGF0aW9uIGljb24gbGFiZWwgYmVzdCBzZWxsZXIgc2lnbiwBAAABAAAALAEAAAEAAAD/4QZEaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLwA8P3hwYWNrZXQgYmVnaW49Iu+7vyIgaWQ9Ilc1TTBNcENlaGlIenJlU3pOVGN6a2M5ZCI/Pgo8eDp4bXBtZXRhIHhtbG5zOng9ImFkb2JlOm5zOm1ldGEvIj4KCTxyZGY6UkRGIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyI+CgkJPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIiB4bWxuczpJcHRjNHhtcENvcmU9Imh0dHA6Ly9pcHRjLm9yZy9zdGQvSXB0YzR4bXBDb3JlLzEuMC94bWxucy8iICAgeG1sbnM6R2V0dHlJbWFnZXNHSUZUPSJodHRwOi8veG1wLmdldHR5aW1hZ2VzLmNvbS9naWZ0LzEuMC8iIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIgeG1sbnM6cGx1cz0iaHR0cDovL25zLnVzZXBsdXMub3JnL2xkZi94bXAvMS4wLyIgIHhtbG5zOmlwdGNFeHQ9Imh0dHA6Ly9pcHRjLm9yZy9zdGQvSXB0YzR4bXBFeHQvMjAwOC0wMi0yOS8iIHhtbG5zOnhtcFJpZ2h0cz0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3JpZ2h0cy8iIHBob3Rvc2hvcDpDcmVkaXQ9IkdldHR5IEltYWdlcy9pU3RvY2twaG90byIgR2V0dHlJbWFnZXNHSUZUOkFzc2V0SUQ9IjE0NTk3MDA5OTMiIHhtcFJpZ2h0czpXZWJTdGF0ZW1lbnQ9Imh0dHBzOi8vd3d3LmlzdG9ja3Bob3RvLmNvbS9sZWdhbC9saWNlbnNlLWFncmVlbWVudD91dG1fbWVkaXVtPW9yZ2FuaWMmYW1wO3V0bV9zb3VyY2U9Z29vZ2xlJmFtcDt1dG1fY2FtcGFpZ249aXB0Y3VybCIgcGx1czpEYXRhTWluaW5nPSJodHRwOi8vbnMudXNlcGx1cy5vcmcvbGRmL3ZvY2FiL0RNSS1QUk9ISUJJVEVELUVYQ0VQVFNFQVJDSEVOR0lORUlOREVYSU5HIiA+CjxkYzpjcmVhdG9yPjxyZGY6U2VxPjxyZGY6bGk+c3Vud2FyZHM8L3JkZjpsaT48L3JkZjpTZXE+PC9kYzpjcmVhdG9yPjxkYzpkZXNjcmlwdGlvbj48cmRmOkFsdD48cmRmOmxpIHhtbDpsYW5nPSJ4LWRlZmF1bHQiPkdyZWVuIHJlY29tbWVuZGVkIGxhYmVsIHdpdGggdGh1bWIgdXAuIFdlYiBidXR0b24gZm9yIG9ubGluZSBzaG9wLiBDaXJjbGUgdmVjdG9yIGJhbm5lciBzb2NpYWwgbWVkaWEgbGlrZSBvciByZWNvbW1lbmRlZCB3aXRoIG1hbiBoYW5kIHRodW1icyB1cC4gR29vZCBjaG9pY2UgcmVjb21tZW5kYXRpb24gaWNvbiBsYWJlbCBiZXN0IHNlbGxlciBzaWduPC9yZGY6bGk+PC9yZGY6QWx0PjwvZGM6ZGVzY3JpcHRpb24+CjxwbHVzOkxpY2Vuc29yPjxyZGY6U2VxPjxyZGY6bGkgcmRmOnBhcnNlVHlwZT0nUmVzb3VyY2UnPjxwbHVzOkxpY2Vuc29yVVJMPmh0dHBzOi8vd3d3LmlzdG9ja3Bob3RvLmNvbS9waG90by9saWNlbnNlLWdtMTQ1OTcwMDk5My0/dXRtX21lZGl1bT1vcmdhbmljJmFtcDt1dG1fc291cmNlPWdvb2dsZSZhbXA7dXRtX2NhbXBhaWduPWlwdGN1cmw8L3BsdXM6TGljZW5zb3JVUkw+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'
        }
      };
    } else {
      return {
        screen: 'KONFIRMASI',
        data: {
          error_message: result.error
        }
      };
    }
  }

  return {
    screen: 'KONFIRMASI',
    data: {}
  };
}

module.exports = { getNextScreen };
