import mongoose from 'mongoose';
import softDeletePlugin from '../database/helpers/softDelete.js';

const reportSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Report name is required'],
      trim: true,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
      index: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
    fileUrl: {
      type: String,
      trim: true,
    },
    summary: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

reportSchema.plugin(softDeletePlugin);

const Report = mongoose.model('Report', reportSchema);
export default Report;
