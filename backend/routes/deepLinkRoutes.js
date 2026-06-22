const express = require("express");
const router = express.Router();

// Android App Links verification
// Android fetches this at install time to confirm the server grants deep link permission.
router.get("/assetlinks.json", (req, res) => {
  const packageName = process.env.ANDROID_PACKAGE_NAME;
  const fingerprint = process.env.ANDROID_SHA256_CERT_FINGERPRINT;

  if (!packageName || !fingerprint) {
    console.error("[DeepLinks] ANDROID_PACKAGE_NAME or ANDROID_SHA256_CERT_FINGERPRINT is not set.");
    return res.status(503).json({ error: "Android deep link config not set" });
  }

  res.setHeader("Content-Type", "application/json");
  return res.status(200).json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: packageName,
        sha256_cert_fingerprints: [fingerprint],
      },
    },
  ]);
});

// iOS Universal Links verification
// URL must NOT have a .json extension — iOS rejects it if it does.
router.get("/apple-app-site-association", (req, res) => {
  const teamId = process.env.IOS_TEAM_ID;
  const bundleId = process.env.IOS_BUNDLE_ID;

  if (!teamId || !bundleId) {
    console.error("[DeepLinks] IOS_TEAM_ID or IOS_BUNDLE_ID is not set.");
    return res.status(503).json({ error: "iOS deep link config not set" });
  }

  res.setHeader("Content-Type", "application/json");
  return res.status(200).json({
    applinks: {
      apps: [],
      details: [
        {
          appID: `${teamId}.${bundleId}`,
          paths: ["*"],
        },
      ],
    },
  });
});

module.exports = router;
