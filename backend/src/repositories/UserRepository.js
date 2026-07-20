import BaseRepository from './BaseRepository.js';
import User from '../models/User.js';

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  /**
   * Find a user by email, optionally including the password
   * 
   * @param {string} email User email address
   * @param {boolean} includePassword If true, selects the password field
   */
  async findByEmail(email, includePassword = false) {
    let query = this.model.findOne({ email });
    if (includePassword) {
      query = query.select('+password');
    }
    return query.exec();
  }
}

export default new UserRepository();
