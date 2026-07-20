import mongoose from 'mongoose';
import softDeletePlugin from '../database/helpers/softDelete.js';

const analyticsSchema = new mongoose.Schema(
  {
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
      index: true,
    },
    metricType: {
      type: String,
      required: true,
      enum: ['source_distribution', 'theme_analysis', 'timeline_overview'],
      index: true,
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    calculationDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

analyticsSchema.plugin(softDeletePlugin);

const Analytics = mongoose.model('Analytics', analyticsSchema);
export default Analytics;
