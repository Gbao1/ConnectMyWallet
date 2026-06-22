const mongoose = require("mongoose");

const suspiciousActivitySchema = new mongoose.Schema(
  {
    type: { type: String, required: true },
    severity: { type: String, enum: ["low", "medium", "high"], default: "low" },
    ip: { type: String, default: null },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    userEmail: { type: String, default: null },
    reason: { type: String, default: null },
    status: {
      type: String,
      enum: ["new", "reviewed", "ignored", "escalated"],
      default: "new",
    },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SuspiciousActivity", suspiciousActivitySchema);
