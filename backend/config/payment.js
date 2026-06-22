// Payment Service Provider Configuration
// Loads PSP credentials from environment variables

const paymentConfig = {
  // SSLCommerz (Bangladesh - BDT)
  sslcommerz: {
    storeId: process.env.SSLCOMMERZ_STORE_ID,
    storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD,
    isSandbox: process.env.SSLCOMMERZ_IS_SANDBOX === "true",
    // API URLs
    get baseUrl() {
      return this.isSandbox
        ? "https://sandbox.sslcommerz.com"
        : "https://securepay.sslcommerz.com";
    },
    get initUrl() {
      return `${this.baseUrl}/gwprocess/v4/api.php`;
    },
    get validationUrl() {
      return `${this.baseUrl}/validator/api/validationserverAPI.php`;
    },
    currency: "BDT",
  },

  // Payfast (Pakistan - PKR)
  payfast: {
    merchantId: process.env.PAYFAST_MERCHANT_ID,
    merchantKey: process.env.PAYFAST_MERCHANT_KEY,
    passphrase: process.env.PAYFAST_PASSPHRASE,
    isSandbox: process.env.PAYFAST_IS_SANDBOX === "true",
    get baseUrl() {
      return this.isSandbox
        ? "https://sandbox.payfast.co.za"
        : "https://www.payfast.co.za";
    },
    currency: "PKR",
  },

  // Redirect URLs (where users go after payment)
  redirectUrls: {
    success: process.env.PAYMENT_SUCCESS_URL || "http://localhost:3000/payment/success",
    failure: process.env.PAYMENT_FAILURE_URL || "http://localhost:3000/payment/failed",
    cancel: process.env.PAYMENT_CANCEL_URL || "http://localhost:3000/payment/cancel",
  },

  // Webhook base URL (where PSPs send callbacks)
  webhookBaseUrl: process.env.WEBHOOK_BASE_URL || "http://localhost:5001/api/payments/webhook",

  // SSLCommerz redirect callback base URL (browser redirects after payment)
  sslCallbackBaseUrl: process.env.SSL_CALLBACK_BASE_URL || "http://localhost:5001/api/payments/ssl",

  // Supported PSPs and their currencies
  supportedPsps: ["sslcommerz", "payfast"],

  pspCurrencyMap: {
    sslcommerz: "BDT",
    payfast: "PKR",
  },
};

// Validate that required credentials exist for a PSP
const validatePspCredentials = (psp) => {
  const config = paymentConfig[psp];
  if (!config) {
    return { valid: false, error: `Unknown PSP: ${psp}` };
  }

  switch (psp) {
    case "sslcommerz":
      if (!config.storeId || !config.storePassword) {
        return { valid: false, error: "SSLCommerz credentials not configured" };
      }
      break;
    case "payfast":
      if (!config.merchantId || !config.merchantKey) {
        return { valid: false, error: "Payfast credentials not configured" };
      }
      break;
  }

  return { valid: true };
};

module.exports = { paymentConfig, validatePspCredentials };
