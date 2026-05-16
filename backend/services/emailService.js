/**
 * ================================================
 * emailService.js — خدمة إرسال الإيميل
 * ================================================
 * تستخدم nodemailer لإرسال الإيميلات.
 * إذا لم يتم إعداد SMTP credentials، الإيميلات تتسجل في الـ console بدلاً من الإرسال.
 */

const nodemailer = require('nodemailer');

// Try to load email credentials from .env.email or process.env
let emailUser = process.env.EMAIL_USER || process.env.SMTP_USER;
let emailPass = process.env.EMAIL_PASS || process.env.SMTP_PASS;
let emailHost = process.env.EMAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
let emailPort = parseInt(process.env.EMAIL_PORT || process.env.SMTP_PORT || '587');

let transporter = null;

if (emailUser && emailPass) {
  transporter = nodemailer.createTransport({
    host: emailHost,
    port: emailPort,
    secure: emailPort === 465,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
    // Force IPv4. Render free tier has no IPv6 outbound, but Gmail's
    // smtp.gmail.com resolves to AAAA records first → nodemailer hits
    // ENETUNREACH on every send. `family: 4` skips IPv6 entirely.
    family: 4,
    // Cap every connect/handshake/socket phase so a hung Gmail attempt
    // can't keep an awaited send blocked for the full TCP timeout
    // (~2 minutes) and stall the calling request.
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });
  console.log('📧 Email service configured with SMTP');
} else {
  console.warn('📧 Email service: No SMTP credentials found — emails will be logged to console only');
}

/**
 * sendNotificationEmail
 * @param {string} to - recipient email
 * @param {string} subject - email subject
 * @param {string} html - email HTML content
 */
async function sendNotificationEmail(to, subject, html) {
  if (!transporter) {
    console.log(`📧 [Email Log] To: ${to} | Subject: ${subject}`);
    console.log(`📧 [Email Log] (No SMTP configured — email not actually sent)`);
    return { success: true, logged: true };
  }

  try {
    const info = await transporter.sendMail({
      from: `"MedCore UMR" <${emailUser}>`,
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`📧 Failed to send email to ${to}:`, err.message);
    throw err;
  }
}

module.exports = { sendNotificationEmail };
