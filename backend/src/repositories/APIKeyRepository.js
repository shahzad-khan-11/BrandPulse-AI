import BaseRepository from './BaseRepository.js';
import APIKey from '../models/APIKey.js';

class APIKeyRepository extends BaseRepository {
  constructor() {
    super(APIKey);
  }

  async findActiveKeys(orgId) {
    return this.find({ organization: orgId, isActive: true });
  }

  async findByHashedKey(hashedKey) {
    return this.model.findOne({ hashedKey, isActive: true }).populate('user');
  }
}

export default new APIKeyRepository();
