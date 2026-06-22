const Review = require('../models/Review');
const User   = require('../models/User');
const { computeTrustScore } = require('../services/reviewService');

const getProviderReviews = async (req, res) => {
  try {
    const { providerId } = req.params;
    const provider = await User.findById(providerId);
    if (!provider) return res.status(404).json({ msg: 'Provider not found' });

    const reviews = await Review.find({
      $or: [{ providerId }, { provider: providerId }],
      flaggedForReview: false,
    })
      .sort({ createdAt: -1 })
      .populate('reviewer', 'name email profilePhoto')
      .populate('task', 'title');

    const trustScore = computeTrustScore(provider);

    return res.status(200).json({
      trustScore,
      totalReviews: provider.totalReviews,
      averageRating: provider.averageRating,
      reviews,
    });
  } catch (err) {
    console.error('[getProviderReviews] Error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

const getReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId)
      .populate('reviewer', 'name email profilePhoto')
      .populate('task', 'title');
    if (!review) return res.status(404).json({ msg: 'Review not found' });
    return res.status(200).json(review);
  } catch (err) {
    console.error('[getReview] Error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

module.exports = { getProviderReviews, getReview };
