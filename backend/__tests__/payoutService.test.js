jest.mock("../models/Payout", () => {
  const MockPayout = jest.fn().mockImplementation((data) => ({
    ...data,
    save: jest.fn().mockResolvedValue({}),
  }));
  MockPayout.findOne = jest.fn();
  MockPayout.find = jest.fn();
  MockPayout.findOneAndUpdate = jest.fn();
  MockPayout.findByIdAndUpdate = jest.fn();
  MockPayout.aggregate = jest.fn();
  return MockPayout;
});

jest.mock("../models/User", () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
}));

jest.mock("../models/Transaction", () => ({
  findOne: jest.fn(),
}));

jest.mock("../models/Task", () => ({
  findById: jest.fn(),
}));

jest.mock("../services/adapters", () => ({
  getAdapter: jest.fn(),
}));

jest.mock("../utils/mail", () => ({
  sendPayoutEscrowEmail: jest.fn().mockResolvedValue({}),
  sendPayoutAvailableEmail: jest.fn().mockResolvedValue({}),
  sendPayoutRequestedEmail: jest.fn().mockResolvedValue({}),
  sendPayoutApprovedEmail: jest.fn().mockResolvedValue({}),
  sendPayoutRejectedEmail: jest.fn().mockResolvedValue({}),
  sendPayoutPaidEmail: jest.fn().mockResolvedValue({}),
  sendPayoutFailedEmail: jest.fn().mockResolvedValue({}),
}));

jest.mock("../config/payout", () => ({
  payoutConfig: {
    commission: { rate: 10, minimumFee: 20 },
    settlementCycles: { BD: 1 },
    countries: {
      BD: {
        currency: "BDT",
        psp: "sslcommerz",
        destinationTypes: ["bank_transfer", "mobile_banking"],
        mobileBankingProviders: ["bkash", "nagad", "rocket"],
      },
    },
  },
}));

const Payout = require("../models/Payout");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Task = require("../models/Task");
const { getAdapter } = require("../services/adapters");
const {
  createEscrowPayout,
  schedulePayoutForTask,
  releaseScheduledPayouts,
  requestWithdrawal,
  requestAllAvailableWithdrawals,
  approveAndDisburse,
  rejectWithdrawal,
  handleDisbursementWebhook,
} = require("../services/payoutService");

