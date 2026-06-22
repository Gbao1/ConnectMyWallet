// Tests for auth controller and requireEmailVerified middleware
// All DB models, mail utils, and external services are mocked — no real DB or network calls

const express = require("express");
const request = require("supertest");
const crypto = require("crypto");

// --- Mocks (hoisted by Jest) ---

jest.mock("../models/User", () => {
  const mockSave = jest.fn().mockResolvedValue({});
  const MockUser = jest.fn().mockImplementation((data) => ({
    _id: "user123",
    name: data.name || "Test User",
    email: data.email || "test@example.com",
    role: data.role || "user",
    password: data.password || "hashedpw",
    isVerified: false,
    verificationToken: null,
    verificationTokenExpiry: null,
    resetPasswordToken: null,
    resetPasswordTokenExpiry: null,
    profilePhoto: data.profilePhoto || "",
    location: data.location || null,
    skills: data.skills || [],
    fcmToken: data.fcmToken || null,
    averageRating: 0,
    totalReviews: 0,
    save: mockSave,
  }));
  MockUser.findOne = jest.fn();
  MockUser.findById = jest.fn();
  MockUser.updateOne = jest.fn();
  MockUser._mockSave = mockSave;
  return MockUser;
});

jest.mock("../utils/mail", () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue({}),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({}),
  sendRegistrationEmail: jest.fn().mockResolvedValue({}),
}));

jest.mock("../middlewares/authMiddleware", () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: "user123", role: "user" };
    next();
  },
  authorizeRoles: () => (req, res, next) => next(),
  requireEmailVerified: (req, res, next) => next(),
  requireKycVerified: (req, res, next) => next(),
}));

jest.mock("../middlewares/recaptcha", () => ({
  validateRecaptcha: () => (req, res, next) => next(),
}));

jest.mock("../middlewares/upload", () => ({
  single: () => (req, res, next) => next(),
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn().mockResolvedValue(true),
  hash: jest.fn().mockResolvedValue("hashedpw"),
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mock.jwt.token"),
  verify: jest.fn().mockReturnValue({ id: "user123", role: "user" }),
}));

jest.mock("../controllers/googleLoginController", () => ({
  googleLogin: (req, res) => res.status(200).json({ msg: "google" }),
}));

jest.mock("../controllers/facebookLoginController", () => ({
  facebookLogin: (req, res) => res.status(200).json({ msg: "facebook" }),
}));

// --- App setup ---

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret";
  process.env.FRONTEND_URL = "http://localhost:3000";
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

const authRoutes = require("../routes/authRoutes");
const User = require("../models/User");
const mail = require("../utils/mail");
const bcrypt = require("bcryptjs");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);

// --- Suite 1: POST /api/auth/register ---

describe("POST /api/auth/register", () => {
  beforeEach(() => jest.clearAllMocks());

  test("success: creates user, sends verification email, 201 without token (verify before login)", async () => {
    User.findOne.mockResolvedValue(null);
    User._mockSave.mockResolvedValue({});

    const res = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "user",
    });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeUndefined();
    expect(res.body.msg).toMatch(/check your email/i);
    expect(res.body.user.isVerified).toBe(false);
    expect(mail.sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(User._mockSave).toHaveBeenCalledTimes(1);
  });

  test("duplicate email: returns 400 'User already exists'", async () => {
    User.findOne.mockResolvedValue({ _id: "existing", email: "test@example.com" });

    const res = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "user",
    });

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("User already exists");
  });

  test("provider role: skills split on comma, stored as array", async () => {
    User.findOne.mockResolvedValue(null);
    User._mockSave.mockResolvedValue({});

    const res = await request(app).post("/api/auth/register").send({
      name: "Provider User",
      email: "provider@example.com",
      password: "password123",
      role: "provider",
      skills: "Plumbing,Electrical,Handyman",
    });

    expect(res.status).toBe(201);
    expect(res.body.user.skills).toEqual(["Plumbing", "Electrical", "Handyman"]);
    expect(res.body.token).toBeUndefined();
  });

  test("server error: user.save() rejects → 500", async () => {
    User.findOne.mockResolvedValue(null);
    User._mockSave.mockRejectedValueOnce(new Error("DB error"));

    const res = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "test@example.com",
      password: "password123",
      role: "user",
    });

    expect(res.status).toBe(500);
  });
});

