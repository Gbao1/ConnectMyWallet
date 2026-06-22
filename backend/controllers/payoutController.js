const Payout = require("../models/Payout");
const User = require("../models/User");
const { payoutConfig, validatePayoutPspCredentials } = require("../config/payout");
const { validatePayoutDestination } = require("../utils/payoutHelper");
const payoutService = require("../services/payoutService");

// ── Provider endpoints ────────────────────────────────────────────────────────

/**
 * GET /api/payouts/wallet
 * Provider: view current wallet balance and pending amount
 */
const getWallet = async (req, res) => {
  try {
    await payoutService.reconcileEscrowPayoutsForProvider(req.user.id);
    await payoutService.reconcileCompletedTasksForProvider(req.user.id);
    await payoutService.releaseScheduledPayouts();
    await payoutService.syncProviderWallet(req.user.id);

    const user = await User.findById(req.user.id).select("walletBalance walletPending");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json({ walletBalance: user.walletBalance, walletPending: user.walletPending });
  } catch (err) {
    console.error("[getWallet]", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * GET /api/payouts/history
 * Provider: paginated payout history with optional status filter
 */
const getPayoutHistory = async (req, res) => {
  try {
    await payoutService.reconcileEscrowPayoutsForProvider(req.user.id);
    await payoutService.reconcileCompletedTasksForProvider(req.user.id);
    await payoutService.releaseScheduledPayouts();
    await payoutService.syncProviderWallet(req.user.id);

    const { page = 1, limit = 10, status } = req.query;
    const query = { providerId: req.user.id };
    const validStatuses = [
      "escrow", "scheduled", "available", "pending_approval",
      "approved", "processing", "paid", "failed", "rejected", "cancelled",
    ];
    if (status && validStatuses.includes(status)) query.status = status;

    const payouts = await Payout.find(query)
      .populate("taskId", "title category status")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Payout.countDocuments(query);

    res.json({
      payouts: payouts.map((p) => ({
        payoutId: p.payoutId,
        status: p.status,
        grossAmount: p.grossAmount,
        commissionAmount: p.commissionAmount,
        netAmount: p.netAmount,
        currency: p.currency,
        country: p.country,
        scheduledAt: p.scheduledAt,
        releasedAt: p.releasedAt,
        task: p.taskId,
        pspReference: p.pspReference,
        createdAt: p.createdAt,
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("[getPayoutHistory]", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * GET /api/payouts/destinations
 * Provider: list saved payout destinations
 */
const getPayoutDestinations = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("payoutDestinations");
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json({ destinations: user.payoutDestinations });
  } catch (err) {
    console.error("[getPayoutDestinations]", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * POST /api/payouts/destinations
 * Provider: save a new payout destination (bank or mobile banking)
 */
const savePayoutDestination = async (req, res) => {
  try {
    const { label, country, type, isDefault, ...rest } = req.body;
    if (!country || !type) return res.status(400).json({ msg: "country and type are required" });
    if (!payoutConfig.countries[country]) {
      return res.status(400).json({ msg: `Unsupported country: ${country}` });
    }

    const destination = { label, country, type, isDefault: isDefault || false, ...rest };
    const validation = validatePayoutDestination(destination, country);
    if (!validation.valid) return res.status(400).json({ msg: validation.error });

    await payoutService.syncProviderWallet(req.user.id);

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    if (isDefault) {
      user.payoutDestinations = user.payoutDestinations.map((d) => ({
        ...d.toObject(),
        isDefault: d.country === country ? false : d.isDefault,
      }));
    }

    user.payoutDestinations.push(destination);
    await user.save();

    res.status(201).json({ msg: "Payout destination saved", destinations: user.payoutDestinations });
  } catch (err) {
    console.error("[savePayoutDestination]", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * DELETE /api/payouts/destinations/:destinationId
 * Provider: remove a saved payout destination
 */
const deletePayoutDestination = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const before = user.payoutDestinations.length;
    user.payoutDestinations = user.payoutDestinations.filter(
      (d) => d._id.toString() !== req.params.destinationId
    );

    if (user.payoutDestinations.length === before) {
      return res.status(404).json({ msg: "Destination not found" });
    }

    await user.save();
    res.json({ msg: "Destination removed", destinations: user.payoutDestinations });
  } catch (err) {
    console.error("[deletePayoutDestination]", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * PATCH /api/payouts/destinations/:destinationId/default
 * Provider: mark an existing payout destination as default
 */
const setDefaultPayoutDestination = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const destination = user.payoutDestinations.find(
      (d) => d._id.toString() === req.params.destinationId
    );
    if (!destination) {
      return res.status(404).json({ msg: "Destination not found" });
    }

    user.payoutDestinations = user.payoutDestinations.map((d) => ({
      ...d.toObject(),
      isDefault: d.country === destination.country ? d._id.toString() === req.params.destinationId : d.isDefault,
    }));

    await user.save();
    res.json({ msg: "Default payout destination updated", destinations: user.payoutDestinations });
  } catch (err) {
    console.error("[setDefaultPayoutDestination]", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * POST /api/payouts/:payoutId/withdraw
 * Provider: request a withdrawal for an available payout
 * Body: { destinationId } OR { destination: { ...fields } }
 */
const requestWithdrawal = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { destinationId, destination: inlineDestination } = req.body;

    let destination;
    if (destinationId) {
      const user = await User.findById(req.user.id).select("payoutDestinations");
      destination = user?.payoutDestinations?.find((d) => d._id.toString() === destinationId);
      if (!destination) return res.status(400).json({ msg: "Saved destination not found" });
    } else if (inlineDestination) {
      const payout = await Payout.findOne({ payoutId });
      if (!payout) return res.status(404).json({ msg: "Payout not found" });
      const validation = validatePayoutDestination(inlineDestination, payout.country);
      if (!validation.valid) return res.status(400).json({ msg: validation.error });
      destination = inlineDestination;
    } else {
      return res.status(400).json({ msg: "Provide either destinationId or destination object" });
    }

    const { payout } = await payoutService.requestWithdrawal(req.user.id, payoutId, destination);
    res.json({
      msg: "Withdrawal request submitted",
      payout: {
        payoutId: payout.payoutId,
        status: payout.status,
        netAmount: payout.netAmount,
        currency: payout.currency,
      },
    });
  } catch (err) {
    console.error("[requestWithdrawal]", err);
    if (err.message.includes("Cannot withdraw") || err.message.includes("Insufficient")) {
      return res.status(400).json({ msg: err.message });
    }
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * POST /api/payouts/withdraw-all
 * Provider: request withdrawals for all available payouts
 * Body: { destinationId }
 */
const requestAllWithdrawals = async (req, res) => {
  try {
    const { destinationId } = req.body;
    if (!destinationId) {
      return res.status(400).json({ msg: "destinationId is required" });
    }

    const user = await User.findById(req.user.id).select("payoutDestinations");
    const destination = user?.payoutDestinations?.find((d) => d._id.toString() === destinationId);
    if (!destination) return res.status(400).json({ msg: "Saved destination not found" });

    const result = await payoutService.requestAllAvailableWithdrawals(req.user.id, destination);
    res.json({
      msg: "Withdrawal requests submitted",
      count: result.count,
      totalAmount: result.totalAmount,
      currency: result.currency,
      payouts: result.payouts.map((p) => ({
        payoutId: p.payoutId,
        status: p.status,
        netAmount: p.netAmount,
        currency: p.currency,
      })),
    });
  } catch (err) {
    console.error("[requestAllWithdrawals]", err);
    if (
      err.message.includes("No available payouts") ||
      err.message.includes("Insufficient")
    ) {
      return res.status(400).json({ msg: err.message });
    }
    res.status(500).json({ msg: "Server error" });
  }
};

// ── Admin endpoints ───────────────────────────────────────────────────────────

/**
 * GET /api/payouts/admin/pending
 * Admin: list all payouts awaiting approval, oldest first
 */
const listPendingPayouts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const payouts = await Payout.find({ status: "pending_approval" })
      .populate("providerId", "name email kyc")
      .populate("taskId", "title category budget")
      .sort({ withdrawalRequestedAt: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Payout.countDocuments({ status: "pending_approval" });
    res.json({
      payouts,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[listPendingPayouts]", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * GET /api/payouts/admin/all
 * Admin: all payouts with optional status/providerId filter
 */
const listAllPayouts = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, providerId } = req.query;
    const query = {};
    if (status) query.status = status;
    if (providerId) query.providerId = providerId;

    const payouts = await Payout.find(query)
      .populate("providerId", "name email")
      .populate("taskId", "title")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Payout.countDocuments(query);
    res.json({
      payouts,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[listAllPayouts]", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * GET /api/payouts/admin/:payoutId
 * Admin: full payout detail with populated references
 */
const getPayoutDetails = async (req, res) => {
  try {
    const payout = await Payout.findOne({ payoutId: req.params.payoutId })
      .populate("providerId", "name email kyc")
      .populate("taskId", "title status budget category")
      .populate("sourceTransactionId", "transactionId amount status")
      .populate("approvedBy", "name email")
      .populate("rejectedBy", "name email");

    if (!payout) return res.status(404).json({ msg: "Payout not found" });
    res.json(payout);
  } catch (err) {
    console.error("[getPayoutDetails]", err);
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * POST /api/payouts/admin/:payoutId/approve
 * Admin: approve a pending withdrawal and trigger PSP disbursement
 */
const approvePayout = async (req, res) => {
  try {
    const { payoutId } = req.params;

    const payout = await Payout.findOne({ payoutId });
    if (!payout) return res.status(404).json({ msg: "Payout not found" });

    const credCheck = validatePayoutPspCredentials(payout.psp);
    if (!credCheck.valid) {
      return res.status(503).json({ msg: "Payout service temporarily unavailable", error: credCheck.error });
    }

    const { payout: updatedPayout, disbursementResult } = await payoutService.approveAndDisburse(
      payoutId,
      req.user.id
    );

    res.json({
      msg: updatedPayout.status === "paid" ? "Payout approved and paid" : "Payout approved but disbursement failed",
      payout: {
        payoutId: updatedPayout.payoutId,
        status: updatedPayout.status,
        pspReference: updatedPayout.pspReference,
      },
      disbursementResult,
    });
  } catch (err) {
    console.error("[approvePayout]", err);
    if (err.message.includes("Cannot approve")) return res.status(400).json({ msg: err.message });
    res.status(500).json({ msg: "Server error" });
  }
};

/**
 * POST /api/payouts/admin/:payoutId/reject
 * Admin: reject a pending withdrawal request
 * Body: { reason }
 */
const rejectPayout = async (req, res) => {
  try {
    const { payoutId } = req.params;
    const reason =
      (typeof req.body?.reason === "string" && req.body.reason.trim()) ||
      "Rejected by admin";

    const payout = await payoutService.rejectWithdrawal(payoutId, req.user.id, reason);
    res.json({
      msg: "Payout rejected",
      payout: {
        payoutId: payout.payoutId,
        status: payout.status,
        rejectionReason: payout.rejectionReason,
      },
    });
  } catch (err) {
    console.error("[rejectPayout]", err);
    if (err.message.includes("Cannot reject")) return res.status(400).json({ msg: err.message });
    res.status(500).json({ msg: "Server error" });
  }
};

// ── Webhook ───────────────────────────────────────────────────────────────────

/**
 * POST /api/payouts/webhook/:psp
 * Public — SSLCommerz calls this after disbursement completes
 */
const handlePayoutWebhook = async (req, res) => {
  try {
    const { psp } = req.params;
    if (!["sslcommerz"].includes(psp)) {
      return res.status(400).json({ msg: `Unknown payout PSP: ${psp}` });
    }

    console.log(`[PayoutWebhook] Received from ${psp}:`, req.body);
    const payout = await payoutService.handleDisbursementWebhook(psp, req.body);
    console.log(`[PayoutWebhook] Payout ${payout.payoutId} updated to: ${payout.status}`);

    return res.status(200).send("OK");
  } catch (err) {
    console.error("[handlePayoutWebhook]", err.message);
    return res.status(200).send("OK"); // Always 200 to prevent PSP retries
  }
};

module.exports = {
  getWallet,
  getPayoutHistory,
  getPayoutDestinations,
  savePayoutDestination,
  deletePayoutDestination,
  setDefaultPayoutDestination,
  requestWithdrawal,
  requestAllWithdrawals,
  listPendingPayouts,
  listAllPayouts,
  getPayoutDetails,
  approvePayout,
  rejectPayout,
  handlePayoutWebhook,
};
