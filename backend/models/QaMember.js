const mongoose = require('mongoose');

const qaMemberSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slackUserId: { type: String, required: true, trim: true },
  team: { type: String, required: true, lowercase: true, trim: true },
  active: { type: Boolean, default: true },
  lastAssignedAt: { type: Date, default: null }
}, { timestamps: true });

// buildCandidates always queries by {team, active} together — see
// backend/services/qaRequestsService.js.
qaMemberSchema.index({ team: 1, active: 1 });

module.exports = mongoose.model('QaMember', qaMemberSchema);
