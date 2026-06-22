// PayFast Payment Service
// Handles signature generation, form building, and ITN verification

const crypto = require("crypto");
const https = require("https");
const { paymentConfig } = require("../config/payment");
const { getWebhookUrl } = require("../utils/paymentHelper");

/**
 * Generate MD5 signature for PayFast form data
 * @param {Object} formFields - Ordered form fields object
 * @param {string|null} passphrase - Optional passphrase for signature
 * @returns {string} MD5 hex signature
 */
const generateSignature = (formFields, passphrase = null) => {
  const pairs = [];
  for (const [key, value] of Object.entries(formFields)) {
    if (value === undefined || value === null) continue;
    const trimmed = String(value).trim();
    const encoded = encodeURIComponent(trimmed).replace(/%20/g, "+");
    pairs.push(`${key}=${encoded}`);
  }

  let signatureString = pairs.join("&");

  if (passphrase) {
    const encodedPassphrase = encodeURIComponent(passphrase.trim()).replace(/%20/g, "+");
    signatureString += `&passphrase=${encodedPassphrase}`;
  }

  return crypto.createHash("md5").update(signatureString).digest("hex");
};

/**
 * Build PayFast payment form data for a transaction
 * @param {Object} transaction - Transaction document
 * @param {Object} user - User document
 * @param {Object} task - Task document
 * @returns {Object} { paymentUrl, formFields }
 */
const buildPaymentFormData = (transaction, user, task) => {
  const config = paymentConfig.payfast;
  const redirectUrls = paymentConfig.redirectUrls;

  // Split user name into first/last
  const nameParts = (user.name || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

  // Build ordered form fields (order matters for signature)
  const formFields = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: redirectUrls.success,
    cancel_url: redirectUrls.cancel,
    notify_url: getWebhookUrl("payfast"),
  };

  // Buyer details
  if (firstName) formFields.name_first = firstName;
  if (lastName) formFields.name_last = lastName;
  if (user.email) formFields.email_address = user.email;

  // Transaction details
  formFields.m_payment_id = transaction.transactionId;
  formFields.amount = Number(transaction.amount).toFixed(2);
  formFields.item_name = `Task: ${task.title}`.substring(0, 100);
  formFields.item_description = `Payment for task ${transaction.transactionId}`.substring(0, 255);
  formFields.custom_str1 = transaction.transactionId;

  // Remove any blank/undefined fields
  for (const key of Object.keys(formFields)) {
    if (formFields[key] === undefined || formFields[key] === null || formFields[key] === "") {
      delete formFields[key];
    }
  }

  // Generate and attach signature
  formFields.signature = generateSignature(formFields, config.passphrase);

  return {
    paymentUrl: `${config.baseUrl}/eng/process`,
    formFields,
  };
};

/**
 * Verify PayFast ITN (Instant Transaction Notification)
 * Performs signature check, data validation, and optional server confirmation
 * @param {Object} postData - POST data from PayFast ITN
 * @param {Object} payfastConfig - PayFast configuration
 * @param {Object} transaction - Stored transaction document
 * @returns {Object} { valid, error?, paymentStatus? }
 */
const verifyITN = async (postData, payfastConfig, transaction) => {
  // Step 1: Signature verification
  const receivedSignature = postData.signature;
  const dataWithoutSig = { ...postData };
  delete dataWithoutSig.signature;

  const expectedSignature = generateSignature(dataWithoutSig, payfastConfig.passphrase);

  if (expectedSignature !== receivedSignature) {
    return { valid: false, error: "Signature mismatch" };
  }

  // Step 2: Data validation
  if (postData.merchant_id !== payfastConfig.merchantId) {
    return { valid: false, error: "Merchant ID mismatch" };
  }

  const receivedAmount = parseFloat(postData.amount_gross);
  const storedAmount = parseFloat(transaction.amount);
  if (Math.abs(receivedAmount - storedAmount) > 0.01) {
    return {
      valid: false,
      error: `Amount mismatch: expected ${storedAmount}, got ${receivedAmount}`,
    };
  }

  // Step 3: Server confirmation (optional, best-effort)
  try {
    const isValid = await confirmWithPayfast(postData, payfastConfig.baseUrl);
    if (!isValid) {
      return { valid: false, error: "PayFast server confirmation failed" };
    }
  } catch (err) {
    // If server confirmation fails, still trust signature check
    console.warn("[PayFast] Server confirmation request failed, proceeding with signature verification:", err.message);
  }

  return {
    valid: true,
    paymentStatus: postData.payment_status,
  };
};

/**
 * Confirm ITN data with PayFast server
 * @param {Object} postData - POST data from ITN
 * @param {string} baseUrl - PayFast base URL
 * @returns {Promise<boolean>} True if PayFast confirms VALID
 */
const confirmWithPayfast = (postData, baseUrl) => {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(postData)) {
      if (key !== "signature") {
        params.append(key, value);
      }
    }
    const postBody = params.toString();

    const url = new URL(`${baseUrl}/eng/query/validate`);

    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postBody),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve(data.trim() === "VALID");
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.destroy(new Error("PayFast validation request timed out"));
    });

    req.write(postBody);
    req.end();
  });
};

/**
 * Check if an IP address is in PayFast's known IP ranges
 * PayFast IPs: 197.97.145.144/28 and 41.74.179.192/27
 * @param {string} ip - IP address to check
 * @returns {boolean} True if IP is in PayFast range
 */
const isPayfastIP = (ip) => {
  // Handle IPv6-mapped IPv4 addresses
  const cleanIp = ip.replace(/^::ffff:/, "");

  const ipToInt = (ipAddr) => {
    const parts = ipAddr.split(".");
    if (parts.length !== 4) return null;
    return parts.reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  };

  const ipInt = ipToInt(cleanIp);
  if (ipInt === null) return false;

  const ranges = [
    { network: "197.97.145.144", prefix: 28 }, // 197.97.145.144 - 197.97.145.159
    { network: "41.74.179.192", prefix: 27 },  // 41.74.179.192 - 41.74.179.223
  ];

  for (const range of ranges) {
    const networkInt = ipToInt(range.network);
    const mask = (~0 << (32 - range.prefix)) >>> 0;
    if ((ipInt & mask) === (networkInt & mask)) {
      return true;
    }
  }

  return false;
};

module.exports = {
  generateSignature,
  buildPaymentFormData,
  verifyITN,
  isPayfastIP,
};
