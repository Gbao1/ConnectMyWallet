const crypto = require("crypto");
const { payoutConfig } = require("../config/payout");

const generatePayoutId = () => {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString("hex");
  return `PYO_${timestamp}_${random}`;
};

const calculateCommission = (grossAmount) => {
  const rate = payoutConfig.commission.rate;
  const minFee = payoutConfig.commission.minimumFee;
  const computed = (grossAmount * rate) / 100;
  const commissionAmount = Math.max(computed, minFee);
  const netAmount = Math.max(grossAmount - commissionAmount, 0);
  return {
    commissionRate: rate,
    commissionAmount: Math.round(commissionAmount * 100) / 100,
    netAmount: Math.round(netAmount * 100) / 100,
  };
};

// Skips Saturday (6) and Sunday (0)
const addBusinessDays = (fromDate, businessDays) => {
  const date = new Date(fromDate);
  let added = 0;
  while (added < businessDays) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return date;
};

const mapPayoutPspStatus = (pspStatus, psp) => {
  const maps = {
    sslcommerz: {
      SUCCESS: "paid",
      PROCESSING: "processing",
      FAILED: "failed",
      PENDING: "processing",
      CANCELLED: "cancelled",
    },
  };
  const map = maps[psp];
  if (!map) return "processing";
  return map[pspStatus] || "processing";
};

const getPspForCountry = (country) => {
  return payoutConfig.countries[country]?.psp || null;
};

const getCurrencyForCountry = (country) => {
  return payoutConfig.countries[country]?.currency || null;
};

const normalizeBangladeshMobileNumber = (mobileNumber = "") => {
  return String(mobileNumber).replace(/[\s-]/g, "");
};

const isValidBangladeshMobileNumber = (mobileNumber = "") => {
  const normalized = normalizeBangladeshMobileNumber(mobileNumber);
  return /^(?:\+88|88)?01[3-9]\d{8}$/.test(normalized);
};

const validatePayoutDestination = (destination, country) => {
  if (!destination || !destination.type) {
    return { valid: false, error: "Destination type is required" };
  }
  const allowed = payoutConfig.countries[country]?.destinationTypes || [];
  if (!allowed.includes(destination.type)) {
    return {
      valid: false,
      error: `Destination type '${destination.type}' not supported for country ${country}`,
    };
  }
  if (destination.type === "bank_transfer") {
    if (
      !destination.bankName ||
      !destination.accountNumber ||
      !destination.accountHolderName ||
      !destination.routingNumber
    ) {
      return {
        valid: false,
        error: "Bank transfer requires bankName, accountNumber, accountHolderName, routingNumber",
      };
    }
  }
  if (destination.type === "mobile_banking") {
    const validProviders = payoutConfig.countries[country]?.mobileBankingProviders || [];
    if (!validProviders.includes(destination.mobileBankingProvider)) {
      return {
        valid: false,
        error: `mobileBankingProvider must be one of: ${validProviders.join(", ")}`,
      };
    }
    if (!destination.mobileNumber) {
      return { valid: false, error: "mobileNumber is required for mobile banking" };
    }
    if (country === "BD" && !isValidBangladeshMobileNumber(destination.mobileNumber)) {
      return {
        valid: false,
        error: "mobileNumber must be a valid Bangladesh number (e.g. 01XXXXXXXXX or +8801XXXXXXXXX)",
      };
    }
  }
  return { valid: true };
};

module.exports = {
  generatePayoutId,
  calculateCommission,
  addBusinessDays,
  mapPayoutPspStatus,
  getPspForCountry,
  getCurrencyForCountry,
  validatePayoutDestination,
};
