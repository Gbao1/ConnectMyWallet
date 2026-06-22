// Tests for completeTask in taskController
// All DB models and external services are mocked — no real DB or network calls

const express = require('express');
const request = require('supertest');

// ---------------------------------------------------------------------------
// Mocks (hoisted by Jest)
// ---------------------------------------------------------------------------

jest.mock('../models/Task', () => {
  const mockSave = jest.fn().mockResolvedValue({});
  const MockTask = jest.fn();
  MockTask.findById = jest.fn();
  MockTask._mockSave = mockSave;
  return MockTask;
});

jest.mock('../models/User', () => {
  const MockUser = jest.fn();
  MockUser.findById = jest.fn();
  return MockUser;
});

jest.mock('../models/Review', () => {
  const mockSave = jest.fn().mockResolvedValue({});
  const MockReview = jest.fn().mockImplementation((data) => ({
    _id: 'review123',
    ...data,
    save: mockSave,
  }));
  MockReview.findOne = jest.fn().mockResolvedValue(null);
  MockReview._mockSave = mockSave;
  return MockReview;
});

jest.mock('../models/Message', () => ({}));

jest.mock('../services/rankingService', () => ({
  calculateProviderRank: jest.fn().mockReturnValue('Silver'),
}));

jest.mock('../services/reviewService', () => ({
  moderateText: jest.fn().mockReturnValue({ flagged: false, reason: null }),
}));

jest.mock('../utils/sendnotification', () => jest.fn().mockResolvedValue({}));

jest.mock('../utils/mail', () => ({
  sendTaskCreationEmail:    jest.fn(),
  sendBidNotificationEmail: jest.fn(),
  sendBidAcceptedEmail:     jest.fn(),
  sendTaskCompletionEmail:  jest.fn(),
  sendTaskUpdatedEmail:     jest.fn(),
}));

jest.mock('../middlewares/authMiddleware', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: 'userId123', role: 'user' };
    next();
  },
  authorizeRoles: () => (req, res, next) => next(),
  requireEmailVerified: (req, res, next) => next(),
  requireKycVerified: (req, res, next) => next(),
}));

jest.mock('../middlewares/recaptcha', () => ({
  validateRecaptcha: () => (req, res, next) => next(),
}));

jest.mock('../middlewares/taskUpload', () => ({
  array: () => (req, res, next) => next(),
}));

jest.mock('../config/recaptcha.config', () => ({
  enabled: false,
  thresholds: {
    createTask: 0.5,
    bid:        0.4,
    comment:    0.3,
    reply:      0.3,
    message:    0.3,
  },
}));

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

const taskRoutes = require('../routes/taskRoutes');
const Task = require('../models/Task');
const User = require('../models/User');
const Review = require('../models/Review');
const { calculateProviderRank } = require('../services/rankingService');
const { moderateText } = require('../services/reviewService');
const sendNotification = require('../utils/sendnotification');

// Build a mock provider with a save fn
function makeMockProvider(overrides = {}) {
  const mockSave = jest.fn().mockResolvedValue({});
  return {
    _id: 'providerId123',
    fcmToken: null,
    totalReviews: 2,
    averageRating: 4.0,
    completedTasks: 2,
    recommendations: 1,
    kyc: null,
    save: mockSave,
    _mockSave: mockSave,
    ...overrides,
  };
}

// Build a mock task
function makeMockTask(overrides = {}) {
  const mockSave = jest.fn().mockResolvedValue({});
  return {
    _id: 'taskId123',
    title: 'Fix leaky tap',
    user: { toString: () => 'userId123' },
    status: 'In Progress',
    review: null,
    assignedProvider: makeMockProvider(),
    save: mockSave,
    _mockSave: mockSave,
    ...overrides,
  };
}

const app = express();
app.use(express.json());

// Attach a mock io to the app
const mockIo = { to: jest.fn().mockReturnThis(), emit: jest.fn() };
app.set('io', mockIo);

app.use('/api/tasks', taskRoutes);

// ---------------------------------------------------------------------------
// Suite: completeTask additions
// ---------------------------------------------------------------------------

