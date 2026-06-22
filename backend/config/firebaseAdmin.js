// config/firebaseAdmin.js
const fs = require("fs");
const path = require("path");

const serviceAccountPath = path.join(__dirname, "serviceAccountKey.json");
const firebaseDisabled =
  process.env.FIREBASE_DISABLED === "true" || !fs.existsSync(serviceAccountPath);

if (firebaseDisabled) {
  // Graceful no-op for local dev without Firebase credentials.
  // Keeps the rest of the app working while notifications are skipped.
  module.exports = {
    apps: [],
    messaging: () => ({
      send: async () => "firebase-disabled",
    }),
  };
} else {
  const admin = require("firebase-admin");

  if (!admin.apps.length) {
    const serviceAccount = require("./serviceAccountKey.json");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  module.exports = admin;
}
