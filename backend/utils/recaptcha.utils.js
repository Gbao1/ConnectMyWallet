const axios = require("axios");
const recaptchaConfig = require("../config/recaptcha.config");

const verifyRecaptcha = async (token) => {
  if (!recaptchaConfig.secretKey) {
    throw new Error("reCAPTCHA secret key is not configured");
  }

  try {
    const response = await axios.post(
      recaptchaConfig.verifyUrl,
      null,
      {
        params: {
          secret: recaptchaConfig.secretKey,
          response: token,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("[RECAPTCHA] Verification request failed:", error.message);
    return { success: false, score: 0 };
  }
};

module.exports = { verifyRecaptcha };
