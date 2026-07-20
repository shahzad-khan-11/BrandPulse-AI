import { verifySignature } from '../utils/webhook.js';
import logger from '../config/logger.js';

/**
 * Middleware to protect incoming n8n webhook callback endpoints.
 * Verifies the X-BrandPulse-Signature HMAC-SHA256 header.
 */
export const protectWebhook = (req, res, next) => {
  const signature = req.headers['x-brandpulse-signature'];
  const secret = process.env.N8N_WEBHOOK_SECRET || 'default_secret';

  // In production, signature verification is strictly enforced.
  // In development, it is verified if the header is present, allowing easier manual testing.
  if (process.env.NODE_ENV === 'production' || signature) {
    if (!signature) {
      logger.warn('Unauthorized webhook request: Missing X-BrandPulse-Signature header');
      return res.status(401).json({ success: false, message: 'Missing webhook signature' });
    }

    const isValid = verifySignature(req.body, signature, secret);
    if (!isValid) {
      logger.warn('Unauthorized webhook request: Invalid HMAC signature');
      return res.status(401).json({ success: false, message: 'Invalid webhook signature' });
    }
  } else {
    logger.info('Skipping webhook signature verification in development (no signature header provided)');
  }

  next();
};
