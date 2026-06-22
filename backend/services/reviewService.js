const TRUST_SCORE_WEIGHTS = {
  rating:         { max: 50, divisor: 5 },
  activity:       { max: 25, divisor: 30 },
  recommendation: { max: 15, divisor: 20 },
  kyc:            { bonus: 10 },
};

function computeTrustScore(provider) {
  const averageRating = Number(provider.averageRating) || 0;
  const completedTasks = Number(provider.completedTasks) || 0;
  const recommendations = Number(provider.recommendations) || 0;

  const ratingScore   = Math.min(averageRating / TRUST_SCORE_WEIGHTS.rating.divisor, 1) * TRUST_SCORE_WEIGHTS.rating.max;
  const activityScore = Math.min(completedTasks / TRUST_SCORE_WEIGHTS.activity.divisor, 1) * TRUST_SCORE_WEIGHTS.activity.max;
  const recommendationScore = Math.min(recommendations / TRUST_SCORE_WEIGHTS.recommendation.divisor, 1) * TRUST_SCORE_WEIGHTS.recommendation.max;
  const kycScore      = provider.kyc?.status === 'verified' ? TRUST_SCORE_WEIGHTS.kyc.bonus : 0;
  return Math.round(ratingScore + activityScore + recommendationScore + kycScore);
}

function moderateText(text) {
  if (!text || text.trim().length === 0) return { flagged: false, reason: null };
  if (/(.)\1{4,}/.test(text)) return { flagged: true, reason: 'Repeated characters detected' };
  if (/https?:\/\/|www\./i.test(text)) return { flagged: true, reason: 'Contains URL' };
  if (text.length > 10) {
    const upperCount  = (text.match(/[A-Z]/g) || []).length;
    const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
    if (letterCount > 0 && upperCount / letterCount > 0.7) return { flagged: true, reason: 'Excessive uppercase text' };
  }
  return { flagged: false, reason: null };
}

module.exports = { computeTrustScore, moderateText, TRUST_SCORE_WEIGHTS };
