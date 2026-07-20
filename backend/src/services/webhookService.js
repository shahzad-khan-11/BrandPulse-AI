import axios from 'axios';
import { generateSignature } from '../utils/webhook.js';
import logger from '../config/logger.js';

/**
 * Sends a secure webhook payload to configured external integrations (like n8n)
 * signs it using HMAC-SHA256.
 * 
 * @param {string} url Destination Webhook URL
 * @param {object} payload Payload data to send
 * @returns {Promise<boolean>} True if sent successfully, false otherwise
 */
export const dispatchWebhook = async (url, payload) => {
  const secret = process.env.N8N_WEBHOOK_SECRET;

  if (!url) {
    logger.warn('n8n Webhook URL is not configured. Skipping dispatch.');
    return false;
  }

  try {
    const signature = generateSignature(payload, secret || 'default_secret');

    logger.info(`Dispatching secure webhook to: ${url}...`);
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-BrandPulse-Signature': signature,
      },
      timeout: 5000, // 5s timeout
    });

    logger.info(`Webhook successfully dispatched. Status: ${response.status}`);
    return true;
  } catch (error) {
    logger.error(`Failed to dispatch webhook: ${error.message}`);
    return false;
  }
};
