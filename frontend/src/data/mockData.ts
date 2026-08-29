import { IncidentStat, CoreWorkflowPillar, WorkflowStep, DisasterCategory, PlatformFeature, RoleInfo } from '@/types';

export const MOCK_SITUATION_STATS: IncidentStat[] = [
  {
    id: 'stat-active',
    label: 'Active Incidents',
    value: 24,
    change: '+3 in last hour',
    trend: 'up',
    color: 'orange',
  },
  {
    id: 'stat-critical',
    label: 'Critical Incidents',
    value: 7,
    change: 'Requires immediate dispatch',
    trend: 'up',
    color: 'red',
  },
  {
    id: 'stat-teams',
    label: 'Response Teams',
    value: 12,
    change: 'Active in field',
    trend: 'neutral',
    color: 'blue',
  },
  {
    id: 'stat-resolved',
    label: 'Resolved Incidents',
    value: 186,
    change: '+14 today',
    trend: 'up',
    color: 'emerald',
  },
];

export const MOCK_CORE_PILLARS: CoreWorkflowPillar[] = [
  {
    id: 'pillar-1',
    number: '01',
    title: 'Disaster Reporting',
    description: 'Citizens can quickly report disasters with critical parameters such as exact geo-location, situational description, severity level, and supporting media uploads.',
    iconName: 'FileText',
  },
  {
    id: 'pillar-2',
    number: '02',
    title: 'Real-Time Monitoring',
    description: 'Authorities can monitor incoming crisis reports live, tracking geographical clusters and changing emergency vectors on interactive situational views.',
    iconName: 'Activity',
  },
  {
    id: 'pillar-3',
    number: '03',
    title: 'Coordinated Response',
    description: 'Authorities can dispatch emergency personnel, assign response teams, track units in transit, and manage resource allocations efficiently.',
    iconName: 'ShieldAlert',
  },
  {
    id: 'pillar-4',
    number: '04',
    title: 'Emergency Alerts',
    description: 'Critical early warnings, broadcast advisories, and area-based evacuation notices are communicated swiftly to affected citizens and local response units.',
    iconName: 'Radio',
  },
];

export const MOCK_WORKFLOW_STEPS: WorkflowStep[] = [
  {
    step: 1,
    code: 'REPORT',
    title: 'Disaster Submission',
    description: 'Citizens submit vital disaster details including verified location coordinates, damage type, and photos/videos.',
    tag: 'Public Input',
  },
  {
    step: 2,
    code: 'VERIFY',
    title: 'Report Verification',
    description: 'Disaster management officers review and validate incoming situational reports to prevent false alarms.',
    tag: 'Triage & Audit',
  },
  {
    step: 3,
    code: 'ANALYZE',
    title: 'Prioritization & AI',
    description: 'System algorithms assist in categorizing risk level, predicting disaster spread, and ranking priority queues.',
    tag: 'Intelligent Ranking',
  },
  {
    step: 4,
    code: 'RESPOND',
    title: 'Team Dispatch',
    description: 'Specialized response units (Fire, Medical, Rescue) are assigned and deployed to designated priority zones.',
    tag: 'Action Mobilized',
  },
  {
    step: 5,
    code: 'RESOLVE',
    title: 'Mitigation & Closure',
    description: 'Authorities track active rescue efforts until safety is secured, logging post-incident resolution reports.',
    tag: 'Mission Complete',
  },
];

export const MOCK_DISASTER_CATEGORIES: DisasterCategory[] = [
  {
    id: 'cat-flood',
    name: 'Flood',
    description: 'Rapid rising water levels, river overflows, and urban flash flooding requiring evacuation and water rescue.',
    iconName: 'Waves',
    badgeText: 'High Priority',
    alertLevel: 'Critical',
  },
  {
    id: 'cat-earthquake',
    name: 'Earthquake',
    description: 'Seismic tremors, structural damage, structural collapses, and ground ruptures requiring urban search and rescue.',
    iconName: 'Zap',
    badgeText: 'Immediate Action',
    alertLevel: 'Critical',
  },
  {
    id: 'cat-cyclone',
    name: 'Cyclone',
    description: 'Severe tropical storms, extreme gale winds, storm surges, and heavy coastal rain hazards.',
    iconName: 'Wind',
    badgeText: 'Weather Warning',
    alertLevel: 'High',
  },
  {
    id: 'cat-wildfire',
    name: 'Wildfire',
    description: 'Rapidly spreading bushfires, forest blazes, and dense smoke hazards threatening settlements.',
    iconName: 'Flame',
    badgeText: 'Containment Ops',
    alertLevel: 'Critical',
  },
  {
    id: 'cat-landslide',
    name: 'Landslide',
    description: 'Mountainous mudslides, rockfalls, and debris flows cutting off road transport and communications.',
    iconName: 'Mountain',
    badgeText: 'Terrain Hazard',
    alertLevel: 'High',
  },
  {
    id: 'cat-storm',
    name: 'Storm',
    description: 'Severe thunderstorms, hail hazards, lightning strikes, and flash wind damage to utility grids.',
    iconName: 'CloudLightning',
    badgeText: 'Advisory Active',
    alertLevel: 'Moderate',
  },
];

