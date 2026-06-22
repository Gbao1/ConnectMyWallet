// backend/routes/taskRoutes.js

const express = require("express");
const {
  authMiddleware,
  authorizeRoles,
  requireEmailVerified,
  requireKycVerified,
} = require("../middlewares/authMiddleware");
const { validateRecaptcha } = require("../middlewares/recaptcha");
const recaptchaConfig = require("../config/recaptcha.config");
const {
  createTask,
  getTasks,
  getTask,
  updateTaskStatus,
  deleteTask,
  bidOnTask,
  acceptBid,
  completeTask,
  providerCompleteTask,
  updateTaskDetails,
  createComment,
  replyToComment,
  getTasksWeb,
  getTaskData,
} = require("../controllers/taskController");
const taskUpload = require("../middlewares/taskUpload");
const Task = require("../models/Task");

const router = express.Router();

/**
 * @swagger
 * /api/tasks:
 *   post:
 *     summary: Create a new task
 *     description: Create a new task with optional images. Only users can create tasks.
 *     tags: [Tasks]
 *     security:
 *       - JWTAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - budget
 *               - category
 *               - location
 *             properties:
 *               title:
 *                 type: string
 *                 description: Task title
 *                 example: "Deep clean my apartment in Gulshan"
 *               description:
 *                 type: string
 *                 description: Detailed task description
 *                 example: "Need a thorough deep clean for a 3-bedroom apartment. Includes kitchen, bathrooms, and all rooms. Please bring your own cleaning supplies."
 *               budget:
 *                 type: number
 *                 description: Budget in BDT
 *                 example: 500
 *               category:
 *                 type: string
 *                 enum: [Cleaning, Plumbing, Electrical, Handyman, Moving, Delivery, Gardening, Tutoring, Tech Support, Other]
 *                 description: Task category
 *                 example: "Cleaning"
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 description: Task deadline
 *                 example: "2026-05-15T17:00:00.000Z"
 *               location:
 *                 type: string
 *                 description: JSON string with location details (type, address, lat, lng)
 *                 example: '{"type":"physical","address":"House 12, Road 3, Gulshan-1, Dhaka 1212","lat":23.7808,"lng":90.4180}'
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Task images (up to 5)
 *               recaptchaToken:
 *                 type: string
 *                 description: Google reCAPTCHA v3 token from frontend
 *     responses:
 *       201:
 *         description: Task created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Validation error
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
 *       403:
 *         description: Forbidden - Only users can create tasks
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/",
  authMiddleware,
  authorizeRoles("user"),
  requireEmailVerified,
  taskUpload.array("images", 5),
  validateRecaptcha(recaptchaConfig.thresholds.createTask, "createTask"),
  createTask
);

/**
 * @swagger
 * /api/tasks:
 *   get:
 *     summary: Get all tasks
 *     description: Retrieve all tasks with populated user data
 *     tags: [Tasks]
 *     security:
 *       - JWTAuth: []
 *     responses:
 *       200:
 *         description: List of tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", authMiddleware, getTasks);

/**
 * @swagger
 * /api/tasks/alltasks/web:
 *   get:
 *     summary: Get all tasks for web
 *     description: Retrieve all tasks formatted for web display
 *     tags: [Tasks]
 *     security:
 *       - JWTAuth: []
 *     responses:
 *       200:
 *         description: List of tasks retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/alltasks/web", authMiddleware, getTasksWeb);

/**
 * @swagger
 * /api/tasks/{id}:
 *   get:
 *     summary: Get task by ID
 *     description: Retrieve a specific task by its ID
 *     tags: [Tasks]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Task retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
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
 */
router.get("/:id", authMiddleware, getTask);

/**
 * @swagger
 * /api/tasks/{id}/data:
 *   get:
 *     summary: Get task with populated data
 *     description: Retrieve a task with fully populated user, bids, and comments data
 *     tags: [Tasks]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Task with populated data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
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
 */
router.get("/:id/data", authMiddleware, getTaskData);

