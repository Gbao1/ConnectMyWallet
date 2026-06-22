const crypto = require("crypto");
const axios = require("axios");
const User = require("../models/User");

const DIDIT_API_KEY = process.env.DIDIT_API_KEY;
const DIDIT_WORKFLOW_URL = process.env.DIDIT_WORKFLOW_URL;
const DIDIT_WORKFLOW_ID =
  process.env.DIDIT_WORKFLOW_ID || "8f9856c5-eee8-44fc-87a9-9ccf75776f34";
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || "http://localhost:3300";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

const canAccessUser = (req, userId) => req.user.id === userId || req.user.role === "admin";

const getSettings = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!canAccessUser(req, userId)) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    const user = await User.findById(userId).select("name email role isVerified kyc");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    return res.json({
      userId: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
      kyc: user.kyc,
      didit: {
        workflowUrl: DIDIT_WORKFLOW_URL,
        workflowId: DIDIT_WORKFLOW_ID,
      },
    });
  } catch (error) {
    console.error("[KYC][getSettings] Error:", error);
    return res.status(500).json({
      msg: "Server error",
      error: error.message,
      stack: error.stack,
    });
  }
};

const startDiditVerification = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!canAccessUser(req, userId)) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (!DIDIT_API_KEY || !DIDIT_WORKFLOW_ID || !SERVER_BASE_URL) {
      return res.status(500).json({
        msg: "DIDIT env is not fully configured",
      });
    }

    const verificationId = crypto.randomUUID();
    const callbackUrl = `${SERVER_BASE_URL}/api/kyc/didit/callback`;

    const diditResponse = await axios.post(
      "https://verification.didit.me/v3/session/",
      {
        workflow_id: DIDIT_WORKFLOW_ID,
        vendor_data: String(userId),
        callback: callbackUrl,
        callback_method: "both",
        redirect: `${FRONTEND_URL}/kyc-complete`, 
        metadata: JSON.stringify({
          userId,
          verificationId,
        }),
        language: "en",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": DIDIT_API_KEY,
        },
      }
    );

    const session = diditResponse.data;

    user.kyc = {
      ...user.kyc,
      provider: "didit",
      status: "pending",
      diditWorkflowUrl: session.url,
      diditWorkflowId: DIDIT_WORKFLOW_ID,
      diditSessionId: session.session_id,
      verificationId,
      lastRedirectAt: new Date(),
    };

    console.log("[KYC] about to save:", user.kyc);
    await user.save();

    return res.json({
      msg: "KYC verification started",
      verificationId,
      sessionId: session.session_id,
      redirectUrl: session.url,
    });
  } catch (error) {
    console.error(
      "[KYC][startDiditVerification] Error:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      msg: "Failed to start DIDIT session",
      error: error.response?.data || error.message,
    });
  }
};

const diditCallback = async (req, res) => {
  try {
    const {
      verificationSessionId,
      verificationId,
      userId,
      status,
      result,
    } = req.query;

    console.log("[KYC][diditCallback] Received query params:", req.query);

    let user = null;

    // 1. Best case: DIDIT sends session id and we have it stored
    if (verificationSessionId) {
      user = await User.findOne({
        "kyc.diditSessionId": verificationSessionId,
      });
    }

    console.log("[KYC][diditCallback] matched user:", user?._id);

    // 2. Fallback: match using our own verificationId if DIDIT returns it
    if (!user && verificationId) {
      user = await User.findOne({
        "kyc.verificationId": verificationId,
      });
    }

    // 3. Manual/local testing path
    if (!user && userId && verificationId) {
      user = await User.findById(userId);

      if (!user) {
        return res.status(404).send("User not found");
      }

      if (user.kyc?.verificationId !== verificationId) {
        return res.status(400).send("Invalid verification session.");
      }
    }

    if (!user) {
      return res.status(404).send(
        "No matching user found for this verification callback."
      );
    }

    const failureValues = [
      "failed",
      "failure",
      "rejected",
      "cancelled",
      "canceled",
      "error",
      "declined",
    ];

    const normalizedStatus = String(status || result || "success").toLowerCase();
    const isFailure = failureValues.includes(normalizedStatus);

    user.kyc = {
      ...user.kyc,
      provider: "didit",
      status: isFailure ? "failed" : "verified",
      diditWorkflowUrl: DIDIT_WORKFLOW_URL,
      diditWorkflowId: DIDIT_WORKFLOW_ID,
      diditSessionId: verificationSessionId || user.kyc?.diditSessionId || null,
      verificationId: verificationId || user.kyc?.verificationId || null,
      lastVerifiedAt: isFailure ? user.kyc?.lastVerifiedAt || null : new Date(),
    };

    await user.save();

    console.log(
      `[KYC][diditCallback] User ${user._id} updated: kyc.status=${user.kyc.status}, emailVerified=${user.isVerified}`
    );

    return res.redirect(302, `${FRONTEND_URL}/kyc-complete?kyc_status=${user.kyc.status}`);
  } catch (error) {
    console.error("[KYC][diditCallback] Error:", error);
    return res.status(500).send("Server error");
  }
};

module.exports = {
  getSettings,
  startDiditVerification,
  diditCallback,
};
