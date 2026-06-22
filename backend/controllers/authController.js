const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  sendRegistrationEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../utils/mail");
const { captureDeviceFingerprint } = require("../services/deviceFingerprintService");
const { computeTrustScore } = require("../services/reviewService");
const { rankFromTrustScore } = require("../services/rankingService");
const { formatUserForClient, normaliseNameParts } = require("../utils/userFormatter");

// @desc    Register a new user
// @access  Public
exports.register = async (req, res) => {
  const { name, email, password, role, skills, fcmToken, firstName, lastName, preferredName } =
    req.body;

  if (req.recaptchaScore !== undefined) {
    console.log(`[RECAPTCHA] Registration - Score: ${req.recaptchaScore}, Email: ${email}`);
  }
  let location;
  // if (req.body.location) location = JSON.parse(req.body.location);
  if (req.body.location) {
    location =
      typeof req.body.location === "string"
        ? JSON.parse(req.body.location) // when coming from multipart
        : req.body.location; // when coming from JSON
  }
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ msg: "User already exists" });

    const profilePhoto = req.file?.path || "";

    const nameParts = normaliseNameParts({ name, firstName, lastName, preferredName });
    user = new User({
      ...nameParts,
      email,
      password,
      role,
      location,
      profilePhoto,
      skills: role === "provider" && skills ? skills.split(",") : [],
      fcmToken,
      isVerified: false,
    });
    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    sendVerificationEmail(user.email, user.name, verificationToken).catch(err =>
      console.error("Verification email failed:", err.message)
    );
    await captureDeviceFingerprint({ user, req, context: "register" });

    res.status(201).json({
      msg: "Registration successful. Please check your email to verify your account before logging in.",
      user: formatUserForClient(user),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get user profile by ID
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });

    const profile = user.toObject();
    const trustScore = computeTrustScore(user);

    res.json({
      ...profile,
      trustScore,
      rank: rankFromTrustScore(trustScore),
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Update user profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Allow only the user themselves or an admin to update
    if (req.user.id !== userId && req.user.role !== "admin") {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const { name, skills } = req.body;

    // Update name if sent
    if (name) user.name = name;

    // Update skills if user is a provider and skills are provided
    if (skills && user.role === "provider") {
      user.skills = skills.split(",").map((s) => s.trim());
    }

    // Update location if provided as JSON string
    if (req.body.location) {
      try {
        const location = JSON.parse(req.body.location);

        // Only update provided location fields
        user.location = {
          ...user.location,
          ...(location.country && { country: location.country }),
          ...(location.lat !== undefined && { lat: parseFloat(location.lat) }),
          ...(location.lng !== undefined && { lng: parseFloat(location.lng) }),
        };
      } catch (err) {
        return res.status(400).json({ msg: "Invalid location format" });
      }
    }

    // Update profile photo if a new one is uploaded
    if (req.file?.path) {
      user.profilePhoto = req.file.path;
    }

    await user.save();

    res.json({
      msg: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePhoto: user.profilePhoto,
        location: user.location,
        skills: user.skills,
        isVerified: user.isVerified,
        kyc: user.kyc,
        averageRating: user.averageRating,
        totalReviews: user.totalReviews,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ msg: "Server error" });
  }
};

// @desc    Login user and return token
// @access  Public
exports.login = async (req, res) => {
  const { email, password, fcmToken } = req.body;

  if (req.recaptchaScore !== undefined) {
    console.log(`[RECAPTCHA] Login - Score: ${req.recaptchaScore}, Email: ${email}`);
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    // Prevent password login for social-only accounts
    if (!user.password) {
      return res.status(400).json({
        msg: "This account uses Google/Facebook login. Please sign in with your social account.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: "Invalid credentials" });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        msg: "Please verify your email before logging in. Check your inbox for the verification link.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    if (!user.fcmToken || user.fcmToken !== fcmToken) {
      user.fcmToken = fcmToken;
      await user.save();
    }
    await captureDeviceFingerprint({ user, req, context: "password_login" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: formatUserForClient(user),
    });
  } catch (err) {
    console.error("[AUTH][login] Error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
};

exports.verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ msg: "Verification token is required" });
  try {
    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpiry: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ msg: "Invalid or expired verification token" });
    user.isVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpiry = null;
    await user.save();
    res.json({ msg: "Email verified successfully. You can now log in." });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

exports.resendVerificationByEmail = async (req, res) => {
  try {
    const email = String(req.body?.email || "")
      .trim()
      .toLowerCase();
    if (!email) return res.status(400).json({ msg: "Email is required" });

    const user = await User.findOne({ email });
    if (user && !user.isVerified) {
      const verificationToken = crypto.randomBytes(32).toString("hex");
      user.verificationToken = verificationToken;
      user.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();
      sendVerificationEmail(user.email, user.name, verificationToken).catch((err) =>
        console.error("Resend verification email failed:", err.message)
      );
    }

    return res.json({
      msg: "If your account exists and is unverified, a new verification email has been sent.",
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).send("Server error");
  }
};

exports.resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });
    if (user.isVerified) return res.status(400).json({ msg: "Email is already verified" });
    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = verificationToken;
    user.verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    sendVerificationEmail(user.email, user.name, verificationToken).catch(err =>
      console.error("Resend verification email failed:", err.message)
    );
    res.json({ msg: "Verification email sent" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

exports.forgotPassword = async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const response = { msg: "If an account exists for this email, a password reset link has been sent" };

  try {
    const user = await User.findOne({ email });
    if (!user) return res.json(response);

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetPasswordTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          resetPasswordToken,
          resetPasswordTokenExpiry,
        },
      }
    );

    await sendPasswordResetEmail(user.email, user.name, resetToken);

    res.json(response);
  } catch (err) {
    console.error("Password reset email failed:", err.message);
    res.status(500).json({ msg: "Failed to send password reset email" });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, token, newPassword } = req.body;
  if (!email || !token || !newPassword) {
    return res.status(400).json({ msg: "Email, token, and newPassword are required" });
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      email,
      resetPasswordToken: hashedToken,
      resetPasswordTokenExpiry: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ msg: "Invalid or expired password reset token" });

    user.password = newPassword;
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpiry = null;
    await user.save();

    res.json({ msg: "Password reset successfully" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Sync device fingerprint for authenticated user
// @access  Private
exports.syncDeviceFingerprint = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const result = await captureDeviceFingerprint({
      user,
      req,
      context: "device_sync",
    });

    if (!result.captured) {
      return res.status(400).json({ msg: "No valid device fingerprint provided" });
    }

    return res.json({
      msg: "Device fingerprint captured",
      fingerprintId: result.fingerprintId,
      linkedAccountCount: result.linkedAccountCount,
      flagged: result.flagged,
      fraudFlags: user.fraudFlags,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "Server error" });
  }
};

