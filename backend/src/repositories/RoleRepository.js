import BaseRepository from './BaseRepository.js';
import Role from '../models/Role.js';

class RoleRepository extends BaseRepository {
  constructor() {
    super(Role);
  }

  async findByName(name) {
    return this.findOne({ name }, 'permissions');
  }
}

export default new RoleRepository();
