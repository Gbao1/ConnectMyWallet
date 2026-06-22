const express = require("express");
const multer = require("multer");
const { analyzeReport } = require("../services/reportCategorizer");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post("/analyze", upload.single("report"), (req, res) => {
  try {
    const textFromFile = req.file ? req.file.buffer.toString("utf-8") : "";
    const textFromBody = typeof req.body.rawText === "string" ? req.body.rawText : "";
    const reportText = (textFromFile || textFromBody).trim();

    if (!reportText) {
      return res.status(400).json({
        message: "Please upload a report file or provide rawText."
      });
    }

    const analyzed = analyzeReport(reportText);
    return res.status(200).json({
      message: "Report processed successfully.",
      ...analyzed
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to process report.",
      error: error.message
    });
  }
});

module.exports = router;
