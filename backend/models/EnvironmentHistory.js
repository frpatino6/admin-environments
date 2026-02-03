const mongoose = require('mongoose');

const environmentHistorySchema = new mongoose.Schema({
  environmentName: {
    type: String,
    required: true,
    enum: ['dev4', 'test4']
  },
  action: {
    type: String,
    enum: ['deploy', 'release'],
    required: true
  },
  branch: {
    type: String,
    default: null
  },
  performedBy: {
    type: String,
    required: true
  },
  performedAt: {
    type: Date,
    default: Date.now
  },
  // Para deploy: quién ocupó
  // Para release: quién liberó
  metadata: {
    type: Object,
    default: {}
  }
}, {
  timestamps: true
});

// Índice para búsquedas rápidas por ambiente
environmentHistorySchema.index({ environmentName: 1, performedAt: -1 });

module.exports = mongoose.model('EnvironmentHistory', environmentHistorySchema);
