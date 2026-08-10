import express from 'express';
import { 
  registerUser, 
  loginUser, 
  verifyOtp,
  resendOtp,
  handleDeviceApproval,
  getTrustedDevices,
  revokeTrustedDevice,
  getUserProfile, 
  refreshTokens, 
  logoutUser, 
  verifyEmail, 
  forgotPassword, 
  resetPassword 
} from '../controllers/authController.js';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { 
  registerSchema, 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema, 
  verifyEmailSchema, 
  refreshTokenSchema 
} from '../validators/authValidator.js';

const router = express.Router();

router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);
router.post('/approve-device', handleDeviceApproval);
router.get('/trusted-devices', protect, getTrustedDevices);
router.delete('/trusted-devices/:id', protect, revokeTrustedDevice);

router.post('/refresh', validate(refreshTokenSchema), refreshTokens);
router.post('/logout', validate(refreshTokenSchema), logoutUser);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmail);
router.post('/forgot-password', validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);
router.get('/profile', protect, getUserProfile);

export default router;

