const mongoose = require('mongoose');

const environmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    enum: ['dev4', 'test4']
  },
  status: {
    type: String,
    enum: ['Libre', 'Ocupado'],
    default: 'Libre'
  },
  branch: {
    type: String,
    default: null
  },
  deployedBy: {
    type: String,
    default: null
  },
  deployedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Environment', environmentSchema);
