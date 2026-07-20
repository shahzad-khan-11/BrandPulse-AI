import BaseRepository from './BaseRepository.js';
import Report from '../models/Report.js';

class ReportRepository extends BaseRepository {
  constructor() {
    super(Report);
  }

  async findByBrand(brandId) {
    return this.find({ brand: brandId });
  }
}

export default new ReportRepository();
