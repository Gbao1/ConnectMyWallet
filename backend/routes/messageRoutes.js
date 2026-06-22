const express = require("express");
const router = express.Router();
const {
  createMessage,
  getMessagesWithUser,
  getChatSummary,
} = require("../controllers/messageController");

const { authMiddleware, requireEmailVerified } = require("../middlewares/authMiddleware");
const messageUpload = require("../middlewares/messageUpload");
const { validateRecaptcha } = require("../middlewares/recaptcha");
const recaptchaConfig = require("../config/recaptcha.config");

/**
 * @swagger
 * /api/messages:
 *   post:
 *     summary: Send a message
 *     description: Send a message to another user with optional image attachment
 *     tags: [Messages]
 *     security:
 *       - JWTAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - receiver
 *             properties:
 *               receiver:
 *                 type: string
 *                 description: Receiver's user ID
 *                 example: "507f1f77bcf86cd799439011"
 *               text:
 *                 type: string
 *                 description: Message text
 *                 example: "Hi, I'm interested in your task. Can you provide more details?"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Optional image attachment
 *               recaptchaToken:
 *                 type: string
 *                 description: Google reCAPTCHA v3 token from frontend
 *     responses:
 *       201:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Message'
 *       400:
 *         description: Validation error - receiver is required
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
 */
router.post(
  "/",
  authMiddleware,
  requireEmailVerified,
  messageUpload.single("image"),
  validateRecaptcha(recaptchaConfig.thresholds.message, "message"),
  createMessage
);

/**
 * @swagger
 * /api/messages/{otherUserId}:
 *   get:
 *     summary: Get chat history
 *     description: Retrieve all messages between the authenticated user and another user
 *     tags: [Messages]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: otherUserId
 *         required: true
 *         schema:
 *           type: string
 *         description: The other user's ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Chat history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Message'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:otherUserId", authMiddleware, getMessagesWithUser);

/**
 * @swagger
 * /api/messages/summary/me:
 *   get:
 *     summary: Get chat summaries
 *     description: Retrieve a summary of all chats for the authenticated user, including last message and unread count
 *     tags: [Messages]
 *     security:
 *       - JWTAuth: []
 *     responses:
 *       200:
 *         description: Chat summaries retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ChatSummary'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/summary/me", authMiddleware, getChatSummary);

module.exports = router;
