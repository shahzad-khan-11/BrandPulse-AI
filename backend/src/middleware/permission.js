import User from '../models/User.js';
import logger from '../config/logger.js';

/**
 * RBAC/Permission Middleware Creator
 * Checks if the authenticated user has the necessary permissions.
 * Admins bypass all permission checks.
 * 
 * @param {string} requiredPermission The string name of the permission (e.g. 'brands:create')
 */
const checkPermission = (requiredPermission) => async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized, no session context' });
  }

  // Admin bypass
  if (req.user.role === 'admin') {
    return next();
  }

  try {
    // Populate user role and permissions dynamically if not already populated
    const user = await User.findById(req.user._id).populate({
      path: 'roleRef',
      populate: {
        path: 'permissions',
      },
    });

    if (!user || !user.roleRef) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: User does not possess the role configuration for permission [${requiredPermission}]`,
      });
    }

    const hasPermission = user.roleRef.permissions.some(
      (perm) => perm.name === requiredPermission
    );

    if (!hasPermission) {
      logger.warn(`User ${user.email} attempted forbidden operation. Missing permission: ${requiredPermission}`);
      return res.status(403).json({
        success: false,
        message: `Forbidden: Missing required authorization permission [${requiredPermission}]`,
      });
    }

    next();
  } catch (error) {
    logger.error(`Error evaluating user permissions: ${error.message}`);
    res.status(500).json({ success: false, message: 'Internal Server Error evaluating permissions' });
  }
};

export default checkPermission;
