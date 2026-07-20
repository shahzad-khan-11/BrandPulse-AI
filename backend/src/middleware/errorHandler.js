import logger from '../config/logger.js';

const errorHandler = (err, req, res, _next) => {
  logger.error(`${err.message} - ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  
  if (process.env.NODE_ENV === 'development') {
    logger.error(err.stack);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};

export default errorHandler;
