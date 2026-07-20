import mongoose from 'mongoose';
import softDeletePlugin from '../database/helpers/softDelete.js';

const permissionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Permission name is required'],
      unique: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

permissionSchema.plugin(softDeletePlugin);

const Permission = mongoose.model('Permission', permissionSchema);
export default Permission;
