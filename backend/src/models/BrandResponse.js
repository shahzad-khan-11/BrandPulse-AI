import mongoose from 'mongoose';

const brandResponseSchema = new mongoose.Schema(
  {
    mention: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BrandMention',
      required: true,
      index: true,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    platform: {
      type: String,
      default: 'web',
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'APPROVED', 'SENT', 'FAILED'],
      default: 'DRAFT',
      index: true,
    },
    sentAt: {
      type: Date,
      default: null,
    },
    error: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const BrandResponse = mongoose.model('BrandResponse', brandResponseSchema);
export default BrandResponse;
