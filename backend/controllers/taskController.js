// backend/controllers/taskController.js

const Task = require("../models/Task");
const User = require("../models/User");
const Review = require("../models/Review");
const {
  sendTaskCreationEmail,
  sendBidNotificationEmail,
  sendBidAcceptedEmail,
  sendTaskCompletionEmail,
  sendTaskUpdatedEmail,
} = require("../utils/mail");
const Message = require("../models/Message");
const { calculateProviderRank } = require("../services/rankingService");
const { moderateText } = require("../services/reviewService");
const sendNotification = require("../utils/sendnotification.js");

// Create a new task
const createTask = async (req, res) => {
  if (req.recaptchaScore !== undefined) {
    console.log(`[RECAPTCHA] CreateTask - Score: ${req.recaptchaScore}, User: ${req.user.id}`);
  }

  try {
    const { title, description, budget, deadline, category } = req.body;

    // Manually parse location string
    let location;
    if (req.body.location) {
      location = JSON.parse(req.body.location);
    } else {
      return res.status(400).json({ message: "Missing location field" });
    }

    // Validate required fields first
    if (!title || !description || !budget || !category || !location) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const normalizedCategory = Task.normalizeCategory(category);
    if (!normalizedCategory) {
      return res.status(400).json({
        message: "Invalid category",
        allowedCategories: Task.categories,
      });
    }

    // Validate location type
    if (location.type === "physical") {
      if (!location.address || location.lat == null || location.lng == null) {
        return res.status(400).json({
          message: "Physical location requires address, lat, and lng",
        });
      }
    } else if (location.type !== "remote") {
      return res
        .status(400)
        .json({ message: "Location type must be 'physical' or 'remote'" });
    }

    const imageUrls = req.files?.map((file) => file.path) || [];

    const newTask = new Task({
      title,
      description,
      budget,
      ...(deadline && { deadline }),
      user: req.user.id, // Logged-in user
      location, // Save location object directly
      images: imageUrls, // Save image paths (from Cloudinary or wherever)
      category: normalizedCategory,
    });

    const savedTask = await newTask.save();
    // sendTaskCreationEmail(req.user.email, req.user.name, savedTask.title); // Send email notification to the user
    res.status(201).json(savedTask);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Get all tasks
const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find().populate("user", "name email"); // Populate user details
    res.json(tasks);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

const getTasksWeb = async (req, res) => {
  try {
    const tasks = await Task.find()
      .populate("user", "name email")
      .populate("bids.provider", "name email")
      .populate("assignedProvider"); // Populate user details
    res.json(tasks);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Get a single task by ID
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate(
      "user",
      "name email"
    );
    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }
    res.json(task);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Get a single task, users, providers, comments related to a task
const getTaskData = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("user", "name email")
      .populate("comments.user")
      .populate("comments.replies.user")
      .populate("bids.provider")
      .populate("assignedProvider");
    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }
    res.json(task);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Update task status (active, completed, cancelled)
const updateTaskStatus = async (req, res) => {
  const { status } = req.body;

  try {
    let task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }

    // Only the task poster or admin can update status
    if (task.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ msg: "Not authorized to update task status" });
    }

    task.status = status;
    await task.save();
    res.json(task);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Delete a task
const deleteTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }

    // Only the user who posted the task or an admin can delete the task
    if (task.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ msg: "Not authorized to delete task" });
    }

    // Use deleteOne() to remove the task
    await Task.deleteOne({ _id: req.params.id });

    res.json({ msg: "Task deleted" });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Bid on a task
