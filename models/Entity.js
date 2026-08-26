const mongoose = require('mongoose');

const entitySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true // e.g., "District Fire Station - Zone 4"
  },
  type: { 
    type: String, 
    required: true,
    enum: ['Department', 'Field Responder', 'NGO', 'Medical Team'] 
  },
  district: { 
    type: String, 
    required: true // Used for jurisdiction/district filtering
  },
  contactPerson: { 
    type: String 
  },
  phone: { 
    type: String, 
    required: true 
  },
  availabilityStatus: { 
    type: String, 
    enum: ['Available', 'Deployed', 'Off-duty'], 
    default: 'Available' 
  },
  activeAssignments: { 
    type: Number, 
    default: 0 
  }
}, { timestamps: true });

module.exports = mongoose.model('Entity', entitySchema);