import mongoose from 'mongoose';
import softDeletePlugin from '../database/helpers/softDelete.js';

const sentimentSchema = new mongoose.Schema(
  {
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    averageScore: {
      type: Number,
      required: true,
      default: 0.0,
    },
    positiveCount: {
      type: Number,
      required: true,
      default: 0,
    },
    neutralCount: {
      type: Number,
      required: true,
      default: 0,
    },
    negativeCount: {
      type: Number,
      required: true,
      default: 0,
    },
    totalCount: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

sentimentSchema.plugin(softDeletePlugin);

// Compound index for unique daily aggregates per brand
sentimentSchema.index({ brand: 1, date: -1 }, { unique: true });

const Sentiment = mongoose.model('Sentiment', sentimentSchema);
export default Sentiment;
