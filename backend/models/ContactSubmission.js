const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema(
  {
    firstName: String,
    lastName: String,
    email: String,
    inquiryType: String,
    subject: String,
    message: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContactSubmission", contactSchema);
