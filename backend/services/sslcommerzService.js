// SSLCommerz Payment Service
// Handles payment initiation, IPN validation, and transaction validation

const SSLCommerzPayment = require("sslcommerz-lts");
const crypto = require("crypto");
const { paymentConfig } = require("../config/payment");
const { getWebhookUrl } = require("../utils/paymentHelper");

const getSslInstance = () => {
  const config = paymentConfig.sslcommerz;
  // Third param: true = live, false = sandbox
  return new SSLCommerzPayment(config.storeId, config.storePassword, !config.isSandbox);
};

/**
 * Initiate a payment with SSLCommerz
 * @param {Object} transaction - Transaction document
 * @param {Object} user - User document
 * @param {Object} task - Task document
 * @returns {Promise<{gatewayUrl: string}>}
 */
const initiateSSLPayment = async (transaction, user, task) => {
  const sslcz = getSslInstance();

  const data = {
    total_amount: transaction.amount,
    currency: "BDT",
    tran_id: transaction.transactionId,

    // Redirect URLs (browser redirects after payment)
    success_url: `${paymentConfig.sslCallbackBaseUrl}/success`,
    fail_url: `${paymentConfig.sslCallbackBaseUrl}/fail`,
    cancel_url: `${paymentConfig.sslCallbackBaseUrl}/cancel`,

    // IPN URL (server-to-server notification)
    ipn_url: getWebhookUrl("sslcommerz"),

    // Customer info
    cus_name: user.name || "Customer",
    cus_email: user.email || "customer@example.com",
    cus_phone: user.phone || "01700000000",
    cus_add1: "Dhaka",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",

    // Product info
    product_name: task.title || "Task Payment",
    product_category: task.category || "General",
    product_profile: "general",

    // Shipping (required by SSLCommerz even for digital goods)
    shipping_method: "NO",
    ship_name: user.name || "Customer",
    ship_add1: "Dhaka",
    ship_city: "Dhaka",
    ship_postcode: "1000",
    ship_country: "Bangladesh",
    num_of_item: 1,

    // Extra reference
    value_a: transaction.transactionId,
  };

  const apiResponse = await sslcz.init(data);

  if (!apiResponse || !apiResponse.GatewayPageURL) {
    throw new Error(
      `SSLCommerz init failed: ${apiResponse?.failedreason || "No GatewayPageURL returned"}`
    );
  }

  return { gatewayUrl: apiResponse.GatewayPageURL };
};

/**
 * Validate SSLCommerz IPN (Instant Payment Notification)
 * Verifies the hash signature to confirm the notification is authentic
 * @param {Object} postData - POST body from SSLCommerz IPN
 * @param {string} storePassword - SSLCommerz store password
 * @returns {{ valid: boolean, error?: string }}
 */
const validateIPN = (postData, storePassword) => {
  try {
    const { verify_sign, verify_key } = postData;

    if (!verify_sign || !verify_key) {
      return { valid: false, error: "Missing verify_sign or verify_key in IPN payload" };
    }

    // Build hash data from verify_key fields
    const keyList = verify_key.split(",");
    const hashData = {};
    for (const key of keyList) {
      hashData[key] = postData[key] || "";
    }

    // Add MD5-hashed store password
    hashData["store_passwd"] = crypto.createHash("md5").update(storePassword).digest("hex");

    // Sort keys alphabetically and build query string
    const sortedKeys = Object.keys(hashData).sort();
    const hashString = sortedKeys.map((k) => `${k}=${hashData[k]}`).join("&");

    // Compute MD5 and compare
    const computedHash = crypto.createHash("md5").update(hashString).digest("hex");

    if (computedHash === verify_sign) {
      return { valid: true };
    }
    return { valid: false, error: "Hash mismatch — IPN signature invalid" };
  } catch (err) {
    return { valid: false, error: err.message };
  }
};

/**
 * Validate a transaction using SSLCommerz Validation API
 * @param {string} valId - val_id from SSLCommerz callback
 * @returns {Promise<Object>} Validation response from SSLCommerz
 */
const validateTransaction = async (valId) => {
  const sslcz = getSslInstance();
  const response = await sslcz.validate({ val_id: valId });
  return response;
};

module.exports = { initiateSSLPayment, validateIPN, validateTransaction };
