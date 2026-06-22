const mongoose = require("mongoose");
const Payout = require("../models/Payout");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Task = require("../models/Task");
const { payoutConfig } = require("../config/payout");
const {
  generatePayoutId,
  calculateCommission,
  addBusinessDays,
  mapPayoutPspStatus,
  getPspForCountry,
  getCurrencyForCountry,
} = require("../utils/payoutHelper");
const { getAdapter } = require("./adapters");
const {
  sendPayoutEscrowEmail,
  sendPayoutAvailableEmail,
  sendPayoutRequestedEmail,
  sendPayoutRejectedEmail,
  sendPayoutPaidEmail,
  sendPayoutFailedEmail,
} = require("../utils/mail");

/**
 * Step 1: Create a payout in escrow after customer payment succeeds.
 * Called from paymentController.handleWebhook when SSLCommerz confirms success.
 */
const createEscrowPayout = async ({
  transactionObjectId,
  taskId,
  providerId,
  grossAmount,
  country,
}) => {
  // Idempotency: one payout per task
  const existing = await Payout.findOne({ taskId, status: { $ne: "cancelled" } });
  if (existing) {
    console.log(`[payoutService] Payout already exists for task ${taskId}: ${existing.payoutId}`);
    return existing;
  }

  const currency = getCurrencyForCountry(country);
  const psp = getPspForCountry(country);
  const { commissionRate, commissionAmount, netAmount } = calculateCommission(grossAmount);
  const settlementCycle = payoutConfig.settlementCycles[country] || 1;

  const payout = new Payout({
    payoutId: generatePayoutId(),
    providerId,
    sourceTransactionId: transactionObjectId,
    taskId,
    grossAmount,
    commissionRate,
    commissionAmount,
    netAmount,
    currency,
    country,
    settlementCycle,
    psp,
    status: "escrow",
    metadata: { createdReason: "customer_payment_success" },
  });

  await payout.save();

  console.log(`[payoutService] Escrow payout created: ${payout.payoutId} (${netAmount} ${currency})`);

  const provider = await User.findById(providerId).select("email name");
  if (provider?.email) {
    sendPayoutEscrowEmail(provider.email, provider.name, { netAmount, currency, taskId }).catch(() => {});
  }

  return payout;
};

/**
 * Repair path for successful payments that do not yet have a payout.
 * This keeps provider history consistent if a PSP redirect/webhook was missed.
 */
const reconcileEscrowPayoutsForProvider = async (providerId) => {
  const tasks = await Task.find({ assignedProvider: providerId }).select("_id");
  const taskIds = tasks.map((task) => task._id);
  if (!taskIds.length) return 0;

  const successfulTransactions = await Transaction.find({
    taskId: { $in: taskIds },
    status: "success",
  }).sort({ updatedAt: -1 });

  let created = 0;
  for (const transaction of successfulTransactions) {
    const existing = await Payout.findOne({
      taskId: transaction.taskId,
      status: { $ne: "cancelled" },
    });
    if (existing) continue;

    await createEscrowPayout({
      transactionObjectId: transaction._id,
      taskId: transaction.taskId,
      providerId,
      grossAmount: transaction.amount,
      country: "BD",
    });
    created++;
  }

  return created;
};

const ensureSuccessTransactionForTask = async (task) => {
  let transaction = await Transaction.findOne({ taskId: task._id, status: "success" }).sort({
    updatedAt: -1,
  });
  if (transaction) return transaction;

  if (!task?.budget || !task?.user) return null;

  transaction = await Transaction.create({
    transactionId: `TXN_task_${task._id}_${Date.now()}`,
    taskId: task._id,
    userId: task.user,
    psp: "sslcommerz",
    pspOrderId: `local-${task._id}`,
    amount: task.budget,
    currency: "BDT",
    status: "success",
    metadata: { createdReason: "completed_task_reconcile" },
  });

  console.log(
    `[payoutService] Created local success transaction ${transaction.transactionId} for task ${task._id} (budget ${task.budget})`
  );
  return transaction;
};

