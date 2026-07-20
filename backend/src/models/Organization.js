import mongoose from 'mongoose';
import softDeletePlugin from '../database/helpers/softDelete.js';

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: [true, 'Organization slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    billingTier: {
      type: String,
      enum: ['free', 'growth', 'enterprise'],
      default: 'free',
    },
  },
  {
    timestamps: true,
  }
);

organizationSchema.plugin(softDeletePlugin);

// Virtual field for brands under this organization (future wiring)
organizationSchema.virtual('brands', {
  ref: 'Brand',
  localField: '_id',
  foreignField: 'organization',
});

const Organization = mongoose.model('Organization', organizationSchema);
export default Organization;
