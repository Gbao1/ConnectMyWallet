// Subscription Payment Controller - Handles subscription plan payments

const User = require("../models/User");
const Transaction = require("../models/Transaction");
const { generateTransactionId } = require("../utils/paymentHelper");
const sslcommerzService = require("../services/sslcommerzService");
const payfastService = require("../services/payfastService");
const { paymentConfig } = require("../config/payment");

/**
 * Initiate a subscription payment
 * POST /api/payments/subscription/initiate
 */
const initiateSubscriptionPayment = async (req, res) => {
  try {
    const { plan, amount, currency } = req.body;

    // Validate required fields
    if (!plan) {
      return res.status(400).json({ msg: "Plan is required" });
    }
    if (!amount) {
      return res.status(400).json({ msg: "Amount is required" });
    }
    if (!currency) {
      return res.status(400).json({ msg: "Currency is required" });
    }

    // Validate plan
    const validPlans = ["basic", "pro", "business"];
    if (!validPlans.includes(plan)) {
      return res.status(400).json({ msg: `Invalid plan: ${plan}` });
    }

    // Validate amount is positive
    if (Number(amount) <= 0) {
      return res.status(400).json({ msg: "Amount must be greater than 0" });
    }

    // Validate currency
    if (!["BDT", "PKR"].includes(currency)) {
      return res.status(400).json({ msg: "Unsupported currency" });
    }

    // Determine PSP based on currency
    const psp = currency === "BDT" ? "sslcommerz" : "payfast";

    // Validate PSP is supported
    if (!paymentConfig.supportedPsps.includes(psp)) {
      return res.status(503).json({
        msg: "Payment service not available for this currency",
      });
    }

    // Generate unique transaction ID
    const transactionId = generateTransactionId();

    // Create transaction record for subscription
    const transaction = new Transaction({
      transactionId,
      userId: req.user.id,
      psp,
      amount,
      currency,
      status: "pending",
      metadata: {
        type: "subscription",
        plan,
        userEmail: req.user.email,
        initiatedAt: new Date(),
      },
    });

    await transaction.save();

    // PSP-specific payment initiation
    if (psp === "sslcommerz") {
      const user = await User.findById(req.user.id);
      // Create a subscription-like object for the payment service
      const subscriptionPayload = {
        title: `${plan.toUpperCase()} Plan Subscription`,
        category: "Subscription",
      };
      const { gatewayUrl } = await sslcommerzService.initiateSSLPayment(
        transaction,
        user,
        subscriptionPayload
      );
      transaction.status = "processing";
      await transaction.save();
      return res.status(201).json({
        msg: "Subscription payment initiated",
        transactionId: transaction.transactionId,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        psp: transaction.psp,
        paymentUrl: gatewayUrl,
        formFields: null,
      });
    }

    if (psp === "payfast") {
      const user = await User.findById(req.user.id);
      // Create a subscription-like object for the payment service
      const subscriptionPayload = {
        title: `${plan.toUpperCase()} Plan Subscription`,
        category: "Subscription",
      };
      const { paymentUrl, formFields } = payfastService.buildPaymentFormData(
        transaction,
        user,
        subscriptionPayload
      );

      return res.status(201).json({
        msg: "Subscription payment initiated",
        transactionId: transaction.transactionId,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        psp: transaction.psp,
        paymentUrl,
        formFields,
      });
    }

    res.status(201).json({
      msg: "Subscription payment initiated",
      transactionId: transaction.transactionId,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      psp: transaction.psp,
      paymentUrl: null,
      formFields: null,
    });
  } catch (error) {
    console.error("[initiateSubscriptionPayment] Error:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports = {
  initiateSubscriptionPayment,
};
