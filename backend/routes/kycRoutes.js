const express = require("express");
const { authMiddleware, authorizeRoles } = require("../middlewares/authMiddleware");
const {
  getSettings,
  startDiditVerification,
  diditCallback,
} = require("../controllers/kycController");

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: KYC
 *     description: Know Your Customer verification via DIDIT
 */

/**
 * @swagger
 * /api/kyc/settings/{userId}:
 *   get:
 *     summary: Get KYC verification status
 *     description: Retrieve current KYC status, DIDIT workflow details, and verification history for a user
 *     tags:
 *       - KYC
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to check KYC status
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: KYC status and settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   example: "507f1f77bcf86cd799439011"
 *                 name:
 *                   type: string
 *                   example: "John Doe"
 *                 email:
 *                   type: string
 *                   example: "john@example.com"
 *                 role:
 *                   type: string
 *                   enum: [user, provider, admin]
 *                 isVerified:
 *                   type: boolean
 *                   example: false
 *                 kyc:
 *                   type: object
 *                   properties:
 *                     provider:
 *                       type: string
 *                       enum: [didit, manual, null]
 *                       example: null
 *                     status:
 *                       type: string
 *                       enum: [not_started, pending, verified, failed]
 *                       example: "not_started"
 *                     verificationId:
 *                       type: string
 *                       nullable: true
 *                     lastVerifiedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                 didit:
 *                   type: object
 *                   properties:
 *                     workflowUrl:
 *                       type: string
 *                       description: DIDIT verification page URL
 *                       example: "https://verify.didit.me/u/j5hWxe7oRPyHqZzPdXdvNA"
 *                     workflowId:
 *                       type: string
 *                       example: "8f9856c5-eee8-44fc-87a9-9ccf75776f34"
 *       403:
 *         description: Unauthorized - can only view own data or admin
 *       404:
 *         description: User not found
 */
router.get(
  "/settings/:userId",
  authMiddleware,
  authorizeRoles("user", "provider", "admin"),
  getSettings
);

/**
 * @swagger
 * /api/kyc/didit/start/{userId}:
 *   post:
 *     summary: Initiate DIDIT verification
 *     description: Start KYC verification process. Returns a redirect URL to send user to DIDIT platform
 *     tags:
 *       - KYC
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to verify
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Verification session created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: "KYC verification started"
 *                 verificationId:
 *                   type: string
 *                   description: Unique verification session ID
 *                   example: "550e8400-e29b-41d4-a716-446655440000"
 *                 redirectUrl:
 *                   type: string
 *                   description: URL to redirect user's browser to DIDIT
 *                   example: "https://verify.didit.me/u/j5hWxe7oRPyHqZzPdXdvNA?workflowId=...&redirect_url=..."
 *       403:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.post(
  "/didit/start/:userId",
  authMiddleware,
  authorizeRoles("user", "provider", "admin"),
  startDiditVerification
);

/**
 * @swagger
 * /api/kyc/didit/callback:
 *   get:
 *     summary: DIDIT verification callback
 *     description: |
 *       Public endpoint that DIDIT redirects to after verification.
 *       Updates user KYC status based on DIDIT result.
 *       Redirects to success/failure page.
 *     tags:
 *       - KYC
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID being verified
 *       - in: query
 *         name: verificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Verification session ID from start endpoint
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [success, failed, cancelled]
 *         description: Verification result from DIDIT
 *       - in: query
 *         name: result
 *         schema:
 *           type: string
 *         description: Alternative status field (DIDIT may use this instead)
 *     responses:
 *       302:
 *         description: Redirect to success/failure page
 *       400:
 *         description: Invalid verification session or missing params
 *       404:
 *         description: User not found
 */
router.get("/didit/callback", diditCallback);

module.exports = router;