export const MOCK_PLATFORM_FEATURES: PlatformFeature[] = [
  {
    id: 'feat-1',
    title: 'Citizen Disaster Reporting',
    description: 'Instant multi-modal reporting with automatic GPS geotagging, threat severity tags, and photo attachment capabilities.',
    iconName: 'Send',
    category: 'Citizen',
  },
  {
    id: 'feat-2',
    title: 'Live Disaster Situation Map',
    description: 'Interactive geospatial overview plotting real-time disaster reports, danger buffer zones, and active rescue units.',
    iconName: 'MapPin',
    category: 'Authority',
  },
  {
    id: 'feat-3',
    title: 'Intelligent Prioritization',
    description: 'Severity matrix and decision-support algorithms that automatically surface life-critical emergencies first.',
    iconName: 'Cpu',
    category: 'System',
  },
  {
    id: 'feat-4',
    title: 'Emergency Broadcasting',
    description: 'Targeted SMS, web notification, and localized alert broadcasts to warn endangered zones instantaneously.',
    iconName: 'BellRing',
    category: 'Citizen',
  },
  {
    id: 'feat-5',
    title: 'Response Coordination',
    description: 'Unified command suite for dispatching multi-agency forces, tracking vehicle routes, and updating task statuses.',
    iconName: 'Users',
    category: 'Authority',
  },
  {
    id: 'feat-6',
    title: 'Disaster Analytics & Post-Mortem',
    description: 'Data analytics tracking response timestamps, resource consumption, and predictive damage assessments.',
    iconName: 'BarChart3',
    category: 'System',
  },
];

export const MOCK_ROLE_CITIZEN: RoleInfo = {
  role: 'citizen',
  title: 'Citizen Portal',
  tagline: 'For Community Safety & Emergency Reporting',
  badge: 'Public Access',
  capabilities: [
    { title: 'Report Disasters', description: 'Submit instant alerts with location pinpointing, incident severity, and media proof.' },
    { title: 'Share Location', description: 'Grant precise GPS coordinates to guide first responders directly to your position.' },
    { title: 'Upload Media', description: 'Attach clear photographic and video evidence of localized damage or hazards.' },
    { title: 'Receive Live Alerts', description: 'Stay informed with emergency warnings and official evacuation guidance for your zone.' },
    { title: 'Track Report Status', description: 'Follow your submitted report status from receipt to verification and dispatch.' },
  ],
  ctaText: 'Citizen Login',
  ctaRoute: '/citizen/login',
  primaryColor: 'emerald',
};

export const MOCK_ROLE_AUTHORITY: RoleInfo = {
  role: 'authority',
  title: 'Authority & First Responder Portal',
  tagline: 'For Incident Command & Emergency Response Teams',
  badge: 'Restricted Access',
  capabilities: [
    { title: 'Monitor Active Incidents', description: 'View and triage incoming disaster signals in a centralized command interface.' },
    { title: 'Geospatial Awareness', description: 'Examine detailed mapping layers showing incident clusters and response vectors.' },
    { title: 'Manage Alerts & Advisories', description: 'Issue high-priority broadcast warnings to endangered populations in real time.' },
    { title: 'Assign Response Teams', description: 'Deploy medical, fire, police, and disaster relief units to urgent locations.' },
    { title: 'Track Logistics & Resources', description: 'Oversee vehicle status, medical stockpiles, and shelter capacity metrics.' },
    { title: 'Incident Resolution Tracking', description: 'Maintain audit trails, timestamp logs, and mission debrief records.' },
  ],
  ctaText: 'Authority Login',
  ctaRoute: '/authority/login',
  primaryColor: 'blue',
};