const bidOnTask = async (req, res) => {
  if (req.recaptchaScore !== undefined) {
    console.log(`[RECAPTCHA] Bid - Score: ${req.recaptchaScore}, User: ${req.user.id}`);
  }

  const { price, estimatedTime, comment } = req.body;

  try {
    const task = await Task.findById(req.params.id).populate(
      "user",
      "email fcmToken"
    );
    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }

    const provider = await User.findById(req.user.id).select("name kyc isVerified");
    if (!provider) return res.status(404).json({ msg: "Provider not found" });

    const providerKycVerified =
      provider.kyc?.status === "verified" || provider.isVerified === true;
    if (!providerKycVerified) {
      return res.status(403).json({
        msg: "Complete KYC verification before placing a bid.",
        code: "KYC_REQUIRED",
      });
    }

    // Add the bid to the task's bids array
    task.bids.push({
      provider: req.user.id,
      price,
      comment: comment || "",
      estimatedTime,
    });

    await task.save();
    //push notification to task poster
    if (task.user.fcmToken) {
      await sendNotification(
        task.user.fcmToken,
        "New Offer Received",
        `${provider.name} has offered $${price} for your task.`,
        { taskId: task._id.toString(), type: "task" }
      );
    } else {
      console.warn("No FCM token found for user.");
    }
    // sendBidNotificationEmail(task.user.email, task.title, req.user.name); // Send email notification to the task poster
    res.json(task);
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

// Accept a bid and assign a provider to the task, updating the task status to "In Progress"
const acceptBid = async (req, res) => {
  const { id, bidId } = req.params;

  try {
    // Find the task by ID
    const task = await Task.findById(id).populate(
      "bids.provider",
      "email fcmToken"
    );
    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }

    // Ensure the user is the one who posted the task
    if (task.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ msg: "Only the task poster can accept a bid" });
    }

    // Find the bid in the task's bids array
    const bid = task.bids.find((bid) => bid._id.toString() === bidId);
    if (!bid) {
      return res.status(404).json({ msg: "Bid not found" });
    }

    // Set the assigned provider and update the task status
    task.assignedProvider = bid.provider;
    task.status = "In Progress";

    await task.save();
    // Send push notification to provider
    const provider = bid.provider;
    if (provider.fcmToken) {
      await sendNotification(
        provider.fcmToken,
        "Offer Accepted!",
        `${req.user.name} has accepted your offer for the task. View task now!`,
        { taskId: task._id.toString(), type: "task" }
      );
    } else {
      console.warn("No FCM token found for accepted provider.");
    }
    // sendBidAcceptedEmail(
    //   bid.provider.email,
    //   task.title
    // ); // Send email notification to the provider

    //  await Message.create({
    //   taskId: task._id,
    //   sender: req.user.id, // Task owner
    //   receiver: bid.provider, // Assigned provider
    //   text: "Chat started. You can now communicate with the service provider.",
    //   isSystem: true,
    // });

    res.json({ msg: "Bid accepted", task });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// Complete Task and Provide a Review
