import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import UserRepository from '../repositories/UserRepository.js';
import RefreshTokenRepository from '../repositories/RefreshTokenRepository.js';
import RoleRepository from '../repositories/RoleRepository.js';
import OrganizationRepository from '../repositories/OrganizationRepository.js';
import { sendWelcomeEmail, sendPasswordResetEmail, sendVerificationEmail, sendPasswordResetSuccessEmail, EMAIL_SERVICE_BUILD } from '../services/emailService.js';
import { pushNotification } from '../services/notificationService.js';
import logger from '../config/logger.js';

// JWT Generation Helpers
const generateAccessToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '15m', // Access token expires in 15 minutes (rotation practice)
  });
};

const generateRefreshToken = async (userId) => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Refresh token valid for 7 days

  await RefreshTokenRepository.create({
    user: userId,
    token,
    expiresAt,
  });

  return token;
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res, next) => {
  const { name, email, password, orgName } = req.body;

  try {
    const userExists = await UserRepository.findByEmail(email);
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // 1. Resolve organization (or create standard organization)
    const orgSlug = (orgName || `${name}'s Org`).toLowerCase().replace(/[^a-z0-9]/g, '-');
    const organization = await OrganizationRepository.create({
      name: orgName || `${name}'s Org`,
      slug: `${orgSlug}-${Math.floor(Math.random() * 1000)}`,
    });

    // 2. Fetch default role (user role)
    let roleRef = null;
    const defaultRole = await RoleRepository.findByName('user');
    if (defaultRole) {
      roleRef = defaultRole._id;
    }

    // 3. Generate verification token
    const verificationToken = crypto.randomBytes(30).toString('hex');

    // 4. Create user
    const user = await UserRepository.create({
      name,
      email,
      password,
      role: 'user',
      roleRef,
      organization: organization._id,
      verificationToken,
      isVerified: false,
    });

    // 5. Send welcome and verification emails asynchronously in background
    setImmediate(async () => {
      try {
        await sendWelcomeEmail(user.email, user.name);
      } catch (emailErr) {
        logger.warn(`[AuthController] Welcome email failed for ${user.email}: ${emailErr.message}`);
      }
      try {
        await sendVerificationEmail(user.email, verificationToken);
      } catch (emailErr) {
        logger.warn(`[AuthController] Verification email failed for ${user.email}: ${emailErr.message}`);
      }
    });

    // 6. Generate session tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);

    res.status(201).json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get tokens
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await UserRepository.findByEmail(email, true);
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);

    // Trigger successful login notification
    await pushNotification({
      userId: user._id,
      organizationId: user.organization,
      title: 'Successful Login',
      message: `New secure authentication session initiated.`,
      category: 'authentication',
      priority: 'INFO'
    });

    res.json({
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Rotate access/refresh tokens
// @route   POST /api/auth/refresh
// @access  Public
export const refreshTokens = async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ success: false, message: 'Refresh token is required' });
  }

  try {
    const activeTokenDoc = await RefreshTokenRepository.findActiveToken(token);
    if (!activeTokenDoc) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    // Revoke current token (Token Rotation Practice)
    await RefreshTokenRepository.revokeToken(token);

    // Generate new pair
    const userId = activeTokenDoc.user;
    const newAccessToken = generateAccessToken(userId);
    const newRefreshToken = await generateRefreshToken(userId);

    res.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user (Revokes refresh token)
// @route   POST /api/auth/logout
// @access  Public
export const logoutUser = async (req, res, next) => {
  const { token } = req.body;

  try {
    if (token) {
      await RefreshTokenRepository.revokeToken(token);
    }
    res.json({ success: true, message: 'User logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify email address
// @route   POST /api/auth/verify-email
// @access  Public
export const verifyEmail = async (req, res, next) => {
  const { token } = req.body;

  try {
    const user = await UserRepository.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot Password (Sends reset email)
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  try {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      // Return 200 even if user not found for security reasons
      return res.json({ 
        success: true, 
        message: 'If email exists, a password reset link has been sent',
        emailDispatch: {
          build: EMAIL_SERVICE_BUILD,
          userFound: false,
          delivered: false,
          error: 'User not found in MongoDB'
        }
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour expiration
    await user.save();

    let emailResult = null;
    let emailErrorMsg = null;
    try {
      emailResult = await sendPasswordResetEmail(user.email, resetToken);
    } catch (emailErr) {
      emailErrorMsg = emailErr.message;
      logger.warn(`[AuthController] Password reset email failed for ${user.email}: ${emailErr.message}`);
    }

    res.json({ 
      success: true, 
      message: 'If email exists, a password reset link has been sent',
      emailDispatch: {
        build: EMAIL_SERVICE_BUILD,
        delivered: !!(emailResult && emailResult.messageId),
        messageId: emailResult?.messageId || null,
        smtpResponse: emailResult?.response || null,
        error: emailErrorMsg,
        envAudit: {
          SMTP_HOST: process.env.SMTP_HOST,
          SMTP_PORT: process.env.SMTP_PORT,
          SMTP_SECURE: process.env.SMTP_SECURE,
          SMTP_USER: process.env.SMTP_USER,
          EMAIL_FROM: process.env.EMAIL_FROM
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password using reset token
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res, next) => {
  const { token, password } = req.body;

  try {
    const user = await UserRepository.model.findOne({
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    }).select('+password +resetPasswordToken +resetPasswordExpire');

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    user.password = password; // Hashed automatically on pre-save
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Send password reset success email and notification
    try {
      await sendPasswordResetSuccessEmail(user.email, user.name);
    } catch (emailErr) {
      logger.warn(`[AuthController] Password reset success email failed for ${user.email}: ${emailErr.message}`);
    }
    await pushNotification({
      userId: user._id,
      organizationId: user.organization,
      title: 'Password Changed',
      message: 'Your account password has been reset successfully.',
      category: 'authentication',
      priority: 'HIGH'
    });

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get authenticated user profile
// @route   GET /api/auth/profile
// @access  Private
export const getUserProfile = async (req, res, next) => {
  try {
    const user = await UserRepository.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};
