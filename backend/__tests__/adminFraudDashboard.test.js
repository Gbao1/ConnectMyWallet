jest.mock("../models/User", () => ({
  find: jest.fn(),
  aggregate: jest.fn(),
}));

jest.mock("../models/Task", () => ({}));

const User = require("../models/User");
const {
  getFlaggedAccountsWithFingerprints,
  getFingerprintNetwork,
} = require("../controllers/adminController");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe("admin fraud dashboard controllers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getFlaggedAccountsWithFingerprints returns flagged users list", async () => {
    const flaggedUsers = [
      {
        _id: "u1",
        email: "risk1@test.com",
        fraudFlags: { isFlagged: true, reasonCodes: ["shared_device_fingerprint"] },
      },
    ];

    User.find.mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(flaggedUsers),
      }),
    });

    const req = {};
    const res = createRes();
    await getFlaggedAccountsWithFingerprints(req, res);

    expect(res.json).toHaveBeenCalledWith({
      count: 1,
      users: flaggedUsers,
    });
  });

  test("getFingerprintNetwork returns grouped device graph", async () => {
    User.aggregate.mockResolvedValue([
      {
        _id: "fp_shared_001",
        accountCount: 2,
        users: [
          { userId: "u1", email: "a@test.com", isFlagged: true },
          { userId: "u2", email: "b@test.com", isFlagged: false },
        ],
      },
    ]);

    const req = { query: { minSharedAccounts: "2" } };
    const res = createRes();
    await getFingerprintNetwork(req, res);

    expect(User.aggregate).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      minSharedAccounts: 2,
      count: 1,
      fingerprints: [
        {
          fingerprintId: "fp_shared_001",
          accountCount: 2,
          users: [
            { userId: "u1", email: "a@test.com", isFlagged: true },
            { userId: "u2", email: "b@test.com", isFlagged: false },
          ],
        },
      ],
    });
  });
});
