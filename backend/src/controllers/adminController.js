import { healthCheck, backupDatabase } from '../database/index.js';

// @desc    Check database liveness & connection health details
// @route   GET /api/admin/health
// @access  Private/Admin
export const getDatabaseHealth = (req, res) => {
  const dbHealth = healthCheck();
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    database: dbHealth,
  });
};

// @desc    Export database collection schemas metadata backup
// @route   POST /api/admin/backup
// @access  Private/Admin
export const triggerBackup = async (req, res, next) => {
  try {
    const backupMetadata = await backupDatabase();
    res.json({
      success: true,
      message: 'Database backup structure exported successfully',
      data: backupMetadata,
    });
  } catch (error) {
    next(error);
  }
};
