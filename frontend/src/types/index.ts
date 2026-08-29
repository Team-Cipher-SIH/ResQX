export interface IncidentStat {
  id: string;
  label: string;
  value: number | string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  color: 'red' | 'orange' | 'blue' | 'emerald';
}

export interface CoreWorkflowPillar {
  id: string;
  number: string;
  title: string;
  description: string;
  iconName: string;
}

export interface WorkflowStep {
  step: number;
  code: 'REPORT' | 'VERIFY' | 'ANALYZE' | 'RESPOND' | 'RESOLVE';
  title: string;
  description: string;
  tag: string;
}

export interface DisasterCategory {
  id: string;
  name: string;
  description: string;
  iconName: string;
  badgeText: string;
  alertLevel: 'Critical' | 'High' | 'Moderate';
}

export interface PlatformFeature {
  id: string;
  title: string;
  description: string;
  iconName: string;
  category: 'Citizen' | 'Authority' | 'System';
}

export interface RoleCapability {
  title: string;
  description: string;
}

export interface RoleInfo {
  role: 'citizen' | 'authority';
  title: string;
  tagline: string;
  badge: string;
  capabilities: RoleCapability[];
  ctaText: string;
  ctaRoute: string;
  primaryColor: string;
}
