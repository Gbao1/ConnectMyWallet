jest.mock("../config/payout", () => ({
  payoutConfig: {
    commission: { rate: 10, minimumFee: 20 },
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

const {
  generatePayoutId,
  calculateCommission,
  addBusinessDays,
  mapPayoutPspStatus,
  validatePayoutDestination,
} = require("../utils/payoutHelper");

// ─────────────────────────────────────────────────────────────────────────────

describe("generatePayoutId", () => {
  test("returns a string starting with PYO_", () => {
    expect(generatePayoutId()).toMatch(/^PYO_/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("calculateCommission", () => {
  test("returns 10% commission for large amounts (500 BDT → 50 commission, 450 net)", () => {
    const result = calculateCommission(500);
    expect(result.commissionRate).toBe(10);
    expect(result.commissionAmount).toBe(50);
    expect(result.netAmount).toBe(450);
  });

  test("applies minimum fee when 10% would be below 20 BDT (100 BDT → 20 commission, 80 net)", () => {
    const result = calculateCommission(100);
    expect(result.commissionAmount).toBe(20);
    expect(result.netAmount).toBe(80);
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("addBusinessDays", () => {
  test("skips Saturday and Sunday when adding 1 day to a Friday", () => {
    const friday = new Date("2026-04-24T00:00:00Z");
    const result = addBusinessDays(friday, 1);
    expect(result.getUTCDay()).toBe(1); // Monday
  });

  test("returns next calendar day when adding 1 day to a Monday", () => {
    const monday = new Date("2026-04-27T00:00:00Z");
    const result = addBusinessDays(monday, 1);
    expect(result.getUTCDay()).toBe(2); // Tuesday
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("mapPayoutPspStatus", () => {
  test("maps SUCCESS to paid", () => {
    expect(mapPayoutPspStatus("SUCCESS", "sslcommerz")).toBe("paid");
  });

  test("maps FAILED to failed", () => {
    expect(mapPayoutPspStatus("FAILED", "sslcommerz")).toBe("failed");
  });

  test("returns processing for unknown status (safe default)", () => {
    expect(mapPayoutPspStatus("UNKNOWN_STATUS", "sslcommerz")).toBe("processing");
  });
});

// ─────────────────────────────────────────────────────────────────────────────

describe("validatePayoutDestination", () => {
  test("returns invalid for mobile_banking missing mobileNumber", () => {
    const result = validatePayoutDestination(
      { type: "mobile_banking", mobileBankingProvider: "bkash" },
      "BD"
    );
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/mobileNumber/);
  });

  test("returns invalid for bank_transfer missing accountNumber", () => {
    const result = validatePayoutDestination(
      { type: "bank_transfer", bankName: "DBB", accountHolderName: "John", routingNumber: "123" },
      "BD"
    );
    expect(result.valid).toBe(false);
  });

  test("returns valid for a complete mobile_banking destination", () => {
    const result = validatePayoutDestination(
      { type: "mobile_banking", mobileBankingProvider: "bkash", mobileNumber: "01712345678" },
      "BD"
    );
    expect(result.valid).toBe(true);
  });

  test("returns valid for BD mobile number with +88 country code", () => {
    const result = validatePayoutDestination(
      { type: "mobile_banking", mobileBankingProvider: "nagad", mobileNumber: "+8801712345678" },
      "BD"
    );
    expect(result.valid).toBe(true);
  });

  test("returns invalid for malformed BD mobile number", () => {
    const result = validatePayoutDestination(
      { type: "mobile_banking", mobileBankingProvider: "rocket", mobileNumber: "01234567890" },
      "BD"
    );
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/valid Bangladesh number/i);
  });
});
