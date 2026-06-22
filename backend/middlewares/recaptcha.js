const recaptchaConfig = require("../config/recaptcha.config");
const { verifyRecaptcha } = require("../utils/recaptcha.utils");

const validateRecaptcha = (minScore, expectedAction) => {
  return async (req, res, next) => {
    if (!recaptchaConfig.enabled) {
      console.log("[RECAPTCHA] Bypass mode - reCAPTCHA disabled");
      return next();
    }

    const token = req.body.recaptchaToken;

    if (!token) {
      return res.status(400).json({ msg: "reCAPTCHA token is required" });
    }

    try {
      const result = await verifyRecaptcha(token);

      if (!result.success) {
        return res.status(400).json({ msg: "reCAPTCHA verification failed" });
      }

      if (expectedAction && result.action !== expectedAction) {
        return res
          .status(400)
          .json({ msg: "reCAPTCHA action mismatch" });
      }

      if (result.score < minScore) {
        return res
          .status(403)
          .json({ msg: "Request blocked due to suspicious activity" });
      }

      req.recaptchaScore = result.score;
      next();
    } catch (error) {
      console.error("[RECAPTCHA] Middleware error:", error.message);
      return res.status(500).json({ msg: "reCAPTCHA verification error" });
    }
  };
};

module.exports = { validateRecaptcha };
