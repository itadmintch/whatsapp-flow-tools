const { makeApiCall } = require('../core/api');
const { API_ENDPOINTS, DEMO_MODE, SIGNIN_MOCK_CONFIG, BOOKING_MOCK_CONFIG } = require('./config');

// =============================================================================
// BOOKING API SERVICES
// =============================================================================

/**
 * Handles patient registration API call
 * @param {Object} registrationData - Registration form data
 * @returns {Promise<Object>} Registration result
 */
async function handleRegistration(registrationData) {
  const payload = {
    trigger: 'submit_registration',
    ...registrationData
  };

  // NOTE No need to hit any real API endpoint for registration to TrakCare, just return payload as is.
  // return await makeApiCall(API_ENDPOINTS.SIGNUP, payload);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        status: 200,
        data: {
          ...payload
        }
      });
    }, 500);
  });
}

/**
 * Handles patient sign-in API call
 * @param {Object} signInData - Sign-in form data
 * @returns {Promise<Object>} Sign-in result
 */
async function handleSignIn(signInData) {
  if (
    DEMO_MODE &&
    String(signInData.pasien_nama_or_telp || '').trim() === SIGNIN_MOCK_CONFIG.nameOrPhone &&
    String(signInData.pasien_tanggal_lahir || '').trim() === SIGNIN_MOCK_CONFIG.birthDate
  ) {
    return {
      success: true,
      status: 200,
      data: {
        user_id: SIGNIN_MOCK_CONFIG.userId,
        mocked: true
      }
    };
  }

  //   const payload = {
  //     trigger: 'sign_in',
  //     pasien_nama_or_telp: signInData.pasien_nama_or_telp,
  //     pasien_tanggal_lahir: signInData.pasien_tanggal_lahir,
  //     pasien_nomor_telepon: signInData.pasien_nomor_telepon
  //   };

  //   return await makeApiCall(API_ENDPOINTS.SIGN_IN, payload);

  const payload = {
    trigger: 'sign_in',
    ...signInData
  };

  // NOTE No need to hit any real API endpoint for registration to TrakCare, just return payload as is.
  // return await makeApiCall(API_ENDPOINTS.SIGNUP, payload);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        status: 200,
        data: {
          ...payload
        }
      });
    }, 500);
  });
}

/**
 * Handles booking submission API call
 * @param {Object} bookingData - Complete booking data
 * @returns {Promise<Object>} Booking result
 */
async function handleBookingSubmission(bookingData) {
  if (DEMO_MODE) {
    const incomingUserId = String(bookingData.user_id || '').trim();
    const requiredUserId = String(BOOKING_MOCK_CONFIG.userIdMatch || '').trim();
    const userIdMatched = !requiredUserId || incomingUserId === requiredUserId;

    if (userIdMatched) {
      return {
        success: true,
        status: 200,
        data: {
          user_id: bookingData.user_id || SIGNIN_MOCK_CONFIG.userId,
          booking_qr_code: BOOKING_MOCK_CONFIG.bookingQrCode,
          booking_code: BOOKING_MOCK_CONFIG.bookingCode,
          nama: bookingData.nama_lengkap || bookingData.pasien_nama || 'Demo Patient',
          dokter: bookingData.dokter || 'Demo Doctor',
          ruang: BOOKING_MOCK_CONFIG.ruang,
          antrian: BOOKING_MOCK_CONFIG.antrian,
          mocked: true
        }
      };
    }
  }

  const payload = {
    trigger: 'submit_booking',
    ...bookingData
  };

  //   return await makeApiCall(API_ENDPOINTS.SUBMIT_BOOKING, payload);

  // NOTE No need to hit any real API endpoint for registration to TrakCare, just return payload as is.
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        status: 200,
        data: {
          ...payload
        }
      });
    }, 500);
  });
}

module.exports = {
  handleRegistration,
  handleSignIn,
  handleBookingSubmission
};
