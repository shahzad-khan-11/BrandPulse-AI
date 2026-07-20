import BaseRepository from './BaseRepository.js';
import WorkflowLog from '../models/WorkflowLog.js';

class WorkflowLogRepository extends BaseRepository {
  constructor() {
    super(WorkflowLog);
  }

  async findActiveWorkflows(brandId) {
    return this.find({ brand: brandId, status: 'running' });
  }
}

export default new WorkflowLogRepository();
