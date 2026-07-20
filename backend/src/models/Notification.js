import mongoose from 'mongoose';
import softDeletePlugin from '../database/helpers/softDelete.js';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipient: { // Maintain backward compatibility
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ['ai', 'report', 'monitoring', 'threat', 'sentiment', 'workspace', 'authentication', 'system'],
      default: 'system',
    },
    priority: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW', 'INFO'],
      default: 'INFO',
    },
    icon: {
      type: String,
    },
    actionUrl: {
      type: String,
    },
    isRead: {
      type: Boolean,
      required: true,
      default: false,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.plugin(softDeletePlugin);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
