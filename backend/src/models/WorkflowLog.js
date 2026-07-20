import mongoose from 'mongoose';
import softDeletePlugin from '../database/helpers/softDelete.js';

const workflowLogSchema = new mongoose.Schema(
  {
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
      index: true,
    },
    workflowType: {
      type: String,
      required: true,
      enum: ['sync_mentions', 'ai_enrichment', 'n8n_webhook_dispatch'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'running', 'completed', 'failed'],
      default: 'pending',
      index: true,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

workflowLogSchema.plugin(softDeletePlugin);

const WorkflowLog = mongoose.model('WorkflowLog', workflowLogSchema);
export default WorkflowLog;
