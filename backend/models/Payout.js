const mongoose = require("mongoose");

const PayoutSchema = new mongoose.Schema(
  {
    payoutId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sourceTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      required: true,
      index: true,
    },

    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true,
    },

    grossAmount: { type: Number, required: true, min: 0 },
    commissionRate: { type: Number, required: true, min: 0, max: 100 },
    commissionAmount: { type: Number, required: true, min: 0 },
    netAmount: { type: Number, required: true, min: 0 },

    currency: {
      type: String,
      enum: ["BDT"],
      required: true,
    },

    // ISO 3166-1 alpha-2 — extensibility key for future countries
    country: {
      type: String,
      enum: ["BD"],
      required: true,
    },

    settlementCycle: { type: Number, default: 1 },
    scheduledAt: { type: Date, default: null },
    releasedAt: { type: Date, default: null },

    status: {
      type: String,
      enum: [
        "escrow",
        "scheduled",
        "available",
        "pending_approval",
        "approved",
        "processing",
        "paid",
        "failed",
        "rejected",
        "cancelled",
      ],
      default: "escrow",
      index: true,
    },

    // Extensible: add "stripe_connect", "wise" etc. per country in future
    psp: {
      type: String,
      enum: ["sslcommerz"],
      default: null,
    },

    pspReference: { type: String, default: null },
    pspRawResponse: { type: mongoose.Schema.Types.Mixed, default: null },

    // Flexible destination: bank_transfer or mobile_banking fields stored as-is
    payoutDestination: { type: mongoose.Schema.Types.Mixed, default: null },

    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    approvedAt: { type: Date, default: null },

    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectedAt: { type: Date, default: null },
    rejectionReason: { type: String, default: null },

    withdrawalRequestedAt: { type: Date, default: null },

    errorDetails: {
      code: { type: String, default: null },
      message: { type: String, default: null },
      retryCount: { type: Number, default: 0 },
      lastAttemptAt: { type: Date, default: null },
    },

    webhookReceivedAt: { type: Date, default: null },

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

PayoutSchema.index({ providerId: 1, status: 1 });
PayoutSchema.index({ providerId: 1, createdAt: -1 });
PayoutSchema.index({ status: 1, scheduledAt: 1 });
PayoutSchema.index({ taskId: 1, status: 1 });

module.exports = mongoose.model("Payout", PayoutSchema);
