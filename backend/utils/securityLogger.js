const fs = require("fs");
const path = require("path");
const SuspiciousActivity = require("../models/SuspiciousActivity");

const LOG_DIR = path.join(__dirname, "..", "logs");
const SUSPICIOUS_LOG_FILE = path.join(LOG_DIR, "suspicious-activity.log");

const ensureLogDir = () => {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
};

const persistSuspiciousActivity = async ({
  eventType,
  severity,
  ip,
  route,
  identifier,
  metadata = {},
}) => {
  try {
    const emailLike =
      typeof identifier === "string" && identifier.includes("@") ? identifier : null;
    await SuspiciousActivity.create({
      type: eventType,
      severity: severity || "medium",
      ip: ip && ip !== "unknown" ? ip : null,
      userEmail: emailLike,
      reason: metadata.reason || route || null,
      status: "new",
      meta: { route, identifier, ...metadata },
    });
  } catch (error) {
    console.error("[SECURITY_LOGGER] Failed to persist activity:", error.message);
  }
};

const logSuspiciousActivity = ({
  eventType,
  severity = "medium",
  ip,
  route,
  identifier,
  metadata = {},
}) => {
  const payload = {
    timestamp: new Date().toISOString(),
    eventType,
    severity,
    ip: ip || "unknown",
    route: route || "unknown",
    identifier: identifier || "anonymous",
    metadata,
  };

  const line = `${JSON.stringify(payload)}\n`;

  try {
    ensureLogDir();
    fs.appendFileSync(SUSPICIOUS_LOG_FILE, line, "utf8");
  } catch (error) {
    console.error("[SECURITY_LOGGER] Failed to write suspicious log:", error.message);
  }

  console.warn("[SUSPICIOUS_ACTIVITY]", payload);
  persistSuspiciousActivity({ eventType, severity, ip, route, identifier, metadata });
};

module.exports = {
  logSuspiciousActivity,
};
