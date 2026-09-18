import type { Incident } from '@/types/authority';
import type { Shelter } from '@/components/authority/CommandMap';

export interface CitizenAlert {
  id: string;
  title: string;
  type: 'flood' | 'storm' | 'fire' | 'cyclone';
  severity: 'critical' | 'high' | 'medium' | 'low';
  avoidArea: string;
  nearestShelter: string;
  distance: string;
  time: string;
}

export interface CitizenIncident extends Incident {
  distance?: string;
  isOwner?: boolean;
}

export interface CitizenShelter extends Shelter {
  distance?: string;
}

export const CITIZEN_MOCK_INCIDENTS: CitizenIncident[] = [
  {
    _id: 'cit-inc-1',
    title: 'Severe Waterlogging & Drain Overflow',
    description: 'Road impassable near Shivaji Nagar junction due to flash water accumulation.',
    type: 'flood',
    severity: 'critical',
    status: 'assigned',
    isSOS: true,
    location: { type: 'Point', coordinates: [73.854, 18.532] },
    address: 'Near Deccan Corner, Shivaji Nagar',
    state: 'Maharashtra',
    district: 'Pune',
    mediaUrls: [],
    reportedBy: { _id: 'u1', name: 'Citizen Amit', email: 'amit@example.com' },
    verifiedBy: { _id: 'a1', name: 'Pune Emergency Cell' },
    assignedTo: null,
    assignedTeam: null,
    priorityScore: 48,
    isOwner: true,
    distance: '0.8 km',
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'cit-inc-2',
    title: 'Transformer Spark & Commercial Fire',
    description: 'Small commercial facade fire with thick smoke. Fire squad mobilized.',
    type: 'fire',
    severity: 'high',
    status: 'in_progress',
    isSOS: false,
    location: { type: 'Point', coordinates: [73.818, 18.508] },
    address: 'Near City Pride, Kothrud',
    state: 'Maharashtra',
    district: 'Pune',
    mediaUrls: [],
    reportedBy: { _id: 'u2', name: 'Pooja K.', email: 'pooja@example.com' },
    verifiedBy: { _id: 'a1', name: 'Pune Emergency Cell' },
    assignedTo: null,
    assignedTeam: null,
    priorityScore: 35,
    distance: '1.6 km',
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'cit-inc-3',
    title: 'Uprooted Trees & Road Blockade',
    description: 'Heavy gales caused two large banyan branches to fall across main transit route.',
    type: 'other',
    severity: 'medium',
    status: 'verified',
    isSOS: false,
    location: { type: 'Point', coordinates: [73.876, 18.521] },
    address: 'East Street, Camp Area',
    state: 'Maharashtra',
    district: 'Pune',
    mediaUrls: [],
    reportedBy: { _id: 'u3', name: 'Vikram S.', email: 'vikram@example.com' },
    verifiedBy: { _id: 'a1', name: 'Pune Emergency Cell' },
    assignedTo: null,
    assignedTeam: null,
    priorityScore: 24,
    distance: '2.4 km',
    createdAt: new Date(Date.now() - 110 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'cit-inc-4',
    title: 'River Embankment Seepage Alert',
    description: 'Mutha river level approaching danger mark near riverside road promenade.',
    type: 'flood',
    severity: 'low',
    status: 'reported',
    isSOS: false,
    location: { type: 'Point', coordinates: [73.842, 18.514] },
    address: 'Alka Talkies Chowk, Riverside',
    state: 'Maharashtra',
    district: 'Pune',
    mediaUrls: [],
    reportedBy: { _id: 'u4', name: 'Sanjay M.', email: 'sanjay@example.com' },
    verifiedBy: null,
    assignedTo: null,
    assignedTeam: null,
    priorityScore: 16,
    distance: '3.1 km',
    createdAt: new Date(Date.now() - 180 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const CITIZEN_MOCK_SHELTERS: CitizenShelter[] = [
  {
    _id: 'cit-sh-1',
    name: 'Shivaji Nagar Multipurpose Relief Camp',
    state: 'Maharashtra',
    district: 'Pune',
    address: 'Behind Deccan Gymkhana Ground',
    capacity: 500,
    occupancy: 230,
    status: 'open',
    location: { type: 'Point', coordinates: [73.846, 18.524] },
    contactPhone: '+91 20 2553 4100',
    distance: '0.9 km',
  },
  {
    _id: 'cit-sh-2',
    name: 'Kothrud Municipal School Emergency Shelter',
    state: 'Maharashtra',
    district: 'Pune',
    address: 'Paud Road, Near Kothrud Depot',
    capacity: 350,
    occupancy: 110,
    status: 'open',
    location: { type: 'Point', coordinates: [73.808, 18.504] },
    contactPhone: '+91 20 2544 8900',
    distance: '1.8 km',
  },
  {
    _id: 'cit-sh-3',
    name: 'Cantonment Hall & Community Shelter #14',
    state: 'Maharashtra',
    district: 'Pune',
    address: 'East Street, Camp, Pune',
    capacity: 650,
    occupancy: 610,
    status: 'open',
    location: { type: 'Point', coordinates: [73.882, 18.516] },
    contactPhone: '+91 20 2636 1200',
    distance: '2.5 km',
  },
];

export const CITIZEN_MOCK_ALERTS: CitizenAlert[] = [
  {
    id: 'alt-1',
    title: 'Critical Flood & Inundation Warning',
    type: 'flood',
    severity: 'critical',
    avoidArea: 'JM Road → Deccan Riverside Promenade',
    nearestShelter: 'Shivaji Nagar Multipurpose Relief Camp (0.9 km)',
    distance: '0.9 km',
    time: 'Issued 20 mins ago',
  },
];