// --- Suite 2: POST /api/auth/login ---

describe("POST /api/auth/login", () => {
  beforeEach(() => jest.clearAllMocks());

  test("success: valid credentials → returns token and user with isVerified", async () => {
    const mockSave = jest.fn().mockResolvedValue({});
    User.findOne.mockResolvedValue({
      _id: "user123",
      name: "Test User",
      email: "test@example.com",
      role: "user",
      password: "hashedpw",
      fcmToken: "same-token",
      isVerified: true,
      save: mockSave,
    });
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "password123",
      fcmToken: "same-token",
    });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe("mock.jwt.token");
    expect(res.body.user.isVerified).toBe(true);
  });

  test("unknown email: returns 400 'Invalid credentials'", async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app).post("/api/auth/login").send({
      email: "noone@example.com",
      password: "password123",
    });

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("Invalid credentials");
  });

  test("unverified email: returns 403 EMAIL_NOT_VERIFIED", async () => {
    const mockSave = jest.fn().mockResolvedValue({});
    User.findOne.mockResolvedValue({
      _id: "user123",
      name: "Test User",
      email: "test@example.com",
      role: "user",
      password: "hashedpw",
      fcmToken: "same-token",
      isVerified: false,
      save: mockSave,
    });
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "password123",
      fcmToken: "same-token",
    });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("EMAIL_NOT_VERIFIED");
    expect(res.body.msg).toMatch(/verify your email/i);
  });

  test("wrong password: bcrypt.compare returns false → 400 'Invalid credentials'", async () => {
    User.findOne.mockResolvedValue({
      _id: "user123",
      password: "hashedpw",
      fcmToken: null,
      save: jest.fn(),
    });
    bcrypt.compare.mockResolvedValue(false);

    const res = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "wrongpassword",
    });

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("Invalid credentials");
  });

  test("FCM token updated: different fcmToken in body → save() called", async () => {
    const mockSave = jest.fn().mockResolvedValue({});
    User.findOne.mockResolvedValue({
      _id: "user123",
      name: "Test User",
      email: "test@example.com",
      role: "user",
      password: "hashedpw",
      fcmToken: "old-token",
      isVerified: true,
      save: mockSave,
    });
    bcrypt.compare.mockResolvedValue(true);

    const res = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "password123",
      fcmToken: "new-token",
    });

    expect(res.status).toBe(200);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  test("server error: User.findOne rejects → 500", async () => {
    User.findOne.mockRejectedValue(new Error("DB error"));

    const res = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "password123",
    });

    expect(res.status).toBe(500);
  });
});

// --- Suite 3: GET /api/auth/verify-email ---

describe("GET /api/auth/verify-email", () => {
  beforeEach(() => jest.clearAllMocks());

  test("success: valid non-expired token → isVerified = true, token cleared, 200", async () => {
    const mockSave = jest.fn().mockResolvedValue({});
    const mockUser = {
      isVerified: false,
      verificationToken: "valid-token",
      verificationTokenExpiry: new Date(Date.now() + 3600000),
      save: mockSave,
    };
    User.findOne.mockResolvedValue(mockUser);

    const res = await request(app).get("/api/auth/verify-email?token=valid-token");

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe("Email verified successfully. You can now log in.");
    expect(mockUser.isVerified).toBe(true);
    expect(mockUser.verificationToken).toBeNull();
    expect(mockUser.verificationTokenExpiry).toBeNull();
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  test("missing token: no ?token= query param → 400 'Verification token is required'", async () => {
    const res = await request(app).get("/api/auth/verify-email");

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("Verification token is required");
  });

  test("invalid/expired token: User.findOne returns null → 400 'Invalid or expired verification token'", async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app).get("/api/auth/verify-email?token=bad-token");

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("Invalid or expired verification token");
  });

  test("server error: User.findOne rejects → 500", async () => {
    User.findOne.mockRejectedValue(new Error("DB error"));

    const res = await request(app).get("/api/auth/verify-email?token=some-token");

    expect(res.status).toBe(500);
  });
});

