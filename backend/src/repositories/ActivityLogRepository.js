import BaseRepository from './BaseRepository.js';
import ActivityLog from '../models/ActivityLog.js';

class ActivityLogRepository extends BaseRepository {
  constructor() {
    super(ActivityLog);
  }

  async findByUser(userId) {
    return this.find({ user: userId });
  }
}

export default new ActivityLogRepository();
