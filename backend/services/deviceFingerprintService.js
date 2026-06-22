const User = require("../models/User");
const { logSuspiciousActivity } = require("../utils/securityLogger");

const SHARED_DEVICE_THRESHOLD = Number(
  process.env.FRAUD_SHARED_DEVICE_ACCOUNT_THRESHOLD || 3
);

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp =
    typeof forwarded === "string" ? forwarded.split(",")[0].trim() : null;
  return forwardedIp || req.ip || req.socket?.remoteAddress || "unknown";
};

const normalizeFingerprintInput = (req) => {
  const device = req.body?.device || {};
  const fingerprintId =
    req.body?.deviceFingerprint ||
    req.body?.fingerprintId ||
    req.body?.deviceId ||
    req.body?.visitorId ||
    device.id;

  if (!fingerprintId || typeof fingerprintId !== "string") {
    return null;
  }

  const rawPlatform =
    req.body?.platform ||
    device.platform ||
    req.headers["x-client-platform"] ||
    "unknown";
  const normalizedPlatform = String(rawPlatform).toLowerCase();
  const platform =
    normalizedPlatform === "web" || normalizedPlatform === "mobile"
      ? normalizedPlatform
      : "unknown";

  const source =
    req.body?.deviceSource ||
    device.source ||
    `${platform}-${device.os || "unknown"}`;

  return {
    fingerprintId: fingerprintId.trim(),
    platform,
    source: String(source || ""),
    userAgent: String(req.headers["user-agent"] || ""),
    ipAddress: getClientIp(req),
  };
};

const markUsersFlaggedForSharedDevice = async (fingerprintId) => {
  const users = await User.find({
    "deviceFingerprints.fingerprintId": fingerprintId,
  }).select("_id");

  if (users.length < SHARED_DEVICE_THRESHOLD) {
    return { flagged: false, linkedAccountCount: users.length };
  }

  const now = new Date();
  await User.updateMany(
    { _id: { $in: users.map((u) => u._id) } },
    {
      $set: {
        "fraudFlags.isFlagged": true,
        "fraudFlags.flaggedAt": now,
        "fraudFlags.lastEvaluatedAt": now,
      },
      $addToSet: {
        "fraudFlags.reasonCodes": "shared_device_fingerprint",
      },
    }
  );

  return { flagged: true, linkedAccountCount: users.length };
};

const captureDeviceFingerprint = async ({ user, req, context = "auth" }) => {
  const normalized = normalizeFingerprintInput(req);
  if (!normalized) {
    return { captured: false, flagged: false, reason: "missing_fingerprint" };
  }

  const now = new Date();
  const existing = user.deviceFingerprints.find(
    (item) => item.fingerprintId === normalized.fingerprintId
  );

  if (existing) {
    existing.lastSeenAt = now;
    existing.seenCount += 1;
    existing.platform = normalized.platform;
    existing.source = normalized.source;
    existing.userAgent = normalized.userAgent;
    existing.ipAddress = normalized.ipAddress;
  } else {
    user.deviceFingerprints.push({
      ...normalized,
      firstSeenAt: now,
      lastSeenAt: now,
      seenCount: 1,
    });
  }

  user.fraudFlags = user.fraudFlags || {};
  user.fraudFlags.lastEvaluatedAt = now;

  await user.save();

  const sharedDeviceResult = await markUsersFlaggedForSharedDevice(
    normalized.fingerprintId
  );

  if (sharedDeviceResult.flagged) {
    logSuspiciousActivity({
      eventType: "shared_device_across_accounts",
      severity: "high",
      ip: normalized.ipAddress,
      route: req.originalUrl || req.url,
      identifier: user.email,
      metadata: {
        context,
        fingerprintId: normalized.fingerprintId,
        linkedAccountCount: sharedDeviceResult.linkedAccountCount,
        threshold: SHARED_DEVICE_THRESHOLD,
      },
    });
  }

  return {
    captured: true,
    flagged: sharedDeviceResult.flagged,
    fingerprintId: normalized.fingerprintId,
    linkedAccountCount: sharedDeviceResult.linkedAccountCount,
  };
};

module.exports = {
  captureDeviceFingerprint,
};
