const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { 
    type: String, 
    required: true // e.g., "DISPATCH_ASSIGNED", "RESOURCE_UPDATED", "INCIDENT_RESOLVED"
  },
  performedBy: { 
    type: String, 
    required: true // e.g., "Officer John Doe", "System Auto-Assign", "User ID 102"
  },
  targetResource: { 
    type: String, 
    required: true // e.g., "Medical Team Alpha", "Incident #402"
  },
  severity: { 
    type: String, 
    enum: ['Info', 'Warning', 'Critical'], 
    default: 'Info' 
  },
  details: { 
    type: String // Extra notes or system context about the event
  },
  ipAddress: { 
    type: String // Client or system IP recording the log
  }
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', auditLogSchema);