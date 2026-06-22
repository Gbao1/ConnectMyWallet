// backend/models/Task.js

const mongoose = require("mongoose");

const TASK_CATEGORIES = [
  "Cleaning",
  "Plumbing",
  "Electrical",
  "Handyman",
  "Moving",
  "Delivery",
  "Gardening",
  "Tutoring",
  "Tech Support",
  "Other",
];

const replySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: { type: String, required: true },
  date: { type: Date, default: Date.now },
});

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: { type: String, required: true },
  date: { type: Date, default: Date.now },
  replies: [replySchema], // ➡️ multiple replies inside each comment
});


const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    budget: {
      type: Number,
      required: true,
    },
    deadline: {
      type: Date,
      required: false,
    },
    status: {
      type: String,
      enum: ["Active", "In Progress", "Completed", "Cancelled"],
      default: "Active",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bids: [
      {
        provider: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        price: Number,
        estimatedTime: { type: String, required: true },
        comment: {
          type: String,    
          default: '',
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    location: {
      type: {
        type: String,
        enum: ['remote', 'physical'],
        required: true,
      },
      address: {
        type: String,
        required: function () {
          return this.type === 'physical'; // Only required if physical
        },
      },
      lat: {
        type: Number,
        required: function () {
          return this.type === 'physical';
        },
      },
      lng: {
        type: Number,
        required: function () {
          return this.type === 'physical';
        },
      },
    },
    
    assignedProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    review: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Review',
      default: null,
    },
    images: [{ type: String }],
    comments: [commentSchema],
    category: {
      type: String,
      enum: TASK_CATEGORIES,
      required: true,
    },
    completionSubmission: {
      notes: { type: String, default: "" },
      images: [{ type: String }],
      status: {
        type: String,
        enum: ["pending_approval", "approved", "rejected"],
        default: "pending_approval",
      },
      submittedAt: { type: Date },
      reviewedAt: { type: Date },
    },
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", TaskSchema);

Task.categories = TASK_CATEGORIES;
Task.normalizeCategory = (category) => {
  if (!category) return category;

  const normalizedCategory = String(category)
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  return TASK_CATEGORIES.find(
    (allowedCategory) => allowedCategory.toLowerCase() === normalizedCategory
  );
};

module.exports = Task;
