const express = require("express");
const request = require("supertest");

jest.mock("../middlewares/authMiddleware", () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: "user123", role: req.headers["x-test-role"] || "provider" };
    next();
  },
  authorizeRoles: (...roles) => (req, res, next) => {
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({ msg: "Forbidden" });
  },
}));

jest.mock("../services/payoutService", () => ({
  reconcileEscrowPayoutsForProvider: jest.fn().mockResolvedValue(0),
  reconcileCompletedTasksForProvider: jest.fn().mockResolvedValue(0),
  releaseScheduledPayouts: jest.fn().mockResolvedValue(0),
  syncProviderWallet: jest.fn().mockResolvedValue({ walletBalance: 0, walletPending: 0 }),
  requestWithdrawal: jest.fn(),
  requestAllAvailableWithdrawals: jest.fn(),
  approveAndDisburse: jest.fn(),
  rejectWithdrawal: jest.fn(),
  handleDisbursementWebhook: jest.fn(),
}));

jest.mock("../models/User", () => ({
  findById: jest.fn(),
}));

jest.mock("../models/Payout", () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
}));

jest.mock("../config/payout", () => ({
  payoutConfig: {
    countries: {
      BD: {
        currency: "BDT",
        psp: "sslcommerz",
        destinationTypes: ["bank_transfer", "mobile_banking"],
        mobileBankingProviders: ["bkash", "nagad", "rocket"],
      },
    },
  },
  validatePayoutPspCredentials: jest.fn().mockReturnValue({ valid: true }),
}));

jest.mock("../utils/payoutHelper", () => ({
  validatePayoutDestination: jest.fn().mockReturnValue({ valid: true }),
}));

const payoutRoutes = require("../routes/payoutRoutes");
const payoutService = require("../services/payoutService");
const User = require("../models/User");
const Payout = require("../models/Payout");

const app = express();
app.use(express.json());
app.use("/api/payouts", payoutRoutes);

beforeEach(() => jest.clearAllMocks());

// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/payouts/wallet", () => {
  test("returns 200 with walletBalance and walletPending for provider", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ walletBalance: 450, walletPending: 0 }),
    });

    const res = await request(app).get("/api/payouts/wallet");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ walletBalance: 450, walletPending: 0 });
  });

  test("returns 403 when called with non-provider role", async () => {
    const res = await request(app).get("/api/payouts/wallet").set("x-test-role", "user");

    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/payouts/history", () => {
  test("reconciles missing escrow payouts before returning provider history", async () => {
    Payout.find.mockReturnValue({
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([]),
    });
    Payout.countDocuments.mockResolvedValue(0);

    const res = await request(app).get("/api/payouts/history");

    expect(res.status).toBe(200);
    expect(payoutService.reconcileEscrowPayoutsForProvider).toHaveBeenCalledWith("user123");
    expect(res.body.payouts).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/payouts/destinations", () => {
  test("returns 400 when country or type is missing", async () => {
    const res = await request(app)
      .post("/api/payouts/destinations")
      .send({ label: "My bKash" }); // missing country and type

    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/country and type/);
  });

  test("returns 201 on valid destination", async () => {
    const mockUser = {
      payoutDestinations: [],
      save: jest.fn().mockResolvedValue({}),
    };
    User.findById.mockResolvedValue(mockUser);

    const res = await request(app)
      .post("/api/payouts/destinations")
      .send({
        label: "My bKash",
        country: "BD",
        type: "mobile_banking",
        mobileBankingProvider: "bkash",
        mobileNumber: "01712345678",
        isDefault: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.msg).toBe("Payout destination saved");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("PATCH /api/payouts/destinations/:destinationId/default", () => {
  test("marks an existing destination as default and clears previous default for same country", async () => {
    const makeDestination = (id, country, isDefault) => ({
      _id: { toString: () => id },
      country,
      isDefault,
      toObject() {
        return { _id: this._id, country: this.country, isDefault: this.isDefault };
      },
    });
    const mockUser = {
      payoutDestinations: [
        makeDestination("dest_old", "BD", true),
        makeDestination("dest_new", "BD", false),
      ],
      save: jest.fn().mockResolvedValue({}),
    };
    User.findById.mockResolvedValue(mockUser);

    const res = await request(app).patch("/api/payouts/destinations/dest_new/default");

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe("Default payout destination updated");
    expect(mockUser.payoutDestinations).toEqual([
      expect.objectContaining({ isDefault: false }),
      expect.objectContaining({ isDefault: true }),
    ]);
    expect(mockUser.save).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/payouts/:payoutId/withdraw", () => {
  test("returns 400 when neither destinationId nor destination object is provided", async () => {
    const res = await request(app)
      .post("/api/payouts/PYO_test_123/withdraw")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/destinationId or destination/);
  });

  test("returns 400 when service throws a wrong-status error", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        payoutDestinations: [{ _id: { toString: () => "dest123" }, type: "mobile_banking" }],
      }),
    });
    payoutService.requestWithdrawal.mockRejectedValue(
      new Error("Cannot withdraw: payout is in 'escrow' state")
    );

    const res = await request(app)
      .post("/api/payouts/PYO_test_123/withdraw")
      .send({ destinationId: "dest123" });

    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/Cannot withdraw/);
  });

  test("returns 200 on successful withdrawal request", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        payoutDestinations: [{ _id: { toString: () => "dest123" }, type: "mobile_banking" }],
      }),
    });
    payoutService.requestWithdrawal.mockResolvedValue({
      payout: { payoutId: "PYO_test_123", status: "pending_approval", netAmount: 450, currency: "BDT" },
    });

    const res = await request(app)
      .post("/api/payouts/PYO_test_123/withdraw")
      .send({ destinationId: "dest123" });

    expect(res.status).toBe(200);
    expect(res.body.payout.status).toBe("pending_approval");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/payouts/withdraw-all", () => {
  test("returns 400 when destinationId is missing", async () => {
    const res = await request(app).post("/api/payouts/withdraw-all").send({});

    expect(res.status).toBe(400);
    expect(res.body.msg).toMatch(/destinationId/);
  });

  test("returns 200 and delegates all available payouts to payout service", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        payoutDestinations: [{ _id: { toString: () => "dest123" }, type: "mobile_banking" }],
      }),
    });
    payoutService.requestAllAvailableWithdrawals.mockResolvedValue({
      count: 2,
      totalAmount: 900,
      currency: "BDT",
      payouts: [
        { payoutId: "PYO_1", status: "pending_approval", netAmount: 450, currency: "BDT" },
        { payoutId: "PYO_2", status: "pending_approval", netAmount: 450, currency: "BDT" },
      ],
    });

    const res = await request(app)
      .post("/api/payouts/withdraw-all")
      .send({ destinationId: "dest123" });

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
    expect(res.body.totalAmount).toBe(900);
    expect(payoutService.requestAllAvailableWithdrawals).toHaveBeenCalledWith(
      "user123",
      expect.objectContaining({ type: "mobile_banking" })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/payouts/admin/:payoutId/approve", () => {
  test("returns 403 when called with non-admin role", async () => {
    const res = await request(app)
      .post("/api/payouts/admin/PYO_test_123/approve")
      .set("x-test-role", "provider");

    expect(res.status).toBe(403);
  });

  test("returns 200 and delegates to payoutService.approveAndDisburse", async () => {
    Payout.findOne.mockResolvedValue({ payoutId: "PYO_test_123", psp: "sslcommerz" });
    payoutService.approveAndDisburse.mockResolvedValue({
      payout: { payoutId: "PYO_test_123", status: "paid", pspReference: "REF_001" },
      disbursementResult: { success: true },
    });

    const res = await request(app)
      .post("/api/payouts/admin/PYO_test_123/approve")
      .set("x-test-role", "admin");

    expect(res.status).toBe(200);
    expect(payoutService.approveAndDisburse).toHaveBeenCalledWith("PYO_test_123", "user123");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/payouts/admin/:payoutId/reject", () => {
  test("returns 200 with default reason when body reason is missing", async () => {
    payoutService.rejectWithdrawal.mockResolvedValue({
      payoutId: "PYO_test_123",
      status: "rejected",
      rejectionReason: "Rejected by admin",
    });

    const res = await request(app)
      .post("/api/payouts/admin/PYO_test_123/reject")
      .set("x-test-role", "admin")
      .send({});

    expect(res.status).toBe(200);
    expect(payoutService.rejectWithdrawal).toHaveBeenCalledWith(
      "PYO_test_123",
      "user123",
      "Rejected by admin"
    );
  });

  test("returns 200 and rejects with provided reason", async () => {
    payoutService.rejectWithdrawal.mockResolvedValue({
      payoutId: "PYO_test_123",
      status: "rejected",
      rejectionReason: "Cannot verify destination",
    });

    const res = await request(app)
      .post("/api/payouts/admin/PYO_test_123/reject")
      .set("x-test-role", "admin")
      .send({ reason: "Cannot verify destination" });

    expect(res.status).toBe(200);
    expect(res.body.payout.status).toBe("rejected");
  });
});
