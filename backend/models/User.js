const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    preferredName: { type: String, default: "" },
    email: { type: String, required: true, unique: true },
    password: {
      type: String,
      required: function () {
        return !this.googleId && !this.facebookId;
      },
    },

    role: {
      type: String,
      enum: ["user", "provider", "admin"],
      default: "user",
    },

    profilePhoto: { type: String },

    location: {
      country: {
        type: String,
      },
      lat: {
        type: Number,
      },
      lng: {
        type: Number,
      },
    },

    skills: [{ type: String }],

    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
    verificationTokenExpiry: { type: Date, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordTokenExpiry: { type: Date, default: null },
    // For Google login

    googleId: { type: String },
    facebookId: { type: String },
    averageRating: { type: Number, default: 0 }, // Average rating for providers
    totalReviews: { type: Number, default: 0 }, // Number of received reviews
    completedTasks: { type: Number, default: 0 },
    recommendations: { type: Number, default: 0 },

    rank: {
      type: String,
      enum: ["Bronze", "Silver", "Gold", "Platinum"],
      default: "Bronze",
    },

    fcmToken: { type: String },

    walletBalance: { type: Number, default: 0, min: 0 },
    walletPending: { type: Number, default: 0, min: 0 },

    payoutDestinations: [
      {
        label: { type: String },
        country: { type: String },
        isDefault: { type: Boolean, default: false },
        type: { type: String, enum: ["bank_transfer", "mobile_banking"] },
        bankName: { type: String, default: null },
        accountNumber: { type: String, default: null },
        accountHolderName: { type: String, default: null },
        routingNumber: { type: String, default: null },
        branchName: { type: String, default: null },
        mobileBankingProvider: {
          type: String,
          enum: ["bkash", "nagad", "rocket", null],
          default: null,
        },
        mobileNumber: { type: String, default: null },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    kyc: {
      provider: {
        type: String,
        enum: ["didit", "manual", null],
        default: null,
      },
      status: {
        type: String,
        enum: ["not_started", "pending", "verified", "failed"],
        default: "not_started",
      },
      diditWorkflowUrl: { type: String, default: null },
      diditWorkflowId: { type: String, default: null },
      verificationId: { type: String, default: null },
      diditSessionId: { type: String, default: null },
      lastRedirectAt: { type: Date, default: null },
      lastVerifiedAt: { type: Date, default: null },
    },
    deviceFingerprints: [
      {
        fingerprintId: { type: String, required: true },
        platform: { type: String, enum: ["web", "mobile", "unknown"], default: "unknown" },
        source: { type: String, default: "" },
        userAgent: { type: String, default: "" },
        ipAddress: { type: String, default: "" },
        firstSeenAt: { type: Date, default: Date.now },
        lastSeenAt: { type: Date, default: Date.now },
        seenCount: { type: Number, default: 1 },
      },
    ],
    fraudFlags: {
      isFlagged: { type: Boolean, default: false },
      reasonCodes: [{ type: String }],
      flaggedAt: { type: Date, default: null },
      lastEvaluatedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

UserSchema.index({ "deviceFingerprints.fingerprintId": 1 });

// Hash password before saving to DB
UserSchema.pre("save", async function (next) {
  if (!this.password || !this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.pre("save", function (next) {
  const shouldUpdateFullName =
    this.isModified("firstName") || this.isModified("lastName") || !this.name;

  if (shouldUpdateFullName) {
    const combined = [this.firstName, this.lastName]
      .filter((value) => value && value.trim())
      .join(" ")
      .trim();

    if (combined) {
      this.name = combined;
    } else if (this.preferredName && this.preferredName.trim()) {
      this.name = this.preferredName.trim();
    } else if (this.email && this.email.trim()) {
      this.name = this.email.trim();
    }
  }

  next();
});

UserSchema.pre("save", function (next) {
  if (this.walletPending < 0) this.walletPending = 0;
  if (this.walletBalance < 0) this.walletBalance = 0;
  next();
});

// Compare Password for Login
UserSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);