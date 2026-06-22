const { logSuspiciousActivity } = require("../utils/securityLogger");

const MAX_ATTEMPTS = Number(process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS || 8);
const WINDOW_MS = Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const BLOCK_MS = Number(process.env.AUTH_RATE_LIMIT_BLOCK_MS || 30 * 60 * 1000);
const SUSPICIOUS_FAILURE_THRESHOLD = Number(
  process.env.AUTH_SUSPICIOUS_FAILURE_THRESHOLD || 5
);

const attemptsByKey = new Map();

const normalizeIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedIp =
    typeof forwarded === "string" ? forwarded.split(",")[0].trim() : null;

  return (
    forwardedIp ||
    req.ip ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    "unknown"
  );
};

const getIdentifier = (req) => {
  const email = req.body?.email;
  if (typeof email === "string" && email.trim()) {
    return email.trim().toLowerCase();
  }
  return "anonymous";
};

const buildAttemptKey = (req, scope) => {
  const ip = normalizeIp(req);
  const identifier = getIdentifier(req);
  return `${scope}:${ip}:${identifier}`;
};

const isFailureStatus = (statusCode) => statusCode >= 400 && statusCode < 500;

const authAttemptGuard = (scope = "auth") => {
  return (req, res, next) => {
    const now = Date.now();
    const key = buildAttemptKey(req, scope);
    const ip = normalizeIp(req);
    const identifier = getIdentifier(req);
    const route = req.originalUrl || req.url;

    let record = attemptsByKey.get(key);
    if (!record) {
      record = {
        windowStart: now,
        requestCount: 0,
        failureCount: 0,
        blockedUntil: 0,
      };
      attemptsByKey.set(key, record);
    }

    if (record.blockedUntil > now) {
      const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({
        msg: "Too many authentication attempts. Please try again later.",
      });
    }

    if (now - record.windowStart > WINDOW_MS) {
      record.windowStart = now;
      record.requestCount = 0;
      record.failureCount = 0;
    }

    record.requestCount += 1;

    if (record.requestCount > MAX_ATTEMPTS) {
      record.blockedUntil = now + BLOCK_MS;

      logSuspiciousActivity({
        eventType: "brute_force_threshold_reached",
        severity: "high",
        ip,
        route,
        identifier,
        metadata: {
          scope,
          requestCount: record.requestCount,
          maxAttempts: MAX_ATTEMPTS,
          windowMs: WINDOW_MS,
          blockMs: BLOCK_MS,
        },
      });

      res.set("Retry-After", String(Math.ceil(BLOCK_MS / 1000)));
      return res.status(429).json({
        msg: "Too many authentication attempts. Please try again later.",
      });
    }

    res.on("finish", () => {
      if (isFailureStatus(res.statusCode)) {
        record.failureCount += 1;

        if (record.failureCount >= SUSPICIOUS_FAILURE_THRESHOLD) {
          logSuspiciousActivity({
            eventType: "repeated_auth_failures",
            severity: "medium",
            ip,
            route,
            identifier,
            metadata: {
              scope,
              failureCount: record.failureCount,
              threshold: SUSPICIOUS_FAILURE_THRESHOLD,
              statusCode: res.statusCode,
            },
          });

          // Avoid log spam for the same actor during an active window.
          record.failureCount = 0;
        }
      } else if (res.statusCode < 400) {
        record.failureCount = 0;
      }
    });

    next();
  };
};

const __resetSecurityStateForTests = () => {
  attemptsByKey.clear();
};

module.exports = {
  authAttemptGuard,
  __resetSecurityStateForTests,
};