/**
 * @swagger
 * /api/tasks/{id}/status:
 *   put:
 *     summary: Update task status
 *     description: Update the status of a task. Admin and task owner can update.
 *     tags: [Tasks]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: "507f1f77bcf86cd799439012"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Active, In Progress, Completed, Cancelled]
 *                 description: New task status
 *                 example: "Cancelled"
 *     responses:
 *       200:
 *         description: Task status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
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
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
  "/:id/status",
  authMiddleware,
  authorizeRoles("admin", "user"),
  updateTaskStatus
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   delete:
 *     summary: Delete a task
 *     description: Delete a task. Only task owner or admin can delete.
 *     tags: [Tasks]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: "507f1f77bcf86cd799439012"
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: "Task deleted successfully"
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
 *         description: Task not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
  "/:id",
  authMiddleware,
  authorizeRoles("user", "admin"),
  deleteTask
);

/**
 * @swagger
 * /api/tasks/{id}/bid:
 *   post:
 *     summary: Submit a bid on a task
 *     description: Submit a bid on a task. Only providers can bid.
 *     tags: [Tasks]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: "507f1f77bcf86cd799439012"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - price
 *               - estimatedTime
 *             properties:
 *               price:
 *                 type: number
 *                 description: Bid price in BDT
 *                 example: 450
 *               estimatedTime:
 *                 type: string
 *                 description: Estimated time to complete the task
 *                 example: "3 hours"
 *               comment:
 *                 type: string
 *                 description: Additional comment from provider
 *                 example: "I have 5 years of professional cleaning experience in Dhaka. Available this week."
 *               recaptchaToken:
 *                 type: string
 *                 description: Google reCAPTCHA v3 token from frontend
 *     responses:
 *       200:
 *         description: Bid submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Already bid on this task or task not active
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
 *       403:
 *         description: Forbidden - Only providers can bid
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
 */
router.post(
  "/:id/bid",
  authMiddleware,
  authorizeRoles("provider"),
  requireKycVerified,
  validateRecaptcha(recaptchaConfig.thresholds.bid, "bid"),
  bidOnTask
);

/**
 * @swagger
 * /api/tasks/{id}/acceptBid/{bidId}:
 *   put:
 *     summary: Accept a bid
 *     description: Accept a bid and assign the provider to the task. Only task owner can accept.
 *     tags: [Tasks]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: "507f1f77bcf86cd799439012"
 *       - in: path
 *         name: bidId
 *         required: true
 *         schema:
 *           type: string
 *         description: Bid ID to accept
 *         example: "507f1f77bcf86cd799439013"
 *     responses:
 *       200:
 *         description: Bid accepted, provider assigned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Task not active or bid not found
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
 *       403:
 *         description: Forbidden - Only task owner can accept bids
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
 */
router.put(
  "/:id/acceptBid/:bidId",
  authMiddleware,
  authorizeRoles("user"),
  acceptBid
);

/**
 * @swagger
 * /api/tasks/{id}/completeTask:
 *   put:
 *     summary: Complete a task with review
 *     description: Mark a task as completed and provide a review for the provider. Only task owner can complete.
 *     tags: [Tasks]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: "507f1f77bcf86cd799439012"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating for the provider (1-5)
 *                 example: 5
 *               comment:
 *                 type: string
 *                 description: Review comment
 *                 example: "Excellent work! The apartment was spotless. Highly recommended."
 *               recommend:
 *                 type: boolean
 *                 description: Whether to recommend the provider
 *                 example: true
 *               subRatings:
 *                 type: object
 *                 description: Sub-ratings for provider performance
 *                 example:
 *                   communication: 5
 *                   punctuality: 5
 *                   quality: 5
 *                   professionalism: 5
 *     responses:
 *       200:
 *         description: Task completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: "Task marked as completed and review added"
 *                 task:
 *                   $ref: '#/components/schemas/Task'
 *                 review:
 *                   $ref: '#/components/schemas/Review'
 *       400:
 *         description: Task not in progress or already completed
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
 *       403:
 *         description: Forbidden - Only task owner can complete
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
 */
