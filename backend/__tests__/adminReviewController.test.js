// Tests for admin review moderation endpoints
// All DB models are mocked — no real DB calls

const express = require('express');
const request = require('supertest');

// ---------------------------------------------------------------------------
// Mocks (hoisted by Jest)
// ---------------------------------------------------------------------------

jest.mock('../models/Review', () => {
  const mockSave = jest.fn().mockResolvedValue({});
  const MockReview = jest.fn();
  MockReview.find            = jest.fn();
  MockReview.findById        = jest.fn();
  MockReview.findByIdAndDelete = jest.fn().mockResolvedValue({});
  MockReview._mockSave       = mockSave;
  return MockReview;
});

jest.mock('../models/Task', () => {
  const MockTask = jest.fn();
  MockTask.find            = jest.fn();
  MockTask.findById        = jest.fn();
  MockTask.findByIdAndUpdate = jest.fn().mockResolvedValue({});
  MockTask.findByIdAndDelete = jest.fn().mockResolvedValue({});
  return MockTask;
});

jest.mock('../models/User', () => {
  const MockUser = jest.fn();
  MockUser.find   = jest.fn();
  MockUser.findById = jest.fn();
  MockUser.findByIdAndDelete = jest.fn().mockResolvedValue({});
  MockUser.findByIdAndUpdate = jest.fn().mockResolvedValue({});
  return MockUser;
});

jest.mock('../services/rankingService', () => ({
  calculateProviderRank: jest.fn().mockReturnValue('Bronze'),
}));

// Admin auth mock — passes by default
jest.mock('../middlewares/authMiddleware', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: 'adminId123', role: 'admin' };
    next();
  },
  authorizeRoles: (...roles) => (req, res, next) => {
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({ msg: 'Forbidden' });
  },
}));

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

const adminRoutes  = require('../routes/adminRoutes');
const Review       = require('../models/Review');
const Task         = require('../models/Task');
const User         = require('../models/User');
const { calculateProviderRank } = require('../services/rankingService');

const app = express();
app.use(express.json());
app.use('/api/admin', adminRoutes);

// Make a non-admin app to test 403 responses
const { authMiddleware: _auth, authorizeRoles: _authz } = require('../middlewares/authMiddleware');

// ---------------------------------------------------------------------------
// Suite: GET /api/admin/reviews/flagged
// ---------------------------------------------------------------------------