/**
 * Step 2: Schedule payout after task is marked Completed.
 * Called from taskController.completeTask.
 */
const schedulePayoutForTask = async (taskId) => {
  let payout = await Payout.findOne({ taskId, status: { $ne: "cancelled" } });

  if (!payout) {
    const task = await Task.findById(taskId).select("assignedProvider budget user status");
    const transaction =
      (await Transaction.findOne({ taskId, status: "success" }).sort({ updatedAt: -1 })) ||
      (task ? await ensureSuccessTransactionForTask(task) : null);

    if (task?.assignedProvider && transaction) {
      payout = await createEscrowPayout({
        transactionObjectId: transaction._id,
        taskId: transaction.taskId,
        providerId: task.assignedProvider,
        grossAmount: transaction.amount,
        country: "BD",
      });
    } else {
      console.warn(`[payoutService] No escrow payout found for task ${taskId}`);
      return null;
    }
  }

  if (payout.status !== "escrow") {
    if (["scheduled", "available", "pending_approval", "paid"].includes(payout.status)) {
      return payout;
    }
    console.warn(`[payoutService] Payout ${payout.payoutId} is not in escrow state (${payout.status})`);
    return null;
  }

  const instantRelease =
    process.env.PAYOUT_INSTANT_RELEASE === "true" || process.env.NODE_ENV !== "production";
  const scheduledAt = instantRelease ? new Date() : addBusinessDays(new Date(), payout.settlementCycle);
  payout.status = "scheduled";
  payout.scheduledAt = scheduledAt;
  await payout.save();
  await User.findByIdAndUpdate(payout.providerId, { $inc: { walletPending: payout.netAmount } });

  console.log(`[payoutService] Payout ${payout.payoutId} scheduled for ${scheduledAt.toISOString()}`);

  if (instantRelease) {
    await releaseScheduledPayouts();
  }

  return payout;
};

/**
 * Backfill payouts for completed jobs (e.g. payment redirect skipped in local dev).
 */
const reconcileCompletedTasksForProvider = async (providerId) => {
  const tasks = await Task.find({ assignedProvider: providerId, status: "Completed" }).select(
    "_id"
  );
  let count = 0;
  for (const task of tasks) {
    const payout = await Payout.findOne({ taskId: task._id, status: { $ne: "cancelled" } });
    if (!payout || payout.status === "escrow") {
      const scheduled = await schedulePayoutForTask(task._id.toString());
      if (scheduled) count += 1;
    }
  }
  return count;
};

/**
 * Recompute walletBalance / walletPending from payout rows (source of truth).
 * Fixes drift from duplicate releases or partial failures.
 */
const syncProviderWallet = async (providerId) => {
  const providerObjectId =
    typeof providerId === "string" && mongoose.Types.ObjectId.isValid(providerId)
      ? new mongoose.Types.ObjectId(providerId)
      : providerId;

  const [scheduledAgg, availableAgg] = await Promise.all([
    Payout.aggregate([
      { $match: { providerId: providerObjectId, status: "scheduled" } },
      { $group: { _id: null, total: { $sum: "$netAmount" } } },
    ]),
    Payout.aggregate([
      { $match: { providerId: providerObjectId, status: "available" } },
      { $group: { _id: null, total: { $sum: "$netAmount" } } },
    ]),
  ]);

  const walletPending = scheduledAgg[0]?.total || 0;
  const walletBalance = availableAgg[0]?.total || 0;

  await User.findByIdAndUpdate(providerId, { walletBalance, walletPending });
  return { walletBalance, walletPending };
};

/**
 * Step 3: Release scheduled payouts whose scheduledAt has passed.
 * Called by the hourly cron job.
 */
