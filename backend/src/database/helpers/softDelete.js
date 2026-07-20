/**
 * Mongoose Soft Delete Plugin
 * Adds isDeleted and deletedAt fields, and hooks into standard find/count queries
 * to filter out soft-deleted documents by default.
 */
const softDeletePlugin = (schema) => {
  schema.add({
    isDeleted: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  });

  // Query helper methods
  schema.methods.softDelete = async function() {
    this.isDeleted = true;
    this.deletedAt = new Date();
    return this.save();
  };

  schema.methods.restore = async function() {
    this.isDeleted = false;
    this.deletedAt = null;
    return this.save();
  };

  // Middleware to filter out deleted documents on standard queries
  const filterDeleted = function(next) {
    const filters = this.getFilter();
    if (filters.isDeleted === undefined) {
      this.where({ isDeleted: false });
    }
    next();
  };

  schema.pre('find', filterDeleted);
  schema.pre('findOne', filterDeleted);
  schema.pre('findOneAndUpdate', filterDeleted);
  schema.pre('countDocuments', filterDeleted);
};

export default softDeletePlugin;