// Factory for mock payout objects returned by Payout.findOne / Payout.find
const makePayout = (overrides = {}) => ({
  payoutId: "PYO_test_123",
  providerId: "provider123",
  taskId: "task123",
  status: "escrow",
  netAmount: 450,
  grossAmount: 500,
  currency: "BDT",
  country: "BD",
  psp: "sslcommerz",
  settlementCycle: 1,
  errorDetails: null,
  payoutDestination: { type: "mobile_banking", mobileBankingProvider: "bkash", mobileNumber: "01712345678" },
  save: jest.fn().mockResolvedValue({}),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  User.findByIdAndUpdate.mockResolvedValue({});
  // Default: chained .select() pattern used by most service functions for email lookups
  User.findById.mockReturnValue({
    select: jest.fn().mockResolvedValue({ email: "provider@test.com", name: "Provider" }),
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("createEscrowPayout", () => {
  const input = {
    transactionObjectId: "txn123",
    taskId: "task123",
    providerId: "provider123",
    grossAmount: 500,
    country: "BD",
  };

  test("creates payout in escrow with correct commission amounts without changing walletPending", async () => {
    Payout.findOne.mockResolvedValue(null);

    await createEscrowPayout(input);

    expect(Payout).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "escrow",
        grossAmount: 500,
        commissionAmount: 50,
        netAmount: 450,
        currency: "BDT",
      })
    );
    expect(User.findByIdAndUpdate).not.toHaveBeenCalledWith("provider123", { $inc: { walletPending: 450 } });
  });

  test("returns existing payout without creating a new one (idempotency)", async () => {
    const existing = makePayout();
    Payout.findOne.mockResolvedValue(existing);

    const result = await createEscrowPayout(input);

    expect(Payout).not.toHaveBeenCalled(); // constructor not called
    expect(result).toBe(existing);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("schedulePayoutForTask", () => {
  test("transitions status to scheduled and sets scheduledAt to next business day", async () => {
    const payout = makePayout({ status: "escrow" });
    Payout.findOne.mockResolvedValue(payout);

    await schedulePayoutForTask("task123");

    expect(payout.status).toBe("scheduled");
    expect(payout.scheduledAt).toBeInstanceOf(Date);
    expect(payout.save).toHaveBeenCalled();
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith("provider123", { $inc: { walletPending: 450 } });
  });

  test("returns null when no escrow payout exists for the task", async () => {
    Payout.findOne.mockResolvedValue(null);
    Task.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });
    Transaction.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue(null),
    });

    const result = await schedulePayoutForTask("task123");

    expect(result).toBeNull();
  });

  test("creates missing escrow from successful transaction before scheduling", async () => {
    Payout.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    Task.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ assignedProvider: "provider123" }),
    });
    Transaction.findOne.mockReturnValue({
      sort: jest.fn().mockResolvedValue({
        _id: "txn123",
        taskId: "task123",
        amount: 500,
      }),
    });

    const result = await schedulePayoutForTask("task123");

    expect(result.status).toBe("scheduled");
    expect(Payout).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "escrow",
        sourceTransactionId: "txn123",
        providerId: "provider123",
      })
    );
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith("provider123", { $inc: { walletPending: 450 } });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("releaseScheduledPayouts", () => {
  beforeEach(() => {
    Payout.aggregate.mockResolvedValue([]);
  });

  test("credits walletBalance, clears walletPending, and sets status to available", async () => {
    const payout = makePayout({ status: "available", netAmount: 450, releasedAt: new Date() });
    Payout.findOneAndUpdate.mockResolvedValueOnce(payout).mockResolvedValueOnce(null);

    const count = await releaseScheduledPayouts();

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith("provider123", {
      $inc: { walletBalance: 450, walletPending: -450 },
    });
    expect(payout.status).toBe("available");
    expect(payout.releasedAt).toBeInstanceOf(Date);
    expect(count).toBe(1);
  });

  test("returns 0 when no payouts are due", async () => {
    Payout.findOneAndUpdate.mockResolvedValue(null);

    const count = await releaseScheduledPayouts();

    expect(count).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("requestWithdrawal", () => {
  const destination = { type: "mobile_banking", mobileBankingProvider: "bkash", mobileNumber: "01712345678" };

  beforeEach(() => {
    // requestWithdrawal uses await User.findById() directly (no .select())
    User.findById.mockResolvedValue({
      walletBalance: 450,
      email: "provider@test.com",
      name: "Provider",
      save: jest.fn().mockResolvedValue({}),
    });
  });

  test("reserves wallet funds and transitions status to pending_approval", async () => {
    const payout = makePayout({ status: "available" });
    Payout.findOne.mockResolvedValue(payout);

    await requestWithdrawal("provider123", "PYO_test_123", destination);

    expect(payout.status).toBe("pending_approval");
    expect(payout.payoutDestination).toBe(destination);
    expect(payout.save).toHaveBeenCalled();
  });

  test("throws when payout is not in available state", async () => {
    Payout.findOne.mockResolvedValue(makePayout({ status: "escrow" }));

    await expect(requestWithdrawal("provider123", "PYO_test_123", destination)).rejects.toThrow(
      "Cannot withdraw: payout is in 'escrow' state"
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("requestAllAvailableWithdrawals", () => {
  const destination = { type: "mobile_banking", mobileBankingProvider: "bkash", mobileNumber: "01712345678" };

  beforeEach(() => {
    User.findById.mockResolvedValue({
      walletBalance: 900,
      email: "provider@test.com",
      name: "Provider",
      save: jest.fn().mockResolvedValue({}),
    });
  });

  test("moves all available payouts to pending_approval and reserves total wallet funds", async () => {
    const payoutA = makePayout({ payoutId: "PYO_a", status: "available", netAmount: 450 });
    const payoutB = makePayout({ payoutId: "PYO_b", status: "available", netAmount: 450 });
    Payout.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([payoutA, payoutB]),
    });

    const result = await requestAllAvailableWithdrawals("provider123", destination);

    expect(result.count).toBe(2);
    expect(result.totalAmount).toBe(900);
    expect(payoutA.status).toBe("pending_approval");
    expect(payoutB.status).toBe("pending_approval");
    expect(payoutA.payoutDestination).toBe(destination);
    expect(payoutB.payoutDestination).toBe(destination);
    expect(payoutA.save).toHaveBeenCalled();
    expect(payoutB.save).toHaveBeenCalled();
  });

  test("throws when there are no available payouts", async () => {
    Payout.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue([]),
    });

    await expect(requestAllAvailableWithdrawals("provider123", destination)).rejects.toThrow(
      "No available payouts to withdraw"
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("approveAndDisburse", () => {
  const mockDisburse = jest.fn();

  beforeEach(() => {
    getAdapter.mockReturnValue({ disburse: mockDisburse });
  });

  test("sets status to paid and saves pspReference on adapter success", async () => {
    const payout = makePayout({ status: "pending_approval" });
    Payout.findOne.mockResolvedValue(payout);
    mockDisburse.mockResolvedValue({ success: true, pspReference: "REF_001", rawResponse: {} });

    await approveAndDisburse("PYO_test_123", "admin123");

    expect(payout.status).toBe("paid");
    expect(payout.pspReference).toBe("REF_001");
  });

  test("sets status to failed and refunds wallet on adapter failure", async () => {
    const payout = makePayout({ status: "pending_approval" });
    Payout.findOne.mockResolvedValue(payout);
    mockDisburse.mockResolvedValue({ success: false, pspReference: null, rawResponse: "PSP error" });

    await approveAndDisburse("PYO_test_123", "admin123");

    expect(payout.status).toBe("failed");
    expect(payout.errorDetails.code).toBe("PSP_DISBURSE_FAILED");
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith("provider123", { $inc: { walletBalance: 450 } });
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("rejectWithdrawal", () => {
  test("restores wallet balance and sets status to rejected with reason", async () => {
    const payout = makePayout({ status: "pending_approval" });
    Payout.findOne.mockResolvedValue(payout);

    await rejectWithdrawal("PYO_test_123", "admin123", "Cannot verify destination");

    expect(User.findByIdAndUpdate).toHaveBeenCalledWith("provider123", { $inc: { walletBalance: 450 } });
    expect(payout.status).toBe("rejected");
    expect(payout.rejectionReason).toBe("Cannot verify destination");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("handleDisbursementWebhook", () => {
  test("updates status to paid on SUCCESS payload", async () => {
    const payout = makePayout({ status: "processing" });
    Payout.findOne.mockResolvedValue(payout);

    await handleDisbursementWebhook("sslcommerz", {
      trnx_id: "PYO_test_123",
      status: "SUCCESS",
      bank_tran_id: "BD_BANK_REF_001",
    });

    expect(payout.status).toBe("paid");
    expect(payout.webhookReceivedAt).toBeInstanceOf(Date);
    expect(payout.save).toHaveBeenCalled();
  });

  test("returns without saving when payout is already in terminal state (idempotency)", async () => {
    const payout = makePayout({ status: "paid" });
    Payout.findOne.mockResolvedValue(payout);

    await handleDisbursementWebhook("sslcommerz", {
      trnx_id: "PYO_test_123",
      status: "SUCCESS",
    });

    expect(payout.save).not.toHaveBeenCalled();
  });
});
