import express from 'express';
import { sendContactEmail } from '../services/emailService.js';
import logger from '../config/logger.js';

const router = express.Router();

// @desc    Submit Contact Form
// @route   POST /api/contact
// @access  Public
router.post('/', async (req, res, next) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email, and message are required' });
  }

  try {
    setImmediate(async () => {
      try {
        await sendContactEmail(name, email, subject || 'General Contact Form Query', message);
      } catch (err) {
        logger.warn(`[ContactRoute] Contact email dispatch failed: ${err.message}`);
      }
    });

    res.json({ success: true, message: 'Thank you for reaching out! Your message has been sent successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
