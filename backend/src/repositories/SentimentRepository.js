import BaseRepository from './BaseRepository.js';
import Sentiment from '../models/Sentiment.js';

class SentimentRepository extends BaseRepository {
  constructor() {
    super(Sentiment);
  }

  async getDailyTimeline(brandId, limit = 7) {
    return this.model
      .find({ brand: brandId })
      .sort('-date')
      .limit(limit)
      .exec();
  }
}

export default new SentimentRepository();
