// Tests for SSLCommerz service logic
// Mocks: sslcommerz-lts, ../config/payment, ../utils/paymentHelper

const crypto = require("crypto");

jest.mock("sslcommerz-lts", () => {
  return jest.fn().mockImplementation(() => ({
    init: jest.fn(),
    validate: jest.fn(),
  }));
});

jest.mock("../config/payment", () => ({
  paymentConfig: {
    sslcommerz: { storeId: "testbox", storePassword: "qwerty", isSandbox: true },
    sslCallbackBaseUrl: "http://localhost:5001/api/payments/ssl",
  },
}));

jest.mock("../utils/paymentHelper", () => ({
  getWebhookUrl: jest.fn().mockReturnValue("http://localhost:5001/api/payments/webhook/sslcommerz"),
}));

const SSLCommerzPayment = require("sslcommerz-lts");
const { validateIPN, initiateSSLPayment } = require("../services/sslcommerzService");

// Helper: compute correct IPN signature
const buildValidIpnPayload = (fields, storePassword) => {
  const verify_key = Object.keys(fields).join(",");
  const hashData = { ...fields };
  hashData["store_passwd"] = crypto.createHash("md5").update(storePassword).digest("hex");

  const sortedKeys = Object.keys(hashData).sort();
  const hashString = sortedKeys.map((k) => `${k}=${hashData[k]}`).join("&");
  const verify_sign = crypto.createHash("md5").update(hashString).digest("hex");

  return { ...fields, verify_key, verify_sign };
};

describe("validateIPN", () => {
  const storePassword = "qwerty";

  test("returns valid:true when hash matches", () => {
    const postData = buildValidIpnPayload(
      { amount: "500.00", tran_id: "TXN_test123", status: "VALID" },
      storePassword
    );
    const result = validateIPN(postData, storePassword);
    expect(result.valid).toBe(true);
  });

  test("returns valid:false when data has been tampered (wrong hash)", () => {
    const postData = buildValidIpnPayload(
      { amount: "500.00", tran_id: "TXN_test123" },
      storePassword
    );
    // Tamper with the amount after computing hash
    postData.amount = "9999.00";

    const result = validateIPN(postData, storePassword);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/hash mismatch/i);
  });

  test("returns valid:false with error when verify_sign or verify_key is missing", () => {
    const result = validateIPN({ amount: "500.00", tran_id: "TXN_test" }, storePassword);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/missing/i);
  });
});

describe("initiateSSLPayment", () => {
  const mockTransaction = {
    amount: 500,
    transactionId: "TXN_test_abc",
  };
  const mockUser = { name: "Test User", email: "test@example.com", phone: "01700000000" };
  const mockTask = { title: "Fix my sink", category: "Plumbing" };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns gatewayUrl when SSLCommerz init succeeds", async () => {
    const mockGatewayUrl = "https://sandbox.sslcommerz.com/pay/session123";
    SSLCommerzPayment.mockImplementation(() => ({
      init: jest.fn().mockResolvedValue({ GatewayPageURL: mockGatewayUrl }),
    }));

    const result = await initiateSSLPayment(mockTransaction, mockUser, mockTask);
    expect(result.gatewayUrl).toBe(mockGatewayUrl);
  });

  test("throws error when SSLCommerz returns no GatewayPageURL", async () => {
    SSLCommerzPayment.mockImplementation(() => ({
      init: jest.fn().mockResolvedValue({ failedreason: "Invalid credentials" }),
    }));

    await expect(initiateSSLPayment(mockTransaction, mockUser, mockTask)).rejects.toThrow(
      /SSLCommerz init failed/
    );
  });
});
