import mongoose from 'mongoose';

const trustedDeviceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    deviceHash: {
      type: String,
      required: true,
      index: true,
    },
    deviceName: {
      type: String,
      default: 'Unknown Device',
    },
    browser: {
      type: String,
      default: '',
    },
    os: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    lastUsedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const TrustedDevice = mongoose.model('TrustedDevice', trustedDeviceSchema);
export default TrustedDevice;
