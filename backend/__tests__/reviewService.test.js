// Pure unit tests for reviewService — no mocks, no DB
const { computeTrustScore, moderateText } = require('../services/reviewService');

// ---------------------------------------------------------------------------
// computeTrustScore
// ---------------------------------------------------------------------------

describe('computeTrustScore', () => {
  test('returns 0 when averageRating=0, completedTasks=0, no KYC', () => {
    const score = computeTrustScore({ averageRating: 0, completedTasks: 0, kyc: null });
    expect(score).toBe(0);
  });

  test('returns 50 when averageRating=5, completedTasks=0, no recommendations, no KYC', () => {
    const score = computeTrustScore({ averageRating: 5, completedTasks: 0, kyc: null });
    expect(score).toBe(50);
  });

  test('returns 60 when averageRating=5, completedTasks=0, no recommendations, kyc.status=verified', () => {
    const score = computeTrustScore({ averageRating: 5, completedTasks: 0, kyc: { status: 'verified' } });
    expect(score).toBe(60);
  });

  test('returns 100 when averageRating=5, completedTasks>=30, recommendations>=20, kyc.status=verified', () => {
    const score = computeTrustScore({ averageRating: 5, completedTasks: 30, recommendations: 20, kyc: { status: 'verified' } });
    expect(score).toBe(100);
  });

  test('clamps activity score at max 25 when completedTasks > 30', () => {
    const score30  = computeTrustScore({ averageRating: 5, completedTasks: 30,  recommendations: 20, kyc: { status: 'verified' } });
    const score100 = computeTrustScore({ averageRating: 5, completedTasks: 100, recommendations: 20, kyc: { status: 'verified' } });
    expect(score30).toBe(score100);
    expect(score30).toBe(100);
  });

  test('clamps recommendation score at max 15 when recommendations > 20', () => {
    const score20 = computeTrustScore({ averageRating: 5, completedTasks: 30, recommendations: 20, kyc: { status: 'verified' } });
    const score50 = computeTrustScore({ averageRating: 5, completedTasks: 30, recommendations: 50, kyc: { status: 'verified' } });
    expect(score20).toBe(score50);
    expect(score20).toBe(100);
  });

  test('balances excellent reviews with low history below Platinum', () => {
    const score = computeTrustScore({ averageRating: 5, completedTasks: 2, recommendations: 2, kyc: { status: 'verified' } });
    expect(score).toBe(63);
  });

  test('always returns an integer (result of Math.round)', () => {
    const score = computeTrustScore({ averageRating: 3.7, completedTasks: 12, kyc: null });
    expect(Number.isInteger(score)).toBe(true);
  });

  test('returns a Number type, not a string', () => {
    const score = computeTrustScore({ averageRating: 4.2, completedTasks: 8, kyc: null });
    expect(typeof score).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// moderateText
// ---------------------------------------------------------------------------

describe('moderateText', () => {
  test('returns { flagged: false, reason: null } for a clean comment', () => {
    expect(moderateText('Great work, very professional.')).toEqual({ flagged: false, reason: null });
  });

  test('flags string with 5+ repeated alpha characters (aaaaaa)', () => {
    const result = moderateText('aaaaaa');
    expect(result.flagged).toBe(true);
    expect(result.reason).toBe('Repeated characters detected');
  });

  test('flags string with 5+ repeated non-alpha characters (!!!!!!!)', () => {
    const result = moderateText('!!!!!!!');
    expect(result.flagged).toBe(true);
    expect(result.reason).toBe('Repeated characters detected');
  });

  test('flags string containing http:// URL', () => {
    const result = moderateText('Visit http://spam.com for deals');
    expect(result.flagged).toBe(true);
    expect(result.reason).toBe('Contains URL');
  });

  test('flags string containing www. URL', () => {
    const result = moderateText('Go to www.something.com now');
    expect(result.flagged).toBe(true);
    expect(result.reason).toBe('Contains URL');
  });

  test('flags all-caps string longer than 10 chars', () => {
    const result = moderateText('TERRIBLE SERVICE');
    expect(result.flagged).toBe(true);
    expect(result.reason).toBe('Excessive uppercase text');
  });

  test('does NOT flag a normally mixed-case sentence starting with a capital', () => {
    const result = moderateText('Good job on the plumbing work.');
    expect(result.flagged).toBe(false);
    expect(result.reason).toBeNull();
  });

  test('does NOT flag an empty string', () => {
    const result = moderateText('');
    expect(result.flagged).toBe(false);
    expect(result.reason).toBeNull();
  });

  test('does NOT crash on null input and returns { flagged: false, reason: null }', () => {
    const result = moderateText(null);
    expect(result).toEqual({ flagged: false, reason: null });
  });
});
