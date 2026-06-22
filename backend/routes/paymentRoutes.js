// Payment Routes - API endpoints for payment operations

const express = require("express");
const {
  authMiddleware,
  authorizeRoles,
} = require("../middlewares/authMiddleware");
const {
  initiatePayment,
  verifyPayment,
  getPaymentHistory,
  handleWebhook,
  getTransaction,
  handleSSLSuccess,
  handleSSLFail,
  handleSSLCancel,
} = require("../controllers/paymentController");
const { initiateSubscriptionPayment } = require("../controllers/subscriptionPaymentController");

const router = express.Router();

/**
 * @swagger
 * /api/payments/subscription/initiate:
 *   post:
 *     summary: Initiate a subscription payment
 *     description: Create a new subscription payment transaction for a pricing plan
 *     tags: [Payments]
 *     security:
 *       - JWTAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - plan
 *               - amount
 *               - currency
 *             properties:
 *               plan:
 *                 type: string
 *                 enum: [basic, pro, business]
 *                 description: Subscription plan
 *                 example: "pro"
 *               amount:
 *                 type: number
 *                 description: Payment amount
 *                 example: 999
 *               currency:
 *                 type: string
 *                 enum: [BDT, PKR]
 *                 description: Currency code (BDT for sslcommerz, PKR for payfast)
 *                 example: "BDT"
 *     responses:
 *       201:
 *         description: Subscription payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                 transactionId:
 *                   type: string
 *                 status:
 *                   type: string
 *                 paymentUrl:
 *                   type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       503:
 *         description: Payment service unavailable
 */
router.post(
  "/subscription/initiate",
  authMiddleware,
  authorizeRoles("user", "provider", "admin"),
  initiateSubscriptionPayment
);

/**
 * @swagger
 * /api/payments/{psp}/initiate:
 *   post:
 *     summary: Initiate a new payment
 *     description: Create a new payment transaction for a task. The PSP must match the currency (SSLCommerz=BDT, Payfast=PKR).
 *     tags: [Payments]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: psp
 *         required: true
 *         schema:
 *           type: string
 *           enum: [sslcommerz, payfast]
 *         description: Payment Service Provider
 *         example: "sslcommerz"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - taskId
 *               - amount
 *               - currency
 *             properties:
 *               taskId:
 *                 type: string
 *                 description: ID of the task to pay for — paste the _id from the created task
 *                 example: "PASTE_TASK_ID_HERE"
 *               amount:
 *                 type: number
 *                 description: Payment amount in BDT — must match the task budget
 *                 example: 500
 *               currency:
 *                 type: string
 *                 enum: [BDT, PKR]
 *                 description: Currency code (must match PSP — sslcommerz uses BDT)
 *                 example: "BDT"
 *     responses:
 *       201:
 *         description: Payment initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentInitiateResponse'
 *       400:
 *         description: Validation error (invalid currency, missing fields, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       503:
 *         description: Payment service unavailable (credentials not configured)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/:psp/initiate",
  authMiddleware,
  authorizeRoles("user", "provider", "admin"),
  initiatePayment
);

/**
 * @swagger
 * /api/payments/verify/{transactionId}:
 *   get:
 *     summary: Verify payment status
 *     description: Check the current status of a payment transaction
 *     tags: [Payments]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *         example: "TXN_1706789432_a1b2c3d4"
 *     responses:
 *       200:
 *         description: Transaction status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionStatus'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Not authorized to view this transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/verify/:transactionId", authMiddleware, verifyPayment);

/**
 * @swagger
 * /api/payments/history:
 *   get:
 *     summary: Get payment history
 *     description: Retrieve the authenticated user's payment history
 *     tags: [Payments]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of transactions per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, success, failed, refunded, cancelled]
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Payment history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaymentHistoryResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/history", authMiddleware, getPaymentHistory);

/**
 * @swagger
 * /api/payments/transaction/{transactionId}:
 *   get:
 *     summary: Get transaction details
 *     description: Get full details of a transaction (owner or admin only)
 *     tags: [Payments]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Transaction ID
 *         example: "TXN_1706789432_a1b2c3d4"
 *     responses:
 *       200:
 *         description: Transaction details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Transaction not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/transaction/:transactionId", authMiddleware, getTransaction);

/**
 * @swagger
 * /api/payments/webhook/{psp}:
 *   post:
 *     summary: PSP webhook endpoint
 *     description: Endpoint for Payment Service Providers to send payment status updates. This endpoint is public but verified by PSP-specific signatures.
 *     tags: [Payments]
 *     parameters:
 *       - in: path
 *         name: psp
 *         required: true
 *         schema:
 *           type: string
 *           enum: [sslcommerz, payfast]
 *         description: Payment Service Provider
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: PSP-specific webhook payload
 *     responses:
 *       200:
 *         description: Webhook acknowledged
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: "Webhook received"
 *       400:
 *         description: Unknown PSP
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/webhook/:psp", handleWebhook);

// SSLCommerz browser redirect callbacks (no auth — SSLCommerz calls these directly)
router.post("/ssl/success", handleSSLSuccess);
router.post("/ssl/fail", handleSSLFail);
router.post("/ssl/cancel", handleSSLCancel);

module.exports = router;
