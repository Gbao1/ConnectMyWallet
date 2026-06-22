const express = require("express");
const { authMiddleware, authorizeRoles } = require("../middlewares/authMiddleware");
const {
  getWallet,
  getPayoutHistory,
  getPayoutDestinations,
  savePayoutDestination,
  deletePayoutDestination,
  setDefaultPayoutDestination,
  requestWithdrawal,
  requestAllWithdrawals,
  listPendingPayouts,
  listAllPayouts,
  getPayoutDetails,
  approvePayout,
  rejectPayout,
  handlePayoutWebhook,
} = require("../controllers/payoutController");

const router = express.Router();

// ── Provider routes ───────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/payouts/wallet:
 *   get:
 *     summary: Get provider wallet balance
 *     tags: [Payouts]
 *     security:
 *       - JWTAuth: []
 *     responses:
 *       200:
 *         description: Wallet balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 walletBalance:
 *                   type: number
 *                   example: 450
 *                 walletPending:
 *                   type: number
 *                   example: 0
 */
router.get("/wallet",       authMiddleware, authorizeRoles("provider"), getWallet);

/**
 * @swagger
 * /api/payouts/history:
 *   get:
 *     summary: Get provider payout history
 *     tags: [Payouts]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [escrow, scheduled, available, pending_approval, approved, processing, paid, failed, rejected, cancelled]
 *     responses:
 *       200:
 *         description: Paginated payout list
 */
router.get("/history",      authMiddleware, authorizeRoles("provider"), getPayoutHistory);

/**
 * @swagger
 * /api/payouts/destinations:
 *   get:
 *     summary: Get saved payout destinations
 *     tags: [Payouts]
 *     security:
 *       - JWTAuth: []
 *     responses:
 *       200:
 *         description: List of payout destinations
 *   post:
 *     summary: Save a new payout destination
 *     tags: [Payouts]
 *     security:
 *       - JWTAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - label
 *               - country
 *               - type
 *             properties:
 *               label:
 *                 type: string
 *                 example: "My bKash"
 *               country:
 *                 type: string
 *                 example: "BD"
 *               type:
 *                 type: string
 *                 enum: [bank_transfer, mobile_banking]
 *                 example: "mobile_banking"
 *               mobileBankingProvider:
 *                 type: string
 *                 enum: [bkash, nagad, rocket]
 *                 example: "bkash"
 *               mobileNumber:
 *                 type: string
 *                 example: "01712345678"
 *               bankName:
 *                 type: string
 *                 example: "Dutch Bangla Bank"
 *               accountNumber:
 *                 type: string
 *                 example: "1234567890"
 *               accountHolderName:
 *                 type: string
 *                 example: "John Doe"
 *               routingNumber:
 *                 type: string
 *                 example: "090261139"
 *               branchName:
 *                 type: string
 *                 example: "Gulshan Branch"
 *               isDefault:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Destination saved
 *       400:
 *         description: Validation error
 */
router.get("/destinations", authMiddleware, authorizeRoles("provider"), getPayoutDestinations);
router.post("/destinations",authMiddleware, authorizeRoles("provider"), savePayoutDestination);
router.patch("/destinations/:destinationId/default", authMiddleware, authorizeRoles("provider"), setDefaultPayoutDestination);
router.post("/withdraw-all", authMiddleware, authorizeRoles("provider"), requestAllWithdrawals);

/**
 * @swagger
 * /api/payouts/destinations/{destinationId}:
 *   delete:
 *     summary: Delete a payout destination
 *     tags: [Payouts]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: destinationId
 *         required: true
 *         schema:
 *           type: string
 *         description: The _id of the destination subdocument
 *         example: "PASTE_DESTINATION_ID_HERE"
 *     responses:
 *       200:
 *         description: Destination deleted
 *       404:
 *         description: Destination not found
 */
router.delete("/destinations/:destinationId", authMiddleware, authorizeRoles("provider"), deletePayoutDestination);

