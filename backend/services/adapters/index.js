// Payout Adapter Registry
// Maps ISO 3166-1 alpha-2 country codes to their concrete PSP adapter.
// To add a new country: import its adapter and add one entry below.

const sslcommerzPayoutAdapter = require("./sslcommerzPayoutAdapter");
// future: const stripeConnectAdapter = require("./stripeConnectAdapter");
// future: const wiseAdapter = require("./wiseAdapter");

const adapterRegistry = {
  BD: sslcommerzPayoutAdapter,
  // future: AU: stripeConnectAdapter,
  // future: GB: wiseAdapter,
};

const getAdapter = (country) => {
  const adapter = adapterRegistry[country];
  if (!adapter) {
    throw new Error(`No payout adapter registered for country: ${country}`);
  }
  return adapter;
};

module.exports = { getAdapter };
