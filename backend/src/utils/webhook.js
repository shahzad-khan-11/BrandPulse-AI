import crypto from 'crypto';

/**
 * Generates an HMAC-SHA256 signature for a payload using a secret key.
 * Used for securing outbound webhooks sent to n8n.
 * 
 * @param {object|string} payload The body payload of the webhook request
 * @param {string} secret The webhook signing secret
 * @returns {string} The hex encoded signature
 */
export const generateSignature = (payload, secret) => {
  if (!secret) {
    throw new Error('Signing secret is missing');
  }
  
  const payloadString = typeof payload === 'string' 
    ? payload 
    : JSON.stringify(payload);
    
  return crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');
};

/**
 * Verifies if a signature matches the payload and secret.
 * Used for verifying inbound webhook payloads if n8n sends callbacks.
 * 
 * @param {object|string} payload The body payload of the request
 * @param {string} signature The received signature to verify
 * @param {string} secret The webhook signing secret
 * @returns {boolean} True if signature is valid, false otherwise
 */
export const verifySignature = (payload, signature, secret) => {
  if (!signature || !secret) return false;
  
  try {
    const expectedSignature = generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
};
