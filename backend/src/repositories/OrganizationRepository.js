import BaseRepository from './BaseRepository.js';
import Organization from '../models/Organization.js';

class OrganizationRepository extends BaseRepository {
  constructor() {
    super(Organization);
  }

  async findBySlug(slug) {
    return this.findOne({ slug });
  }
}

export default new OrganizationRepository();
