const express = require("express");
const request = require("supertest");

jest.mock("../utils/securityLogger", () => ({
  logSuspiciousActivity: jest.fn(),
}));

describe("authAttemptGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.AUTH_RATE_LIMIT_MAX_ATTEMPTS = "3";
    process.env.AUTH_RATE_LIMIT_WINDOW_MS = "60000";
    process.env.AUTH_RATE_LIMIT_BLOCK_MS = "120000";
    process.env.AUTH_SUSPICIOUS_FAILURE_THRESHOLD = "2";
    jest.resetModules();
  });

  test("blocks requests after max auth attempts", async () => {
    const { logSuspiciousActivity } = require("../utils/securityLogger");
    const { authAttemptGuard, __resetSecurityStateForTests } = require("../middlewares/securityMiddleware");
    __resetSecurityStateForTests();

    const app = express();
    app.use(express.json());
    app.post("/api/auth/login", authAttemptGuard("password_login"), (req, res) =>
      res.status(401).json({ msg: "Invalid credentials" })
    );

    await request(app)
      .post("/api/auth/login")
      .send({ email: "demo@test.com", password: "wrong" })
      .expect(401);

    await request(app)
      .post("/api/auth/login")
      .send({ email: "demo@test.com", password: "wrong" })
      .expect(401);

    await request(app)
      .post("/api/auth/login")
      .send({ email: "demo@test.com", password: "wrong" })
      .expect(401);

    const blocked = await request(app)
      .post("/api/auth/login")
      .send({ email: "demo@test.com", password: "wrong" });

    expect(blocked.status).toBe(429);
    expect(blocked.body.msg).toMatch(/too many authentication attempts/i);
    expect(logSuspiciousActivity).toHaveBeenCalled();
  });

  test("logs suspicious repeated auth failures before hard block", async () => {
    const { logSuspiciousActivity } = require("../utils/securityLogger");
    const { authAttemptGuard, __resetSecurityStateForTests } = require("../middlewares/securityMiddleware");
    __resetSecurityStateForTests();

    const app = express();
    app.use(express.json());
    app.post("/api/auth/google", authAttemptGuard("google_login"), (req, res) =>
      res.status(401).json({ msg: "Invalid access token" })
    );

    await request(app).post("/api/auth/google").send({ idToken: "bad-token" }).expect(401);
    await request(app).post("/api/auth/google").send({ idToken: "bad-token" }).expect(401);

    expect(logSuspiciousActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: "repeated_auth_failures",
      })
    );
  });
});
