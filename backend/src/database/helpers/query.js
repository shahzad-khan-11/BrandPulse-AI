/**
 * Database Query Helper Utilities
 * Provides reusable functions for pagination, searching, sorting, and filtering Mongoose query chains.
 */

/**
 * Executes a query with pagination and returns structured pagination metadata.
 * 
 * @param {object} mongooseModel The Mongoose model to query
 * @param {object} filter Mongoose filter query object
 * @param {object} options Pagination options (page, limit, populate, sort)
 * @returns {Promise<object>} Paginated results and metadata
 */
export const paginate = async (mongooseModel, filter = {}, options = {}) => {
  const page = Math.max(1, parseInt(options.page, 10) || 1);
  const limit = Math.max(1, parseInt(options.limit, 10) || 10);
  const skip = (page - 1) * limit;

  let query = mongooseModel.find(filter);

  // Apply sorting
  if (options.sort) {
    const sortBy = options.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt'); // Default sort
  }

  // Apply population fields
  if (options.populate) {
    if (Array.isArray(options.populate)) {
      options.populate.forEach(p => {
        query = query.populate(p);
      });
    } else {
      query = query.populate(options.populate);
    }
  }

  // Apply select fields
  if (options.select) {
    const fields = options.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Execute queries in parallel
  const [data, total] = await Promise.all([
    query.skip(skip).limit(limit).exec(),
    mongooseModel.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Builds a search query filter object using regex matches across specified fields.
 * 
 * @param {string} searchString The text to search for
 * @param {string[]} fields Array of schema fields to apply the search on
 * @returns {object} Mongoose search condition query object
 */
export const buildSearchQuery = (searchString, fields = []) => {
  if (!searchString || fields.length === 0) return {};

  const searchConditions = fields.map(field => ({
    [field]: { $regex: searchString, $options: 'i' },
  }));

  return { $or: searchConditions };
};

/**
 * Parses URL query parameters to construct clean MongoDB filter queries.
 * Excludes reserved query parameters (page, limit, sort, fields, search).
 * 
 * @param {object} reqQuery Express req.query object
 * @returns {object} Cleaned filter query object
 */
export const parseFilterQuery = (reqQuery) => {
  const queryObj = { ...reqQuery };
  const excludedFields = ['page', 'limit', 'sort', 'fields', 'search'];
  
  excludedFields.forEach(el => delete queryObj[el]);

  // Support advanced filtering operators (gte, gt, lte, lt, ne, in)
  let queryStr = JSON.stringify(queryObj);
  queryStr = queryStr.replace(/\b(gte|gt|lte|lt|ne|in)\b/g, match => `$${match}`);

  return JSON.parse(queryStr);
};
