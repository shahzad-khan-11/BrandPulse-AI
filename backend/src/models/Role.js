import mongoose from 'mongoose';
import softDeletePlugin from '../database/helpers/softDelete.js';
import Permission from './Permission.js';

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
    },
    permissions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Permission',
      },
    ],
  },
  {
    timestamps: true,
  }
);

roleSchema.plugin(softDeletePlugin);

const Role = mongoose.model('Role', roleSchema);
export default Role;
