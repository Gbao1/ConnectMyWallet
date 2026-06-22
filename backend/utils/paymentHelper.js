// Payment Helper Utilities
// Shared functions used across payment code

const crypto = require("crypto");
const { paymentConfig } = require("../config/payment");

/**
 * Generate a unique transaction ID
 * Format: TXN_<timestamp>_<random>
 * @returns {string} Unique transaction ID
 */
const generateTransactionId = () => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString("hex");
  return `TXN_${timestamp}_${random}`;
};

/**
 * Validate that the currency matches the PSP
 * Each PSP only supports specific currencies
 * @param {string} currency - Currency code (BDT, PKR)
 * @param {string} psp - Payment provider (sslcommerz, payfast)
 * @returns {boolean} True if currency is valid for the PSP
 */
const validateCurrencyForPsp = (currency, psp) => {
  const expectedCurrency = paymentConfig.pspCurrencyMap[psp];
  if (!expectedCurrency) {
    return false;
  }
  return currency === expectedCurrency;
};

/**
 * Get the expected currency for a PSP
 * @param {string} psp - Payment provider
 * @returns {string|null} Expected currency or null if PSP unknown
 */
const getCurrencyForPsp = (psp) => {
  return paymentConfig.pspCurrencyMap[psp] || null;
};

/**
 * Format amount for PSP (some need cents, some need whole numbers)
 * @param {number} amount - Amount in major currency units
 * @param {string} currency - Currency code
 * @returns {number} Formatted amount
 */
const formatAmount = (amount) => {
  return Math.round(amount * 100) / 100; // Round to 2 decimal places
};

/**
 * Map PSP-specific status to our internal status
 * @param {string} pspStatus - Status returned by PSP
 * @param {string} psp - Payment provider
 * @returns {string} Internal status (pending, processing, success, failed, refunded)
 */
const mapPspStatus = (pspStatus, psp) => {
  const statusMaps = {
    sslcommerz: {
      VALID: "success",
      VALIDATED: "success",
      PENDING: "processing",
      FAILED: "failed",
      CANCELLED: "cancelled",
      UNATTEMPTED: "pending",
      EXPIRED: "failed",
    },
    payfast: {
      COMPLETE: "success",
      PENDING: "processing",
      FAILED: "failed",
      CANCELLED: "cancelled",
    },
  };

  const map = statusMaps[psp];
  if (!map) {
    return "pending";
  }

  return map[pspStatus] || "pending";
};

/**
 * Check if a PSP is supported
 * @param {string} psp - Payment provider name
 * @returns {boolean} True if PSP is supported
 */
const isSupportedPsp = (psp) => {
  return paymentConfig.supportedPsps.includes(psp);
};

/**
 * Validate amount is positive and reasonable
 * @param {number} amount - Amount to validate
 * @returns {Object} { valid: boolean, error?: string }
 */
const validateAmount = (amount) => {
  if (typeof amount !== "number" || isNaN(amount)) {
    return { valid: false, error: "Amount must be a valid number" };
  }
  if (amount <= 0) {
    return { valid: false, error: "Amount must be greater than 0" };
  }
  if (amount > 10000000) {
    return { valid: false, error: "Amount exceeds maximum limit" };
  }
  return { valid: true };
};

/**
 * Generate webhook URL for a specific PSP
 * @param {string} psp - Payment provider
 * @returns {string} Full webhook URL
 */
const getWebhookUrl = (psp) => {
  return `${paymentConfig.webhookBaseUrl}/${psp}`;
};

module.exports = {
  generateTransactionId,
  validateCurrencyForPsp,
  getCurrencyForPsp,
  formatAmount,
  mapPspStatus,
  isSupportedPsp,
  validateAmount,
  getWebhookUrl,
};
