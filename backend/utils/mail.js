const nodemailer = require("nodemailer");

let sgMail = null;
const sendgridKey = process.env.SENDGRID_API_KEY;
const supportEmail = process.env.SUPPORT_EMAIL || "support@connectmytask.com";
const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER || supportEmail;

if (sendgridKey) {
  sgMail = require("@sendgrid/mail");
  sgMail.setApiKey(sendgridKey);
  console.log("[email] SendGrid enabled for verification, reset, and notifications");
} else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  console.log("[email] SENDGRID_API_KEY not set; using Gmail SMTP");
} else {
  console.warn("[email] No SENDGRID_API_KEY or EMAIL_USER/EMAIL_PASS — outbound mail disabled");
}

const smtpTransporter =
  !sendgridKey && process.env.EMAIL_USER && process.env.EMAIL_PASS
    ? nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: { rejectUnauthorized: false },
      })
    : null;

function getAppBaseUrl() {
  return (
    process.env.FRONTEND_URL ||
    process.env.APP_BASE_URL ||
    process.env.CORS_ORIGIN?.split(",")[0]?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

const sendEmail = async (to, subject, html, text) => {
  if (sendgridKey) {
    await sgMail.send({
      to,
      from: fromEmail,
      subject,
      html,
      ...(text ? { text } : {}),
    });
    console.log(`✅ Email sent (SendGrid): ${subject} → ${to}`);
    return;
  }
  if (smtpTransporter) {
    const info = await smtpTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
    console.log("✅ Email sent (SMTP):", info.response);
    return info;
  }
  throw new Error("Email delivery is not configured");
};

const sendRegistrationEmail = async (to, name) => {
  const subject = "Welcome to ConnectMyTask!";
  const html = `<h3>Hi ${name},</h3><p>Thank you for registering on ConnectMyTask. We're excited to have you onboard!</p>`;
  return sendEmail(to, subject, html);
};

const sendTaskCreationEmail = async (to, name, taskTitle) => {
  const subject = "Your Task Has Been Created";
  const html = `<h3>Hi ${name},</h3><p>Your task "<strong>${taskTitle}</strong>" has been successfully posted. Service providers can now place bids on it.</p>`;
  return sendEmail(to, subject, html);
};

const sendBidNotificationEmail = async (to, taskTitle, providerName) => {
  const subject = "New Bid on Your Task";
  const html = `<p>You received a new bid from <strong>${providerName}</strong> on your task "<strong>${taskTitle}</strong>".</p>`;
  return sendEmail(to, subject, html);
};

const sendBidAcceptedEmail = async (to, taskTitle) => {
  const subject = "Your Bid Has Been Accepted!";
  const html = `<p>Your bid for the task "<strong>${taskTitle}</strong>" has been accepted. Please check your dashboard for further details.</p>`;
  return sendEmail(to, subject, html);
};

const sendTaskCompletionEmail = async (to, taskTitle) => {
  const subject = "Task Marked as Completed";
  const html = `<p>The task "<strong>${taskTitle}</strong>" has been marked as completed. Thank you for your contribution!</p>`;
  return sendEmail(to, subject, html);
};

const sendTaskUpdatedEmail = async (to, taskTitle) => {
  const subject = "Task Updated Successfully";
  const html = `<p>Your task "<strong>${taskTitle}</strong>" has been updated successfully. Thank you for keeping it up to date!</p>`;
  return sendEmail(to, subject, html);
};

const sendVerificationEmail = async (to, name, token) => {
  const verifyUrl = `${getAppBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  const greeting = name || "there";
  const subject = "Verify your ConnectMyTask email address";
  const text = `Hi ${greeting},\n\nPlease verify your email:\n${verifyUrl}\n\nExpires in 24 hours.`;
  const html = `
    <h3>Hi ${greeting},</h3>
    <p>Please verify your email by clicking the link below. Expires in 24 hours.</p>
    <p><a href="${verifyUrl}">Verify email</a></p>
    <p>If you did not create an account, ignore this email.</p>
  `;
  return sendEmail(to, subject, html, text);
};

const sendPasswordResetEmail = async (to, name, token) => {
  const encodedEmail = encodeURIComponent(to);
  const appBase = getAppBaseUrl();
  const appResetUrl = `${appBase}/reset-password?token=${encodeURIComponent(token)}&email=${encodedEmail}`;
  const resetUrl = process.env.SERVER_BASE_URL
    ? `${process.env.SERVER_BASE_URL.replace(/\/$/, "")}/api/auth/reset-password-link?token=${encodeURIComponent(token)}&email=${encodedEmail}`
    : appResetUrl;
  const subject = "Reset your ConnectMyTask password";
  const greeting = name || "there";
  const html = `
    <h3>Hi ${greeting},</h3>
    <p>Reset your password (expires in 15 minutes):</p>
    <p><a href="${resetUrl}">Reset password</a></p>
  `;
  return sendEmail(to, subject, html);
};

const sendPayoutEscrowEmail = async (to, name, { netAmount, currency }) => {
  const subject = "Your earnings are in escrow — ConnectMyTask";
  const html = `<h3>Hi ${name},</h3><p>Your earnings of <strong>${netAmount} ${currency}</strong> are held in escrow until the task is complete.</p>`;
  return sendEmail(to, subject, html);
};

const sendPayoutAvailableEmail = async (to, name, { netAmount, currency }) => {
  const subject = "Funds available in your wallet — ConnectMyTask";
  const html = `<h3>Hi ${name},</h3><p><strong>${netAmount} ${currency}</strong> is now available in your wallet.</p>`;
  return sendEmail(to, subject, html);
};

const sendPayoutRequestedEmail = async (to, name, { payoutId, netAmount, currency }) => {
  const subject = "Withdrawal request received — ConnectMyTask";
  const html = `<h3>Hi ${name},</h3><p>Withdrawal request for <strong>${netAmount} ${currency}</strong> (Ref: ${payoutId}).</p>`;
  return sendEmail(to, subject, html);
};

const sendPayoutApprovedEmail = async (to, name, { payoutId, netAmount, currency }) => {
  const subject = "Withdrawal approved — ConnectMyTask";
  const html = `<h3>Hi ${name},</h3><p>Withdrawal of <strong>${netAmount} ${currency}</strong> (Ref: ${payoutId}) approved.</p>`;
  return sendEmail(to, subject, html);
};

const sendPayoutRejectedEmail = async (to, name, { payoutId, reason, netAmount, currency }) => {
  const subject = "Withdrawal request rejected — ConnectMyTask";
  const html = `<h3>Hi ${name},</h3><p>Withdrawal rejected (Ref: ${payoutId}). Reason: ${reason}</p>`;
  return sendEmail(to, subject, html);
};

const sendPayoutPaidEmail = async (to, name, { payoutId, netAmount, currency, pspReference }) => {
  const subject = "Payment sent! — ConnectMyTask";
  const html = `<h3>Hi ${name},</h3><p><strong>${netAmount} ${currency}</strong> sent (Ref: ${payoutId}).</p>`;
  return sendEmail(to, subject, html);
};

const sendPayoutFailedEmail = async (to, name, { payoutId, netAmount, currency }) => {
  const subject = "Withdrawal failed — ConnectMyTask";
  const html = `<h3>Hi ${name},</h3><p>Withdrawal failed (Ref: ${payoutId}). Funds returned to your wallet.</p>`;
  return sendEmail(to, subject, html);
};

const sendContactEmails = async (body) => {
  const userName =
    [body?.firstName, body?.lastName].filter(Boolean).join(" ").trim() || "there";
  const inquiryType = body?.inquiryType || "general";
  const subject = body?.subject || "Contact request";
  const message = body?.message || "";
  const userEmail = body?.email;

  if (!userEmail) return;

  const userText = `Hi ${userName},\n\nThanks for contacting ConnectMyTask. We have received your message and our team will get back to you soon.\n\nYour subject: ${subject}\n\nBest regards,\nConnectMyTask Support`;
  await sendEmail(
    userEmail,
    "We received your message - ConnectMyTask",
    `<p>${userText.replace(/\n/g, "<br>")}</p>`,
    userText
  );

  const supportText = `New contact submission\n\nName: ${userName}\nEmail: ${userEmail}\nInquiry type: ${inquiryType}\nSubject: ${subject}\n\nMessage:\n${message}\n`;
  if (sendgridKey) {
    await sgMail.send({
      to: supportEmail,
      from: fromEmail,
      subject: `[Contact] ${subject}`,
      text: supportText,
      replyTo: userEmail,
    });
    console.log(`✅ Email sent (SendGrid): [Contact] ${subject} → ${supportEmail}`);
  } else if (smtpTransporter) {
    await smtpTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: supportEmail,
      subject: `[Contact] ${subject}`,
      text: supportText,
      replyTo: userEmail,
    });
  }
};

module.exports = {
  sendEmail,
  sendRegistrationEmail,
  sendTaskCreationEmail,
  sendBidNotificationEmail,
  sendBidAcceptedEmail,
  sendTaskCompletionEmail,
  sendTaskUpdatedEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPayoutEscrowEmail,
  sendPayoutAvailableEmail,
  sendPayoutRequestedEmail,
  sendPayoutApprovedEmail,
  sendPayoutRejectedEmail,
  sendPayoutPaidEmail,
  sendPayoutFailedEmail,
  sendContactEmails,
};