/**
 * @swagger
 * /api/payouts/{payoutId}/withdraw:
 *   post:
 *     summary: Request a withdrawal for an available payout
 *     tags: [Payouts]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: payoutId
 *         required: true
 *         schema:
 *           type: string
 *         description: Payout ID (format PYO_xxx) — get this from GET /api/payouts/history
 *         example: "PASTE_PAYOUT_ID_HERE"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - destinationId
 *             properties:
 *               destinationId:
 *                 type: string
 *                 description: The _id of the saved destination from POST /api/payouts/destinations
 *                 example: "PASTE_DESTINATION_ID_HERE"
 *     responses:
 *       200:
 *         description: Withdrawal request submitted — payout moves to pending_approval
 *       400:
 *         description: Cannot withdraw (wrong status or insufficient balance)
 *       404:
 *         description: Payout or destination not found
 */
router.post("/:payoutId/withdraw", authMiddleware, authorizeRoles("provider"), requestWithdrawal);

// ── Admin routes — static paths BEFORE parameterized /:payoutId ───────────────

/**
 * @swagger
 * /api/payouts/admin/pending:
 *   get:
 *     summary: List payouts pending admin approval
 *     tags: [Payouts - Admin]
 *     security:
 *       - JWTAuth: []
 *     responses:
 *       200:
 *         description: List of pending_approval payouts
 */
router.get("/admin/pending",  authMiddleware, authorizeRoles("admin"), listPendingPayouts);

/**
 * @swagger
 * /api/payouts/admin/all:
 *   get:
 *     summary: List all payouts (admin)
 *     tags: [Payouts - Admin]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [escrow, scheduled, available, pending_approval, approved, processing, paid, failed, rejected, cancelled]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Paginated payout list
 */
router.get("/admin/all",      authMiddleware, authorizeRoles("admin"), listAllPayouts);

/**
 * @swagger
 * /api/payouts/admin/{payoutId}:
 *   get:
 *     summary: Get full payout detail (admin)
 *     tags: [Payouts - Admin]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: payoutId
 *         required: true
 *         schema:
 *           type: string
 *         example: "PASTE_PAYOUT_ID_HERE"
 *     responses:
 *       200:
 *         description: Payout document
 *       404:
 *         description: Payout not found
 */
router.get("/admin/:payoutId",authMiddleware, authorizeRoles("admin"), getPayoutDetails);

/**
 * @swagger
 * /api/payouts/admin/{payoutId}/approve:
 *   post:
 *     summary: Approve a withdrawal and trigger disbursement
 *     tags: [Payouts - Admin]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: payoutId
 *         required: true
 *         schema:
 *           type: string
 *         example: "PASTE_PAYOUT_ID_HERE"
 *     responses:
 *       200:
 *         description: Approved and disbursement triggered (sandbox may show failed — expected)
 *       400:
 *         description: Payout not in pending_approval state
 *       404:
 *         description: Payout not found
 */
router.post("/admin/:payoutId/approve", authMiddleware, authorizeRoles("admin"), approvePayout);

/**
 * @swagger
 * /api/payouts/admin/{payoutId}/reject:
 *   post:
 *     summary: Reject a withdrawal request
 *     tags: [Payouts - Admin]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: payoutId
 *         required: true
 *         schema:
 *           type: string
 *         example: "PASTE_PAYOUT_ID_HERE"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "Cannot verify destination details"
 *     responses:
 *       200:
 *         description: Rejected — walletBalance restored to provider
 *       400:
 *         description: Payout not in pending_approval state
 *       404:
 *         description: Payout not found
 */
router.post("/admin/:payoutId/reject",  authMiddleware, authorizeRoles("admin"), rejectPayout);

// ── Webhook — public, PSP calls this directly ─────────────────────────────────

/**
 * @swagger
 * /api/payouts/webhook/{psp}:
 *   post:
 *     summary: Handle disbursement webhook from PSP (public — no auth)
 *     description: SSLCommerz calls this after B2C disbursement. Simulate manually in sandbox.
 *     tags: [Payouts]
 *     parameters:
 *       - in: path
 *         name: psp
 *         required: true
 *         schema:
 *           type: string
 *           enum: [sslcommerz]
 *         example: "sslcommerz"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               trnx_id:
 *                 type: string
 *                 description: Payout ID echoed back by SSLCommerz (format PYO_xxx)
 *                 example: "PASTE_PAYOUT_ID_HERE"
 *               status:
 *                 type: string
 *                 example: "SUCCESS"
 *               bank_tran_id:
 *                 type: string
 *                 example: "BD_BANK_REF_001"
 *     responses:
 *       200:
 *         description: Webhook processed
 */
router.post("/webhook/:psp", handlePayoutWebhook);

module.exports = router;
