const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  displayName: { type: String, required: true, trim: true },
  environments: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);
