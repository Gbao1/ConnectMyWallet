const recaptchaConfig = {
  enabled: process.env.RECAPTCHA_ENABLED === "true",
  secretKey: process.env.RECAPTCHA_SECRET_KEY,
  siteKey: process.env.RECAPTCHA_SITE_KEY,
  verifyUrl: "https://www.google.com/recaptcha/api/siteverify",
  thresholds: {
    register: 0.5,
    login: 0.3,
    createTask: 0.5,
    bid: 0.4,
    comment: 0.3,
    reply: 0.3,
    message: 0.3,
  },
};

module.exports = recaptchaConfig;