describe('GET /api/admin/reviews/flagged', () => {
  beforeEach(() => jest.clearAllMocks());

  const flaggedReviews = [
    {
      _id: 'rev1',
      comment: 'TERRIBLE!!!!',
      moderationReason: 'Repeated characters detected',
      rating: 1,
      reviewer: { _id: 'user1', name: 'Jane Doe' },
      provider: { _id: 'prov1', name: 'John Smith' },
      task:     { _id: 'task1', title: 'Fix tap' },
      flaggedForReview: true,
    },
  ];

  test('returns 200 with array of flagged reviews', async () => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      sort:     jest.fn().mockReturnThis(),
    };
    Object.assign(chain, { then: (res, rej) => Promise.resolve(flaggedReviews).then(res, rej) });
    Review.find.mockReturnValue(chain);

    const res = await request(app).get('/api/admin/reviews/flagged');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(Review.find).toHaveBeenCalledWith({ flaggedForReview: true });
  });

  test('returns 200 with empty array when no flagged reviews exist', async () => {
    const chain = {
      populate: jest.fn().mockReturnThis(),
      sort:     jest.fn().mockReturnThis(),
    };
    Object.assign(chain, { then: (res, rej) => Promise.resolve([]).then(res, rej) });
    Review.find.mockReturnValue(chain);

    const res = await request(app).get('/api/admin/reviews/flagged');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  test('returns 500 on DB error', async () => {
    Review.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort:     jest.fn().mockRejectedValue(new Error('DB error')),
    });

    const res = await request(app).get('/api/admin/reviews/flagged');

    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Suite: PATCH /api/admin/reviews/:reviewId/dismiss
// ---------------------------------------------------------------------------

describe('PATCH /api/admin/reviews/:reviewId/dismiss', () => {
  beforeEach(() => jest.clearAllMocks());

  test('returns 200 and sets flaggedForReview: false', async () => {
    const mockSave = jest.fn().mockResolvedValue({});
    const mockReview = {
      _id: 'rev1',
      flaggedForReview: true,
      moderationNote: null,
      save: mockSave,
    };
    Review.findById.mockResolvedValue(mockReview);

    const res = await request(app)
      .patch('/api/admin/reviews/rev1/dismiss')
      .send({ moderationNote: 'Reviewed and cleared' });

    expect(res.status).toBe(200);
    expect(mockReview.flaggedForReview).toBe(false);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  test('saves moderationNote from request body', async () => {
    const mockSave = jest.fn().mockResolvedValue({});
    const mockReview = {
      _id: 'rev1',
      flaggedForReview: true,
      moderationNote: null,
      save: mockSave,
    };
    Review.findById.mockResolvedValue(mockReview);

    await request(app)
      .patch('/api/admin/reviews/rev1/dismiss')
      .send({ moderationNote: 'No policy violation found' });

    expect(mockReview.moderationNote).toBe('No policy violation found');
  });

  test('returns 404 when review not found', async () => {
    Review.findById.mockResolvedValue(null);

    const res = await request(app)
      .patch('/api/admin/reviews/notfound/dismiss')
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.msg).toBe('Review not found');
  });

  test('returns 500 on DB error', async () => {
    Review.findById.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .patch('/api/admin/reviews/rev1/dismiss')
      .send({});

    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Suite: DELETE /api/admin/reviews/:reviewId
// ---------------------------------------------------------------------------

describe('DELETE /api/admin/reviews/:reviewId', () => {
  beforeEach(() => jest.clearAllMocks());

  function makeMockReview(overrides = {}) {
    return {
      _id:      'rev1',
      rating:   4,
      task:     'task1',
      provider: 'prov1',
      ...overrides,
    };
  }

  function makeMockProvider(overrides = {}) {
    const mockSave = jest.fn().mockResolvedValue({});
    return {
      _id:             'prov1',
      totalReviews:    3,
      averageRating:   4.0,
      completedTasks:  3,
      recommendations: 1,
      save:            mockSave,
      _mockSave:       mockSave,
      ...overrides,
    };
  }

  test('returns 200 and deletes Review document', async () => {
    Review.findById.mockResolvedValue(makeMockReview());
    User.findById.mockResolvedValue(makeMockProvider());

    const res = await request(app).delete('/api/admin/reviews/rev1');

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe('Review deleted and provider stats updated');
    expect(Review.findByIdAndDelete).toHaveBeenCalledWith('rev1');
  });

  test('sets task.review = null after deletion', async () => {
    Review.findById.mockResolvedValue(makeMockReview());
    User.findById.mockResolvedValue(makeMockProvider());

    await request(app).delete('/api/admin/reviews/rev1');

    expect(Task.findByIdAndUpdate).toHaveBeenCalledWith('task1', { review: null });
  });

  test('decrements provider.totalReviews by 1', async () => {
    const provider = makeMockProvider({ totalReviews: 3 });
    Review.findById.mockResolvedValue(makeMockReview({ rating: 4 }));
    User.findById.mockResolvedValue(provider);

    await request(app).delete('/api/admin/reviews/rev1');

    expect(provider.totalReviews).toBe(2);
  });

  test('recalculates provider.averageRating correctly', async () => {
    // 3 reviews avg 4.0. Delete review with rating 4. New: (4.0*3 - 4)/2 = 8/2 = 4.0
    const provider = makeMockProvider({ totalReviews: 3, averageRating: 4.0 });
    Review.findById.mockResolvedValue(makeMockReview({ rating: 4 }));
    User.findById.mockResolvedValue(provider);

    await request(app).delete('/api/admin/reviews/rev1');

    expect(provider.averageRating).toBeCloseTo(4.0, 1);
  });

  test('sets averageRating = 0 when totalReviews hits 0', async () => {
    // 1 review. Delete it. totalReviews → 0, averageRating → 0
    const provider = makeMockProvider({ totalReviews: 1, averageRating: 5.0 });
    Review.findById.mockResolvedValue(makeMockReview({ rating: 5 }));
    User.findById.mockResolvedValue(provider);

    await request(app).delete('/api/admin/reviews/rev1');

    expect(provider.totalReviews).toBe(0);
    expect(provider.averageRating).toBe(0);
  });

  test('calls calculateProviderRank after stat reversal', async () => {
    Review.findById.mockResolvedValue(makeMockReview());
    User.findById.mockResolvedValue(makeMockProvider());

    await request(app).delete('/api/admin/reviews/rev1');

    expect(calculateProviderRank).toHaveBeenCalledTimes(1);
  });

  test('does NOT decrement provider.completedTasks', async () => {
    const provider = makeMockProvider({ completedTasks: 5 });
    Review.findById.mockResolvedValue(makeMockReview());
    User.findById.mockResolvedValue(provider);

    await request(app).delete('/api/admin/reviews/rev1');

    expect(provider.completedTasks).toBe(5);
  });

  test('returns 404 when review not found', async () => {
    Review.findById.mockResolvedValue(null);

    const res = await request(app).delete('/api/admin/reviews/notfound');

    expect(res.status).toBe(404);
    expect(res.body.msg).toBe('Review not found');
  });

  test('returns 500 on DB error', async () => {
    Review.findById.mockRejectedValue(new Error('DB error'));

    const res = await request(app).delete('/api/admin/reviews/rev1');

    expect(res.status).toBe(500);
  });
});