const completeTask = async (req, res) => {
  const { id } = req.params;
  const { rating, comment, recommend, subRatings } = req.body;

  // Validate sub-ratings if provided
  if (subRatings) {
    const fields = ['communication', 'punctuality', 'quality', 'professionalism'];
    const valid = fields.every(f => Number.isInteger(subRatings[f]) && subRatings[f] >= 1 && subRatings[f] <= 5);
    if (!valid) {
      return res.status(400).json({ msg: 'All four sub-ratings (communication, punctuality, quality, professionalism) must be integers 1–5' });
    }
  }

  try {
    // Find the task by ID
    const task = await Task.findById(id).populate("assignedProvider");
    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }

    // Ensure the user is the one who posted the task
    if (task.user.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ msg: "Only the task poster can mark a task as completed" });
    }

    // Check if task is already completed
    if (task.status === "Completed" || task.review) {
      return res.status(400).json({ msg: "Task is already completed" });
    }

    // Find the provider of the task
    const provider = task.assignedProvider;
    if (!provider) {
      return res.status(404).json({ msg: "Assigned provider not found" });
    }

    // Mark task as completed
    task.status = "Completed";

    // Increment recommendations
    if (recommend) {
      provider.recommendations = (provider.recommendations || 0) + 1;
    }

    // Ensure recommendations field exists
    provider.recommendations = provider.recommendations || 0;

    // Update the provider's average rating and total reviews
    provider.totalReviews += 1;
    provider.averageRating = Math.round(
      ((provider.averageRating * (provider.totalReviews - 1) + rating) /
        provider.totalReviews) * 10
    ) / 10; // Recalculate average rating

    // Increment completed tasks
    provider.completedTasks = (provider.completedTasks || 0) + 1;

    // Calculate and assign rank
    provider.rank = calculateProviderRank({
      averageRating: provider.averageRating,
      completedTasks: provider.completedTasks,
      recommendations: provider.recommendations,
      kyc: provider.kyc,
    });

    await provider.save(); // Save updated provider info

    // Read reviewer KYC status
    const reviewer = await User.findById(req.user.id).select('kyc name');
    const kycVerified = reviewer?.kyc?.status === 'verified';

    // Run text moderation
    const mod = moderateText(comment);

    const providerId = provider._id || provider.id;
    const existingReview = await Review.findOne({
      taskId: task._id,
      reviewerId: req.user.id,
    });
    if (existingReview) {
      return res.status(409).json({ msg: "Review already submitted for this task" });
    }

    // Create Review document (taskId/reviewerId match DB unique index)
    const review = new Review({
      taskId:              task._id,
      providerId,
      reviewerId:          req.user.id,
      task:                task._id,
      provider:            providerId,
      reviewer:            req.user.id,
      rating,
      subRatings:          subRatings || null,
      comment:             comment || '',
      recommend:           recommend || false,
      reviewerKycVerified: kycVerified,
      flaggedForReview:    mod.flagged,
      moderationReason:    mod.reason,
    });
    await review.save();

    // Update task.review to reference the Review document
    task.review = review._id;
    await task.save(); // Save the task with updated status and review

    // Socket.IO real-time notification to provider
    const io = req.app.get('io');
    if (io) {
      io.to(provider._id.toString()).emit('reviewReceived', {
        reviewId:            review._id,
        taskId:              task._id,
        taskTitle:           task.title,
        overallRating:       review.rating,
        subRatings:          review.subRatings,
        reviewerName:        reviewer?.name,
        reviewerKycVerified: review.reviewerKycVerified,
      });
    }

    // FCM push notification (fire and forget)
    if (provider.fcmToken) {
      sendNotification(provider.fcmToken, 'New Review', `You received a new review — ${task.title}`).catch(() => {});
    }

    // sendTaskCompletionEmail(
    //   provider.email,
    //   task.title
    // ); // Send email notification to the provider

    try {
      const { schedulePayoutForTask } = require("../services/payoutService");
      await schedulePayoutForTask(task._id.toString());
    } catch (payoutErr) {
      console.error("[completeTask] Payout scheduling failed:", payoutErr.message);
    }

    res.status(200).json({ msg: 'Task marked as completed and review added', task, review });
  } catch (err) {
    console.error("[completeTask] Error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ msg: "Review already submitted for this task" });
    }
    res.status(500).json({ msg: "Server error" });
  }
};

