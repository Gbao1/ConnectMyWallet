const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authMiddleware = (req, res, next) => {
  const authHeader = req.header("Authorization");
  if (!authHeader)
    return res.status(401).json({ msg: "No token, authorization denied" });

  try {
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : authHeader.trim();
    if (!token) {
      return res.status(401).json({ msg: "No token, authorization denied" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ msg: "Invalid token" });
  }
};

// Middleware to check role permissions
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: You do not have permission" });
    }
    next();
  };
};

const requireEmailVerified = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("isVerified");
    if (!user) return res.status(401).json({ msg: "User not found" });
    if (!user.isVerified) {
      return res.status(403).json({ msg: "Please verify your email address before performing this action" });
    }
    next();
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

const requireKycVerified = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("kyc");
    if (!user) return res.status(401).json({ msg: "User not found" });
    if (user.kyc?.status !== "verified") {
      return res.status(403).json({ msg: "Please complete KYC verification before performing this action" });
    }
    next();
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

module.exports = { authMiddleware, authorizeRoles, requireEmailVerified, requireKycVerified };
