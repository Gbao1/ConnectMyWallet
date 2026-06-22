const ContactSubmission = require("../models/ContactSubmission");
const { sendContactEmails } = require("../utils/mail");

const submitContact = async (req, res) => {
  try {
    const doc = await ContactSubmission.create(req.body);
    try {
      await sendContactEmails(req.body);
    } catch (mailErr) {
      console.error("[submitContact] email failed:", mailErr.message);
    }
    res.status(201).json({ ok: true, id: doc._id.toString() });
  } catch (err) {
    console.error("[submitContact]", err);
    res.status(500).json({ msg: err.message || "Failed to send message" });
  }
};

module.exports = { submitContact };