exports.openResetPasswordLink = (req, res) => {
  const { email, token } = req.query;
  if (!email || !token) {
    return res.status(400).send("Reset password link is missing required information");
  }

  const appBaseUrl = process.env.FRONTEND_URL || "connectmytask://auth";
  const redirectUrl = `${appBaseUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  const pageState = JSON.stringify({
    email,
    token,
    appUrl: redirectUrl,
  }).replace(/</g, "\\u003c");

  return res.send(`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Reset Password - ConnectMyTask</title>
        <style>
          body {
            margin: 0;
            min-height: 100vh;
            display: grid;
            place-items: center;
            font-family: Arial, sans-serif;
            background: #f6f8f7;
            color: #202124;
          }
          main {
            width: min(460px, calc(100vw - 32px));
            padding: 32px;
            border-radius: 12px;
            background: white;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.12);
          }
          h1 {
            margin: 0 0 10px;
            color: #214296;
            text-align: center;
          }
          p {
            line-height: 1.5;
            color: #4d4f53;
            text-align: center;
          }
          label {
            display: block;
            margin: 18px 0 8px;
            color: #006851;
            font-weight: 700;
          }
          input {
            width: 100%;
            box-sizing: border-box;
            padding: 14px;
            border: 1px solid #d7dadc;
            border-radius: 8px;
            font-size: 16px;
          }
          button, a {
            width: 100%;
            box-sizing: border-box;
            display: block;
            margin-top: 18px;
            padding: 14px 20px;
            border-radius: 999px;
            border: 0;
            background: #019c47;
            color: white;
            text-decoration: none;
            font-weight: 700;
            font-size: 16px;
            text-align: center;
            cursor: pointer;
          }
          a.secondary {
            background: white;
            color: #019c47;
            border: 1px solid #019c47;
          }
          button:disabled {
            opacity: 0.65;
            cursor: not-allowed;
          }
          #message {
            min-height: 22px;
            margin-top: 16px;
            font-weight: 700;
          }
          .success {
            color: #019c47;
          }
          .error {
            color: #c62828;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>Reset Password</h1>
          <p>Create a new ConnectMyTask password here, or open the reset screen in the mobile app.</p>

          <form id="reset-form">
            <label for="password">New password</label>
            <input id="password" name="password" type="text" minlength="6" autocomplete="off" autocapitalize="none" spellcheck="false" required />

            <label for="confirm-password">Confirm password</label>
            <input id="confirm-password" name="confirm-password" type="text" minlength="6" autocomplete="off" autocapitalize="none" spellcheck="false" required />

            <button id="submit-button" type="submit">Reset password</button>
          </form>

          <a class="secondary" id="open-app-link" href="${redirectUrl}">Open in app</a>
          <p id="message" role="status"></p>
        </main>

        <script>
          const state = ${pageState};
          const form = document.getElementById("reset-form");
          const button = document.getElementById("submit-button");
          const message = document.getElementById("message");
          const openAppLink = document.getElementById("open-app-link");
          const passwordInput = document.getElementById("password");
          const confirmPasswordInput = document.getElementById("confirm-password");
          const maskChar = "\\u2022";

          openAppLink.href = state.appUrl;

          function renderMaskedInput(input, revealLast) {
            const secret = input.dataset.secret || "";
            if (!secret) {
              input.value = "";
              return;
            }

            const maskedLength = revealLast ? secret.length - 1 : secret.length;
            const visibleLast = revealLast ? secret.slice(-1) : "";
            input.value = maskChar.repeat(Math.max(maskedLength, 0)) + visibleLast;
          }

          function setupLatestCharacterMask(input) {
            let hideTimer;
            input.dataset.secret = "";

            input.addEventListener("keydown", (event) => {
              if (event.metaKey || event.ctrlKey || event.altKey) return;

              const secret = input.dataset.secret || "";

              if (event.key === "Backspace") {
                event.preventDefault();
                input.dataset.secret = secret.slice(0, -1);
                renderMaskedInput(input, false);
                return;
              }

              if (event.key === "Delete") {
                event.preventDefault();
                input.dataset.secret = "";
                renderMaskedInput(input, false);
                return;
              }

              if (event.key.length !== 1) return;

              event.preventDefault();
              input.dataset.secret = secret + event.key;
              renderMaskedInput(input, true);

              clearTimeout(hideTimer);
              hideTimer = setTimeout(() => renderMaskedInput(input, false), 900);
            });

            input.addEventListener("paste", (event) => {
              event.preventDefault();
              const pasted = event.clipboardData.getData("text");
              input.dataset.secret = (input.dataset.secret || "") + pasted;
              renderMaskedInput(input, false);
            });
          }

          function getSecretValue(input) {
            return input.dataset.secret || "";
          }

          setupLatestCharacterMask(passwordInput);
          setupLatestCharacterMask(confirmPasswordInput);

          form.addEventListener("submit", async (event) => {
            event.preventDefault();
            message.textContent = "";
            message.className = "";

            const password = getSecretValue(passwordInput);
            const confirmPassword = getSecretValue(confirmPasswordInput);

            if (password.length < 6) {
              message.textContent = "Password must be at least 6 characters.";
              message.className = "error";
              return;
            }

            if (password !== confirmPassword) {
              message.textContent = "Passwords do not match.";
              message.className = "error";
              return;
            }

            button.disabled = true;
            button.textContent = "Resetting...";

            try {
              const response = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: state.email,
                  token: state.token,
                  newPassword: password,
                }),
              });

              const data = await response.json().catch(() => ({}));
              if (!response.ok) {
                throw new Error(data.msg || "Failed to reset password.");
              }

              form.reset();
              message.textContent = data.msg || "Password reset successfully.";
              message.className = "success";
            } catch (error) {
              message.textContent = error.message;
              message.className = "error";
            } finally {
              button.disabled = false;
              button.textContent = "Reset password";
            }
          });
        </script>
      </body>
    </html>
  `);
};
