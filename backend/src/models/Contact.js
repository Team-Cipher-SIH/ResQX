const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    required: true,
    enum: ['Medical', 'Police', 'Fire', 'NDRF', 'Shelter', 'Disaster Control'] 
  },
  region: { 
    type: String, 
    required: true 
  },
  phoneNumbers: [{ 
    type: String, 
    required: true 
  }],
  priorityLevel: { 
    type: Number, 
    default: 3 // 1 = Highest Priority (e.g. National 112), 3 = Standard
  },
  coordinates: {
    latitude: { type: Number },
    longitude: { type: Number }
  }
}, { timestamps: true });

module.exports = mongoose.model('Contact', contactSchema);