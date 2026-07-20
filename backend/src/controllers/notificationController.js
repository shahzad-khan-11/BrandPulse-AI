import Notification from '../models/Notification.js';
import logger from '../config/logger.js';

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      userId: req.user._id,
      isDeleted: { $ne: true }
    });

    const priorityWeight = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1, 'INFO': 0 };
    notifications.sort((a, b) => {
      // 1. Sort by Unread first (isRead false comes before true)
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      // 2. Sort by priority weight descending
      const pA = priorityWeight[a.priority] || 0;
      const pB = priorityWeight[b.priority] || 0;
      if (pA !== pB) {
        return pB - pA;
      }
      // 3. Sort by createdAt descending (newest first)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read
// @access  Private
export const readAllNotifications = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false, isDeleted: { $ne: true } },
      { isRead: true }
    );
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const readSingleNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a single notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      { isDeleted: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    res.json({ success: true, message: 'Notification deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete all notifications
// @route   DELETE /api/notifications
// @access  Private
export const deleteAllNotifications = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isDeleted: { $ne: true } },
      { isDeleted: true }
    );
    res.json({ success: true, message: 'All notifications cleared successfully' });
  } catch (error) {
    next(error);
  }
};
