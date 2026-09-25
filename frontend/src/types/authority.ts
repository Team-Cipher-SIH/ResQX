// ─── Authority User Types ───

export type AuthorityLevel =
  | 'central'
  | 'state_admin'
  | 'district_admin'
  | 'field_responder'
  | 'department';

export interface UserSession {
  _id: string;
  name: string;
  email: string;
  role: 'citizen' | 'authority' | 'admin';
  authorityLevel?: AuthorityLevel | null;
  state?: string | null;
  district?: string | null;
  jurisdictionState?: string | null;
  jurisdictionDistrict?: string | null;
  department?: string | null;
  phone?: string | null;
}

export interface AuthorityUser {
  _id: string;
  name: string;
  email: string;
  role: 'authority' | 'admin';
  authorityLevel: AuthorityLevel | null;
  state: string | null;
  district: string | null;
  department: string | null;
  phone: string | null;
  address: string | null;
  isAvailable: boolean;
  currentLocation?: {
    type: 'Point';
    coordinates: [number, number];
  };
  createdAt: string;
  updatedAt: string;
}

// ─── Incident Types ───

export type IncidentType = 'flood' | 'fire' | 'earthquake' | 'landslide' | 'cyclone' | 'other';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'reported' | 'verified' | 'assigned' | 'in_progress' | 'resolved' | 'closed';

export interface AIIncidentAnalysis {
  status?: 'pending' | 'completed' | 'failed' | 'unavailable';
  isEmergency?: boolean;
  emergencyRelevanceReason?: string | null;
  classifiedType?: string | null;
  predictedType?: string | null;
  aiSeverity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  predictedSeverity?: string | null;
  aiPriority?: 'P1' | 'P2' | 'P3' | 'P4' | null;
  recommendedTeam?: string | null;
  aiSummary?: string | null;
  summary?: string | null;
  authenticity?: 'LIKELY_GENUINE' | 'SUSPICIOUS_OR_PRANK' | 'NEEDS_PHYSICAL_VERIFICATION' | null;
  credibilityScore?: number | null;
  confidence?: number | null;
  reasoning?: string | null;
  recommendedAction?: string | null;
  suggestedUnit?: string | null;
  analyzedAt?: string | null;
}

export interface RelatedIncidentInfo {
  clusterId?: string;
  relatedIncidentIds?: string[];
  similarityScore?: number;
  reason?: string;
}

