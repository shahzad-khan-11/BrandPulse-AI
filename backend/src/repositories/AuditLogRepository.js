import BaseRepository from './BaseRepository.js';
import AuditLog from '../models/AuditLog.js';

class AuditLogRepository extends BaseRepository {
  constructor() {
    super(AuditLog);
  }

  async findCriticalLogs() {
    return this.find({ severity: { $in: ['high', 'critical'] } });
  }
}

export default new AuditLogRepository();
