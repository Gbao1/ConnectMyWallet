// Payment Controller - Business logic for payment operations

const Transaction = require("../models/Transaction");
const Task = require("../models/Task");
const User = require("../models/User");
const { paymentConfig, validatePspCredentials } = require("../config/payment");
const payfastService = require("../services/payfastService");
const sslcommerzService = require("../services/sslcommerzService");
const {
  generateTransactionId,
  validateCurrencyForPsp,
  getCurrencyForPsp,
  isSupportedPsp,
  validateAmount,
  mapPspStatus,
} = require("../utils/paymentHelper");
const payoutService = require("../services/payoutService");

const createEscrowPayoutForTransaction = async (transaction, logPrefix) => {
  try {
    const task = await Task.findById(transaction.taskId).select("assignedProvider");
    if (task?.assignedProvider) {
      await payoutService.createEscrowPayout({
        transactionObjectId: transaction._id,
        taskId: transaction.taskId,
        providerId: task.assignedProvider,
        grossAmount: transaction.amount,
        country: "BD",
      });
    }
  } catch (payoutErr) {
    console.error(`${logPrefix} Payout escrow creation failed:`, payoutErr.message);
  }
};

/**
 * Initiate a new payment
 * Creates a transaction record and prepares for PSP integration
 *
 * POST /api/payments/:psp/initiate
 */
