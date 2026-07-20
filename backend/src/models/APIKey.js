import mongoose from 'mongoose';
import softDeletePlugin from '../database/helpers/softDelete.js';

const apiKeySchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    keyPrefix: {
      type: String,
      required: true,
    },
    hashedKey: {
      type: String,
      required: true,
      select: false, // Do not expose by default
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    lastUsedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

apiKeySchema.plugin(softDeletePlugin);

const APIKey = mongoose.model('APIKey', apiKeySchema);
export default APIKey;
