import Notification from '../models/Notification.js';
import User from '../models/User.js';
import logger from '../config/logger.js';

/**
 * Creates a notification in MongoDB.
 * If userId is null but organizationId is provided, broadcasts to all members of the organization.
 * 
 * @param {object} params Notification details 
 */
export const pushNotification = async ({
  userId,
  organizationId,
  brandId,
  title,
  message,
  category = 'system',
  priority = 'INFO',
  icon = '',
  actionUrl = '',
  metadata = {}
}) => {
  try {
    // If no specific userId is given, broadcast to all users in the organization
    if (!userId && organizationId) {
      const users = await User.find({ organization: organizationId });
      const notifications = users.map(u => ({
        userId: u._id,
        recipient: u._id,
        organizationId,
        brandId,
        title,
        message,
        category,
        priority,
        icon,
        actionUrl,
        metadata
      }));
      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        logger.info(`[Notification Service] Broadcasted "${title}" to ${notifications.length} users in org ${organizationId}`);
      }
      return;
    }

    if (!userId) {
      logger.warn('[Notification Service] Cannot create notification: No user or organization ID provided.');
      return;
    }

    const notification = await Notification.create({
      userId,
      recipient: userId,
      organizationId,
      brandId,
      title,
      message,
      category,
      priority,
      icon,
      actionUrl,
      metadata
    });

    logger.info(`[Notification Service] Created notification "${title}" for user ${userId}`);
    return notification;
  } catch (error) {
    logger.error(`[Notification Service] Error creating notification: ${error.message}`, error);
  }
};
