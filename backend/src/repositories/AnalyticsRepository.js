import BaseRepository from './BaseRepository.js';
import Analytics from '../models/Analytics.js';

class AnalyticsRepository extends BaseRepository {
  constructor() {
    super(Analytics);
  }

  async getLatestMetrics(brandId, type) {
    return this.model
      .findOne({ brand: brandId, metricType: type })
      .sort('-calculationDate')
      .exec();
  }
}

export default new AnalyticsRepository();
