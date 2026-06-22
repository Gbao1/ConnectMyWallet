const { calculateProviderRank, rankFromTrustScore } = require('../services/rankingService');

describe('rankFromTrustScore', () => {
  test.each([
    [0, 'Bronze'],
    [39, 'Bronze'],
    [40, 'Silver'],
    [69, 'Silver'],
    [70, 'Gold'],
    [84, 'Gold'],
    [85, 'Platinum'],
    [100, 'Platinum'],
  ])('maps trust score %i to %s', (score, expectedRank) => {
    expect(rankFromTrustScore(score)).toBe(expectedRank);
  });
});

describe('calculateProviderRank', () => {
  test('uses the documented trust score formula to produce rank labels', () => {
    expect(calculateProviderRank({
      averageRating: 5,
      completedTasks: 0,
      kyc: null,
    })).toBe('Silver');

    expect(calculateProviderRank({
      averageRating: 5,
      completedTasks: 30,
      recommendations: 20,
      kyc: { status: 'verified' },
    })).toBe('Platinum');
  });

  test('uses recommendations when calculating rank', () => {
    expect(calculateProviderRank({
      averageRating: 4,
      completedTasks: 30,
      recommendations: 0,
      kyc: null,
    })).toBe('Silver');

    expect(calculateProviderRank({
      averageRating: 4,
      completedTasks: 30,
      recommendations: 20,
      kyc: null,
    })).toBe('Gold');
  });
});
