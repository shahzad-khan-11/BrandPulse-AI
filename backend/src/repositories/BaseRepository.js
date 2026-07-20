import { paginate } from '../database/helpers/query.js';

/**
 * Base Repository Class implementing reusable CRUD methods
 */
export default class BaseRepository {
  /**
   * @param {object} model Mongoose Model instance
   */
  constructor(model) {
    this.model = model;
  }

  async find(filter = {}, sort = '-createdAt', populate = '') {
    return this.model.find(filter).sort(sort).populate(populate);
  }

  async findOne(filter = {}, populate = '') {
    return this.model.findOne(filter).populate(populate);
  }

  async findById(id, populate = '') {
    return this.model.findById(id).populate(populate);
  }

  async create(data) {
    return this.model.create(data);
  }

  async update(id, data) {
    return this.model.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  async delete(id) {
    const doc = await this.model.findById(id);
    if (!doc) return null;
    
    // Check if soft delete is supported via Mongoose plugin
    if (typeof doc.softDelete === 'function') {
      return doc.softDelete();
    }
    return doc.deleteOne();
  }

  async restore(id) {
    const doc = await this.model.findById(id);
    if (doc && typeof doc.restore === 'function') {
      return doc.restore();
    }
    return doc;
  }

  async paginate(filter = {}, options = {}) {
    return paginate(this.model, filter, options);
  }

  async count(filter = {}) {
    return this.model.countDocuments(filter);
  }
}
