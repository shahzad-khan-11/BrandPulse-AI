import BaseRepository from './BaseRepository.js';
import RefreshToken from '../models/RefreshToken.js';

class RefreshTokenRepository extends BaseRepository {
  constructor() {
    super(RefreshToken);
  }

  async findActiveToken(token) {
    const doc = await this.model.findOne({ token, isRevoked: false });
    if (doc && doc.isValid) {
      return doc;
    }
    return null;
  }

  async revokeToken(token) {
    return this.model.findOneAndUpdate({ token }, { isRevoked: true }, { new: true });
  }
}

export default new RefreshTokenRepository();
