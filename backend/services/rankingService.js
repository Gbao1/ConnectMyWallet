const { computeTrustScore } = require("./reviewService");

function rankFromTrustScore(trustScore) {
  if (trustScore >= 85) return "Platinum";
  if (trustScore >= 70) return "Gold";
  if (trustScore >= 40) return "Silver";
  return "Bronze";
}

function calculateProviderRank(provider) {
  return rankFromTrustScore(computeTrustScore(provider));
}

module.exports = { calculateProviderRank, rankFromTrustScore };
