// Transaction Model - Tracks all payment records

const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    // Unique transaction ID for internal tracking
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    // Link to the task being paid for
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: false,
      index: true,
    },

    // User who initiated the payment
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Payment Service Provider used
    psp: {
      type: String,
      enum: ["sslcommerz", "payfast"],
      required: true,
    },

    // PSP's unique order/transaction ID
    pspOrderId: {
      type: String,
      default: null,
    },

    // Payment amount
    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // Currency code
    currency: {
      type: String,
      enum: ["BDT", "PKR", "AUD"],
      required: true,
    },

    // Transaction status
    status: {
      type: String,
      enum: ["pending", "processing", "success", "failed", "refunded", "cancelled"],
      default: "pending",
      index: true,
    },

    // Payment method used (populated after payment)
    paymentMethod: {
      type: String,
      enum: ["card", "upi", "wallet", "mobile_banking", "net_banking", "other", null],
      default: null,
    },

    // PSP response data (for debugging and records)
    pspResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    // Error details if payment failed
    errorDetails: {
      code: { type: String, default: null },
      message: { type: String, default: null },
    },

    // Webhook received timestamp
    webhookReceivedAt: {
      type: Date,
      default: null,
    },

    // Metadata for additional info
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

// Compound index for efficient queries
TransactionSchema.index({ userId: 1, createdAt: -1 });
TransactionSchema.index({ taskId: 1, status: 1 });
TransactionSchema.index({ psp: 1, pspOrderId: 1 });

module.exports = mongoose.model("Transaction", TransactionSchema);
