import mongoose from 'mongoose';
import logger from '../config/logger.js';

// Connection state flags
const connectionState = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

/**
 * Database Connection Manager
 */
export const connect = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    logger.error('MONGODB_URI environment variable is missing.');
    process.exit(1);
  }

  // Set mongoose options
  mongoose.set('strictQuery', true);

  // Monitor connection events
  mongoose.connection.on('connected', () => {
    logger.info('Mongoose connection successfully established.');
  });

  mongoose.connection.on('error', (err) => {
    logger.error(`Mongoose connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('Mongoose connection disconnected. Attempting reconnect...');
  });
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true, // Auto-build indexes in development/test
    });
  } catch (error) {
    logger.error(`Initial MongoDB connection failed: ${error.message}`);
    logger.warn('Running backend server in local fallback/offline mode.');
  }
};
/**
 * Health check utility returning status of database connection
 * 
 * @returns {object} Health statistics
 */
export const healthCheck = () => {
  const state = mongoose.connection.readyState;
  return {
    status: state === 1 ? 'UP' : 'DOWN',
    state: connectionState[state] || 'unknown',
    host: mongoose.connection.host || 'none',
    dbName: mongoose.connection.name || 'none',
  };
};

/**
 * Database Transaction Wrapper (future-ready)
 * Automatically starts a session, runs callback inside transaction, commits, 
 * and aborts on exception. Note: Requires replica-set to run successfully.
 * 
 * @param {function} callback Async transaction operations callback
 */
export const withTransaction = async (callback) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const result = await callback(session);
    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Database Backup Utility (Structure Only as requested)
 */
export const backupDatabase = async () => {
  logger.info('Database backup utility initiated...');
  try {
    const modelsList = Object.keys(mongoose.models);
    const backupMetadata = {
      timestamp: new Date().toISOString(),
      models: modelsList,
      collectionsCount: modelsList.length,
      status: 'STRUCTURE_EXPORTED',
    };
    logger.info(`Backup structure exported successfully for: ${modelsList.join(', ')}`);
    return backupMetadata;
  } catch (error) {
    logger.error(`Database backup failed: ${error.message}`);
    throw error;
  }
};
