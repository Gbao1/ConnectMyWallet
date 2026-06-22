const cron = require("node-cron");
const { releaseScheduledPayouts } = require("../services/payoutService");

// DEV: runs every minute — change back to "0 * * * *" for production
const startReleasePayoutsCron = () => {
  cron.schedule("* * * * *", async () => {
    console.log("[Cron] Checking for scheduled payouts to release...");
    try {
      const count = await releaseScheduledPayouts();
      if (count > 0) console.log(`[Cron] Released ${count} payout(s)`);
    } catch (err) {
      console.error("[Cron] releaseScheduledPayouts error:", err.message);
    }
  });

  console.log("[Cron] Release payouts job scheduled (hourly)");
};

module.exports = { startReleasePayoutsCron };
