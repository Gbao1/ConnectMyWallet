jest.mock("../models/User", () => ({
  find: jest.fn(),
  updateMany: jest.fn(),
}));

jest.mock("../utils/securityLogger", () => ({
  logSuspiciousActivity: jest.fn(),
}));

const User = require("../models/User");
const { logSuspiciousActivity } = require("../utils/securityLogger");
const { captureDeviceFingerprint } = require("../services/deviceFingerprintService");

describe("deviceFingerprintService.captureDeviceFingerprint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns missing_fingerprint when fingerprint is absent", async () => {
    const user = {
      email: "demo@test.com",
      deviceFingerprints: [],
      fraudFlags: {},
      save: jest.fn(),
    };
    const req = { body: {}, headers: {}, ip: "127.0.0.1", originalUrl: "/api/auth/login" };

    const result = await captureDeviceFingerprint({ user, req, context: "password_login" });

    expect(result).toEqual({
      captured: false,
      flagged: false,
      reason: "missing_fingerprint",
    });
    expect(user.save).not.toHaveBeenCalled();
  });

  test("captures new fingerprint and flags shared device risk", async () => {
    User.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: "u1" }, { _id: "u2" }, { _id: "u3" }]),
    });
    User.updateMany.mockResolvedValue({ acknowledged: true, modifiedCount: 3 });

    const user = {
      email: "fraud@test.com",
      deviceFingerprints: [],
      fraudFlags: {},
      save: jest.fn().mockResolvedValue(undefined),
    };

    const req = {
      body: { deviceFingerprint: "fp_shared_001", platform: "web" },
      headers: { "user-agent": "jest-agent" },
      ip: "10.0.0.8",
      originalUrl: "/api/auth/login",
    };

    const result = await captureDeviceFingerprint({ user, req, context: "password_login" });

    expect(result.captured).toBe(true);
    expect(result.flagged).toBe(true);
    expect(result.linkedAccountCount).toBe(3);
    expect(user.deviceFingerprints).toHaveLength(1);
    expect(user.deviceFingerprints[0].fingerprintId).toBe("fp_shared_001");
    expect(User.updateMany).toHaveBeenCalled();
    expect(logSuspiciousActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "shared_device_across_accounts",
        identifier: "fraud@test.com",
      })
    );
  });
});
