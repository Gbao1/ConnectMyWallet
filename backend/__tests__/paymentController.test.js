// Tests for payment controller via supertest
// All DB models and services are mocked — no real DB or network calls

const express = require("express");
const request = require("supertest");

// --- Mocks (hoisted by Jest) ---

jest.mock("../models/Transaction", () => {
  const mockSave = jest.fn().mockResolvedValue({});
  const MockTransaction = jest.fn().mockImplementation((data) => ({
    ...data,
    transactionId: "TXN_mock_123",
    status: "pending",
    save: mockSave,
  }));
  MockTransaction.findOne = jest.fn();
  return MockTransaction;
});

jest.mock("../models/Task", () => ({
  findById: jest.fn(),
}));

jest.mock("../models/User", () => ({
  findById: jest.fn(),
}));

jest.mock("../services/sslcommerzService", () => ({
  initiateSSLPayment: jest.fn(),
  validateIPN: jest.fn(),
  validateTransaction: jest.fn(),
}));

jest.mock("../services/payfastService", () => ({
  buildPaymentFormData: jest.fn(),
  verifyITN: jest.fn(),
  isPayfastIP: jest.fn(),
}));

jest.mock("../services/payoutService", () => ({
  createEscrowPayout: jest.fn(),
}));

jest.mock("../config/payment", () => ({
  paymentConfig: {
    supportedPsps: ["sslcommerz", "payfast"],
    pspCurrencyMap: { sslcommerz: "BDT", payfast: "PKR" },
    sslcommerz: { storeId: "testbox", storePassword: "qwerty", isSandbox: true },
    payfast: { merchantId: "testmerchant", merchantKey: "testkey", isSandbox: true },
    redirectUrls: {
      success: "http://localhost:3000/payment/success",
      failure: "http://localhost:3000/payment/failed",
      cancel: "http://localhost:3000/payment/cancel",
    },
    sslCallbackBaseUrl: "http://localhost:5001/api/payments/ssl",
    webhookBaseUrl: "http://localhost:5001/api/payments/webhook",
  },
  validatePspCredentials: jest.fn().mockReturnValue({ valid: true }),
}));

jest.mock("../middlewares/authMiddleware", () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: "user123", role: "user" };
    next();
  },
  authorizeRoles: () => (req, res, next) => next(),
}));

// --- App setup ---

const paymentRoutes = require("../routes/paymentRoutes");
const Transaction = require("../models/Transaction");
const Task = require("../models/Task");
const User = require("../models/User");
const sslcommerzService = require("../services/sslcommerzService");
const payoutService = require("../services/payoutService");

const app = express();
app.use(express.json());
app.use("/api/payments", paymentRoutes);

// --- Tests ---

describe("POST /api/payments/:psp/initiate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no duplicate transaction, credentials valid
    Transaction.findOne.mockResolvedValue(null);
  });

  test("returns 400 for unsupported PSP (stripe)", async () => {
    const res = await request(app)
      .post("/api/payments/stripe/initiate")
      .send({ taskId: "task123", amount: 500, currency: "USD" });

    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/unsupported payment provider/i);
  });

  test("returns 400 for wrong currency for sslcommerz (PKR instead of BDT)", async () => {
    const res = await request(app)
      .post("/api/payments/sslcommerz/initiate")
      .send({ taskId: "task123", amount: 500, currency: "PKR" });

    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/invalid currency/i);
  });

  test("returns 400 with existing transactionId when a pending payment already exists", async () => {
    Transaction.findOne.mockResolvedValue({
      transactionId: "TXN_existing_456",
      status: "pending",
    });
    Task.findById.mockResolvedValue({ _id: "task123", title: "Fix sink", category: "Plumbing" });

    const res = await request(app)
      .post("/api/payments/sslcommerz/initiate")
      .send({ taskId: "task123", amount: 500, currency: "BDT" });

    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/already in progress/i);
    expect(res.body.transactionId).toBe("TXN_existing_456");
  });

  test("returns 201 with paymentUrl on successful SSLCommerz initiation", async () => {
    const mockTask = { _id: "task123", title: "Fix sink", category: "Plumbing" };
    const mockUser = { _id: "user123", name: "Test User", email: "test@example.com" };
    const mockGatewayUrl = "https://sandbox.sslcommerz.com/pay/sess_abc";

    Task.findById.mockResolvedValue(mockTask);
    User.findById.mockResolvedValue(mockUser);
    Transaction.findOne.mockResolvedValue(null);
    sslcommerzService.initiateSSLPayment.mockResolvedValue({ gatewayUrl: mockGatewayUrl });

    const res = await request(app)
      .post("/api/payments/sslcommerz/initiate")
      .send({ taskId: "task123", amount: 500, currency: "BDT" });

    expect(res.status).toBe(201);
    expect(res.body.paymentUrl).toBe(mockGatewayUrl);
    expect(res.body.msg).toMatch(/payment initiated/i);
    expect(sslcommerzService.initiateSSLPayment).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/payments/ssl/success", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("creates an escrow payout when browser redirect marks SSLCommerz payment successful", async () => {
    const save = jest.fn().mockResolvedValue({});
    const transaction = {
      _id: "txnObject123",
      transactionId: "TXN_success_123",
      taskId: "task123",
      amount: 800,
      status: "processing",
      pspResponse: {},
      save,
    };

    Transaction.findOne.mockResolvedValue(transaction);
    Task.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ assignedProvider: "provider123" }),
    });

    const res = await request(app)
      .post("/api/payments/ssl/success")
      .send({ tran_id: "TXN_success_123" });

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("http://localhost:3000/payment/success");
    expect(transaction.status).toBe("success");
    expect(save).toHaveBeenCalledTimes(1);
    expect(payoutService.createEscrowPayout).toHaveBeenCalledWith({
      transactionObjectId: "txnObject123",
      taskId: "task123",
      providerId: "provider123",
      grossAmount: 800,
      country: "BD",
    });
  });

  test("still ensures escrow payout when success redirect is repeated for an already-successful transaction", async () => {
    const save = jest.fn().mockResolvedValue({});
    const transaction = {
      _id: "txnObject123",
      transactionId: "TXN_success_123",
      taskId: "task123",
      amount: 800,
      status: "success",
      pspResponse: {},
      save,
    };

    Transaction.findOne.mockResolvedValue(transaction);
    Task.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ assignedProvider: "provider123" }),
    });

    const res = await request(app)
      .post("/api/payments/ssl/success")
      .send({ tran_id: "TXN_success_123" });

    expect(res.status).toBe(302);
    expect(save).not.toHaveBeenCalled();
    expect(payoutService.createEscrowPayout).toHaveBeenCalledWith({
      transactionObjectId: "txnObject123",
      taskId: "task123",
      providerId: "provider123",
      grossAmount: 800,
      country: "BD",
    });
  });
});