const initiatePayment = async (req, res) => {
  try {
    const { psp } = req.params;
    const { taskId, amount, currency } = req.body;

    // Validate PSP is supported
    if (!isSupportedPsp(psp)) {
      return res.status(400).json({
        msg: `Unsupported payment provider: ${psp}`,
        supportedPsps: paymentConfig.supportedPsps,
      });
    }

    // Validate PSP credentials are configured
    const credentialCheck = validatePspCredentials(psp);
    if (!credentialCheck.valid) {
      return res.status(503).json({
        msg: "Payment service temporarily unavailable",
        error: credentialCheck.error,
      });
    }

    // Validate required fields
    if (!taskId) {
      return res.status(400).json({ msg: "Task ID is required" });
    }
    if (!amount) {
      return res.status(400).json({ msg: "Amount is required" });
    }
    if (!currency) {
      return res.status(400).json({ msg: "Currency is required" });
    }

    // Validate amount
    const amountValidation = validateAmount(amount);
    if (!amountValidation.valid) {
      return res.status(400).json({ msg: amountValidation.error });
    }

    // Validate currency matches PSP
    if (!validateCurrencyForPsp(currency, psp)) {
      const expectedCurrency = getCurrencyForPsp(psp);
      return res.status(400).json({
        msg: `Invalid currency for ${psp}. Expected: ${expectedCurrency}, Got: ${currency}`,
      });
    }

    // Validate task exists
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }

    // Check if there's already a pending/processing transaction for this task
    const existingTransaction = await Transaction.findOne({
      taskId,
      userId: req.user.id,
      status: { $in: ["pending", "processing"] },
    });

    if (existingTransaction) {
      return res.status(400).json({
        msg: "A payment is already in progress for this task",
        transactionId: existingTransaction.transactionId,
      });
    }

    // Generate unique transaction ID
    const transactionId = generateTransactionId();

    // Create transaction record
    const transaction = new Transaction({
      transactionId,
      taskId,
      userId: req.user.id,
      psp,
      amount,
      currency,
      status: "pending",
      metadata: {
        taskTitle: task.title,
        userEmail: req.user.email,
        initiatedAt: new Date(),
      },
    });

    await transaction.save();

    // PSP-specific payment initiation
    if (psp === "sslcommerz") {
      const user = await User.findById(req.user.id);
      const { gatewayUrl } = await sslcommerzService.initiateSSLPayment(transaction, user, task);
      transaction.status = "processing";
      await transaction.save();
      return res.status(201).json({
        msg: "Payment initiated",
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
      const { paymentUrl, formFields } = payfastService.buildPaymentFormData(transaction, user, task);

      return res.status(201).json({
        msg: "Payment initiated",
        transactionId: transaction.transactionId,
        status: transaction.status,
        amount: transaction.amount,
        currency: transaction.currency,
        psp: transaction.psp,
        paymentUrl,
        formFields,
      });
    }

    // Default Phase 0 response for other PSPs
    res.status(201).json({
      msg: "Payment initiated",
      transactionId: transaction.transactionId,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      psp: transaction.psp,
      paymentUrl: null,
      formFields: null,
    });
  } catch (error) {
    console.error("[initiatePayment] Error:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * Verify payment status
 * Checks the current status of a transaction
 *
 * GET /api/payments/verify/:transactionId
 */
const verifyPayment = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findOne({ transactionId })
      .populate("taskId", "title status")
      .populate("userId", "name email");

    if (!transaction) {
      return res.status(404).json({ msg: "Transaction not found" });
    }

    // Verify the user owns this transaction
    if (transaction.userId._id.toString() !== req.user.id) {
      return res.status(403).json({ msg: "Not authorized to view this transaction" });
    }

    res.json({
      transactionId: transaction.transactionId,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      psp: transaction.psp,
      pspOrderId: transaction.pspOrderId,
      paymentMethod: transaction.paymentMethod,
      task: transaction.taskId,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
      errorDetails: transaction.status === "failed" ? transaction.errorDetails : undefined,
    });
  } catch (error) {
    console.error("[verifyPayment] Error:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * Get payment history for the authenticated user
 *
 * GET /api/payments/history
 */
const getPaymentHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { userId: req.user.id };
    if (status && ["pending", "processing", "success", "failed", "refunded", "cancelled"].includes(status)) {
      query.status = status;
    }

    const transactions = await Transaction.find(query)
      .populate("taskId", "title status category")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Transaction.countDocuments(query);

    res.json({
      transactions: transactions.map((t) => ({
        transactionId: t.transactionId,
        status: t.status,
        amount: t.amount,
        currency: t.currency,
        psp: t.psp,
        paymentMethod: t.paymentMethod,
        task: t.taskId,
        createdAt: t.createdAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[getPaymentHistory] Error:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * Handle webhook from PSP
 * Base structure for processing payment callbacks
 *
 * POST /api/payments/webhook/:psp
 */
const handleWebhook = async (req, res) => {
  try {
    const { psp } = req.params;

    // Validate PSP
    if (!isSupportedPsp(psp)) {
      return res.status(400).json({ msg: `Unknown PSP: ${psp}` });
    }

    // Log webhook receipt for debugging
    console.log(`[Webhook] Received from ${psp}:`, {
      headers: req.headers,
      body: req.body,
    });

    if (psp === "sslcommerz") {
      const postData = req.body;
      const { tran_id, val_id, status: sslStatus } = postData;

      if (!tran_id) {
        console.error("[Webhook SSLCommerz] Missing tran_id");
        return res.status(200).send("OK");
      }

      const transaction = await Transaction.findOne({ transactionId: tran_id });
      if (!transaction) {
        console.error(`[Webhook SSLCommerz] Transaction not found: ${tran_id}`);
        return res.status(200).send("OK");
      }

      // Idempotency: skip if already in terminal state
      const terminalStatuses = ["success", "failed", "cancelled", "refunded"];
      if (terminalStatuses.includes(transaction.status)) {
        console.log(`[Webhook SSLCommerz] Already terminal: ${transaction.status}`);
        if (transaction.status === "success") {
          await createEscrowPayoutForTransaction(transaction, "[Webhook SSLCommerz]");
        }
        return res.status(200).send("OK");
      }

      const config = paymentConfig.sslcommerz;

      // SANDBOX: skip IPN hash validation — sandbox doesn't send a real signature
      if (!config.isSandbox) {
        const ipnResult = sslcommerzService.validateIPN(postData, config.storePassword);
        if (!ipnResult.valid) {
          console.error(`[Webhook SSLCommerz] IPN validation failed: ${ipnResult.error}`);
          transaction.status = "failed";
          transaction.errorDetails = {
            code: "IPN_VALIDATION_FAILED",
            message: ipnResult.error,
          };
          await transaction.save();
          return res.status(200).send("OK");
        }
      }

      // Double-confirm with Validation API
      let finalStatus = mapPspStatus(sslStatus, "sslcommerz");
      if (val_id && (sslStatus === "VALID" || sslStatus === "VALIDATED")) {
        try {
          const validation = await sslcommerzService.validateTransaction(val_id);
          finalStatus = mapPspStatus(validation.status, "sslcommerz");
        } catch (valErr) {
          console.error("[Webhook SSLCommerz] Validation API error:", valErr.message);
        }
      }

      transaction.status = finalStatus;
      transaction.pspOrderId = postData.bank_tran_id || null;
      transaction.paymentMethod = postData.card_type ? "card" : "other";
      transaction.webhookReceivedAt = new Date();
      transaction.pspResponse = postData;
      await transaction.save();

      console.log(`[Webhook SSLCommerz] Transaction ${tran_id} updated to: ${finalStatus}`);

      if (finalStatus === "success") {
        await createEscrowPayoutForTransaction(transaction, "[Webhook SSLCommerz]");
      }

      return res.status(200).send("OK");
    }

    if (psp === "payfast") {
      const postData = req.body;

      // Validate m_payment_id exists
      if (!postData.m_payment_id) {
        console.error("[Webhook PayFast] Missing m_payment_id");
        return res.status(200).send("OK");
      }

      // IP verification in production only
      const config = paymentConfig.payfast;
      if (!config.isSandbox) {
        const clientIp = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
        if (!payfastService.isPayfastIP(clientIp)) {
          console.error(`[Webhook PayFast] Untrusted IP: ${clientIp}`);
          return res.status(200).send("OK");
        }
      }

      // Find transaction
      const transaction = await Transaction.findOne({ transactionId: postData.m_payment_id });
      if (!transaction) {
        console.error(`[Webhook PayFast] Transaction not found: ${postData.m_payment_id}`);
        return res.status(200).send("OK");
      }

      // Idempotency guard: skip if already in terminal state
      const terminalStatuses = ["success", "failed", "cancelled", "refunded"];
      if (terminalStatuses.includes(transaction.status)) {
        console.log(`[Webhook PayFast] Transaction ${transaction.transactionId} already in terminal state: ${transaction.status}`);
        return res.status(200).send("OK");
      }

      // Verify ITN
      const verification = await payfastService.verifyITN(postData, config, transaction);

      if (!verification.valid) {
        console.error(`[Webhook PayFast] Verification failed: ${verification.error}`);
        transaction.status = "failed";
        transaction.errorDetails = {
          code: "ITN_VERIFICATION_FAILED",
          message: verification.error,
          rawResponse: postData,
        };
        await transaction.save();
        return res.status(200).send("OK");
      }

      // Map PayFast status to internal status and update
      const internalStatus = mapPspStatus(verification.paymentStatus, "payfast");
      transaction.status = internalStatus;
      transaction.pspOrderId = postData.pf_payment_id || null;
      transaction.metadata = {
        ...transaction.metadata,
        payfastPaymentStatus: verification.paymentStatus,
        processedAt: new Date(),
      };
      await transaction.save();

      console.log(`[Webhook PayFast] Transaction ${transaction.transactionId} updated to: ${internalStatus}`);
      return res.status(200).send("OK");
    }

    // Default: acknowledge receipt for other PSPs
    res.status(200).json({
      msg: "Webhook received",
    });
  } catch (error) {
    console.error("[handleWebhook] Error:", error);
    // Always return 200 for webhooks to prevent retries
    res.status(200).json({ msg: "Webhook processing error" });
  }
};

/**
 * Get transaction by ID (admin or transaction owner)
 *
 * GET /api/payments/transaction/:transactionId
 */
const getTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await Transaction.findOne({ transactionId })
      .populate("taskId", "title status category budget")
      .populate("userId", "name email");

    if (!transaction) {
      return res.status(404).json({ msg: "Transaction not found" });
    }

    // Check authorization (owner or admin)
    if (transaction.userId._id.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ msg: "Not authorized to view this transaction" });
    }

    res.json(transaction);
  } catch (error) {
    console.error("[getTransaction] Error:", error);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * Shared handler for SSLCommerz browser redirect callbacks
 * SSLCommerz redirects the user's browser here after payment
 *
 * @param {Request} req
 * @param {Response} res
 * @param {"success"|"failed"|"cancelled"} outcomeStatus
 */
const handleSSLRedirect = async (req, res, outcomeStatus) => {
  try {
    const { tran_id, val_id } = req.body;

    if (tran_id) {
      const terminalStatuses = ["success", "failed", "cancelled", "refunded"];
      const transaction = await Transaction.findOne({ transactionId: tran_id });

      if (transaction && terminalStatuses.includes(transaction.status)) {
        if (transaction.status === "success") {
          await createEscrowPayoutForTransaction(transaction, "[SSL Redirect]");
        }
      } else if (transaction) {
        let finalStatus = outcomeStatus;

        // Validate with SSLCommerz API for success/fail cases where val_id is present
        if (val_id && outcomeStatus !== "cancelled") {
          try {
            const validation = await sslcommerzService.validateTransaction(val_id);
            finalStatus = mapPspStatus(validation.status, "sslcommerz");
          } catch (err) {
            console.error("[SSL Redirect] Validation API error:", err.message);
          }
        }

        transaction.status = finalStatus;
        transaction.pspResponse = { ...transaction.pspResponse, redirectCallback: req.body };
        await transaction.save();
        console.log(`[SSL Redirect] Transaction ${tran_id} → ${finalStatus}`);

        if (finalStatus === "success") {
          await createEscrowPayoutForTransaction(transaction, "[SSL Redirect]");
        }
      }
    }

    // Redirect browser to frontend
    const redirectMap = {
      success: paymentConfig.redirectUrls.success,
      failed: paymentConfig.redirectUrls.failure,
      cancelled: paymentConfig.redirectUrls.cancel,
    };
    return res.redirect(redirectMap[outcomeStatus] || paymentConfig.redirectUrls.failure);
  } catch (error) {
    console.error("[handleSSLRedirect] Error:", error);
    return res.redirect(paymentConfig.redirectUrls.failure);
  }
};

const handleSSLSuccess = (req, res) => handleSSLRedirect(req, res, "success");
const handleSSLFail = (req, res) => handleSSLRedirect(req, res, "failed");
const handleSSLCancel = (req, res) => handleSSLRedirect(req, res, "cancelled");

module.exports = {
  initiatePayment,
  verifyPayment,
  getPaymentHistory,
  handleWebhook,
  getTransaction,
  handleSSLSuccess,
  handleSSLFail,
  handleSSLCancel,
};