// Create a Comment
const createComment = async (req, res) => {
  if (req.recaptchaScore !== undefined) {
    console.log(`[RECAPTCHA] Comment - Score: ${req.recaptchaScore}, User: ${req.user.id}`);
  }

  const { text } = req.body;
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ msg: "Task not found" });

    const newComment = {
      user: req.user.id,
      text,
    };

    task.comments.push(newComment);
    await task.save();

    // Get commenter name
    const commenter = await User.findById(req.user.id);
    // Find the poster of the task
    const poster = await User.findById(task.user);
    if (!poster) {
      return res.status(404).json({ msg: "Poster not found" });
    }

    if (poster._id.toString() !== req.user.id.toString()){
      if (poster.fcmToken) {
        await sendNotification(
          poster.fcmToken,
          "New comment",
          `${commenter?.name ?? "Someone"} commented on your task.`,
          { taskId: task._id.toString(), type: "task" }
        );
      } else {
        console.warn("No FCM token found for accepted provider.");
      }
    }

    res.status(201).json(newComment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// Reply to a Comment
const replyToComment = async (req, res) => {
  if (req.recaptchaScore !== undefined) {
    console.log(`[RECAPTCHA] Reply - Score: ${req.recaptchaScore}, User: ${req.user.id}`);
  }

  const { text } = req.body;
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ msg: "Task not found" });

    const comment = task.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ msg: "Comment not found" });

    const newReply = {
      user: req.user.id,
      text,
    };

    comment.replies.push(newReply);
    await task.save();

    const originalCommenter = await User.findById(comment.user);
    if (originalCommenter?.fcmToken) {
      await sendNotification(
        originalCommenter.fcmToken,
        "New reply",
        `${req.user.name ?? "Someone"} replied to your comment.`,
        { taskId: task._id.toString(), type: "reply" }
      );
    }

    const reply = comment.replies[comment.replies.length - 1];
    res.status(201).json({
      ...reply.toObject(),
      user: {
        _id: req.user.id,
        name: req.user.name,
        profilePhoto: req.user.profilePhoto,
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

const updateTaskDetails = async (req, res) => {
  const { title, description, budget, deadline, category } = req.body;

  let location;
  if (req.body.location) {
    try {
      location = JSON.parse(req.body.location); // parse location JSON string
    } catch (err) {
      return res.status(400).json({ msg: "Invalid location format" });
    }
  }

  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }

    if (task.bids.length > 0) {
      return res
        .status(400)
        .json({ msg: "Cannot update task after bids have been placed" });
    }

    const normalizedCategory = category ? Task.normalizeCategory(category) : null;
    if (category && !normalizedCategory) {
      return res.status(400).json({
        msg: "Invalid category",
        allowedCategories: Task.categories,
      });
    }

    // Only update fields that are provided
    if (title) task.title = title;
    if (description) task.description = description;
    if (budget) task.budget = budget;
    if (deadline) task.deadline = deadline;
    if (normalizedCategory) task.category = normalizedCategory;

    if (location) {
      // Validate structure like in createTask if needed
      if (location.type === "physical") {
        if (!location.address || location.lat == null || location.lng == null) {
          return res.status(400).json({ msg: "Invalid physical location" });
        }
      } else if (location.type !== "remote") {
        return res
          .status(400)
          .json({ msg: "Location type must be 'physical' or 'remote'" });
      }

      task.location = location;
    }

    await task.save();

    // sendTaskUpdatedEmail(req.user.email, task.title);

    res.json({ msg: "Task updated successfully", task });
  } catch (error) {
    console.error(error.message);
    res.status(500).send("Server error");
  }
};

const providerCompleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ msg: "Task not found" });
    }

    if (task.status !== "In Progress") {
      return res.status(400).json({ msg: "Task must be in progress to submit completion" });
    }

    const providerId = String(task.assignedProvider || "");
    if (!providerId || providerId !== String(req.user.id)) {
      return res.status(403).json({ msg: "Only the assigned provider can submit completion" });
    }

    if (task.completionSubmission?.status === "pending_approval") {
      return res.status(400).json({ msg: "Completion already submitted and pending approval" });
    }

    const notes = String(req.body?.notes || "").trim();
    const imageUrls = req.files?.map((file) => file.path) || [];

    if (!notes && imageUrls.length === 0) {
      return res.status(400).json({ msg: "Please add completion notes or at least one image" });
    }

    task.completionSubmission = {
      notes,
      images: imageUrls,
      status: "pending_approval",
      submittedAt: new Date(),
      reviewedAt: null,
    };

    await task.save();

    const owner = await User.findById(task.user).select("email name");
    if (owner?.email) {
      try {
        await sendTaskCompletionEmail(owner.email, task.title);
      } catch (mailErr) {
        console.warn("[providerCompleteTask] Email failed:", mailErr.message);
      }
    }

    res.json({
      msg: "Completion submitted for review",
      task,
    });
  } catch (err) {
    console.error("[providerCompleteTask] Error:", err);
    res.status(500).json({ msg: "Server error" });
  }
};

module.exports = {
  createTask,
  getTasks,
  getTask,
  getTaskData,
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
};