describe('PUT /api/tasks/:id/completeTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset io mocks
    mockIo.to.mockReturnThis();
    mockIo.emit.mockReset();
    // Reset moderateText default
    moderateText.mockReturnValue({ flagged: false, reason: null });
  });

  test('returns 400 if subRatings provided with fewer than 4 fields', async () => {
    const res = await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 5, subRatings: { communication: 5, punctuality: 4 } });

    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/sub-ratings/);
  });

  test('returns 400 if any sub-rating is outside 1–5 range', async () => {
    const res = await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({
        rating: 5,
        subRatings: { communication: 5, punctuality: 4, quality: 6, professionalism: 5 },
      });

    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/sub-ratings/);
  });

  test('returns 400 if any sub-rating is a float (not integer)', async () => {
    const res = await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({
        rating: 5,
        subRatings: { communication: 5, punctuality: 4.5, quality: 5, professionalism: 5 },
      });

    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/sub-ratings/);
  });

  test('creates a Review document on successful completion', async () => {
    const mockTask = makeMockTask();
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ kyc: null, name: 'Jane' }) });

    const res = await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 5, comment: 'Great work' });

    expect(res.status).toBe(200);
    expect(Review).toHaveBeenCalledTimes(1);
    expect(Review._mockSave).toHaveBeenCalledTimes(1);
  });

  test('sets task.review to the new Review _id', async () => {
    const mockTask = makeMockTask();
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ kyc: null, name: 'Jane' }) });

    await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 4, comment: 'Good' });

    expect(mockTask.review).toBe('review123');
  });

  test('sets reviewerKycVerified: true when reviewer kyc.status is verified', async () => {
    const mockTask = makeMockTask();
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ kyc: { status: 'verified' }, name: 'Jane' }) });

    await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 5, comment: 'Verified reviewer' });

    const reviewConstructorArg = Review.mock.calls[0][0];
    expect(reviewConstructorArg.reviewerKycVerified).toBe(true);
  });

  test('sets reviewerKycVerified: false when kyc.status is not verified', async () => {
    const mockTask = makeMockTask();
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ kyc: { status: 'pending' }, name: 'Jane' }) });

    await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 4, comment: 'Unverified reviewer' });

    const reviewConstructorArg = Review.mock.calls[0][0];
    expect(reviewConstructorArg.reviewerKycVerified).toBe(false);
  });

  test('calls moderateText with the submitted comment', async () => {
    const mockTask = makeMockTask();
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ kyc: null, name: 'Jane' }) });

    await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 4, comment: 'Solid work' });

    expect(moderateText).toHaveBeenCalledWith('Solid work');
  });

  test('sets flaggedForReview: true when moderateText returns flagged — but still returns 200', async () => {
    moderateText.mockReturnValueOnce({ flagged: true, reason: 'Excessive uppercase text' });
    const mockTask = makeMockTask();
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ kyc: null, name: 'Jane' }) });

    const res = await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 2, comment: 'TERRIBLE WORK' });

    expect(res.status).toBe(200);
    const reviewConstructorArg = Review.mock.calls[0][0];
    expect(reviewConstructorArg.flaggedForReview).toBe(true);
    expect(reviewConstructorArg.moderationReason).toBe('Excessive uppercase text');
  });

  test('returns 400 when task already has a review (task.review already set)', async () => {
    const mockTask = makeMockTask({ review: 'existingReviewId' });
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });

    const res = await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 5 });

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe('Task is already completed');
  });

  test('returns 400 when task.status is already Completed', async () => {
    const mockTask = makeMockTask({ status: 'Completed', review: null });
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });

    const res = await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 5 });

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe('Task is already completed');
  });

  test('emits reviewReceived Socket.IO event to provider room', async () => {
    const mockTask = makeMockTask();
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ kyc: null, name: 'Jane' }) });

    await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 5, comment: 'Good' });

    expect(mockIo.to).toHaveBeenCalledWith('providerId123');
    expect(mockIo.emit).toHaveBeenCalledWith('reviewReceived', expect.objectContaining({
      reviewId: 'review123',
      taskId:   'taskId123',
    }));
  });

  test('sends FCM notification when provider has fcmToken', async () => {
    const provider = makeMockProvider({ fcmToken: 'fcm-token-abc' });
    const mockTask = makeMockTask({ assignedProvider: provider });
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ kyc: null, name: 'Jane' }) });

    await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 5 });

    expect(sendNotification).toHaveBeenCalledWith(
      'fcm-token-abc',
      'New Review',
      expect.stringContaining('Fix leaky tap')
    );
  });

  test('does NOT throw when provider has no fcmToken', async () => {
    const mockTask = makeMockTask({ assignedProvider: makeMockProvider({ fcmToken: null }) });
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ kyc: null, name: 'Jane' }) });

    const res = await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 5 });

    expect(res.status).toBe(200);
    expect(sendNotification).not.toHaveBeenCalled();
  });

  test('increments provider.totalReviews by 1', async () => {
    const provider = makeMockProvider({ totalReviews: 3, averageRating: 4.0 });
    const mockTask = makeMockTask({ assignedProvider: provider });
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ kyc: null, name: 'Jane' }) });

    await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 4 });

    expect(provider.totalReviews).toBe(4);
  });

  test('recalculates provider.averageRating correctly', async () => {
    // existing: 3 reviews at avg 4.0. New rating: 5. New avg = (4.0*3 + 5) / 4 = 17/4 = 4.25 → rounded = 4.3
    const provider = makeMockProvider({ totalReviews: 3, averageRating: 4.0 });
    const mockTask = makeMockTask({ assignedProvider: provider });
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ kyc: null, name: 'Jane' }) });

    await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 5 });

    // (4.0 * 3 + 5) / 4 = 17/4 = 4.25 → Math.round(4.25 * 10) / 10 = 4.3
    expect(provider.averageRating).toBeCloseTo(4.3, 1);
  });

  test('increments provider.recommendations when recommend: true', async () => {
    const provider = makeMockProvider({ recommendations: 2 });
    const mockTask = makeMockTask({ assignedProvider: provider });
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ kyc: null, name: 'Jane' }) });

    await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 5, recommend: true });

    expect(provider.recommendations).toBe(3);
  });

  test('does NOT increment provider.recommendations when recommend: false', async () => {
    const provider = makeMockProvider({ recommendations: 2 });
    const mockTask = makeMockTask({ assignedProvider: provider });
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ kyc: null, name: 'Jane' }) });

    await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 5, recommend: false });

    expect(provider.recommendations).toBe(2);
  });

  test('calls calculateProviderRank after stat updates', async () => {
    const mockTask = makeMockTask();
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue({ kyc: null, name: 'Jane' }) });

    await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 5 });

    expect(calculateProviderRank).toHaveBeenCalledTimes(1);
  });

  test('returns 404 when task not found', async () => {
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

    const res = await request(app)
      .put('/api/tasks/notfound/completeTask')
      .send({ rating: 5 });

    expect(res.status).toBe(404);
    expect(res.body.msg).toBe('Task not found');
  });

  test('returns 403 when user is not the task poster', async () => {
    const mockTask = makeMockTask({ user: { toString: () => 'differentUser' } });
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });

    const res = await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 5 });

    expect(res.status).toBe(403);
  });

  test('returns 500 on DB error', async () => {
    Task.findById.mockReturnValue({
      populate: jest.fn().mockRejectedValue(new Error('DB failure')),
    });

    const res = await request(app)
      .put('/api/tasks/taskId123/completeTask')
      .send({ rating: 5 });

    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Suite: bidOnTask — KYC required
// ---------------------------------------------------------------------------

const makeMockTaskForBid = (overrides = {}) => ({
  _id: 'taskId123',
  status: 'Active',
  bids: [],
  user: { fcmToken: null, email: 'poster@test.com' },
  save: jest.fn().mockResolvedValue({}),
  ...overrides,
});

describe('POST /api/tasks/:id/bid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns 403 KYC_REQUIRED when provider KYC is not verified', async () => {
    const mockTask = makeMockTaskForBid();
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        name: 'Provider',
        kyc: { status: 'pending' },
        isVerified: false,
      }),
    });

    const res = await request(app)
      .post('/api/tasks/taskId123/bid')
      .send({ price: 100, estimatedTime: '1 day', comment: 'I can do this' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('KYC_REQUIRED');
    expect(res.body.msg).toMatch(/KYC verification/i);
    expect(mockTask.save).not.toHaveBeenCalled();
  });

  test('submits bid when provider KYC status is verified', async () => {
    const mockTask = makeMockTaskForBid();
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        name: 'Provider',
        kyc: { status: 'verified' },
        isVerified: false,
      }),
    });

    const res = await request(app)
      .post('/api/tasks/taskId123/bid')
      .send({ price: 100, estimatedTime: '1 day', comment: 'Ready to start' });

    expect(res.status).toBe(200);
    expect(mockTask.bids).toHaveLength(1);
    expect(mockTask.bids[0].price).toBe(100);
    expect(mockTask.save).toHaveBeenCalled();
  });

  test('submits bid when provider isVerified is true (legacy compatibility)', async () => {
    const mockTask = makeMockTaskForBid();
    Task.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockTask) });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        name: 'Provider',
        kyc: { status: 'not_started' },
        isVerified: true,
      }),
    });

    const res = await request(app)
      .post('/api/tasks/taskId123/bid')
      .send({ price: 50, estimatedTime: '2 days' });

    expect(res.status).toBe(200);
    expect(mockTask.save).toHaveBeenCalled();
  });
});
