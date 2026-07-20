import mongoose from 'mongoose';
import softDeletePlugin from '../database/helpers/softDelete.js';

const refreshTokenSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    token: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isRevoked: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

refreshTokenSchema.plugin(softDeletePlugin);

// Virtual check to verify if token is active/valid
refreshTokenSchema.virtual('isValid').get(function() {
  return !this.isRevoked && new Date() < this.expiresAt;
});

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);
export default RefreshToken;
