// Tests for reviewController
// All DB models are mocked — no real DB calls

const express = require('express');
const request = require('supertest');

// ---------------------------------------------------------------------------
// Mocks (hoisted by Jest)
// ---------------------------------------------------------------------------

jest.mock('../models/Review', () => {
  const MockReview = jest.fn();
  MockReview.find    = jest.fn();
  MockReview.findById = jest.fn();
  return MockReview;
});

jest.mock('../models/User', () => {
  const MockUser = jest.fn();
  MockUser.findById = jest.fn();
  return MockUser;
});

jest.mock('../services/reviewService', () => ({
  computeTrustScore: jest.fn().mockReturnValue(75),
}));

jest.mock('../middlewares/authMiddleware', () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: 'userId123', role: 'user' };
    next();
  },
  authorizeRoles: () => (req, res, next) => next(),
}));

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

const reviewRoutes = require('../routes/reviewRoutes');
const Review = require('../models/Review');
const User   = require('../models/User');
const { computeTrustScore } = require('../services/reviewService');

const app = express();
app.use(express.json());
app.use('/api/reviews', reviewRoutes);

// ---------------------------------------------------------------------------
// Suite: GET /api/reviews/provider/:providerId
// ---------------------------------------------------------------------------

describe('GET /api/reviews/provider/:providerId', () => {
  beforeEach(() => jest.clearAllMocks());

  const mockProvider = {
    _id:           'provider123',
    totalReviews:  5,
    averageRating: 4.2,
    completedTasks: 5,
    kyc:           null,
  };

  const mockReviews = [
    { _id: 'rev1', rating: 5, comment: 'Great', flaggedForReview: false },
    { _id: 'rev2', rating: 4, comment: 'Good',  flaggedForReview: false },
  ];

  // Helper: build a Review.find() chain: find() → sort() → populate() → populate() → awaitable
  function makeReviewFindChain(resolveWith) {
    const chain = {};
    chain.sort     = jest.fn().mockReturnValue(chain);
    chain.populate = jest.fn().mockReturnValue(chain);
    chain.then     = (res, rej) => Promise.resolve(resolveWith).then(res, rej);
    chain.catch    = (fn) => Promise.resolve(resolveWith).catch(fn);
    return chain;
  }

  test('returns 200 with trustScore, totalReviews, averageRating, reviews array', async () => {
    User.findById.mockResolvedValue(mockProvider);
    Review.find.mockReturnValue(makeReviewFindChain(mockReviews));

    const res = await request(app).get('/api/reviews/provider/provider123');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('trustScore');
    expect(res.body).toHaveProperty('totalReviews', 5);
    expect(res.body).toHaveProperty('averageRating', 4.2);
    expect(res.body).toHaveProperty('reviews');
  });

  test('returns 200 with empty reviews array when provider has no reviews', async () => {
    User.findById.mockResolvedValue(mockProvider);
    Review.find.mockReturnValue(makeReviewFindChain([]));

    const res = await request(app).get('/api/reviews/provider/provider123');

    expect(res.status).toBe(200);
    expect(res.body.reviews).toEqual([]);
  });

  test('only queries for non-flagged reviews', async () => {
    User.findById.mockResolvedValue(mockProvider);
    Review.find.mockReturnValue(makeReviewFindChain([]));

    await request(app).get('/api/reviews/provider/provider123');

    expect(Review.find).toHaveBeenCalledWith(expect.objectContaining({
      flaggedForReview: false,
    }));
  });

  test('calls computeTrustScore with the provider document', async () => {
    User.findById.mockResolvedValue(mockProvider);
    Review.find.mockReturnValue(makeReviewFindChain([]));

    await request(app).get('/api/reviews/provider/provider123');

    expect(computeTrustScore).toHaveBeenCalledWith(mockProvider);
  });

  test('returns 404 when provider not found', async () => {
    User.findById.mockResolvedValue(null);

    const res = await request(app).get('/api/reviews/provider/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.msg).toBe('Provider not found');
  });

  test('returns 500 on DB error', async () => {
    User.findById.mockRejectedValue(new Error('DB error'));

    const res = await request(app).get('/api/reviews/provider/provider123');

    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Suite: GET /api/reviews/:reviewId
// ---------------------------------------------------------------------------

describe('GET /api/reviews/:reviewId', () => {
  beforeEach(() => jest.clearAllMocks());

  const mockReview = {
    _id:     'rev1',
    rating:  5,
    comment: 'Excellent work!',
    flaggedForReview: false,
  };

  test('returns 200 with the full review document when found', async () => {
    // Controller calls .populate(...).populate(...) — need two chained calls
    const innerChain = {
      populate: jest.fn(),
    };
    Object.assign(innerChain, { then: (res, rej) => Promise.resolve(mockReview).then(res, rej) });
    innerChain.populate.mockReturnValue(innerChain);
    const outerChain = { populate: jest.fn().mockReturnValue(innerChain) };
    Review.findById.mockReturnValue(outerChain);

    const res = await request(app).get('/api/reviews/rev1');

    expect(res.status).toBe(200);
    expect(res.body._id).toBe('rev1');
    expect(res.body.rating).toBe(5);
  });

  test('returns 404 when review ID does not exist', async () => {
    const innerChain = {
      populate: jest.fn(),
    };
    Object.assign(innerChain, { then: (res, rej) => Promise.resolve(null).then(res, rej) });
    innerChain.populate.mockReturnValue(innerChain);
    const outerChain = { populate: jest.fn().mockReturnValue(innerChain) };
    Review.findById.mockReturnValue(outerChain);

    const res = await request(app).get('/api/reviews/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.msg).toBe('Review not found');
  });

  test('returns 500 on DB error', async () => {
    const innerChain = {
      populate: jest.fn().mockRejectedValue(new Error('DB error')),
    };
    Review.findById.mockReturnValue({ populate: jest.fn().mockReturnValue(innerChain) });

    const res = await request(app).get('/api/reviews/rev1');

    expect(res.status).toBe(500);
  });
});
