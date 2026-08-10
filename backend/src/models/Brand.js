import mongoose from 'mongoose';
import softDeletePlugin from '../database/helpers/softDelete.js';

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a brand name'],
      trim: true,
      index: true,
    },
    keywords: {
      type: [String],
      required: [true, 'Please provide at least one keyword for monitoring'],
      validate: {
        validator: function (v) {
          return v && v.length > 0;
        },
        message: 'A brand must have at least one keyword.',
      },
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    industry: {
      type: String,
      trim: true,
      default: 'E-commerce',
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    city: {
      type: String,
      required: [true, 'Please provide a city'],
      trim: true,
      default: 'Delhi',
      index: true,
    },
    state: {
      type: String,
      required: [true, 'Please provide a state'],
      trim: true,
      default: 'Delhi',
      index: true,
    },
    region: {
      type: String,
      required: [true, 'Please provide a region'],
      trim: true,
      default: 'North India',
      index: true,
    },
    country: {
      type: String,
      trim: true,
      default: 'India',
      index: true,
    },
    language: {
      type: String,
      default: 'Hindi',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

brandSchema.plugin(softDeletePlugin);

// Virtual field for mentions under this brand
brandSchema.virtual('mentions', {
  ref: 'BrandMention',
  localField: '_id',
  foreignField: 'brand',
});

const Brand = mongoose.model('Brand', brandSchema);
export default Brand;
