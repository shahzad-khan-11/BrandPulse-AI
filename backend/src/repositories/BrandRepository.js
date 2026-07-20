import BaseRepository from './BaseRepository.js';
import Brand from '../models/Brand.js';

class BrandRepository extends BaseRepository {
  constructor() {
    super(Brand);
  }

  async findByOrganization(orgId) {
    return this.find({ organization: orgId });
  }

  async findByUser(userId) {
    return this.find({ createdBy: userId });
  }
}

export default new BrandRepository();