// --- Suite 4: POST /api/auth/resend-verification-email (public, for login screen) ---

describe("POST /api/auth/resend-verification-email", () => {
  beforeEach(() => jest.clearAllMocks());

  test("success: unverified user by email → verification email sent", async () => {
    const mockSave = jest.fn().mockResolvedValue({});
    User.findOne.mockResolvedValue({
      email: "test@example.com",
      name: "Test User",
      isVerified: false,
      save: mockSave,
    });

    const res = await request(app)
      .post("/api/auth/resend-verification-email")
      .send({ email: "test@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.msg).toMatch(/verification email/i);
    expect(mail.sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  test("unknown email: still returns 200 generic message", async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/resend-verification-email")
      .send({ email: "nobody@example.com" });

    expect(res.status).toBe(200);
    expect(mail.sendVerificationEmail).not.toHaveBeenCalled();
  });
});

// --- Suite 5: POST /api/auth/resend-verification ---

describe("POST /api/auth/resend-verification", () => {
  beforeEach(() => jest.clearAllMocks());

  test("success: unverified user → new token generated, email sent, 200", async () => {
    const mockSave = jest.fn().mockResolvedValue({});
    User.findById.mockResolvedValue({
      _id: "user123",
      email: "test@example.com",
      name: "Test User",
      isVerified: false,
      save: mockSave,
    });

    const res = await request(app)
      .post("/api/auth/resend-verification")
      .set("Authorization", "mock.jwt.token");

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe("Verification email sent");
    expect(mail.sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  test("already verified: returns 400 'Email is already verified'", async () => {
    User.findById.mockResolvedValue({
      _id: "user123",
      isVerified: true,
      save: jest.fn(),
    });

    const res = await request(app)
      .post("/api/auth/resend-verification")
      .set("Authorization", "mock.jwt.token");

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("Email is already verified");
  });

  test("user not found: User.findById returns null → 404 'User not found'", async () => {
    User.findById.mockResolvedValue(null);

    const res = await request(app)
      .post("/api/auth/resend-verification")
      .set("Authorization", "mock.jwt.token");

    expect(res.status).toBe(404);
    expect(res.body.msg).toBe("User not found");
  });

  test("server error: User.findById rejects → 500", async () => {
    User.findById.mockRejectedValue(new Error("DB error"));

    const res = await request(app)
      .post("/api/auth/resend-verification")
      .set("Authorization", "mock.jwt.token");

    expect(res.status).toBe(500);
  });
});

// --- Suite 5: POST /api/auth/forgot-password ---

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => jest.clearAllMocks());

  test("success: existing user gets reset token and email, returns generic message", async () => {
    const mockUser = {
      _id: "user123",
      email: "test@example.com",
      name: "Test User",
    };
    User.findOne.mockResolvedValue(mockUser);
    User.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const res = await request(app).post("/api/auth/forgot-password").send({
      email: "test@example.com",
    });

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe("If an account exists for this email, a password reset link has been sent");
    expect(User.updateOne).toHaveBeenCalledWith(
      { _id: "user123" },
      {
        $set: {
          resetPasswordToken: expect.any(String),
          resetPasswordTokenExpiry: expect.any(Date),
        },
      }
    );
    expect(mail.sendPasswordResetEmail).toHaveBeenCalledWith(
      "test@example.com",
      "Test User",
      expect.any(String)
    );
  });

  test("unknown email: returns same generic message and does not send email", async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app).post("/api/auth/forgot-password").send({
      email: "missing@example.com",
    });

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe("If an account exists for this email, a password reset link has been sent");
    expect(mail.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  test("invalid email: route validation returns 400", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({
      email: "not-an-email",
    });

    expect(res.status).toBe(400);
  });
});

// --- Suite 6: POST /api/auth/reset-password ---

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => jest.clearAllMocks());

  test("success: valid token updates password and clears reset fields", async () => {
    const rawToken = "valid-reset-token";
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const mockSave = jest.fn().mockResolvedValue({});
    const mockUser = {
      email: "test@example.com",
      password: "old-hash",
      resetPasswordToken: hashedToken,
      resetPasswordTokenExpiry: new Date(Date.now() + 60000),
      save: mockSave,
    };
    User.findOne.mockResolvedValue(mockUser);

    const res = await request(app).post("/api/auth/reset-password").send({
      email: "test@example.com",
      token: rawToken,
      newPassword: "newpassword123",
    });

    expect(res.status).toBe(200);
    expect(res.body.msg).toBe("Password reset successfully");
    expect(User.findOne).toHaveBeenCalledWith({
      email: "test@example.com",
      resetPasswordToken: hashedToken,
      resetPasswordTokenExpiry: { $gt: expect.any(Date) },
    });
    expect(mockUser.password).toBe("newpassword123");
    expect(mockUser.resetPasswordToken).toBeNull();
    expect(mockUser.resetPasswordTokenExpiry).toBeNull();
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  test("invalid or expired token: returns 400", async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app).post("/api/auth/reset-password").send({
      email: "test@example.com",
      token: "bad-token",
      newPassword: "newpassword123",
    });

    expect(res.status).toBe(400);
    expect(res.body.msg).toBe("Invalid or expired password reset token");
  });

  test("short password: route validation returns 400", async () => {
    const res = await request(app).post("/api/auth/reset-password").send({
      email: "test@example.com",
      token: "valid-reset-token",
      newPassword: "123",
    });

    expect(res.status).toBe(400);
  });
});

// --- Suite 7: GET /api/auth/reset-password-link ---

describe("GET /api/auth/reset-password-link", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renders reset form with app deep link", async () => {
    process.env.FRONTEND_URL = "connectmytask://auth";

    const res = await request(app)
      .get("/api/auth/reset-password-link")
      .query({ token: "reset-token", email: "test@example.com" });

    expect(res.status).toBe(200);
    expect(res.text).toContain("Reset password");
    expect(res.text).toContain("fetch(\"/api/auth/reset-password\"");
    expect(res.text).toContain(
      "connectmytask://auth/reset-password?token=reset-token&email=test%40example.com"
    );
  });

  test("missing token or email returns 400", async () => {
    const res = await request(app).get("/api/auth/reset-password-link");

    expect(res.status).toBe(400);
  });
});

