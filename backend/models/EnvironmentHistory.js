const mongoose = require('mongoose');

const environmentHistorySchema = new mongoose.Schema({
  environmentName: { type: String, required: true },
  team: { type: String, required: true },
  action: { type: String, enum: ['deploy', 'release'], required: true },
  branch: { type: String, default: null },
  performedBy: { type: String, required: true },
  performedAt: { type: Date, default: Date.now },
  metadata: { type: Object, default: {} }
}, { timestamps: true });

environmentHistorySchema.index({ team: 1, environmentName: 1, performedAt: -1 });

module.exports = mongoose.model('EnvironmentHistory', environmentHistorySchema);
