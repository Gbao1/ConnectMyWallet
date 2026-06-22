const express = require("express");
const request = require("supertest");

jest.mock("../models/ContactSubmission", () => ({
  create: jest.fn(),
}));

jest.mock("../models/SuspiciousActivity", () => ({
  find: jest.fn(),
  countDocuments: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  aggregate: jest.fn(),
  create: jest.fn(),
}));

jest.mock("../utils/mail", () => ({
  sendContactEmails: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../middlewares/authMiddleware", () => ({
  authMiddleware: (req, res, next) => {
    req.user = { id: "admin123", role: "admin" };
    next();
  },
  authorizeRoles: (...roles) => (req, res, next) => {
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({ msg: "Forbidden" });
  },
}));

const ContactSubmission = require("../models/ContactSubmission");
const SuspiciousActivity = require("../models/SuspiciousActivity");
const contactRoutes = require("../routes/contactRoutes");
const adminRoutes = require("../routes/adminRoutes");

const contactApp = express();
contactApp.use(express.json());
contactApp.use("/api/contact", contactRoutes);

const adminApp = express();
adminApp.use(express.json());
adminApp.use("/api/admin", adminRoutes);

describe("POST /api/contact", () => {
  test("creates submission and returns id", async () => {
    ContactSubmission.create.mockResolvedValue({ _id: "contact1" });

    const res = await request(contactApp)
      .post("/api/contact")
      .send({
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        subject: "Hello",
        message: "Test message",
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.id).toBe("contact1");
  });
});

describe("GET /api/admin/fraud", () => {
  test("returns paginated suspicious activities for admin", async () => {
    const doc = {
      _id: { toString: () => "act1" },
      toObject: () => ({
        _id: { toString: () => "act1" },
        type: "recaptcha_low_score",
        severity: "high",
        ip: "1.2.3.4",
        userId: null,
        userEmail: "user@test.com",
        reason: "low score",
        status: "new",
        meta: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    };

    SuspiciousActivity.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([doc]),
        }),
      }),
    });
    SuspiciousActivity.countDocuments.mockResolvedValue(1);

    const res = await request(adminApp).get("/api/admin/fraud?page=1&limit=25");

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].type).toBe("recaptcha_low_score");
    expect(res.body.total).toBe(1);
  });
});