const releaseScheduledPayouts = async () => {
  const now = new Date();
  let released = 0;
  const touchedProviders = new Set();

  while (true) {
    const payout = await Payout.findOneAndUpdate(
      { status: "scheduled", scheduledAt: { $lte: now } },
      { $set: { status: "available", releasedAt: now } },
      { new: true, sort: { scheduledAt: 1 } }
    );
    if (!payout) break;

    await User.findByIdAndUpdate(payout.providerId, {
      $inc: { walletBalance: payout.netAmount, walletPending: -payout.netAmount },
    });
    touchedProviders.add(payout.providerId.toString());
    released++;

    const provider = await User.findById(payout.providerId).select("email name");
    if (provider?.email) {
      sendPayoutAvailableEmail(provider.email, provider.name, {
        netAmount: payout.netAmount,
        currency: payout.currency,
      }).catch(() => {});
    }

    console.log(`[payoutService] Released payout ${payout.payoutId} → ${payout.netAmount} ${payout.currency}`);
  }

  for (const providerId of touchedProviders) {
    await syncProviderWallet(providerId);
  }

  return released;
};

/**
 * Step 4: Provider requests a withdrawal.
 * Validates balance, snapshots destination, reserves funds.
 */
const requestWithdrawal = async (providerId, payoutId, destination) => {
  const payout = await Payout.findOne({ payoutId, providerId });
  if (!payout) throw new Error("Payout not found");
  if (payout.status !== "available") {
    throw new Error(`Cannot withdraw: payout is in '${payout.status}' state`);
  }

  const provider = await User.findById(providerId);
  if (!provider) throw new Error("Provider not found");
  if (provider.walletBalance < payout.netAmount) throw new Error("Insufficient wallet balance");

  provider.walletBalance -= payout.netAmount;
  await provider.save();

  payout.status = "pending_approval";
  payout.payoutDestination = destination;
  payout.withdrawalRequestedAt = new Date();
  await payout.save();

  sendPayoutRequestedEmail(provider.email, provider.name, {
    payoutId,
    netAmount: payout.netAmount,
    currency: payout.currency,
  }).catch(() => {});

  return { payout };
};

/**
 * Provider requests withdrawals for every available payout.
 * Uses one destination for all available payouts.
 */
const requestAllAvailableWithdrawals = async (providerId, destination) => {
  const payouts = await Payout.find({ providerId, status: "available" }).sort({ createdAt: 1 });
  if (!payouts.length) throw new Error("No available payouts to withdraw");

  const totalAmount = payouts.reduce((sum, payout) => sum + payout.netAmount, 0);
  const provider = await User.findById(providerId);
  if (!provider) throw new Error("Provider not found");
  if (provider.walletBalance < totalAmount) throw new Error("Insufficient wallet balance");

  provider.walletBalance -= totalAmount;
  await provider.save();

  const requestedAt = new Date();
  for (const payout of payouts) {
    payout.status = "pending_approval";
    payout.payoutDestination = destination;
    payout.withdrawalRequestedAt = requestedAt;
    await payout.save();

    sendPayoutRequestedEmail(provider.email, provider.name, {
      payoutId: payout.payoutId,
      netAmount: payout.netAmount,
      currency: payout.currency,
    }).catch(() => {});
  }

  return {
    payouts,
    count: payouts.length,
    totalAmount,
    currency: payouts[0].currency,
  };
};

/**
 * Step 5a: Admin approves withdrawal and triggers PSP disbursement.
 */
