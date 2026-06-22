const toPlainObject = (user) =>
  typeof user?.toObject === "function" ? user.toObject({ virtuals: false }) : user;

const { computeTrustScore } = require("../services/reviewService");
const { rankFromTrustScore } = require("../services/rankingService");

const normaliseNameParts = ({ name, firstName, lastName, preferredName }) => {
  const safeName = typeof name === "string" ? name.trim() : "";
  const safeFirst = typeof firstName === "string" ? firstName.trim() : "";
  const safeLast = typeof lastName === "string" ? lastName.trim() : "";
  const safePreferred = typeof preferredName === "string" ? preferredName.trim() : "";

  const derivedFirst = safeFirst || safeName.split(/\s+/)[0] || "";
  const derivedLast =
    safeLast ||
    (safeName.includes(" ")
      ? safeName
          .split(/\s+/)
          .slice(1)
          .join(" ")
      : "");

  const finalName =
    safeName ||
    [derivedFirst, derivedLast]
      .filter((value) => value && value.trim())
      .join(" ")
      .trim() ||
    safePreferred ||
    "";

  return {
    firstName: derivedFirst,
    lastName: derivedLast,
    preferredName: safePreferred,
    name: finalName,
  };
};

const computeDisplayName = (doc) => {
  const preferred = (doc?.preferredName ?? "").trim();
  const first = (doc?.firstName ?? "").trim();
  const combinedName = (doc?.name ?? "").trim();
  const email = (doc?.email ?? "").trim();

  if (preferred) return preferred;
  if (first) return first;
  if (combinedName.includes(" ")) {
    return combinedName.split(/\s+/)[0];
  }
  if (combinedName && !combinedName.includes("@")) return combinedName;
  if (email.includes("@")) return email.split("@")[0];
  return email || "Member";
};

exports.formatUserForClient = (user) => {
  if (!user) return null;
  const doc = toPlainObject(user);
  const nameParts = normaliseNameParts(doc);
  const merged = { ...doc, ...nameParts };
  const displayName = computeDisplayName(merged);
  const trustScore = computeTrustScore(doc);

  return {
    id: doc._id ?? doc.id,
    name: nameParts.name,
    firstName: nameParts.firstName,
    lastName: nameParts.lastName,
    preferredName: nameParts.preferredName,
    displayName,
    email: doc.email ?? "",
    role: doc.role ?? "user",
    profilePhoto: doc.profilePhoto ?? "",
    location: doc.location ?? null,
    skills: Array.isArray(doc.skills) ? doc.skills : [],
    isVerified: Boolean(doc.isVerified),
    emailVerified: Boolean(doc.isVerified),
    kycVerified: doc.kyc?.status === "verified",
    kyc: doc.kyc ?? null,
    averageRating: doc.averageRating ?? 0,
    totalReviews: doc.totalReviews ?? 0,
    completedTasks: doc.completedTasks ?? 0,
    recommendations: doc.recommendations ?? 0,
    trustScore,
    rank: rankFromTrustScore(trustScore),
    fcmToken: doc.fcmToken ?? "",
    createdAt: doc.createdAt ?? null,
    updatedAt: doc.updatedAt ?? null,
  };
};

exports.normaliseNameParts = normaliseNameParts;
