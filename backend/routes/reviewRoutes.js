// routes/reviewRoutes.js

const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware');
const { getProviderReviews, getReview } = require('../controllers/reviewController');

const router = express.Router();

/**
 * @swagger
 * /api/reviews/provider/{providerId}:
 *   get:
 *     summary: Get all reviews for a provider
 *     description: Returns all non-flagged reviews for a provider along with trust score and rating stats.
 *     tags: [Reviews]
 *     security:
 *       - JWTAuth: []
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
 *               $ref: '#/components/schemas/ProviderReviewsResponse'
 *       404:
 *         description: Provider not found
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/provider/:providerId', authMiddleware, getProviderReviews);

/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   get:
 *     summary: Get a single review by ID
 *     description: Returns the full review document including reviewer and task details.
 *     tags: [Reviews]
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
 *     responses:
 *       200:
 *         description: Review retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Review'
 *       404:
 *         description: Review not found
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
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:reviewId', authMiddleware, getReview);

module.exports = router;
