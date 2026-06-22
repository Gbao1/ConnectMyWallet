// SSLCommerz B2C Disbursement Adapter
// Handles bank transfer (BEFTN) and mobile banking (bKash, Nagad, Rocket).
// NOTE: Confirm exact endpoint URLs and field names against SSLCommerz B2C API docs
// before going live — the URLs in config are based on their documented API structure.

const axios = require("axios");
const { payoutConfig, useMockPayoutDisburse } = require("../../config/payout");

const mapDestinationToFundType = (destination) => {
  if (destination.type === "bank_transfer") return "BEFTN";
  if (destination.type === "mobile_banking") {
    const providerMap = { bkash: "BKASH", nagad: "NAGAD", rocket: "ROCKET" };
    return providerMap[destination.mobileBankingProvider] || null;
  }
  return null;
};

const disburse = async (payout, destination) => {
  const config = payoutConfig.sslcommerz;

  if (useMockPayoutDisburse()) {
    console.log(`[sslcommerzPayoutAdapter] Mock disburse ${payout.payoutId} → ${payout.netAmount} ${payout.currency}`);
    return {
      success: true,
      pspReference: `MOCK_${payout.payoutId}`,
      rawResponse: { mock: true, status: "SUCCESS" },
    };
  }

  const fundType = mapDestinationToFundType(destination);
  if (!fundType) {
    return {
      success: false,
      pspReference: null,
      rawResponse: { error: "Unsupported destination type for SSLCommerz disbursement" },
    };
  }

  const payload = {
    store_id: config.storeId,
    store_passwd: config.storePassword,
    transfer_amount: payout.netAmount,
    currency: payout.currency,
    trnx_id: payout.payoutId,
    fund_type: fundType,

    ...(destination.type === "bank_transfer" && {
      bank_name: destination.bankName,
      branch_name: destination.branchName || "",
      routing_number: destination.routingNumber,
      account_name: destination.accountHolderName,
      account_number: destination.accountNumber,
    }),

    ...(destination.type === "mobile_banking" && {
      mobile_no: destination.mobileNumber,
    }),

    ipn_url: `${payoutConfig.payoutWebhookBaseUrl}/sslcommerz`,
    remarks: `Payout for task ${payout.taskId} — ${payout.payoutId}`,
  };

  try {
    const response = await axios.post(config.disbursementUrl, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });

    const data = response.data;
    const success = data?.status === "SUCCESS" || data?.result === "SUCCESS";
    const pspReference = data?.trnx_id || data?.bank_tran_id || null;

    return { success, pspReference, rawResponse: data };
  } catch (err) {
    const rawResponse = err.response?.data || { error: err.message };
    return { success: false, pspReference: null, rawResponse };
  }
};

const queryDisbursementStatus = async (payoutId) => {
  const config = payoutConfig.sslcommerz;
  try {
    const response = await axios.post(
      config.disbursementStatusUrl,
      {
        store_id: config.storeId,
        store_passwd: config.storePassword,
        trnx_id: payoutId,
      },
      { headers: { "Content-Type": "application/json" }, timeout: 10000 }
    );
    return { status: response.data?.status || "UNKNOWN", rawResponse: response.data };
  } catch (err) {
    return { status: "UNKNOWN", rawResponse: { error: err.message } };
  }
};

module.exports = { disburse, queryDisbursementStatus };
