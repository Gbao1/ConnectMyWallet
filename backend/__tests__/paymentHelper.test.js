// Tests for pure utility functions in paymentHelper.js
// No mocking required — config values used (pspCurrencyMap, supportedPsps) are hardcoded

const {
  validateAmount,
  validateCurrencyForPsp,
  mapPspStatus,
  generateTransactionId,
  isSupportedPsp,
} = require("../utils/paymentHelper");

describe("validateAmount", () => {
  test("returns valid:true for valid amounts", () => {
    expect(validateAmount(100).valid).toBe(true);
    expect(validateAmount(9999999.99).valid).toBe(true);
    expect(validateAmount(0.01).valid).toBe(true);
  });

  test("returns valid:false for edge cases: zero, negative, over limit, non-number", () => {
    expect(validateAmount(0).valid).toBe(false);
    expect(validateAmount(-1).valid).toBe(false);
    expect(validateAmount(10000001).valid).toBe(false);
    expect(validateAmount("100").valid).toBe(false);
    expect(validateAmount(NaN).valid).toBe(false);
  });
});

describe("validateCurrencyForPsp", () => {
  test("accepts valid currency+PSP pairs", () => {
    expect(validateCurrencyForPsp("BDT", "sslcommerz")).toBe(true);
    expect(validateCurrencyForPsp("PKR", "payfast")).toBe(true);
  });

  test("rejects invalid currency+PSP pairs", () => {
    expect(validateCurrencyForPsp("PKR", "sslcommerz")).toBe(false);
    expect(validateCurrencyForPsp("BDT", "payfast")).toBe(false);
    expect(validateCurrencyForPsp("USD", "sslcommerz")).toBe(false);
    expect(validateCurrencyForPsp("BDT", "unknownpsp")).toBe(false);
  });
});

describe("mapPspStatus", () => {
  test("maps SSLCommerz success states to 'success'", () => {
    expect(mapPspStatus("VALID", "sslcommerz")).toBe("success");
    expect(mapPspStatus("VALIDATED", "sslcommerz")).toBe("success");
  });

  test("maps SSLCommerz fail/cancel states correctly", () => {
    expect(mapPspStatus("FAILED", "sslcommerz")).toBe("failed");
    expect(mapPspStatus("CANCELLED", "sslcommerz")).toBe("cancelled");
  });

  test("returns 'pending' for unknown status (safe default)", () => {
    expect(mapPspStatus("GIBBERISH", "sslcommerz")).toBe("pending");
    expect(mapPspStatus("UNKNOWN", "payfast")).toBe("pending");
  });
});

describe("generateTransactionId", () => {
  test("starts with TXN_ and two calls produce different IDs", () => {
    const id1 = generateTransactionId();
    const id2 = generateTransactionId();

    expect(id1).toMatch(/^TXN_/);
    expect(id2).toMatch(/^TXN_/);
    expect(id1).not.toBe(id2);
  });
});

describe("isSupportedPsp", () => {
  test("returns true for supported PSPs", () => {
    expect(isSupportedPsp("sslcommerz")).toBe(true);
    expect(isSupportedPsp("payfast")).toBe(true);
  });

  test("returns false for unsupported PSPs", () => {
    expect(isSupportedPsp("razorpay")).toBe(false);
    expect(isSupportedPsp("stripe")).toBe(false);
    expect(isSupportedPsp("")).toBe(false);
  });
});
