import BaseRepository from './BaseRepository.js';
import BrandMention from '../models/BrandMention.js';
import mongoose from 'mongoose';

class BrandMentionRepository extends BaseRepository {
  constructor() {
    super(BrandMention);
  }

  async findByBrand(brandId, sort = '-publishedAt') {
    return this.find({ brand: brandId }, sort);
  }

  async getSentimentStats(brandId) {
    return this.model.aggregate([
      { $match: { brand: new mongoose.Types.ObjectId(brandId), isDeleted: false } },
      {
        $group: {
          _id: '$sentiment',
          count: { $sum: 1 },
          avgScore: { $avg: '$sentimentScore' }
        }
      }
    ]);
  }
}

export default new BrandMentionRepository();
