import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
  // Skip auth and n8n webhook routes
  skip: (req) => {
    return req.originalUrl && (
      req.originalUrl.includes('/api/auth') ||
      req.originalUrl.includes('/api/workflows/n8n')
    );
  },
});

export default limiter;
