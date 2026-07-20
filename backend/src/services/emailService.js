import nodemailer from 'nodemailer';
import logger from '../config/logger.js';

let transporterInstance = null;

const getTransporter = () => {
  if (transporterInstance) return transporterInstance;

  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const missingVars = requiredVars.filter(key => !process.env[key]);

  if (missingVars.length > 0) {
    logger.error(`SMTP configuration variables are missing: ${missingVars.join(', ')}. Email dispatch will be disabled.`);
    return null;
  }

  try {
    transporterInstance = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: false, // port 587 uses STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify SMTP connection configuration on startup/first use
    transporterInstance.verify((error) => {
      if (error) {
        logger.error(`SMTP connection verification failed: ${error.message}. Please check your credentials and configuration.`);
      } else {
        logger.info('SMTP connection successfully established and verified.');
      }
    });

    return transporterInstance;
  } catch (error) {
    logger.error(`Failed to initialize SMTP transporter: ${error.message}`, error);
    return null;
  }
};

const getSenderEmail = () => {
  return process.env.EMAIL_FROM || 'yourgmail@gmail.com';
};

/**
 * Common HTML wrap template for BrandPulse AI premium dark theme
 */
const wrapTemplate = (contentHtml) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          background-color: #0f172a !important;
          color: #cbd5e1 !important;
          font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          padding: 32px;
          background-color: #1e293b !important;
          border: 1px solid #334155 !important;
          border-radius: 12px;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
          border-bottom: 1px solid #334155;
          padding-bottom: 20px;
        }
        .logo {
          font-size: 26px;
          font-weight: 800;
          color: #818cf8 !important;
          text-decoration: none;
        }
        .content {
          font-size: 16px;
          line-height: 1.6;
          color: #cbd5e1 !important;
        }
        .content p {
          color: #cbd5e1 !important;
        }
        .btn {
          display: inline-block;
          padding: 12px 24px;
          margin: 20px 0;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%) !important;
          color: #ffffff !important;
          text-decoration: none !important;
          font-weight: 600;
          border-radius: 6px;
          text-align: center;
        }
        .footer {
          margin-top: 32px;
          text-align: center;
          font-size: 12px;
          color: #64748b !important;
          border-top: 1px solid #334155;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <span class="logo">BrandPulse AI</span>
        </div>
        <div class="content">
          ${contentHtml}
        </div>
        <div class="footer">
          &copy; 2026 BrandPulse AI. All rights reserved.<br>
          Enterprise AI-powered Brand Sentiment and Web Crawling Platform.
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Sends a welcome email to a newly registered user
 */
export const sendWelcomeEmail = async (email, name) => {
  const client = getTransporter();
  if (!client) return false;

  try {
    const content = `
      <h3>Hello ${name},</h3>
      <p>Welcome to <strong>BrandPulse AI</strong>!</p>
      <p>Your enterprise-grade brand monitoring and sentiment analysis dashboard is successfully configured. You can now setup your brands, keywords, and hashtags to begin tracking mentions and reviews in real-time using BrandPulse AI.</p>
      <p>Best regards,<br>The BrandPulse Team</p>
    `;
    const response = await client.sendMail({
      from: getSenderEmail(),
      to: email,
      subject: 'Welcome to BrandPulse AI! 🚀',
      html: wrapTemplate(content),
    });

    logger.info(`Welcome email sent successfully to ${email}. Message ID: ${response.messageId}`);
    return response;
  } catch (error) {
    logger.error(`Failed to send welcome email to ${email}: ${error.message}`, error);
    return false;
  }
};

/**
 * Sends an email verification request
 */
export const sendVerificationEmail = async (email, verificationToken) => {
  const client = getTransporter();
  if (!client) return false;

  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
  try {
    const content = `
      <h3>Verify Your Email Address</h3>
      <p>Thank you for signing up with BrandPulse AI. To activate your account and start monitoring sentiment, please verify your email address by clicking the button below:</p>
      <div style="text-align: center;">
        <a href="${verifyUrl}" class="btn" style="color: #ffffff !important;">Verify Email Address</a>
      </div>
      <p>If the button doesn't work, you can copy and paste this URL into your browser:</p>
      <p><a href="${verifyUrl}" style="color: #818cf8;">${verifyUrl}</a></p>
    `;
    const response = await client.sendMail({
      from: getSenderEmail(),
      to: email,
      subject: 'Verify Your BrandPulse AI Account 🔑',
      html: wrapTemplate(content),
    });

    logger.info(`Verification email sent successfully to ${email}. Message ID: ${response.messageId}`);
    return response;
  } catch (error) {
    logger.error(`Failed to send verification email to ${email}: ${error.message}`, error);
    return false;
  }
};

/**
 * Sends a password reset email
 */
export const sendPasswordResetEmail = async (email, resetToken) => {
  const client = getTransporter();
  if (!client) return false;

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
  try {
    const content = `
      <h3>Password Reset Request</h3>
      <p>You requested a password reset for your BrandPulse AI account. Please click the button below to configure your new secure password:</p>
      <div style="text-align: center;">
        <a href="${resetUrl}" class="btn" style="color: #ffffff !important;">Reset Password</a>
      </div>
      <p>This password reset link is valid for <strong>1 hour</strong>. If you did not request this, please ignore this email and your password will remain secure.</p>
      <p>Copy & paste link fallback:<br><a href="${resetUrl}" style="color: #818cf8;">${resetUrl}</a></p>
    `;
    const response = await client.sendMail({
      from: getSenderEmail(),
      to: email,
      subject: 'BrandPulse AI - Password Reset Request 🔄',
      html: wrapTemplate(content),
    });

    logger.info(`Password reset email sent successfully to ${email}. Message ID: ${response.messageId}`);
    return response;
  } catch (error) {
    logger.error(`Failed to send password reset email to ${email}: ${error.message}`, error);
    return false;
  }
};

/**
 * Sends a password reset confirmation email
 */
export const sendPasswordResetSuccessEmail = async (email, name) => {
  const client = getTransporter();
  if (!client) return false;

  try {
    const content = `
      <h3>Password Reset Successful</h3>
      <p>Hello ${name},</p>
      <p>This is a confirmation that the password for your BrandPulse AI account has been successfully updated.</p>
      <p>If you did not make this change, please contact our support team immediately to secure your account.</p>
    `;
    const response = await client.sendMail({
      from: getSenderEmail(),
      to: email,
      subject: 'BrandPulse AI - Password Reset Successful ✅',
      html: wrapTemplate(content),
    });

    logger.info(`Password reset confirmation email sent successfully to ${email}. Message ID: ${response.messageId}`);
    return response;
  } catch (error) {
    logger.error(`Failed to send password reset success email to ${email}: ${error.message}`, error);
    return false;
  }
};

/**
 * Sends a profile update notification
 */
export const sendProfileUpdatedEmail = async (email, name) => {
  const client = getTransporter();
  if (!client) return false;

  try {
    const content = `
      <h3>Profile Updated</h3>
      <p>Hello ${name},</p>
      <p>This is to inform you that your BrandPulse AI profile information (such as name, company, or contact details) was recently updated.</p>
      <p>If you did not perform this update, please review your account settings and contact support.</p>
    `;
    const response = await client.sendMail({
      from: getSenderEmail(),
      to: email,
      subject: 'BrandPulse AI - Profile Updated 👤',
      html: wrapTemplate(content),
    });

    logger.info(`Profile updated email sent successfully to ${email}. Message ID: ${response.messageId}`);
    return response;
  } catch (error) {
    logger.error(`Failed to send profile updated email to ${email}: ${error.message}`, error);
    return false;
  }
};

/**
 * Sends a report generated notification
 */
export const sendReportGeneratedEmail = async (email, name, reportName, brandName) => {
  const client = getTransporter();
  if (!client) return false;

  try {
    const content = `
      <h3>New Brand Analytics Report Generated</h3>
      <p>Hello ${name},</p>
      <p>A new brand analytics report <strong>"${reportName}"</strong> has been successfully generated for <strong>${brandName}</strong>.</p>
      <p>You can now download and view this report from your dashboard under the Reports tab.</p>
      <p>Best regards,<br>The BrandPulse Team</p>
    `;
    const response = await client.sendMail({
      from: getSenderEmail(),
      to: email,
      subject: `New Report Generated for ${brandName} 📊`,
      html: wrapTemplate(content),
    });

    logger.info(`Report generated email sent successfully to ${email}. Message ID: ${response.messageId}`);
    return response;
  } catch (error) {
    logger.error(`Failed to send report generated email to ${email}: ${error.message}`, error);
    return false;
  }
};

/**
 * Sends a custom email notification, optionally with attachments (PDF, etc.)
 */
export const sendCustomEmail = async (email, subject, contentHtml, attachments = []) => {
  const client = getTransporter();
  if (!client) return false;

  try {
    const response = await client.sendMail({
      from: getSenderEmail(),
      to: email,
      subject,
      html: wrapTemplate(contentHtml),
      attachments,
    });

    logger.info(`Custom email sent successfully to ${email}. Message ID: ${response.messageId}`);
    return response;
  } catch (error) {
    logger.error(`Failed to send custom email to ${email}: ${error.message}`, error);
    return false;
  }
};

// Initialize and verify SMTP connection on startup
getTransporter();