export interface Incident {
  _id: string;
  title: string;
  description: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  isSOS: boolean;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  address: string;
  state: string;
  district: string;
  mediaUrls: string[];
  reportedBy: string | { _id: string; name: string; email: string; phone?: string };
  verifiedBy: string | { _id: string; name: string } | null;
  verifiedAt?: string;
  assignedTo: string | { _id: string; name: string } | null;
  assignedTeam: string | ResponseTeam | null;
  assignedDepartment?: string | null;
  priorityScore: number;
  aiAnalysis?: AIIncidentAnalysis | null;
  // Deduplication & Clustering attributes
  clusterId?: string | null;
  relatedIncidentIds?: string[] | null;
  similarityScore?: number | null;
  duplicateReason?: string | null;
  statusHistory?: StatusHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface StatusHistoryEntry {
  status: string;
  timestamp: string;
  updatedBy?: string | { _id: string; name: string };
  note?: string;
}

// ─── Response Team Types ───

export type TeamType = 'medical' | 'fire' | 'rescue' | 'flood' | 'general' | 'police' | 'hazmat';
export type TeamStatus = 'available' | 'busy' | 'offline';

export interface ResponseTeam {
  _id: string;
  name: string;
  type: TeamType;
  state: string;
  district: string;
  members: Array<{ _id: string; name: string; email: string; phone?: string }>;
  leader: { _id: string; name: string; email: string } | null;
  capabilities: string[];
  status: TeamStatus;
  currentLocation: {
    type: 'Point';
    coordinates: [number, number];
  };
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Dispatch Types ───

export type DispatchStatus =
  | 'pending'
  | 'accepted'
  | 'en_route'
  | 'on_site'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface Dispatch {
  _id: string;
  incident: Incident | string;
  team: ResponseTeam | string;
  assignedBy: { _id: string; name: string } | string;
  status: DispatchStatus;
  statusHistory: StatusHistoryEntry[];
  notes: string;
  state: string;
  district: string;
  dispatchedAt: string;
  acceptedAt: string | null;
  arrivedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Activity Log Types ───

export type ActivityAction =
  | 'incident_reported'
  | 'incident_verified'
  | 'incident_assigned'
  | 'incident_status_updated'
  | 'incident_resolved'
  | 'incident_closed'
  | 'dispatch_created'
  | 'dispatch_accepted'
  | 'dispatch_en_route'
  | 'dispatch_on_site'
  | 'dispatch_in_progress'
  | 'dispatch_completed'
  | 'team_created'
  | 'team_status_changed'
  | 'alert_created'
  | 'alert_deactivated'
  | 'responder_status_changed'
  | 'sos_triggered';

export interface ActivityLogEntry {
  _id: string;
  action: ActivityAction;
  description: string;
  performedBy: { _id: string; name: string } | string;
  incident?: { _id: string; title: string } | string | null;
  dispatch?: string | null;
  team?: { _id: string; name: string } | string | null;
  state: string | null;
  district: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─── Dashboard Types ───

export interface DashboardStats {
  activeIncidents: number;
  criticalIncidents: number;
  pendingVerification: number;
  dispatchedIncidents: number;
  activeResponseTeams: number;
  resolvedToday: number;
  totalIncidents: number;
  inProgressIncidents: number;
}

export interface DistrictOverview {
  district: string;
  state: string;
  activeIncidents: number;
  criticalIncidents: number;
  respondersAvailable: number;
  unresolvedIncidents: number;
  totalTeams: number;
}

// ─── Alert Types ───

export type AlertType = 'warning' | 'watch' | 'advisory';

export interface Alert {
  _id: string;
  title: string;
  message: string;
  type: AlertType;
  severity: IncidentSeverity;
  affectedStates: string[];
  affectedDistricts: string[];
  issuedBy: { _id: string; name: string } | string;
  startTime: string;
  endTime: string | null;
  source?: 'manual' | 'ai_risk_prediction' | 'citizen_report'; 
  status?: 'draft' | 'issued' | 'expired';
  sourceRiskAssessment?: string | null; 
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Priority Helpers ───

export type PriorityLevel = 'P0' | 'P1' | 'P2' | 'P3';

export function getPriorityLevel(score: number): PriorityLevel {
  if (score >= 40) return 'P0';
  if (score >= 30) return 'P1';
  if (score >= 20) return 'P2';
  return 'P3';
}

export function getPriorityLabel(level: PriorityLevel): string {
  switch (level) {
    case 'P0': return 'Critical';
    case 'P1': return 'High';
    case 'P2': return 'Medium';
    case 'P3': return 'Low';
  }
}

export function getPriorityColor(level: PriorityLevel): string {
  switch (level) {
    case 'P0': return 'text-red-700 bg-red-50 border-red-200';
    case 'P1': return 'text-orange-700 bg-orange-50 border-orange-200';
    case 'P2': return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'P3': return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}

export function getSeverityColor(severity: IncidentSeverity): string {
  switch (severity) {
    case 'critical': return 'text-red-700 bg-red-50 border-red-200';
    case 'high': return 'text-orange-700 bg-orange-50 border-orange-200';
    case 'medium': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    case 'low': return 'text-green-700 bg-green-50 border-green-200';
  }
}

export function getStatusColor(status: IncidentStatus): string {
  switch (status) {
    case 'reported': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    case 'verified': return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'assigned': return 'text-indigo-700 bg-indigo-50 border-indigo-200';
    case 'in_progress': return 'text-purple-700 bg-purple-50 border-purple-200';
    case 'resolved': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'closed': return 'text-slate-600 bg-slate-100 border-slate-200';
  }
}

export function getDispatchStatusColor(status: DispatchStatus): string {
  switch (status) {
    case 'pending': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    case 'accepted': return 'text-blue-700 bg-blue-50 border-blue-200';
    case 'en_route': return 'text-indigo-700 bg-indigo-50 border-indigo-200';
    case 'on_site': return 'text-purple-700 bg-purple-50 border-purple-200';
    case 'in_progress': return 'text-orange-700 bg-orange-50 border-orange-200';
    case 'completed': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'cancelled': return 'text-red-700 bg-red-50 border-red-200';
  }
}

export function getTeamStatusColor(status: TeamStatus): string {
  switch (status) {
    case 'available': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    case 'busy': return 'text-orange-700 bg-orange-50 border-orange-200';
    case 'offline': return 'text-slate-600 bg-slate-100 border-slate-200';
  }
}

// ─── Shelter & Relief Types ───

export type ShelterStatus = 'open' | 'near_capacity' | 'full' | 'inactive';

export interface Shelter {
  _id: string;
  name: string;
  address?: string;
  state: string;
  district: string;
  capacity: number;
  currentOccupancy?: number;
  occupancy?: number; // legacy alias
  contactNumber?: string | null;
  contactPhone?: string | null; // legacy alias
  isActive?: boolean;
  status?: ShelterStatus;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  createdBy?: string | { _id: string; name: string };
  createdAt?: string;
  updatedAt?: string;
}

export function getShelterStatus(shelter: { capacity: number; currentOccupancy?: number; occupancy?: number; isActive?: boolean }): ShelterStatus {
  if (shelter.isActive === false) return 'inactive';
  const occ = shelter.currentOccupancy !== undefined ? shelter.currentOccupancy : (shelter.occupancy || 0);
  const cap = shelter.capacity || 0;
  if (cap <= 0) return 'open';
  const pct = (occ / cap) * 100;
  if (pct >= 100) return 'full';
  if (pct >= 85) return 'near_capacity';
  return 'open';
}

export function getShelterStatusColor(status: ShelterStatus): string {
  switch (status) {
    case 'open':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'near_capacity':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'full':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'inactive':
      return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

export function getShelterStatusLabel(status: ShelterStatus): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'near_capacity':
      return 'Near Capacity';
    case 'full':
      return 'Full';
    case 'inactive':
      return 'Inactive';
  }
}

// ─── Supply & Inventory Types ───

export type SupplyCategory =
  | 'Water'
  | 'Food'
  | 'Medicine'
  | 'First Aid'
  | 'Blankets'
  | 'Tents'
  | 'Clothing'
  | 'Hygiene'
  | 'Baby Care'
  | 'Other';

export type SupplyStatus = 'AVAILABLE' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';

export interface Supply {
  _id: string;
  name: string;
  category: SupplyCategory;
  shelter: string | Shelter;
  state: string;
  district: string;
  quantity: number;
  unit: string;
  minimumStock: number;
  status: SupplyStatus;
  isAvailable: boolean;
  lastUpdated?: string;
  updatedBy?: string | { _id: string; name: string; email?: string };
  createdBy?: string | { _id: string; name: string; email?: string };
  createdAt?: string;
  updatedAt?: string;
}

export function computeSupplyStatus(quantity: number, minimumStock: number): SupplyStatus {
  const q = Number(quantity) || 0;
  const min = Number(minimumStock) || 0;
  if (q <= 0) return 'OUT_OF_STOCK';
  if (q <= min) return 'CRITICAL';
  if (q <= min * 2) return 'LOW';
  return 'AVAILABLE';
}

export function getSupplyStatusColor(status: SupplyStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'LOW':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'CRITICAL':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'OUT_OF_STOCK':
      return 'bg-red-50 text-red-700 border-red-200';
  }
}

export function getSupplyStatusLabel(status: SupplyStatus): string {
  switch (status) {
    case 'AVAILABLE':
      return 'Available';
    case 'LOW':
      return 'Low Stock';
    case 'CRITICAL':
      return 'Critical';
    case 'OUT_OF_STOCK':
      return 'Out of Stock';
  }
}

// ─── Risk Assessment Types ───

export type DisasterRiskType = 'flood' | 'fire' | 'earthquake' | 'landslide' | 'cyclone' | 'other';
export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type RiskSource = 'ai_model' | 'manual' | 'external_feed' | 'citizen_report';

export interface RiskAssessment {
  _id: string;
  disasterType: DisasterRiskType;
  riskScore: number;
  riskLevel: RiskLevel;
  confidence?: number;
  riskFactors?: string[];
  location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
  state: string;
  district: string;
  status: 'active' | 'resolved' | 'superseded';
  source?: RiskSource;
  isVulnerableZone: boolean;
  isStale?: boolean;
  predictedAt: string;
  createdAt: string;
  updatedAt: string;
}

export function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case 'CRITICAL':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'HIGH':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'MODERATE':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'LOW':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }
}

export function getRiskHexColor(score: number): string {
  if (score >= 85) return '#dc2626'; // CRITICAL
  if (score >= 70) return '#ea580c'; // HIGH
  if (score >= 40) return '#f59e0b'; // MODERATE
  return '#10b981'; // LOW
}

// ─── Preparedness Types ───

export type PreparednessStatus = 'well_prepared' | 'moderate' | 'at_risk' | 'critical';
export type SupplyReadinessStatus = 'AVAILABLE' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK' | 'UNKNOWN';

export interface PreparednessMetrics {
  totalShelters: number;
  activeShelters: number;
  totalCapacity: number;
  availableCapacity: number;
  totalTeams: number;
  availableTeams: number;
  activeRiskZones: number;
  highRiskZones: number;
  vulnerableZones: number;
}

export interface PreparednessData {
  state: string | null;
  district: string | null;
  disasterType: string;
  shelterReadiness: number;
  teamsAvailable: number;
  waterStatus: SupplyReadinessStatus;
  medicineStatus: SupplyReadinessStatus;
  foodStatus: SupplyReadinessStatus;
  actions: string[];
  score: number;
  status: PreparednessStatus;
  lastUpdated: string;
  metrics: PreparednessMetrics;
}

export interface DistrictPreparednessBreakdown extends PreparednessData {
  district: string;
}



