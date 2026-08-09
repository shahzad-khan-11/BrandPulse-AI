import nodemailer from 'nodemailer';
import logger from '../config/logger.js';

let transporter = null;

const getTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const secure = process.env.EMAIL_SECURE === 'true'; // false for 587 (STARTTLS)
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    logger.warn('[EmailService] ⚠️ EMAIL_USER or EMAIL_PASS environment variable is not configured. Email delivery will fail.');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  return transporter;
};

/**
 * Verify SMTP connection status for health checks
 */
export const verifySmtpConnection = async () => {
  try {
    const transport = getTransporter();
    await transport.verify();
    return true;
  } catch (error) {
    logger.error(`[EmailService] ❌ SMTP Verification failed: ${error.message}`);
    return false;
  }
};

const getSender = () => {
  if (process.env.EMAIL_FROM) {
    return process.env.EMAIL_FROM;
  }
  const user = process.env.EMAIL_USER || 'no-reply@gmail.com';
  return `BrandPulse AI <${user}>`;
};

const sendEmail = async (mailOptions, retries = 1) => {
  const transport = getTransporter();
  const sender = getSender();

  const options = {
    from: mailOptions.from || sender,
    to: mailOptions.to,
    subject: mailOptions.subject,
    html: mailOptions.html,
  };

  if (mailOptions.attachments && mailOptions.attachments.length > 0) {
    options.attachments = mailOptions.attachments;
  }

  logger.info(`[EmailService] 📧 Sending via Gmail SMTP "${options.subject}" → ${options.to}`);

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const info = await transport.sendMail(options);
      logger.info(
        `[EmailService] ✅ Email delivered via Gmail SMTP | to=${options.to} | subject="${options.subject}" | messageId=${info?.messageId}`
      );
      return info;
    } catch (err) {
      logger.error(
        `[EmailService] ❌ Send attempt ${attempt}/${retries + 1} failed | to=${options.to} | error=${err.message}`
      );
      if (attempt <= retries) {
        const delay = attempt * 2000;
        logger.info(`[EmailService] ⏳ Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        logger.error(`[EmailService] 💀 All ${retries + 1} attempts failed for ${options.to}. Email NOT delivered.`);
        throw err;
      }
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// HTML Email Template — BrandPulse AI Premium Dark Theme
// Inline styles for maximum email client compatibility (Gmail, Outlook, Apple Mail)
// ─────────────────────────────────────────────────────────────────────────────
const wrapTemplate = (contentHtml) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>BrandPulse AI</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#0f172a;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">

          <!-- Header / Logo -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;border:1px solid #4338ca;">
              <div style="display:inline-flex;align-items:center;gap:8px;">
                <span style="font-size:22px;">⚡</span>
                <span style="font-size:24px;font-weight:800;color:#a5b4fc;letter-spacing:-0.5px;">BrandPulse AI</span>
              </div>
              <p style="margin:6px 0 0;font-size:12px;color:#6366f1;letter-spacing:2px;text-transform:uppercase;">Enterprise Brand Intelligence</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color:#1e293b;padding:36px 32px;border-left:1px solid #334155;border-right:1px solid #334155;">
              <div style="font-size:15px;line-height:1.7;color:#cbd5e1;">
                ${contentHtml}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0f172a;border-radius:0 0 12px 12px;padding:20px 32px;text-align:center;border:1px solid #1e293b;border-top:1px solid #334155;">
              <p style="margin:0 0 6px;font-size:12px;color:#475569;">
                © 2026 BrandPulse AI · Enterprise Brand Sentiment &amp; Intelligence Platform
              </p>
              <p style="margin:0;font-size:11px;color:#334155;">
                You received this email because you registered at BrandPulse AI.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS — shared UI components
// ─────────────────────────────────────────────────────────────────────────────
const ctaButton = (href, label) =>
  `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px auto;">
    <tr>
      <td style="border-radius:8px;background:linear-gradient(135deg,#6366f1 0%,#a855f7 100%);">
        <a href="${href}" target="_blank"
           style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:0.3px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;

const divider = () =>
  `<hr style="border:none;border-top:1px solid #334155;margin:24px 0;">`;

const fallbackLink = (href) =>
  `<p style="font-size:13px;color:#64748b;word-break:break-all;">
    Or copy this link: <a href="${href}" style="color:#818cf8;">${href}</a>
  </p>`;

const warningBox = (text) =>
  `<div style="background-color:#1a1a2e;border-left:3px solid #f59e0b;border-radius:4px;padding:12px 16px;margin:16px 0;">
    <p style="margin:0;font-size:13px;color:#fbbf24;">⚠️ ${text}</p>
  </div>`;

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL TEMPLATES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Welcome email — sent on registration
 */
export const sendWelcomeEmail = async (email, name) => {
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#e2e8f0;">
      Welcome to BrandPulse AI, ${name}! 🚀
    </h2>
    <p style="margin:0 0 16px;color:#94a3b8;">
      Your enterprise-grade brand intelligence dashboard is ready. Here's what you can do:
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;">
      <tr>
        <td style="padding:10px 16px;background:#0f172a;border-radius:8px;border:1px solid #334155;margin-bottom:8px;">
          <span style="color:#818cf8;font-weight:600;">📊 Track Brand Mentions</span>
          <span style="color:#64748b;font-size:13px;display:block;margin-top:2px;">Monitor your brand across the web in real-time</span>
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:10px 16px;background:#0f172a;border-radius:8px;border:1px solid #334155;">
          <span style="color:#818cf8;font-weight:600;">🤖 AI Sentiment Analysis</span>
          <span style="color:#64748b;font-size:13px;display:block;margin-top:2px;">Powered by Google Gemini AI</span>
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>
      <tr>
        <td style="padding:10px 16px;background:#0f172a;border-radius:8px;border:1px solid #334155;">
          <span style="color:#818cf8;font-weight:600;">📈 Executive Reports</span>
          <span style="color:#64748b;font-size:13px;display:block;margin-top:2px;">Auto-generated PDF reports with reputation scores</span>
        </td>
      </tr>
    </table>
    ${ctaButton(`${process.env.FRONTEND_URL || 'https://brandpulse-ai-three.vercel.app'}`, 'Open Dashboard')}
    ${divider()}
    <p style="font-size:13px;color:#64748b;margin:0;">The BrandPulse AI Team</p>
  `;
  return sendEmail({ to: email, subject: 'Welcome to BrandPulse AI! 🚀', html: wrapTemplate(content) });
};

/**
 * Email verification — sent after registration
 */
export const sendVerificationEmail = async (email, verificationToken) => {
  const verifyUrl = `${process.env.FRONTEND_URL || 'https://brandpulse-ai-three.vercel.app'}/verify-email?token=${verificationToken}`;
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#e2e8f0;">
      Verify Your Email Address 🔑
    </h2>
    <p style="color:#94a3b8;margin:0 0 16px;">
      Thank you for signing up with BrandPulse AI. Click the button below to verify your email and activate your account.
    </p>
    ${ctaButton(verifyUrl, 'Verify Email Address')}
    ${warningBox('This verification link expires in 24 hours. If you did not register, ignore this email.')}
    ${fallbackLink(verifyUrl)}
  `;
  return sendEmail({ to: email, subject: 'Verify Your BrandPulse AI Account 🔑', html: wrapTemplate(content) });
};

/**
 * Password reset — sent on forgot-password request
 */
export const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL || 'https://brandpulse-ai-three.vercel.app'}/reset-password?token=${resetToken}`;
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#e2e8f0;">
      Reset Your Password 🔄
    </h2>
    <p style="color:#94a3b8;margin:0 0 16px;">
      We received a request to reset the password for your BrandPulse AI account. Click the button below to set a new password.
    </p>
    ${ctaButton(resetUrl, 'Reset Password')}
    ${warningBox('This reset link is valid for 1 hour only. If you did not request a reset, your password is safe — you can ignore this email.')}
    ${fallbackLink(resetUrl)}
  `;
  return sendEmail({ to: email, subject: 'BrandPulse AI — Password Reset Request 🔄', html: wrapTemplate(content) });
};

/**
 * Password changed confirmation
 */
export const sendPasswordResetSuccessEmail = async (email, name) => {
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#e2e8f0;">
      Password Changed Successfully ✅
    </h2>
    <p style="color:#94a3b8;margin:0 0 16px;">Hello <strong style="color:#e2e8f0;">${name}</strong>,</p>
    <p style="color:#94a3b8;margin:0 0 16px;">
      Your BrandPulse AI account password was just successfully updated.
    </p>
    <div style="background-color:#052e16;border:1px solid #16a34a;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;color:#4ade80;font-weight:600;">🔒 Your account is secure</p>
      <p style="margin:6px 0 0;font-size:13px;color:#86efac;">Password was changed at ${new Date().toUTCString()}</p>
    </div>
    ${warningBox('If you did NOT make this change, contact support immediately and reset your password.')}
    ${ctaButton(`${process.env.FRONTEND_URL || 'https://brandpulse-ai-three.vercel.app'}/login`, 'Login to Dashboard')}
  `;
  return sendEmail({ to: email, subject: 'BrandPulse AI — Password Changed ✅', html: wrapTemplate(content) });
};

/**
 * Profile updated notification
 */
export const sendProfileUpdatedEmail = async (email, name) => {
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#e2e8f0;">
      Profile Updated 👤
    </h2>
    <p style="color:#94a3b8;margin:0 0 16px;">Hello <strong style="color:#e2e8f0;">${name}</strong>,</p>
    <p style="color:#94a3b8;margin:0 0 16px;">
      Your BrandPulse AI profile information was recently updated successfully.
    </p>
    ${warningBox('If you did not make this change, please review your account and contact support.')}
  `;
  return sendEmail({ to: email, subject: 'BrandPulse AI — Profile Updated 👤', html: wrapTemplate(content) });
};

/**
 * Report generated notification
 */
export const sendReportGeneratedEmail = async (email, name, reportName, brandName) => {
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#e2e8f0;">
      New Analytics Report Ready 📊
    </h2>
    <p style="color:#94a3b8;margin:0 0 16px;">Hello <strong style="color:#e2e8f0;">${name}</strong>,</p>
    <p style="color:#94a3b8;margin:0 0 16px;">
      A new brand analytics report has been generated for <strong style="color:#e2e8f0;">${brandName}</strong>.
    </p>
    <div style="background-color:#0f172a;border:1px solid #334155;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;color:#818cf8;font-weight:600;">📋 ${reportName}</p>
      <p style="margin:6px 0 0;font-size:13px;color:#64748b;">Brand: ${brandName} · Generated: ${new Date().toUTCString()}</p>
    </div>
    ${ctaButton(`${process.env.FRONTEND_URL || 'https://brandpulse-ai-three.vercel.app'}/reports`, 'View Report')}
  `;
  return sendEmail({ to: email, subject: `BrandPulse AI — New Report: ${reportName} 📊`, html: wrapTemplate(content) });
};

/**
 * Email verified notification
 */
export const sendEmailVerifiedEmail = async (email, name) => {
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#e2e8f0;">
      Email Verified Successfully 🎉
    </h2>
    <p style="color:#94a3b8;margin:0 0 16px;">Hello <strong style="color:#e2e8f0;">${name || 'User'}</strong>,</p>
    <p style="color:#94a3b8;margin:0 0 16px;">
      Your email address <strong style="color:#e2e8f0;">${email}</strong> has been successfully verified for BrandPulse AI.
    </p>
    <div style="background-color:#052e16;border:1px solid #16a34a;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;color:#4ade80;font-weight:600;">✅ Full Account Access Unlocked</p>
      <p style="margin:6px 0 0;font-size:13px;color:#86efac;">You can now use all features of your BrandPulse AI workspace.</p>
    </div>
    ${ctaButton(`${process.env.FRONTEND_URL || 'https://brandpulse-ai-three.vercel.app'}/login`, 'Go to Dashboard')}
  `;
  return sendEmail({ to: email, subject: 'BrandPulse AI - Email Verified 🎉', html: wrapTemplate(content) });
};

/**
 * Login security notification email
 */
export const sendLoginNotificationEmail = async (email, name, loginTime = new Date().toUTCString()) => {
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#e2e8f0;">
      New Security Login Alert 🔐
    </h2>
    <p style="color:#94a3b8;margin:0 0 16px;">Hello <strong style="color:#e2e8f0;">${name || 'User'}</strong>,</p>
    <p style="color:#94a3b8;margin:0 0 16px;">
      A new login session was initiated for your BrandPulse AI account (<strong style="color:#e2e8f0;">${email}</strong>).
    </p>
    <div style="background-color:#0f172a;border:1px solid #334155;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 6px;font-size:14px;color:#818cf8;"><strong>Application:</strong> BrandPulse AI Platform</p>
      <p style="margin:0;font-size:13px;color:#94a3b8;"><strong>Timestamp:</strong> ${loginTime}</p>
    </div>
    ${warningBox('If you did not initiate this login session, please reset your password immediately.')}
  `;
  return sendEmail({ to: email, subject: 'BrandPulse AI - New Login 🔐', html: wrapTemplate(content) });
};

/**
 * Brand created notification
 */
export const sendBrandCreatedEmail = async (email, name, brandName, industry = 'General') => {
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#e2e8f0;">
      Brand Added Successfully 🏢
    </h2>
    <p style="color:#94a3b8;margin:0 0 16px;">Hello <strong style="color:#e2e8f0;">${name || 'User'}</strong>,</p>
    <p style="color:#94a3b8;margin:0 0 16px;">
      Your new brand <strong style="color:#e2e8f0;">${brandName}</strong> has been added to BrandPulse AI and regional monitoring is active.
    </p>
    <div style="background-color:#0f172a;border:1px solid #334155;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 6px;color:#818cf8;font-weight:600;">🏷️ Brand: ${brandName}</p>
      <p style="margin:0;font-size:13px;color:#64748b;">Industry Scope: ${industry}</p>
    </div>
    ${ctaButton(`${process.env.FRONTEND_URL || 'https://brandpulse-ai-three.vercel.app'}/brands`, 'View Workspace Brands')}
  `;
  return sendEmail({ to: email, subject: 'BrandPulse AI - Brand Added Successfully 🏢', html: wrapTemplate(content) });
};

/**
 * Brand updated notification
 */
export const sendBrandUpdatedEmail = async (email, name, brandName) => {
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#e2e8f0;">
      Brand Settings Updated ⚙️
    </h2>
    <p style="color:#94a3b8;margin:0 0 16px;">Hello <strong style="color:#e2e8f0;">${name || 'User'}</strong>,</p>
    <p style="color:#94a3b8;margin:0 0 16px;">
      The brand settings for <strong style="color:#e2e8f0;">${brandName}</strong> were successfully updated in your BrandPulse AI workspace.
    </p>
  `;
  return sendEmail({ to: email, subject: 'BrandPulse AI - Brand Updated ⚙️', html: wrapTemplate(content) });
};

/**
 * Brand deleted notification
 */
export const sendBrandDeletedEmail = async (email, name, brandName) => {
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#e2e8f0;">
      Brand Removed 🗑️
    </h2>
    <p style="color:#94a3b8;margin:0 0 16px;">Hello <strong style="color:#e2e8f0;">${name || 'User'}</strong>,</p>
    <p style="color:#94a3b8;margin:0 0 16px;">
      The brand <strong style="color:#e2e8f0;">${brandName}</strong> and its associated monitoring data were removed from your workspace.
    </p>
  `;
  return sendEmail({ to: email, subject: 'BrandPulse AI - Brand Removed 🗑️', html: wrapTemplate(content) });
};

/**
 * Critical Threat Alert email
 */
export const sendCriticalThreatAlertEmail = async (email, name, brandName, threatReason, sentiment = 'negative', action = 'Review immediate crisis plan') => {
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#f87171;">
      🚨 Critical Brand Alert Detected
    </h2>
    <p style="color:#94a3b8;margin:0 0 16px;">Hello <strong style="color:#e2e8f0;">${name || 'User'}</strong>,</p>
    <p style="color:#94a3b8;margin:0 0 16px;">
      Our AI sentiment and threat monitoring detected a <strong style="color:#f87171;">CRITICAL priority threat</strong> affecting <strong style="color:#e2e8f0;">${brandName}</strong>.
    </p>
    <div style="background-color:#450a0a;border:1px solid #dc2626;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;color:#fca5a5;font-weight:700;">⚠️ Threat Level: CRITICAL</p>
      <p style="margin:0 0 6px;font-size:14px;color:#fecaca;"><strong>Reason:</strong> ${threatReason}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#fca5a5;"><strong>Sentiment:</strong> ${sentiment.toUpperCase()}</p>
      <p style="margin:0;font-size:13px;color:#fee2e2;"><strong>Recommended Action:</strong> ${action}</p>
    </div>
    ${ctaButton(`${process.env.FRONTEND_URL || 'https://brandpulse-ai-three.vercel.app'}/mentions`, 'View Critical Alert Details')}
  `;
  return sendEmail({ to: email, subject: `BrandPulse AI - Critical Brand Alert: ${brandName} 🚨`, html: wrapTemplate(content) });
};

/**
 * Custom/notification email with optional attachments
 */
export const sendCustomEmail = async (email, subject, contentHtml, attachments = []) => {
  return sendEmail({
    to: email,
    subject,
    html: wrapTemplate(contentHtml),
    attachments,
  });
};

/**
 * Contact form submission notification — sent to support/admin
 */
export const sendContactEmail = async (name, senderEmail, subject, message) => {
  const adminEmail = process.env.EMAIL_USER || process.env.EMAIL_FROM || 'admin@gmail.com';
  const content = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#e2e8f0;">
      New Contact Form Submission 📩
    </h2>
    <p style="color:#94a3b8;margin:0 0 8px;"><strong style="color:#e2e8f0;">Name:</strong> ${name}</p>
    <p style="color:#94a3b8;margin:0 0 8px;"><strong style="color:#e2e8f0;">Email:</strong> ${senderEmail}</p>
    <p style="color:#94a3b8;margin:0 0 16px;"><strong style="color:#e2e8f0;">Subject:</strong> ${subject}</p>
    <div style="background-color:#0f172a;border:1px solid #334155;border-radius:8px;padding:16px;margin:16px 0;color:#cbd5e1;">
      ${message}
    </div>
  `;
  return sendEmail({ to: adminEmail, subject: `[Contact Form] ${subject}`, html: wrapTemplate(content) });
};
