const mongoose = require('mongoose');

const rejectionSchema = new mongoose.Schema({
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'QaMember', required: true },
  reason: { type: String, required: true },
  rejectedAt: { type: Date, default: Date.now }
}, { _id: false });

const qaRequestSchema = new mongoose.Schema({
  jiraKey: { type: String, required: true, trim: true },
  jiraSummary: { type: String, required: true, trim: true },
  jiraUrl: { type: String, default: null },
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'QaMember', required: true },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'QaMember', default: null },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'approved', 'changes_requested', 'unassignable'],
    default: 'pending'
  },
  environmentName: { type: String, required: true },
  team: { type: String, required: true },
  rejections: { type: [rejectionSchema], default: [] },
  assignedAt: { type: Date, default: Date.now },
  lastReminderAt: { type: Date, default: null },
  acceptedAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  escalatedCount: { type: Number, default: 0 }
}, { timestamps: true });

qaRequestSchema.index({ environmentName: 1, team: 1, status: 1 });

module.exports = mongoose.model('QaRequest', qaRequestSchema);
