const express = require("express");
const request = require("supertest");

jest.mock("../models/User", () => ({
  findById: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock("axios", () => ({
  post: jest.fn().mockResolvedValue({
    data: {
      url: "https://verify.didit.me/u/j5hWxe7oRPyHqZzPdXdvNA",
      session_id: "test-session-id",
    },
  }),
}));

jest.mock("../middlewares/authMiddleware", () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: "user123", role: "user" };
    next();
  },
  authorizeRoles: () => (req, res, next) => next(),
}));

// Set before module load — controller captures DIDIT_API_KEY at require-time
process.env.DIDIT_API_KEY = "test-key";

const kycRoutes = require("../routes/kycRoutes");
const User = require("../models/User");

const app = express();
app.use(express.json());
app.use("/api/kyc", kycRoutes);

describe("KYC Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("GET /api/kyc/settings/:userId returns current KYC details", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        _id: "user123",
        name: "Test User",
        email: "test@example.com",
        role: "user",
        isVerified: false,
        kyc: { status: "not_started" },
      }),
    });

    const res = await request(app).get("/api/kyc/settings/user123");

    expect(res.status).toBe(200);
    expect(res.body.kyc.status).toBe("not_started");
    expect(res.body.didit.workflowId).toBe("8f9856c5-eee8-44fc-87a9-9ccf75776f34");
  });

  test("POST /api/kyc/didit/start/:userId sets pending and returns redirect URL", async () => {
    const save = jest.fn().mockResolvedValue({});

    User.findById.mockResolvedValue({
      _id: "user123",
      kyc: { status: "not_started" },
      save,
    });

    const res = await request(app).post("/api/kyc/didit/start/user123");

    expect(res.status).toBe(200);
    expect(res.body.msg).toMatch(/started/i);
    expect(res.body.redirectUrl).toContain("https://verify.didit.me/u/j5hWxe7oRPyHqZzPdXdvNA");
    expect(save).toHaveBeenCalled();
  });

  test("GET /api/kyc/didit/callback with manual params updates user to verified", async () => {
    const save = jest.fn().mockResolvedValue({});

    User.findById.mockResolvedValue({
      _id: "user123",
      isVerified: false,
      kyc: {
        verificationId: "ver-abc",
        status: "pending",
      },
      save,
    });

    const res = await request(app).get(
      "/api/kyc/didit/callback?userId=user123&verificationId=ver-abc&status=success"
    );

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("kyc_status=verified");
    expect(save).toHaveBeenCalled();
  });

  test("GET /api/kyc/didit/callback with DIDIT verificationSessionId and status=Approved", async () => {
    const save = jest.fn().mockResolvedValue({});
    const mockUser = {
      _id: "user123",
      isVerified: false,
      kyc: {
        diditSessionId: "fc3ab0d8-xxxx",
        status: "pending",
      },
      save,
    };

    User.findOne.mockResolvedValue(mockUser);

    const res = await request(app).get(
      "/api/kyc/didit/callback?verificationSessionId=fc3ab0d8-xxxx&status=Approved"
    );

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("kyc_status=verified");
    expect(save).toHaveBeenCalled();
    expect(mockUser.isVerified).toBe(false);
    expect(mockUser.kyc.status).toBe("verified");
  });

});
