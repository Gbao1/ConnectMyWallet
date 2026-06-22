const express = require("express");
const { check, validationResult } = require("express-validator");
const upload = require("../middlewares/upload");
const { authMiddleware } = require("../middlewares/authMiddleware");
const { validateRecaptcha } = require("../middlewares/recaptcha");
const recaptchaConfig = require("../config/recaptcha.config");
const { googleLogin } = require("../controllers/googleLoginController");
const { facebookLogin } = require("../controllers/facebookLoginController");
const authController = require("../controllers/authController");
const User = require("../models/User");
const { formatUserForClient } = require("../utils/userFormatter");
const { authAttemptGuard } = require("../middlewares/securityMiddleware");

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with optional profile photo upload
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name
 *                 example: "John Smith"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "john.smith@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 description: Password (minimum 6 characters)
 *                 example: "password123"
 *               role:
 *                 type: string
 *                 enum: [user, provider]
 *                 description: User role
 *                 example: "user"
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *                 description: Profile photo image file
 *               location:
 *                 type: object
 *                 properties:
 *                   country:
 *                     type: string
 *                     example: "Australia"
 *                   lat:
 *                     type: number
 *                     example: -33.8688
 *                   lng:
 *                     type: number
 *                     example: 151.2093
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Skills (for providers only)
 *                 example: ["Plumbing", "Electrical"]
 *               recaptchaToken:
 *                 type: string
 *                 description: Google reCAPTCHA v3 token from frontend
 *               fcmToken:
 *                 type: string
 *                 description: Firebase Cloud Messaging token for push notifications
 *     responses:
 *       200:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 */
router.post(
  "/register",
  upload.single("profilePhoto"),
  validateRecaptcha(recaptchaConfig.thresholds.register, "register"),
  [
    check("name", "Name is required").not().isEmpty(),
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password must be at least 6 characters").isLength({
      min: 6,
    }),
    check("role", "Role must be either user or provider").isIn([
      "user",
      "provider",
    ]),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    authController.register(req, res);
  }
);

/**
 * @swagger
 * /api/auth/profile/{id}:
 *   get:
 *     summary: Get user profile by ID
 *     description: Retrieve a user's profile information by their ID
 *     tags: [Auth]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/profile/:id", authMiddleware, authController.getProfile);

/**
 * @swagger
 * /api/auth/profile/{userId}:
 *   put:
 *     summary: Update user profile
 *     description: Update the authenticated user's profile information
 *     tags: [Auth]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to update
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: User's full name
 *                 example: "John Smith Updated"
 *               profilePhoto:
 *                 type: string
 *                 format: binary
 *                 description: New profile photo image file
 *               location:
 *                 type: object
 *                 properties:
 *                   country:
 *                     type: string
 *                     example: "Australia"
 *                   lat:
 *                     type: number
 *                     example: -33.8688
 *                   lng:
 *                     type: number
 *                     example: 151.2093
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Skills (for providers only)
 *                 example: ["Plumbing", "Electrical", "Handyman"]
 *               fcmToken:
 *                 type: string
 *                 description: Firebase Cloud Messaging token
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  "/profile/:userId",
  authMiddleware,
  upload.single("profilePhoto"),
  authController.updateProfile
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     description: Authenticate user with email and password, returns JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: "john.smith@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User's password
 *                 example: "password123"
 *               recaptchaToken:
 *                 type: string
 *                 description: Google reCAPTCHA v3 token from frontend
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid credentials or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/login",
  authAttemptGuard("password_login"),
  validateRecaptcha(recaptchaConfig.thresholds.login, "login"),
  [
    check("email", "Please include a valid email").isEmail(),
    check("password", "Password is required").exists(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    authController.login(req, res);
  }
);

router.post(
  "/forgot-password",
  [check("email", "Please include a valid email").isEmail()],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    authController.forgotPassword(req, res);
  }
);

router.post(
  "/reset-password",
  [
    check("email", "Please include a valid email").isEmail(),
    check("token", "Reset token is required").not().isEmpty(),
    check("newPassword", "Password must be at least 6 characters").isLength({
      min: 6,
    }),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    authController.resetPassword(req, res);
  }
);

router.get("/reset-password-link", authController.openResetPasswordLink);

/**
 * @swagger
 * /api/auth/google:
 *   post:
 *     summary: Google OAuth login
 *     description: Authenticate user with Google OAuth token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: Google OAuth ID token
 *                 example: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               role:
 *                 type: string
 *                 enum: [user, provider]
 *                 description: User role (for new users)
 *                 example: "user"
 *               fcmToken:
 *                 type: string
 *                 description: Firebase Cloud Messaging token
 *     responses:
 *       200:
 *         description: Google login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid Google token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/google", authAttemptGuard("google_login"), googleLogin);

/**
 * @swagger
 * /api/auth/facebook:
 *   post:
 *     summary: Facebook OAuth login
 *     description: Authenticate user with Facebook access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accessToken
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: Facebook access token
 *                 example: "EAAGm0PX4ZCpsBAExample..."
 *               role:
 *                 type: string
 *                 enum: [user, provider]
 *                 description: User role (for new users)
 *                 example: "user"
 *               fcmToken:
 *                 type: string
 *                 description: Firebase Cloud Messaging token
 *     responses:
 *       200:
 *         description: Facebook login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid Facebook token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/facebook", authAttemptGuard("facebook_login"), facebookLogin);
router.post("/device-fingerprint", authMiddleware, authController.syncDeviceFingerprint);

// Web app compatibility endpoints
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ msg: "User not found" });
    return res.json({ user: formatUserForClient(user) });
  } catch (err) {
    console.error("[AUTH][me] Error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

router.patch("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });

    const { firstName, lastName, preferredName, skills } = req.body || {};
    if (firstName !== undefined) user.firstName = String(firstName || "").trim();
    if (lastName !== undefined) user.lastName = String(lastName || "").trim();
    if (preferredName !== undefined) user.preferredName = String(preferredName || "").trim();
    if (skills !== undefined) {
      user.skills = Array.isArray(skills)
        ? skills
        : String(skills || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
    }

    await user.save();
    return res.json({ user: formatUserForClient(user) });
  } catch (err) {
    console.error("[AUTH][patch me] Error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

router.patch("/role", authMiddleware, async (req, res) => {
  try {
    const { role } = req.body || {};
    if (role !== "user" && role !== "provider") {
      return res.status(400).json({ msg: "Role must be either user or provider" });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: "User not found" });
    user.role = role;
    await user.save();
    return res.json({ user: formatUserForClient(user) });
  } catch (err) {
    console.error("[AUTH][role] Error:", err);
    return res.status(500).json({ msg: "Server error" });
  }
});

/**
 * @swagger
 * /api/auth/verify-email:
 *   get:
 *     summary: Verify email address
 *     description: Verifies a user's email address using the token sent to their inbox. Token expires in 24 hours.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Email verification token from the verification email
 *         example: "a3f8c2d1e4b5..."
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: "Email verified successfully"
 *       400:
 *         description: Token missing, invalid, or expired
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/verify-email", authController.verifyEmail);
router.post("/resend-verification-email", authController.resendVerificationByEmail);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend verification email
 *     description: Sends a new verification email to the authenticated user. Only works if the user is not yet verified.
 *     tags: [Auth]
 *     security:
 *       - JWTAuth: []
 *     responses:
 *       200:
 *         description: Verification email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: "Verification email sent"
 *       400:
 *         description: Email is already verified
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - missing or invalid token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/resend-verification", authMiddleware, authController.resendVerification);

module.exports = router;