router.put(
  "/:id/completeTask",
  authMiddleware,
  authorizeRoles("user"),
  completeTask
);

router.patch(
  "/:id/providerComplete",
  authMiddleware,
  authorizeRoles("provider"),
  taskUpload.array("images", 5),
  providerCompleteTask
);

/**
 * @swagger
 * /api/tasks/{id}:
 *   put:
 *     summary: Update task details
 *     description: Update task details including title, description, budget, etc. Only task owner can update.
 *     tags: [Tasks]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: "507f1f77bcf86cd799439012"
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Task title
 *                 example: "Deep clean my apartment in Gulshan (updated)"
 *               description:
 *                 type: string
 *                 description: Task description
 *                 example: "Updated: also need balcony and windows cleaned."
 *               budget:
 *                 type: number
 *                 description: Budget in BDT
 *                 example: 600
 *               category:
 *                 type: string
 *                 enum: [Cleaning, Plumbing, Electrical, Handyman, Moving, Delivery, Gardening, Tutoring, Tech Support, Other]
 *                 example: "Cleaning"
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-05-20T17:00:00.000Z"
 *               location:
 *                 type: string
 *                 description: JSON string with location details
 *                 example: '{"type":"physical","address":"Flat 5A, Road 11, Banani, Dhaka 1213","lat":23.7937,"lng":90.4066}'
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: New task images (up to 5)
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Only task owner can update
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
 */
router.put(
  "/:id",
  authMiddleware,
  authorizeRoles("user"),
  taskUpload.array("images", 5),
  updateTaskDetails
);

/**
 * @swagger
 * /api/tasks/provider/{providerId}:
 *   get:
 *     summary: Get provider reviews
 *     description: Get all reviews for a specific provider from completed tasks
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Provider's user ID
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: Provider reviews retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ProviderReview'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/provider/:providerId", async (req, res) => {
  try {
    const tasks = await Task.find({
      assignedProvider: req.params.providerId,
      status: "Completed",
      review: { $ne: null },
    })
      .populate("user", "name email profilePhoto location skills isVerified role averageRating totalReviews")
      .populate("review", "rating comment");

    const reviews = tasks.map((task) => ({
      rating: task.review?.rating,
      comment: task.review?.comment,
      reviewer: task.user, // the task poster becomes the reviewer
      task: { title: task.title },
    }));

    res.json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch reviews" });
  }
});

/**
 * @swagger
 * /api/tasks/{taskId}/comment:
 *   post:
 *     summary: Create a comment on a task
 *     description: Add a comment to a task for questions or clarifications
 *     tags: [Tasks]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: "507f1f77bcf86cd799439012"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Comment text
 *                 example: "Is the tap a mixer or standard?"
 *               recaptchaToken:
 *                 type: string
 *                 description: Google reCAPTCHA v3 token from frontend
 *     responses:
 *       200:
 *         description: Comment added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
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
 */
router.post(
  "/:taskId/comment",
  authMiddleware,
  validateRecaptcha(recaptchaConfig.thresholds.comment, "comment"),
  createComment
);

/**
 * @swagger
 * /api/tasks/{taskId}/comment/{commentId}/reply:
 *   post:
 *     summary: Reply to a comment
 *     description: Add a reply to an existing comment on a task
 *     tags: [Tasks]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID
 *         example: "507f1f77bcf86cd799439012"
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID to reply to
 *         example: "507f1f77bcf86cd799439014"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Reply text
 *                 example: "It's a mixer tap."
 *               recaptchaToken:
 *                 type: string
 *                 description: Google reCAPTCHA v3 token from frontend
 *     responses:
 *       200:
 *         description: Reply added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Task or comment not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
  "/:taskId/comment/:commentId/reply",
  authMiddleware,
  validateRecaptcha(recaptchaConfig.thresholds.reply, "reply"),
  replyToComment
);

module.exports = router;
