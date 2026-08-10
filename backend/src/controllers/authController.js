import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import UserRepository from '../repositories/UserRepository.js';
import RefreshTokenRepository from '../repositories/RefreshTokenRepository.js';
import RoleRepository from '../repositories/RoleRepository.js';
import OrganizationRepository from '../repositories/OrganizationRepository.js';
import { sendWelcomeEmail, sendPasswordResetEmail, sendVerificationEmail, sendPasswordResetSuccessEmail, sendEmailVerifiedEmail, sendLoginNotificationEmail, sendLoginOtpEmail } from '../services/emailService.js';
import { pushNotification } from '../services/notificationService.js';
import SecurityEvent from '../models/SecurityEvent.js';
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

    // 5. Send welcome and verification emails safely
    try {
      await sendWelcomeEmail(user.email, user.name);
    } catch (emailErr) {
      logger.error(`[AuthController] Welcome email failed for ${user.email}: ${emailErr.message}`);
    }
    try {
      await sendVerificationEmail(user.email, verificationToken);
    } catch (emailErr) {
      logger.error(`[AuthController] Verification email failed for ${user.email}: ${emailErr.message}`);
    }

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

// Helper to hash OTP codes safely
const hashOtp = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

// @desc    Authenticate user credentials & issue 6-digit OTP
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    const user = await UserRepository.findByEmail(email, true);
    if (!user || !(await user.matchPassword(password))) {
      // Log failed attempt
      await SecurityEvent.create({
        email,
        eventType: 'LOGIN_ATTEMPT',
        status: 'FAILED',
        userAgent: req.headers['user-agent'] || '',
        ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      }).catch(err => logger.error(`Security logging error: ${err.message}`));

      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate secure 6-digit OTP
    const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = hashOtp(plainOtp);

    // Save OTP details on user document (expires in 5 minutes)
    await UserRepository.model.findByIdAndUpdate(user._id, {
      loginOtp: hashed,
      loginOtpExpire: new Date(Date.now() + 5 * 60 * 1000),
      loginOtpAttempts: 0,
    });

    // Send OTP email using existing EmailService
    try {
      await sendLoginOtpEmail(user.email, user.name, plainOtp);
    } catch (emailErr) {
      logger.error(`[AuthController] OTP email delivery failed for ${user.email}: ${emailErr.message}`);
    }

    // Log security event
    await SecurityEvent.create({
      user: user._id,
      email: user.email,
      eventType: 'OTP_SENT',
      status: 'SUCCESS',
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip || '127.0.0.1',
    }).catch(err => logger.error(`Security logging error: ${err.message}`));

    res.json({
      success: true,
      requiresOtp: true,
      email: user.email,
      message: `A 6-digit verification code has been sent to ${user.email}.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify 6-digit Login OTP & complete authentication
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyOtp = async (req, res, next) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ success: false, message: 'Email and OTP code are required' });
  }

  try {
    const user = await UserRepository.model.findOne({ email }).select('+loginOtp +loginOtpExpire +loginOtpAttempts');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found' });
    }

    if (!user.loginOtp || !user.loginOtpExpire || Date.now() > user.loginOtpExpire) {
      return res.status(400).json({ success: false, message: 'OTP code has expired. Please request a new code.' });
    }

    if (user.loginOtpAttempts >= 5) {
      user.loginOtp = undefined;
      user.loginOtpExpire = undefined;
      await user.save();
      return res.status(429).json({ success: false, message: 'Maximum OTP verification attempts exceeded. Please request a new code.' });
    }

    const hashedInput = hashOtp(otp);
    if (hashedInput !== user.loginOtp) {
      user.loginOtpAttempts = (user.loginOtpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ success: false, message: 'Invalid OTP code. Please check and try again.' });
    }

    // Clear OTP fields upon successful verification
    user.loginOtp = undefined;
    user.loginOtpExpire = undefined;
    user.loginOtpAttempts = 0;
    await user.save();

    // Generate JWT access & refresh tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = await generateRefreshToken(user._id);

    // Security event & notification
    await SecurityEvent.create({
      user: user._id,
      email: user.email,
      eventType: 'LOGIN_SUCCESS',
      status: 'SUCCESS',
      userAgent: req.headers['user-agent'] || '',
      ipAddress: req.ip || '127.0.0.1',
    }).catch(err => logger.error(`Security logging error: ${err.message}`));

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

// @desc    Resend 6-digit Login OTP
// @route   POST /api/auth/resend-otp
// @access  Public
export const resendOtp = async (req, res, next) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

  try {
    const user = await UserRepository.findByEmail(email);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const plainOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashed = hashOtp(plainOtp);

    await UserRepository.model.findByIdAndUpdate(user._id, {
      loginOtp: hashed,
      loginOtpExpire: new Date(Date.now() + 5 * 60 * 1000),
      loginOtpAttempts: 0,
    });

    try {
      await sendLoginOtpEmail(user.email, user.name, plainOtp);
    } catch (emailErr) {
      logger.error(`[AuthController] Resend OTP email failed for ${user.email}: ${emailErr.message}`);
    }

    res.json({ success: true, message: `A new 6-digit OTP code has been sent to ${user.email}.` });
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

    // Send email verified confirmation email safely
    try {
      await sendEmailVerifiedEmail(user.email, user.name);
    } catch (emailErr) {
      logger.error(`[AuthController] Email verified confirmation failed for ${user.email}: ${emailErr.message}`);
    }

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
        message: 'If email exists, a password reset link has been sent'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour expiration
    await user.save();

    // Dispatch password reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken);
    } catch (emailErr) {
      logger.error(`[AuthController] Password reset email failed for ${user.email}: ${emailErr.message}`);
    }

    res.json({ 
      success: true, 
      message: 'If email exists, a password reset link has been sent'
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
