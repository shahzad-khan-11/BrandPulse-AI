import mongoose from 'mongoose';

const restrictionRecordSchema = new mongoose.Schema(
  {
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
      index: true,
    },
    mention: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BrandMention',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actionType: {
      type: String,
      enum: ['RESTRICT_CONTENT', 'FLAG_AUTHOR', 'INTERNAL_BLOCK'],
      default: 'RESTRICT_CONTENT',
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'SIMULATED', 'REMOVED'],
      default: 'SIMULATED',
      index: true,
    },
    mode: {
      type: String,
      enum: ['LIVE', 'DEMO'],
      default: 'LIVE',
    },
    isDemo: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const RestrictionRecord = mongoose.model('RestrictionRecord', restrictionRecordSchema);
export default RestrictionRecord;
