import 'dotenv/config';
import app from './app.js';
import connectDB from './config/db.js';
import logger from './config/logger.js';
import { verifySmtpConnection } from './services/emailService.js';

const PORT = process.env.PORT || 5000;

// Connect to Database, verify SMTP, and start server
const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Verify SMTP email connection on startup (non-blocking — logs result)
    verifySmtpConnection().then((ok) => {
      if (ok) {
        logger.info('[Startup] ✅ SMTP email delivery verified and ENABLED.');
      } else {
        logger.warn('[Startup] ⚠️  SMTP verification failed. Emails will NOT be delivered. Check SMTP env vars.');
      }
    });

    // 3. Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Server is running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
