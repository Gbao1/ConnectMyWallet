const payoutConfig = {
  commission: {
    rate: parseFloat(process.env.PAYOUT_COMMISSION_RATE) || 10,
    minimumFee: parseFloat(process.env.PAYOUT_MINIMUM_FEE) || 20,
  },

  settlementCycles: {
    BD: parseInt(process.env.PAYOUT_SETTLEMENT_DAYS_BD) || 1,
  },

  countries: {
    BD: {
      currency: "BDT",
      psp: "sslcommerz",
      destinationTypes: ["bank_transfer", "mobile_banking"],
      mobileBankingProviders: ["bkash", "nagad", "rocket"],
    },
  },

  minimumWithdrawal: {
    BD: parseFloat(process.env.PAYOUT_MIN_WITHDRAWAL_BD) || 100,
  },

  sslcommerz: {
    storeId: process.env.SSLCOMMERZ_STORE_ID,
    storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD,
    isSandbox: process.env.SSLCOMMERZ_IS_SANDBOX === "true",
    get disbursementUrl() {
      return this.isSandbox
        ? "https://sandbox.sslcommerz.com/dfs-process/v4/initiate"
        : "https://securepay.sslcommerz.com/dfs-process/v4/initiate";
    },
    get disbursementStatusUrl() {
      return this.isSandbox
        ? "https://sandbox.sslcommerz.com/dfs-process/v4/status"
        : "https://securepay.sslcommerz.com/dfs-process/v4/status";
    },
  },

  payoutWebhookBaseUrl:
    process.env.PAYOUT_WEBHOOK_BASE_URL ||
    "http://localhost:5001/api/payouts/webhook",
};

const useMockPayoutDisburse = () =>
  process.env.PAYOUT_MOCK_DISBURSE === "true" ||
  (process.env.NODE_ENV !== "production" && process.env.PAYOUT_MOCK_DISBURSE !== "false");

const validatePayoutPspCredentials = (psp) => {
  if (psp === "sslcommerz") {
    if (useMockPayoutDisburse()) return { valid: true, mock: true };
    if (!payoutConfig.sslcommerz.storeId || !payoutConfig.sslcommerz.storePassword) {
      return { valid: false, error: "SSLCommerz payout credentials not configured" };
    }
    return { valid: true };
  }
  return { valid: false, error: `Unknown payout PSP: ${psp}` };
};

module.exports = { payoutConfig, validatePayoutPspCredentials, useMockPayoutDisburse };
