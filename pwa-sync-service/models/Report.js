const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  clientReportId: { 
    type: String, 
    required: true, 
    unique: true // Duplicates rokne ke liye unique index
  },
  title: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  location: { 
    type: String, 
    default: "Unknown" 
  },
  offlineCreatedAppTimestamp: { 
    type: String 
  },
  syncedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);