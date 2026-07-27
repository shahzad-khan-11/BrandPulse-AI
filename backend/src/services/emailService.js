import nodemailer from 'nodemailer';
import dns from 'dns';
import logger from '../config/logger.js';

export const EMAIL_SERVICE_BUILD = `v3-PROD-TRACE-${Date.now()}`;

logger.info(`[EmailService] 🚀 INSTANTIATED EMAIL SERVICE BUILD IDENTIFIER: ${EMAIL_SERVICE_BUILD}`);

/**
 * Creates a fresh Nodemailer transporter instance.
 */
const createTransporter = () => {
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const missing = requiredVars.filter((k) => !process.env[k]);

  if (missing.length > 0) {
    logger.error(
      `[EmailService BUILD: ${EMAIL_SERVICE_BUILD}] ❌ Missing SMTP env vars: ${missing.join(', ')}. Email sending is DISABLED.`
    );
    return null;
  }

  const port = parseInt(process.env.SMTP_PORT, 10) || 465;
  const secure = true;

  logger.info(
    `[EmailService BUILD: ${EMAIL_SERVICE_BUILD}] 🛠️ Creating Transporter: node=${process.version} platform=${process.platform} host=${process.env.SMTP_HOST} port=${port} secure=${secure} user=${process.env.SMTP_USER}`
  );

  dns.lookup(process.env.SMTP_HOST, { all: true }, (err, addresses) => {
    if (err) {
      logger.error(`[EmailService BUILD: ${EMAIL_SERVICE_BUILD}] ❌ DNS Lookup Error: ${err.message}`);
    } else {
      logger.info(`[EmailService BUILD: ${EMAIL_SERVICE_BUILD}] 🌐 Resolved DNS for ${process.env.SMTP_HOST}: ${JSON.stringify(addresses)}`);
    }
  });

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    pool: false,
    debug: true,
    logger: true
  });
};

const getSender = () => {
  const emailAddr = process.env.SMTP_USER || process.env.EMAIL_FROM;
  if (!emailAddr) {
    logger.error(`[EmailService BUILD: ${EMAIL_SERVICE_BUILD}] ❌ Neither SMTP_USER nor EMAIL_FROM is set.`);
    return null;
  }
  return `"BrandPulse AI" <${emailAddr}>`;
};

const sendEmail = async (mailOptions, retries = 1) => {
  const sender = getSender();
  if (!sender) return false;

  const transporter = createTransporter();
  if (!transporter) return false;

  const options = { ...mailOptions, from: mailOptions.from || sender };

  logger.info(`[EmailService BUILD: ${EMAIL_SERVICE_BUILD}] USING EMAIL SERVICE BUILD: ${EMAIL_SERVICE_BUILD} | 📧 Sending "${options.subject}" → ${options.to}`);

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const result = await transporter.sendMail(options);
      logger.info(
        `[EmailService BUILD: ${EMAIL_SERVICE_BUILD}] ✅ Email delivered | to=${options.to} | subject="${options.subject}" | messageId=${result.messageId} | response=${result.response}`
      );
      try { transporter.close(); } catch (_) {}
      return result;
    } catch (err) {
      logger.error(
        `[EmailService BUILD: ${EMAIL_SERVICE_BUILD}] ❌ Send attempt ${attempt}/${retries + 1} failed | to=${options.to} | error=${err.message} | code=${err.code} | responseCode=${err.responseCode} | command=${err.command}`
      );
      if (attempt <= retries) {
        const delay = attempt * 2000;
        logger.info(`[EmailService BUILD: ${EMAIL_SERVICE_BUILD}] ⏳ Retrying in ${delay}ms...`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        logger.error(`[EmailService BUILD: ${EMAIL_SERVICE_BUILD}] 💀 All ${retries + 1} attempts failed for ${options.to}. Email NOT delivered.`);
        try { transporter.close(); } catch (_) {}
        throw err;
      }
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Startup SMTP Verification
// Called once at server boot to validate credentials before any email is sent.
// ─────────────────────────────────────────────────────────────────────────────
export const verifySmtpConnection = async () => {
  const transporter = createTransporter();
  if (!transporter) {
    logger.error('[EmailService] ❌ SMTP verification skipped — transporter could not be created.');
    return false;
  }
  try {
    await transporter.verify();
    logger.info('[EmailService] ✅ SMTP connection verified successfully. Email delivery is ENABLED.');
    transporter.close();
    return true;
  } catch (err) {
    logger.error(
      `[EmailService] ❌ SMTP verification FAILED: ${err.message} | code=${err.code} | responseCode=${err.responseCode}`
    );
    logger.error('[EmailService] ⚠️  Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and Gmail App Password.');
    try { transporter.close(); } catch (_) {}
    return false;
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
