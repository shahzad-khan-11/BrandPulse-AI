import BaseRepository from './BaseRepository.js';
import Notification from '../models/Notification.js';

class NotificationRepository extends BaseRepository {
  constructor() {
    super(Notification);
  }

  async findUnreadByUser(userId) {
    return this.find({ recipient: userId, isRead: false });
  }

  async markAllAsRead(userId) {
    return this.model.updateMany({ recipient: userId, isRead: false }, { isRead: true });
  }
}

export default new NotificationRepository();
