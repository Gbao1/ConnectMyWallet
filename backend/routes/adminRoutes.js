// backend/routes/adminRoutes.js

const express = require("express");
const {
  getAllUsers,
  getAllProviders,
  getUserById,
  deleteUser,
  verifyUser,
  changeUserRole,
  changeUserRank,
  getAllTasks,
  deleteTask,
  editTaskByAdmin,
  deleteComment,
  deleteReply,
  getFlaggedReviews,
  dismissReview,
  deleteReview,
  getFlaggedAccountsWithFingerprints,
  getFingerprintNetwork,
} = require("../controllers/adminController");

const {
  listFraudActivities,
  updateFraudActivity,
  getFraudActivityStats,
} = require("../controllers/adminFraudActivityController");

const {
  authMiddleware,
  authorizeRoles,
} = require("../middlewares/authMiddleware");

const router = express.Router();

// All routes protected by admin role
router.use(authMiddleware, authorizeRoles("admin"));

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve all users in the system (admin only)
 *     tags: [Admin]
 *     security:
 *       - JWTAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/users", getAllUsers);

/**
 * @swagger
 * /api/admin/providers:
 *   get:
 *     summary: Get all providers
 *     description: Retrieve all users with provider role (admin only)
 *     tags: [Admin]
 *     security:
 *       - JWTAuth: []
 *     responses:
 *       200:
 *         description: List of providers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/providers", getAllProviders);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     description: Retrieve a specific user by their ID (admin only)
 *     tags: [Admin]
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
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
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
router.get("/users/:id", getUserById);

/**
 * @swagger
 * /api/admin/user/{id}:
 *   delete:
 *     summary: Delete a user
 *     description: Permanently delete a user from the system (admin only)
 *     tags: [Admin]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to delete
 *         example: "507f1f77bcf86cd799439011"
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: "User deleted successfully"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
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
router.delete("/user/:id", deleteUser);

/**
 * @swagger
 * /api/admin/users/{id}/verify:
 *   put:
 *     summary: Verify a user
 *     description: Toggle user verification status (admin only)
 *     tags: [Admin]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to verify
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isVerified
 *             properties:
 *               isVerified:
 *                 type: boolean
 *                 description: Verification status
 *                 example: true
 *     responses:
 *       200:
 *         description: User verification status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
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
router.put("/users/:id/verify", verifyUser);

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   put:
 *     summary: Change user role
 *     description: Change a user's role (user, provider, admin) - admin only
 *     tags: [Admin]
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [user, provider, admin]
 *                 description: New role for the user
 *                 example: "provider"
 *     responses:
 *       200:
 *         description: User role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid role
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
 *         description: Forbidden - Admin access required
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
router.put("/users/:id/role", changeUserRole);

/**
 * @swagger
 * /api/admin/users/{id}/rank:
 *   put:
 *     summary: Change provider rank
 *     description: Manually change a provider's rank (Bronze, Silver, Gold, Platinum) - admin only
 *     tags: [Admin]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Provider's user ID
 *         example: "507f1f77bcf86cd799439011"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rank
 *             properties:
 *               rank:
 *                 type: string
 *                 enum: [Bronze, Silver, Gold, Platinum]
 *                 description: New rank for the provider
 *                 example: "Gold"
 *     responses:
 *       200:
 *         description: Provider rank updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid rank
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
 *         description: Forbidden - Admin access required
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
router.put("/users/:id/rank", changeUserRank);

/**
 * @swagger
 * /api/admin/tasks:
 *   get:
 *     summary: Get all tasks
 *     description: Retrieve all tasks in the system (admin only)
 *     tags: [Admin]
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
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/tasks", getAllTasks);

/**
 * @swagger
 * /api/admin/task/{id}:
 *   delete:
 *     summary: Delete a task
 *     description: Permanently delete a task from the system (admin only)
 *     tags: [Admin]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID to delete
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
 *         description: Forbidden - Admin access required
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
router.delete("/task/:id", deleteTask);

/**
 * @swagger
 * /api/admin/tasks/{id}/edit:
 *   put:
 *     summary: Edit task by admin
 *     description: Edit any task details as admin
 *     tags: [Admin]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Task ID to edit
 *         example: "507f1f77bcf86cd799439012"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Task title
 *                 example: "Updated task title"
 *               description:
 *                 type: string
 *                 description: Task description
 *                 example: "Updated task description"
 *               budget:
 *                 type: number
 *                 description: Budget in AUD
 *                 example: 200
 *               status:
 *                 type: string
 *                 enum: [Active, In Progress, Completed, Cancelled]
 *                 example: "Active"
 *               category:
 *                 type: string
 *                 enum: [Cleaning, Plumbing, Electrical, Handyman, Moving, Delivery, Gardening, Tutoring, Tech Support, Other]
 *                 example: "Plumbing"
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
 *         description: Forbidden - Admin access required
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
router.put("/tasks/:id/edit", editTaskByAdmin);

/**
 * @swagger
 * /api/admin/tasks/{taskId}/comments/{commentId}:
 *   delete:
 *     summary: Delete a comment
 *     description: Delete a comment from a task (admin only)
 *     tags: [Admin]
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
 *         description: Comment ID to delete
 *         example: "507f1f77bcf86cd799439014"
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: "Comment deleted successfully"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
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
router.delete("/tasks/:taskId/comments/:commentId", deleteComment);

/**
 * @swagger
 * /api/admin/tasks/{taskId}/comments/{commentId}/replies/{replyId}:
 *   delete:
 *     summary: Delete a reply
 *     description: Delete a reply from a comment (admin only)
 *     tags: [Admin]
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
 *         description: Comment ID
 *         example: "507f1f77bcf86cd799439014"
 *       - in: path
 *         name: replyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Reply ID to delete
 *         example: "507f1f77bcf86cd799439015"
 *     responses:
 *       200:
 *         description: Reply deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: "Reply deleted successfully"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Task, comment, or reply not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/tasks/:taskId/comments/:commentId/replies/:replyId", deleteReply);
router.get("/fraud", listFraudActivities);
router.get("/fraud/stats", getFraudActivityStats);
router.patch("/fraud/:id", updateFraudActivity);
router.get("/fraud/flagged-accounts", getFlaggedAccountsWithFingerprints);
router.get("/fraud/device-network", getFingerprintNetwork);

/**
 * @swagger
 * /api/admin/reviews/flagged:
 *   get:
 *     summary: Get all flagged reviews
 *     description: Retrieve all reviews flagged for moderation (admin only)
 *     tags: [Admin]
 *     security:
 *       - JWTAuth: []
 *     responses:
 *       200:
 *         description: List of flagged reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FlaggedReview'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/reviews/flagged", getFlaggedReviews);

/**
 * @swagger
 * /api/admin/reviews/{reviewId}/dismiss:
 *   patch:
 *     summary: Dismiss a flagged review
 *     description: Clear the flag on a review and optionally add a moderation note (admin only)
 *     tags: [Admin]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID
 *         example: "507f1f77bcf86cd799439099"
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               moderationNote:
 *                 type: string
 *                 description: Optional note explaining why the flag was dismissed
 *                 example: "Reviewed and found no policy violation"
 *     responses:
 *       200:
 *         description: Review flag dismissed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: "Review flag dismissed"
 *                 review:
 *                   $ref: '#/components/schemas/Review'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Review not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/reviews/:reviewId/dismiss", dismissReview);

/**
 * @swagger
 * /api/admin/reviews/{reviewId}:
 *   delete:
 *     summary: Delete a review
 *     description: Permanently delete a review and revert provider stats (admin only)
 *     tags: [Admin]
 *     security:
 *       - JWTAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: string
 *         description: Review ID to delete
 *         example: "507f1f77bcf86cd799439099"
 *     responses:
 *       200:
 *         description: Review deleted and provider stats updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 msg:
 *                   type: string
 *                   example: "Review deleted and provider stats updated"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Review not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/reviews/:reviewId", deleteReview);

module.exports = router;
