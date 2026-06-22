const mongoose = require('mongoose');

const subRatingsSchema = new mongoose.Schema({
  communication:   { type: Number, min: 1, max: 5, required: true },
  punctuality:     { type: Number, min: 1, max: 5, required: true },
  quality:         { type: Number, min: 1, max: 5, required: true },
  professionalism: { type: Number, min: 1, max: 5, required: true },
}, { _id: false });

const reviewSchema = new mongoose.Schema({
  taskId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
  providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Legacy aliases kept for existing queries/populates
  task:     { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rating:              { type: Number, min: 1, max: 5, required: true },
  subRatings:          { type: subRatingsSchema, default: null },
  comment:             { type: String, maxlength: 1000, default: '' },
  recommend:           { type: Boolean, default: false },
  reviewerKycVerified: { type: Boolean, default: false },
  flaggedForReview:    { type: Boolean, default: false, index: true },
  moderationReason:    { type: String, default: null },
  moderationNote:      { type: String, default: null },
}, { timestamps: true });

reviewSchema.pre('validate', function syncReviewRefs(next) {
  if (!this.taskId && this.task) this.taskId = this.task;
  if (!this.task && this.taskId) this.task = this.taskId;
  if (!this.providerId && this.provider) this.providerId = this.provider;
  if (!this.provider && this.providerId) this.provider = this.providerId;
  if (!this.reviewerId && this.reviewer) this.reviewerId = this.reviewer;
  if (!this.reviewer && this.reviewerId) this.reviewer = this.reviewerId;
  next();
});

reviewSchema.index({ taskId: 1, reviewerId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
