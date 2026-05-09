const mongoose = require('mongoose');

const environmentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  team: { type: String, required: true },
  status: { type: String, enum: ['Libre', 'Ocupado'], default: 'Libre' },
  branch: { type: String, default: null },
  deployedBy: { type: String, default: null },
  deployedAt: { type: Date, default: null }
}, { timestamps: true });

environmentSchema.index({ name: 1, team: 1 }, { unique: true });

module.exports = mongoose.model('Environment', environmentSchema);