// --- Suite 8: requireEmailVerified middleware (unit tested directly) ---

describe("requireEmailVerified middleware", () => {
  // Load the REAL implementation — its User dependency resolves to the mock above
  const { requireEmailVerified } = jest.requireActual("../middlewares/authMiddleware");

  beforeEach(() => jest.clearAllMocks());

  const makeContext = () => ({
    req: { user: { id: "user123" } },
    res: {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    },
    next: jest.fn(),
  });

  test("passes: user exists and isVerified: true → calls next()", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ isVerified: true }),
    });
    const { req, res, next } = makeContext();

    await requireEmailVerified(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("blocked: user exists but isVerified: false → 403 with message", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ isVerified: false }),
    });
    const { req, res, next } = makeContext();

    await requireEmailVerified(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Please verify your email address before performing this action",
    });
  });

  test("user not found: User.findById returns null → 401 'User not found'", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });
    const { req, res, next } = makeContext();

    await requireEmailVerified(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ msg: "User not found" });
  });

  test("server error: User.findById rejects → 500", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error("DB error")),
    });
    const { req, res, next } = makeContext();

    await requireEmailVerified(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("requireKycVerified middleware", () => {
  const { requireKycVerified } = jest.requireActual("../middlewares/authMiddleware");

  beforeEach(() => jest.clearAllMocks());

  const makeContext = () => ({
    req: { user: { id: "user123" } },
    res: {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    },
    next: jest.fn(),
  });

  test("passes: user exists and kyc.status is verified → calls next()", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ kyc: { status: "verified" } }),
    });
    const { req, res, next } = makeContext();

    await requireKycVerified(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("blocked: user exists but kyc.status is not verified → 403 with message", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ kyc: { status: "pending" } }),
    });
    const { req, res, next } = makeContext();

    await requireKycVerified(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      msg: "Please complete KYC verification before performing this action",
    });
  });
});

// --- Suite 6: POST /api/auth/forgot-password ---