const approveAndDisburse = async (payoutId, adminId) => {
  const payout = await Payout.findOne({ payoutId });
  if (!payout) throw new Error("Payout not found");
  if (payout.status !== "pending_approval") {
    throw new Error(`Cannot approve: payout status is '${payout.status}'`);
  }

  payout.status = "approved";
  payout.approvedBy = adminId;
  payout.approvedAt = new Date();
  await payout.save();

  payout.status = "processing";
  await payout.save();

  const adapter = getAdapter(payout.country);
  const disbursementResult = await adapter.disburse(payout, payout.payoutDestination);

  if (disbursementResult.success) {
    payout.status = "paid";
    payout.pspReference = disbursementResult.pspReference;
    payout.pspRawResponse = disbursementResult.rawResponse;
  } else {
    payout.status = "failed";
    payout.errorDetails = {
      code: "PSP_DISBURSE_FAILED",
      message: JSON.stringify(disbursementResult.rawResponse),
      retryCount: (payout.errorDetails?.retryCount || 0) + 1,
      lastAttemptAt: new Date(),
    };
    // Refund reserved funds back to wallet on failure
    await User.findByIdAndUpdate(payout.providerId, { $inc: { walletBalance: payout.netAmount } });
  }

  await payout.save();

  const provider = await User.findById(payout.providerId).select("email name");
  if (provider?.email) {
    if (payout.status === "paid") {
      sendPayoutPaidEmail(provider.email, provider.name, {
        payoutId,
        netAmount: payout.netAmount,
        currency: payout.currency,
        pspReference: payout.pspReference,
      }).catch(() => {});
    } else {
      sendPayoutFailedEmail(provider.email, provider.name, {
        payoutId,
        netAmount: payout.netAmount,
        currency: payout.currency,
      }).catch(() => {});
    }
  }

  return { payout, disbursementResult };
};

/**
 * Step 5b: Admin rejects withdrawal request.
 */
const rejectWithdrawal = async (payoutId, adminId, reason) => {
  const payout = await Payout.findOne({ payoutId });
  if (!payout) throw new Error("Payout not found");
  if (payout.status !== "pending_approval") {
    throw new Error(`Cannot reject: payout status is '${payout.status}'`);
  }

  // Return reserved funds to wallet
  await User.findByIdAndUpdate(payout.providerId, { $inc: { walletBalance: payout.netAmount } });

  payout.status = "rejected";
  payout.rejectedBy = adminId;
  payout.rejectedAt = new Date();
  payout.rejectionReason = reason;
  await payout.save();

  const provider = await User.findById(payout.providerId).select("email name");
  if (provider?.email) {
    sendPayoutRejectedEmail(provider.email, provider.name, {
      payoutId,
      reason,
      netAmount: payout.netAmount,
      currency: payout.currency,
    }).catch(() => {});
  }

  return payout;
};

/**
 * Handle incoming disbursement webhook from PSP.
 * Called from payoutController.handlePayoutWebhook.
 */
const handleDisbursementWebhook = async (psp, payload) => {
  const payoutId = payload?.trnx_id || payload?.reference;
  if (!payoutId) throw new Error("Missing payout reference in webhook payload");

  const payout = await Payout.findOne({ payoutId });
  if (!payout) throw new Error(`Payout not found for reference: ${payoutId}`);

  const terminalStatuses = ["paid", "failed", "cancelled", "rejected"];
  if (terminalStatuses.includes(payout.status)) {
    return payout;
  }

  const internalStatus = mapPayoutPspStatus(payload?.status || payload?.result, psp);
  payout.status = internalStatus;
  payout.pspReference = payload?.bank_tran_id || payload?.trnx_id || null;
  payout.pspRawResponse = payload;
  payout.webhookReceivedAt = new Date();

  if (internalStatus === "failed") {
    payout.errorDetails = {
      code: "PSP_CALLBACK_FAILED",
      message: payload?.reason || "PSP reported failure",
      retryCount: (payout.errorDetails?.retryCount || 0) + 1,
      lastAttemptAt: new Date(),
    };
    await User.findByIdAndUpdate(payout.providerId, { $inc: { walletBalance: payout.netAmount } });
  }

  await payout.save();
  return payout;
};

module.exports = {
  createEscrowPayout,
  reconcileEscrowPayoutsForProvider,
  reconcileCompletedTasksForProvider,
  schedulePayoutForTask,
  syncProviderWallet,
  releaseScheduledPayouts,
  requestWithdrawal,
  requestAllAvailableWithdrawals,
  approveAndDisburse,
  rejectWithdrawal,
  handleDisbursementWebhook,
};
