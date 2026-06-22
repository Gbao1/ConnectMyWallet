const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { formatUserForClient } = require("../utils/userFormatter");
const { captureDeviceFingerprint } = require("../services/deviceFingerprintService");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const getGoogleProfileFromAccessToken = async (accessToken) => {
  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) {
    const error = new Error("Invalid Google token");
    error.statusCode = 401;
    throw error;
  }

  return profileRes.json();
};

const getGoogleProfileFromIdToken = async (idToken) => {
  const verifyOptions = { idToken };
  if (GOOGLE_CLIENT_ID) verifyOptions.audience = GOOGLE_CLIENT_ID;

  const ticket = await googleClient.verifyIdToken(verifyOptions);
  return ticket.getPayload();
};

exports.googleLogin = async (req, res) => {
  const { accessToken, idToken, fcmToken, role } = req.body || {};
  if (!accessToken && !idToken) {
    return res.status(400).json({ msg: "Google token is required" });
  }
  if (role && !["user", "provider"].includes(role)) {
    return res.status(400).json({ msg: "Role must be either user or provider" });
  }

  try {
    const profile = accessToken
      ? await getGoogleProfileFromAccessToken(accessToken)
      : await getGoogleProfileFromIdToken(idToken);

    const email = String(profile.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ msg: "Google did not return email" });

    let user = await User.findOne({ email });
    if (!user) {
      if (!role) {
        return res.status(409).json({
          code: "ROLE_REQUIRED",
          msg: "Role is required for first-time social login",
        });
      }

      user = new User({
        name: profile.name || email.split("@")[0],
        email,
        googleId: profile.sub,
        role,
        profilePhoto: profile.picture || "",
        fcmToken,
        isVerified: true,
      });

      await user.save();
    }

    if (!user.googleId && profile.sub) {
      user.googleId = profile.sub;
    }

    if (fcmToken && user.fcmToken !== fcmToken) {
      user.fcmToken = fcmToken;
    }

    if (!user.isVerified) {
      user.isVerified = true;
    }

    if (user.isModified()) {
      await user.save();
    }
    await captureDeviceFingerprint({ user, req, context: "google_login" });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    return res.json({ token, user: formatUserForClient(user), needsRole: !user.role });
  } catch (err) {
    console.error("Google login failed:", err);
    return res.status(err.statusCode || 401).json({ msg: "Failed to authenticate with Google" });
  }
};
