require("dotenv").config();
const express = require("express");
const cors = require("cors");
const reportRoutes = require("./routes/reportRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rule-based finance processing route
app.use("/api/reports", reportRoutes);

app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", mode: "rule-based" });
});

app.get("/", (req, res) => {
  res.send("ConnectMyWallet API is running.");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`Rule-based report API: http://localhost:${PORT}/api/reports/analyze`);
});
