import BaseRepository from './BaseRepository.js';
import Permission from '../models/Permission.js';

class PermissionRepository extends BaseRepository {
  constructor() {
    super(Permission);
  }

  async findByName(name) {
    return this.findOne({ name });
  }
}

export default new PermissionRepository();
