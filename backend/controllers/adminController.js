const User = require("../models/User");
const Task = require("../models/Task");
const Review = require("../models/Review");
const { calculateProviderRank } = require("../services/rankingService");

// Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get all providers
const getAllProviders = async (req, res) => {
  try {
    const providers = await User.find({ role: "provider" }).select("-password");
    res.json(providers);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get single user
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a user/provider
const deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Verify a user
const verifyUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    );
    res.json({ message: "User verified", user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Change user role
const changeUserRole = async (req, res) => {
  const { role } = req.body;
  if (!["user", "provider", "admin"].includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    );
    res.json({ message: "Role updated", user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Change provider rank
const changeUserRank = async (req, res) => {
  const { rank } = req.body;
  if (!["Bronze", "Silver", "Gold", "Platinum"].includes(rank)) {
    return res.status(400).json({ message: "Invalid rank" });
  }
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { rank },
      { new: true }
    );
    res.json({ message: "Rank updated", user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Get all tasks
const getAllTasks = async (req, res) => {
  try {
    const tasks = await Task.find().populate("user", "name email");
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete task
const deleteTask = async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Edit task by admin
const editTaskByAdmin = async (req, res) => {
  try {
    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.json({ message: "Task updated", task: updatedTask });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete comment
const deleteComment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    task.comments = task.comments.filter(
      (comment) => comment._id.toString() !== req.params.commentId
    );
    await task.save();
    res.json({ message: "Comment deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Delete reply
const deleteReply = async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: "Task not found" });

    const comment = task.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });

    comment.replies = comment.replies.filter(
      (reply) => reply._id.toString() !== req.params.replyId
    );
    await task.save();

    res.json({ message: "Reply deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

const getFlaggedReviews = async (req, res) => {
  try {
    const flagged = await Review.find({ flaggedForReview: true })
      .populate('reviewer', 'name')
      .populate('provider', 'name')
      .populate('task', 'title')
      .sort({ createdAt: -1 });
    return res.status(200).json(flagged);
  } catch (err) {
    console.error('[getFlaggedReviews] Error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

const dismissReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ msg: 'Review not found' });
    review.flaggedForReview = false;
    review.moderationNote = req.body.moderationNote || '';
    await review.save();
    return res.status(200).json({ msg: 'Review flag dismissed', review });
  } catch (err) {
    console.error('[dismissReview] Error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ msg: 'Review not found' });

    const provider = await User.findById(review.provider);
    if (provider) {
      const newTotal = provider.totalReviews - 1;
      const newAvg   = newTotal === 0
        ? 0
        : Math.round(((provider.averageRating * provider.totalReviews) - review.rating) / newTotal * 10) / 10;
      provider.totalReviews  = Math.max(newTotal, 0);
      provider.averageRating = newAvg;
      provider.rank = calculateProviderRank({
        averageRating:   newAvg,
        completedTasks:  provider.completedTasks,
        recommendations: provider.recommendations,
        kyc:             provider.kyc,
      });
      await provider.save();
    }

    await Task.findByIdAndUpdate(review.task, { review: null });
    await Review.findByIdAndDelete(req.params.reviewId);

    return res.status(200).json({ msg: 'Review deleted and provider stats updated' });
  } catch (err) {
    console.error('[deleteReview] Error:', err);
    return res.status(500).json({ msg: 'Server error' });
  }
};

// Fraud dashboard: list flagged accounts with fingerprints
const getFlaggedAccountsWithFingerprints = async (req, res) => {
  try {
    const flaggedUsers = await User.find({ "fraudFlags.isFlagged": true })
      .select(
        "name email role fraudFlags deviceFingerprints createdAt updatedAt isVerified"
      )
      .sort({ "fraudFlags.flaggedAt": -1 });

    return res.json({
      count: flaggedUsers.length,
      users: flaggedUsers,
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

// Fraud dashboard: network view of fingerprints used by multiple accounts
const getFingerprintNetwork = async (req, res) => {
  const minSharedAccounts = Number(req.query.minSharedAccounts || 2);

  try {
    const network = await User.aggregate([
      { $unwind: "$deviceFingerprints" },
      {
        $group: {
          _id: "$deviceFingerprints.fingerprintId",
          accountCount: { $sum: 1 },
          users: {
            $push: {
              userId: "$_id",
              name: "$name",
              email: "$email",
              role: "$role",
              isFlagged: "$fraudFlags.isFlagged",
              flaggedAt: "$fraudFlags.flaggedAt",
              platform: "$deviceFingerprints.platform",
              source: "$deviceFingerprints.source",
              lastSeenAt: "$deviceFingerprints.lastSeenAt",
            },
          },
        },
      },
      { $match: { accountCount: { $gte: minSharedAccounts } } },
      { $sort: { accountCount: -1 } },
    ]);

    return res.json({
      minSharedAccounts,
      count: network.length,
      fingerprints: network.map((entry) => ({
        fingerprintId: entry._id,
        accountCount: entry.accountCount,
        users: entry.users,
      })),
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
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
};
