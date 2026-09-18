'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import {
  Shield,
  Phone,
  Radio,
  Clock,
  Layers,
  MapPin,
  Flame,
  AlertTriangle,
  Waves,
  Eye,
  Send,
  RefreshCw,
  Package,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { MOCK_SHELTERS_DATA } from '@/data/shelterMockData';
import type { Incident, ResponseTeam, Shelter } from '@/types/authority';
import type { CommandMapProps } from './CommandMap';
import PulsingDot from '@/components/ui/PulsingDot';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';

// ─── Comprehensive State Coordinates Dictionary for India ───
const STATE_CENTERS: Record<string, { center: [number, number]; zoom: number }> = {
  'andhra pradesh': { center: [15.9129, 79.74], zoom: 7 },
  'arunachal pradesh': { center: [28.218, 94.7278], zoom: 7 },
  'assam': { center: [26.2006, 92.9376], zoom: 7 },
  'bihar': { center: [25.0961, 85.3131], zoom: 7 },
  'chhattisgarh': { center: [21.2787, 81.8661], zoom: 7 },
  'delhi': { center: [28.6139, 77.209], zoom: 11 },
  'goa': { center: [15.2993, 74.124], zoom: 10 },
  'gujarat': { center: [22.2587, 71.1924], zoom: 7 },
  'haryana': { center: [29.0588, 76.0856], zoom: 8 },
  'himachal pradesh': { center: [31.1048, 77.1734], zoom: 7 },
  'jharkhand': { center: [23.6102, 85.2799], zoom: 7 },
  'karnataka': { center: [15.3173, 75.7139], zoom: 7 },
  'kerala': { center: [10.8505, 76.2711], zoom: 7 },
  'madhya pradesh': { center: [22.9734, 78.6569], zoom: 7 },
  'maharashtra': { center: [19.7515, 75.7139], zoom: 7 },
  'manipur': { center: [24.6637, 93.9063], zoom: 8 },
  'meghalaya': { center: [25.467, 91.3662], zoom: 8 },
  'mizoram': { center: [23.1645, 92.9376], zoom: 8 },
  'nagaland': { center: [26.1584, 94.5624], zoom: 8 },
  'odisha': { center: [20.9517, 85.0985], zoom: 7 },
  'punjab': { center: [31.1471, 75.3412], zoom: 8 },
  'rajasthan': { center: [27.0238, 74.2179], zoom: 7 },
  'sikkim': { center: [27.533, 88.5122], zoom: 9 },
  'tamil nadu': { center: [11.1271, 78.6569], zoom: 7 },
  'telangana': { center: [18.1124, 79.0193], zoom: 7 },
  'tripura': { center: [23.9408, 91.9882], zoom: 8 },
  'uttar pradesh': { center: [26.8467, 80.9462], zoom: 7 },
  'uttarakhand': { center: [30.0668, 79.0193], zoom: 8 },
  'west bengal': { center: [22.9868, 87.855], zoom: 7 },
  'jammu and kashmir': { center: [33.7782, 76.5762], zoom: 7 },
  'ladakh': { center: [34.1526, 77.5771], zoom: 7 },
  'chandigarh': { center: [30.7333, 76.7794], zoom: 12 },
  'puducherry': { center: [11.9416, 79.8083], zoom: 11 },
};

// ─── Major District Coordinates ───
const DISTRICT_CENTERS: Record<string, [number, number]> = {
  // Maharashtra
  'pune': [18.5204, 73.8567],
  'mumbai': [19.076, 72.8777],
  'mumbai city': [18.96, 72.82],
  'mumbai suburban': [19.12, 72.85],
  'nagpur': [21.1458, 79.0882],
  'nashik': [19.9975, 73.7898],
  'thane': [19.2183, 72.9781],
  'aurangabad': [19.8762, 75.3433],
  'kolhapur': [16.705, 74.2433],
  'solapur': [17.6599, 75.9064],
  'amravati': [20.9374, 77.7796],
  'jalgaon': [21.0077, 75.5626],
  'satara': [17.6805, 74.0183],
  'sangli': [16.8524, 74.5815],
  'raigad': [18.5158, 73.1822],
  'ratnagiri': [16.9902, 73.312],

  // Delhi & NCR
  'new delhi': [28.6139, 77.209],
  'central delhi': [28.6453, 77.2128],
  'north delhi': [28.7041, 77.1025],
  'south delhi': [28.4817, 77.1873],
  'east delhi': [28.628, 77.295],
  'west delhi': [28.6669, 77.0689],
  'gurugram': [28.4595, 77.0266],
  'gautam buddh nagar': [28.5355, 77.391],
  'ghaziabad': [28.6692, 77.4538],
  'faridabad': [28.4089, 77.3178],

  // Karnataka
  'bangalore urban': [12.9716, 77.5946],
  'bangalore rural': [13.2847, 77.5583],
  'mysore': [12.2958, 76.6394],
  'belgaum': [15.8497, 74.4977],
  'hubli': [15.3647, 75.124],
  'dharwad': [15.4589, 75.0078],
  'mangalore': [12.9141, 74.856],
  'dakshina kannada': [12.8703, 75.2479],

  // Tamil Nadu
  'chennai': [13.0827, 80.2707],
  'coimbatore': [11.0168, 76.9558],
  'madurai': [9.9252, 78.1198],
  'tiruchirappalli': [10.7905, 78.7047],
  'salem': [11.6643, 78.146],
  'tirunelveli': [8.7139, 77.7567],

  // Telangana & Andhra Pradesh
  'hyderabad': [17.385, 78.4867],
  'rangareddy': [17.2403, 78.4294],
  'warangal urban': [17.9689, 79.5941],
  'visakhapatnam': [17.6868, 83.2185],
  'krishna': [16.1959, 81.1345],
  'guntur': [16.3067, 80.4365],
  'chittoor': [13.2172, 79.1003],

  // West Bengal
  'kolkata': [22.5726, 88.3639],
  'howrah': [22.5958, 88.2636],
  'north 24 parganas': [22.7214, 88.4839],
  'south 24 parganas': [22.1856, 88.5471],
  'darjeeling': [27.041, 88.2663],

  // Uttar Pradesh
  'lucknow': [26.8467, 80.9462],
  'kanpur nagar': [26.4499, 80.3319],
  'varanasi': [25.3176, 82.9739],
  'agra': [27.1767, 78.0081],
  'prayagraj': [25.4358, 81.8463],
  'meerut': [28.9845, 77.7064],
  'bareilly': [28.367, 79.4304],
  'gorakhpur': [26.7606, 83.3732],

  // Gujarat
  'ahmedabad': [23.0225, 72.5714],
  'surat': [21.1702, 72.8311],
  'vadodara': [22.3072, 73.1812],
  'rajkot': [22.3039, 70.8022],

  // Rajasthan
  'jaipur': [26.9124, 75.7873],
  'jodhpur': [26.2389, 73.0243],
  'udaipur': [24.5854, 73.7125],
  'kota': [25.2138, 75.8648],

  // Kerala
  'thiruvananthapuram': [8.5241, 76.9366],
  'ernakulam': [9.9816, 76.2999],
  'kozhikode': [11.2588, 75.7804],
  'wayanad': [11.6854, 76.132],
  'kannur': [11.8745, 75.3704],

  // Bihar
  'patna': [25.5941, 85.1376],
  'gaya': [24.7914, 85.0002],
  'muzaffarpur': [26.1209, 85.3647],

  // Madhya Pradesh
  'bhopal': [23.2599, 77.4126],
  'indore': [22.7196, 75.8577],
  'jabalpur': [23.1815, 79.9864],
  'gwalior': [26.2183, 78.1828],

  // Odisha
  'khordha': [20.1809, 85.6212],
  'cuttack': [20.4625, 85.8828],
  'puri': [19.8135, 85.8312],

  // Assam
  'kamrup metropolitan': [26.1445, 91.7362],
  'dibrugarh': [27.4728, 94.912],
};

// ─── Default Fallback Mock Data ───
const FALLBACK_INCIDENTS: Incident[] = [
  {
    _id: 'inc-pune-1',
    title: 'Flash Flood & Embankment Overflow',
    description: 'Mutha river basin flooding low lying residential sectors near Deccan.',
    type: 'flood',
    severity: 'critical',
    status: 'assigned',
    isSOS: true,
    location: { type: 'Point', coordinates: [73.8567, 18.5314] },
    address: 'JM Road, Shivaji Nagar',
    state: 'Maharashtra',
    district: 'Pune',
    mediaUrls: [],
    reportedBy: { _id: 'u1', name: 'Citizen Amit', email: 'amit@example.com' },
    verifiedBy: { _id: 'a1', name: 'Pune Command' },
    assignedTo: null,
    assignedTeam: 'team-pune-1',
    priorityScore: 48,
    createdAt: new Date(Date.now() - 30 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'inc-pune-2',
    title: 'Commercial Substation Fire Outbreak',
    description: 'Transformer fire causing heavy smoke in commercial hub.',
    type: 'fire',
    severity: 'high',
    status: 'in_progress',
    isSOS: false,
    location: { type: 'Point', coordinates: [73.8143, 18.5074] },
    address: 'Karve Road, Kothrud',
    state: 'Maharashtra',
    district: 'Pune',
    mediaUrls: [],
    reportedBy: { _id: 'u2', name: 'Pooja K.', email: 'pooja@example.com' },
    verifiedBy: { _id: 'a1', name: 'Pune Command' },
    assignedTo: null,
    assignedTeam: 'team-pune-2',
    priorityScore: 35,
    createdAt: new Date(Date.now() - 60 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'inc-mum-1',
    title: 'Coastal High Tide Inundation',
    description: 'Promenade waterlogging and storm surges near coastal roads.',
    type: 'cyclone',
    severity: 'high',
    status: 'verified',
    isSOS: false,
    location: { type: 'Point', coordinates: [72.8258, 18.922] },
    address: 'Colaba Waterfront, Mumbai',
    state: 'Maharashtra',
    district: 'Mumbai',
    mediaUrls: [],
    reportedBy: { _id: 'u3', name: 'Rahul V.', email: 'rahul@example.com' },
    verifiedBy: { _id: 'a2', name: 'State Command' },
    assignedTo: null,
    assignedTeam: null,
    priorityScore: 38,
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'inc-delhi-1',
    title: 'Hospital Emergency Grid Blackout',
    description: 'Basement transformer failure requiring immediate mobile backup units.',
    type: 'other',
    severity: 'critical',
    status: 'assigned',
    isSOS: true,
    location: { type: 'Point', coordinates: [77.209, 28.6139] },
    address: 'Ring Road, New Delhi',
    state: 'Delhi',
    district: 'New Delhi',
    mediaUrls: [],
    reportedBy: { _id: 'u4', name: 'Dr. Mehra', email: 'mehra@example.com' },
    verifiedBy: { _id: 'a3', name: 'Central Command' },
    assignedTo: null,
    assignedTeam: null,
    priorityScore: 46,
    createdAt: new Date(Date.now() - 20 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'inc-blr-1',
    title: 'Urban Waterlogging at Tech Hub Junction',
    description: 'Drainage overflow causing extensive vehicle stranding on Outer Ring Road.',
    type: 'flood',
    severity: 'medium',
    status: 'reported',
    isSOS: false,
    location: { type: 'Point', coordinates: [77.6848, 12.9279] },
    address: 'Bellandur EcoSpace, Bengaluru',
    state: 'Karnataka',
    district: 'Bangalore Urban',
    mediaUrls: [],
    reportedBy: { _id: 'u5', name: 'Kiran S.', email: 'kiran@example.com' },
    verifiedBy: null,
    assignedTo: null,
    assignedTeam: null,
    priorityScore: 22,
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const FALLBACK_TEAMS: ResponseTeam[] = [
  {
    _id: 'team-pune-1',
    name: 'NDRF 5th Battalion Unit Alpha',
    type: 'flood',
    state: 'Maharashtra',
    district: 'Pune',
    members: [{ _id: 'm1', name: 'Insp. Deshmukh', email: 'd@resqtech.gov.in', phone: '+91 98230 11223' }],
    leader: { _id: 'm1', name: 'Insp. Deshmukh', email: 'd@resqtech.gov.in' },
    capabilities: ['flood_rescue', 'inflatable_boats', 'diving', 'first_aid'],
    status: 'busy',
    currentLocation: { type: 'Point', coordinates: [73.854, 18.528] },
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'team-pune-2',
    name: 'Pune Fire & Hazmat Unit 02',
    type: 'fire',
    state: 'Maharashtra',
    district: 'Pune',
    members: [{ _id: 'm2', name: 'Capt. R. Pawar', email: 'pawar@resqtech.gov.in', phone: '+91 98221 44556' }],
    leader: { _id: 'm2', name: 'Capt. R. Pawar', email: 'pawar@resqtech.gov.in' },
    capabilities: ['hazmat', 'fire_suppression', 'hydraulic_cutters'],
    status: 'available',
    currentLocation: { type: 'Point', coordinates: [73.818, 18.509] },
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'team-pune-3',
    name: 'SDRF Medical & Triage Corps',
    type: 'medical',
    state: 'Maharashtra',
    district: 'Pune',
    members: [{ _id: 'm3', name: 'Dr. S. Kulkarni', email: 'kulkarni@resqtech.gov.in', phone: '+91 94220 77889' }],
    leader: { _id: 'm3', name: 'Dr. S. Kulkarni', email: 'kulkarni@resqtech.gov.in' },
    capabilities: ['mobile_icu', 'trauma_triage', 'airlift_support'],
    status: 'available',
    currentLocation: { type: 'Point', coordinates: [73.868, 18.522] },
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'team-mum-1',
    name: 'Mumbai Coastal Rescue Unit',
    type: 'rescue',
    state: 'Maharashtra',
    district: 'Mumbai',
    members: [{ _id: 'm4', name: 'Officer Sawant', email: 'sawant@resqtech.gov.in' }],
    leader: { _id: 'm4', name: 'Officer Sawant', email: 'sawant@resqtech.gov.in' },
    capabilities: ['coastal_search', 'speedboats', 'night_vision'],
    status: 'available',
    currentLocation: { type: 'Point', coordinates: [72.83, 18.93] },
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    _id: 'team-delhi-1',
    name: 'Delhi Emergency Response Battalion',
    type: 'general',
    state: 'Delhi',
    district: 'New Delhi',
    members: [{ _id: 'm5', name: 'Cmdr. R. Verma', email: 'verma@resqtech.gov.in' }],
    leader: { _id: 'm5', name: 'Cmdr. R. Verma', email: 'verma@resqtech.gov.in' },
    capabilities: ['power_grids', 'structural_stabilization'],
    status: 'busy',
    currentLocation: { type: 'Point', coordinates: [77.215, 28.618] },
    createdBy: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const FALLBACK_SHELTERS: Shelter[] = MOCK_SHELTERS_DATA;

// ─── Custom DivIcons ───
const createIncidentIcon = (severity: Incident['severity'], isCritical: boolean, isSOS?: boolean) => {
  const color =
    severity === 'critical' ? '#dc2626' : severity === 'high' ? '#ea580c' : severity === 'medium' ? '#d97706' : '#2563eb';

  return L.divIcon({
    className: 'custom-incident-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;">
        ${
          isCritical || isSOS
            ? `<div style="position: absolute; inset: -4px; border-radius: 50%; background: ${color}; opacity: 0.4; animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
            : ''
        }
        <div style="
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: ${color};
          border: 2.5px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(15, 23, 42, 0.35);
          color: white;
          font-weight: 800;
          font-size: 10px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        ">
          ${isSOS ? '!' : severity.charAt(0).toUpperCase()}
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

const createTeamIcon = (status: ResponseTeam['status']) => {
  const color = status === 'available' ? '#059669' : status === 'busy' ? '#d97706' : '#64748b';

  return L.divIcon({
    className: 'custom-team-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 26px; height: 26px;">
        ${
          status === 'available'
            ? `<div style="position: absolute; inset: -3px; border-radius: 50%; background: ${color}; opacity: 0.35; animation: ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>`
            : ''
        }
        <div style="
          width: 22px;
          height: 22px;
          border-radius: 6px;
          background: ${color};
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 3px 8px rgba(15, 23, 42, 0.25);
          color: white;
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

const createShelterIcon = () => {
  return L.divIcon({
    className: 'custom-shelter-marker',
    html: `
      <div style="
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #0284c7;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 3px 8px rgba(15, 23, 42, 0.25);
        color: white;
      ">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
};

// ─── Map Pan & Zoom Controller ───
function MapViewController({
  targetCenter,
  targetZoom,
}: {
  targetCenter: [number, number];
  targetZoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(targetCenter, targetZoom, { duration: 1.1 });
  }, [map, targetCenter, targetZoom]);

  return null;
}

export default function CommandMapClient({
  scope = 'central',
  state,
  district,
  incidents: propIncidents,
  teams: propTeams,
  shelters: propShelters,
  selectedIncidentId,
  onSelectIncident,
  height = '440px',
  className = '',
}: CommandMapProps) {
  const [fetchedIncidents, setFetchedIncidents] = useState<Incident[] | null>(null);
  const [fetchedTeams, setFetchedTeams] = useState<ResponseTeam[] | null>(null);
  const [fetchedShelters, setFetchedShelters] = useState<Shelter[] | null>(null);
  const [loading, setLoading] = useState(false);

  // Layer Toggles
  const [showIncidents, setShowIncidents] = useState(true);
  const [showTeams, setShowTeams] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  // Load telemetry data dynamically if not passed via props
  useEffect(() => {
    if (propIncidents && propTeams) {
      // Parent component supplied full dataset
      return;
    }

    let isMounted = true;
    const loadTelemetry = async () => {
      setLoading(true);
      try {
        let incidentUrl = `${API_ENDPOINTS.INCIDENTS}?limit=50`;
        let teamsUrl = `${API_ENDPOINTS.TEAMS}`;
        let sheltersUrl = `${API_ENDPOINTS.SHELTERS}`;

        if (scope === 'district' && state && district) {
          incidentUrl += `&state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`;
          teamsUrl += `?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`;
          sheltersUrl += `?state=${encodeURIComponent(state)}&district=${encodeURIComponent(district)}`;
        } else if (scope === 'state' && state) {
          incidentUrl += `&state=${encodeURIComponent(state)}`;
          teamsUrl += `?state=${encodeURIComponent(state)}`;
          sheltersUrl += `?state=${encodeURIComponent(state)}`;
        }

        const [incRes, teamsRes, shRes] = await Promise.all([
          !propIncidents ? fetchFromApi<Incident[]>(incidentUrl) : Promise.resolve(null),
          !propTeams ? fetchFromApi<ResponseTeam[]>(teamsUrl) : Promise.resolve(null),
          !propShelters ? fetchFromApi<Shelter[]>(sheltersUrl) : Promise.resolve(null),
        ]);

        if (isMounted) {
          if (incRes?.success && incRes.data) {
            const list = Array.isArray(incRes.data) ? incRes.data : (incRes.data as any).incidents || [];
            setFetchedIncidents(list);
          }
          if (teamsRes?.success && teamsRes.data) {
            const list = Array.isArray(teamsRes.data) ? teamsRes.data : (teamsRes.data as any).teams || [];
            setFetchedTeams(list);
          }
          if (shRes?.success && shRes.data) {
            const list = Array.isArray(shRes.data) ? shRes.data : (shRes.data as any).shelters || [];
            setFetchedShelters(list);
          }
        }
      } catch (err) {
        console.warn('CommandMap: using fallback data', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTelemetry();

    return () => {
      isMounted = false;
    };
  }, [scope, state, district, propIncidents, propTeams, propShelters]);

  // Merge prop or fetched or fallback data
  const rawIncidents = useMemo(() => {
    if (propIncidents && propIncidents.length > 0) return propIncidents;
    if (fetchedIncidents && fetchedIncidents.length > 0) return fetchedIncidents;
    return FALLBACK_INCIDENTS;
  }, [propIncidents, fetchedIncidents]);

  const rawTeams = useMemo(() => {
    if (propTeams && propTeams.length > 0) return propTeams;
    if (fetchedTeams && fetchedTeams.length > 0) return fetchedTeams;
    return FALLBACK_TEAMS;
  }, [propTeams, fetchedTeams]);

  const rawShelters = useMemo(() => {
    if (propShelters && propShelters.length > 0) return propShelters;
    if (fetchedShelters && fetchedShelters.length > 0) return fetchedShelters;
    return FALLBACK_SHELTERS;
  }, [propShelters, fetchedShelters]);

  // Filter items by current scope and state/district
  const incidents = useMemo(() => {
    if (scope === 'district' && district) {
      const filtered = rawIncidents.filter(
        (i) => i.district?.toLowerCase() === district.toLowerCase()
      );
      return filtered.length > 0 ? filtered : rawIncidents;
    }
    if (scope === 'state' && state) {
      const filtered = rawIncidents.filter(
        (i) => i.state?.toLowerCase() === state.toLowerCase()
      );
      return filtered.length > 0 ? filtered : rawIncidents;
    }
    return rawIncidents;
  }, [rawIncidents, scope, state, district]);

  const teams = useMemo(() => {
    if (scope === 'district' && district) {
      const filtered = rawTeams.filter(
        (t) => t.district?.toLowerCase() === district.toLowerCase()
      );
      return filtered.length > 0 ? filtered : rawTeams;
    }
    if (scope === 'state' && state) {
      const filtered = rawTeams.filter(
        (t) => t.state?.toLowerCase() === state.toLowerCase()
      );
      return filtered.length > 0 ? filtered : rawTeams;
    }
    return rawTeams;
  }, [rawTeams, scope, state, district]);

  const shelters = useMemo(() => {
    if (scope === 'district' && district) {
      const filtered = rawShelters.filter(
        (s) => s.district?.toLowerCase() === district.toLowerCase()
      );
      return filtered.length > 0 ? filtered : rawShelters;
    }
    if (scope === 'state' && state) {
      const filtered = rawShelters.filter(
        (s) => s.state?.toLowerCase() === state.toLowerCase()
      );
      return filtered.length > 0 ? filtered : rawShelters;
    }
    return rawShelters;
  }, [rawShelters, scope, state, district]);

  // Compute Active View Center & Zoom
  const { center, zoom } = useMemo(() => {
    if (scope === 'district' && district) {
      const distKey = district.toLowerCase().trim();
      if (DISTRICT_CENTERS[distKey]) {
        return { center: DISTRICT_CENTERS[distKey], zoom: 12 };
      }
      // If district has incidents with coordinates, use first incident coordinate
      const incWithCoord = incidents.find(
        (i) => i.location?.coordinates && i.location.coordinates.length === 2
      );
      if (incWithCoord) {
        return {
          center: [incWithCoord.location.coordinates[1], incWithCoord.location.coordinates[0]] as [number, number],
          zoom: 12,
        };
      }
    }

    if (state) {
      const stateKey = state.toLowerCase().trim();
      if (STATE_CENTERS[stateKey]) {
        return scope === 'district'
          ? { center: STATE_CENTERS[stateKey].center, zoom: 10 }
          : STATE_CENTERS[stateKey];
      }
    }

    return { center: [22.9734, 78.6569] as [number, number], zoom: 5 };
  }, [scope, state, district, incidents]);

  // Filtered Incidents by severity
  const visibleIncidents = useMemo(() => {
    if (!showIncidents) return [];
    if (severityFilter === 'all') return incidents;
    return incidents.filter((i) => i.severity === severityFilter);
  }, [incidents, showIncidents, severityFilter]);

   const criticalCount = useMemo(
    () => incidents.filter((i) => i.severity === 'critical' || i.isSOS).length,
    [incidents]
  );
  const availableTeamsCount = useMemo(
    () => teams.filter((t) => t.status === 'available').length,
    [teams]
  );

  const [scrollZoomEnabled, setScrollZoomEnabled] = useState(false);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm ${className}`}
      style={{ height }}
      onMouseEnter={() => setScrollZoomEnabled(true)}
      onMouseLeave={() => setScrollZoomEnabled(false)}
    >
      {/* ─── Map Container ─── */}
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={scrollZoomEnabled}
        className="h-full w-full z-0"
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        <MapViewController targetCenter={center} targetZoom={zoom} />

        {/* ─── Incident Markers ─── */}
        {visibleIncidents.map((incident) => {
          const coords = incident.location?.coordinates;
          if (
            !coords ||
            coords.length !== 2 ||
            !Number.isFinite(coords[0]) ||
            !Number.isFinite(coords[1])
          ) {
            return null;
          }
          const [lng, lat] = coords;
          const isCritical = incident.severity === 'critical';

          return (
            <Marker
              key={`inc-${incident._id}`}
              position={[lat, lng]}
              icon={createIncidentIcon(incident.severity, isCritical, incident.isSOS)}
              eventHandlers={{
                click: () => {
                  if (onSelectIncident) onSelectIncident(incident);
                },
              }}
            >
              <Popup className="custom-resqtech-popup" closeButton={false}>
                <div className="min-w-[240px] max-w-[280px] p-3 text-slate-800 space-y-2">
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded ${
                            incident.severity === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : incident.severity === 'high'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {incident.severity}
                        </span>
                        {incident.isSOS && (
                          <span className="bg-red-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded animate-pulse">
                            SOS
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">
                          P{incident.priorityScore >= 40 ? '0' : incident.priorityScore >= 30 ? '1' : '2'}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 mt-1 leading-snug line-clamp-2">
                        {incident.title}
                      </h4>
                    </div>
                  </div>

                  {incident.description && (
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                      {incident.description}
                    </p>
                  )}

                  <div className="text-[10px] text-slate-500 space-y-0.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <p className="font-medium text-slate-700">
                      📍 {incident.district}, {incident.state} {incident.address ? `(${incident.address})` : ''}
                    </p>
                    <p className="flex items-center justify-between">
                      <span>
                        Status: <b className="capitalize text-slate-800">{incident.status?.replace('_', ' ')}</b>
                      </span>
                      <span className="text-slate-400 font-mono">Score: {incident.priorityScore ?? 0}</span>
                    </p>
                  </div>

                  <div className="pt-1 flex items-center gap-2">
                    <Link
                      href={`/authority/incidents/${incident._id}`}
                      className="flex-1 inline-flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-600 text-white rounded-lg text-[11px] font-semibold hover:bg-blue-700 transition-colors shadow-2xs"
                    >
                      <Eye className="w-3 h-3" />
                      View Incident
                    </Link>
                    <Link
                      href={`/authority/dispatches?incident=${incident._id}`}
                      className="inline-flex items-center justify-center p-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                      title="Dispatch Response Unit"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* ─── Response Team Markers ─── */}
        {showTeams &&
          teams.map((team) => {
            const coords = team.currentLocation?.coordinates;
            if (
              !coords ||
              coords.length !== 2 ||
              !Number.isFinite(coords[0]) ||
              !Number.isFinite(coords[1])
            ) {
              return null;
            }
            const [lng, lat] = coords;

            return (
              <Marker
                key={`team-${team._id}`}
                position={[lat, lng]}
                icon={createTeamIcon(team.status)}
              >
                <Popup className="custom-resqtech-popup" closeButton={false}>
                  <div className="min-w-[220px] p-3 text-slate-800 space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          team.status === 'available'
                            ? 'bg-emerald-100 text-emerald-700'
                            : team.status === 'busy'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {team.status}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium capitalize">{team.type} Squad</span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 leading-snug">{team.name}</h4>

                    <div className="text-[10px] text-slate-500 space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <p>📍 Sector: <b>{team.district}, {team.state}</b></p>
                      {team.leader && <p>👤 Leader: <b>{team.leader.name}</b></p>}
                      <p>👥 Squad Size: <b>{team.members?.length || 1} responders</b></p>
                    </div>

                    {team.capabilities && team.capabilities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {team.capabilities.slice(0, 3).map((cap, i) => (
                          <span key={i} className="text-[9px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {cap.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* ─── Relief Camp / Shelter Markers ─── */}
        {showShelters &&
          shelters.map((shelter) => {
            const coords = shelter.location?.coordinates;
            if (
              !coords ||
              coords.length !== 2 ||
              !Number.isFinite(coords[0]) ||
              !Number.isFinite(coords[1])
            ) {
              return null;
            }
            const [lng, lat] = coords;
            const occ =
              shelter.currentOccupancy !== undefined ? shelter.currentOccupancy : shelter.occupancy || 0;
            const cap = shelter.capacity || 0;
            const avail = Math.max(0, cap - occ);
            const occPct = cap > 0 ? Math.min(100, Math.round((occ / cap) * 100)) : 0;
            const isInactive = shelter.isActive === false;
            const statusBadge = isInactive
              ? 'bg-slate-100 text-slate-700 border-slate-200'
              : occPct >= 100
              ? 'bg-red-100 text-red-700 border-red-200'
              : occPct >= 85
              ? 'bg-amber-100 text-amber-700 border-amber-200'
              : 'bg-emerald-100 text-emerald-700 border-emerald-200';
            const statusText = isInactive
              ? 'INACTIVE'
              : occPct >= 100
              ? 'FULL'
              : occPct >= 85
              ? 'NEAR CAPACITY'
              : 'OPEN';

            return (
              <Marker
                key={`sh-${shelter._id}`}
                position={[lat, lng]}
                icon={createShelterIcon()}
              >
                <Popup className="custom-resqtech-popup" closeButton={false}>
                  <div className="min-w-[240px] p-3 text-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        Relief Shelter
                      </span>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${statusBadge}`}>
                        {statusText}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-xs text-slate-900 leading-snug">{shelter.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        📍 {shelter.address || `${shelter.district}, ${shelter.state}`}
                      </p>
                    </div>

                    <div className="space-y-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>Occupancy:</span>
                        <b className="text-slate-900">
                          {occ} / {cap} ({occPct}%)
                        </b>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>Available:</span>
                        <b className="text-emerald-700 font-semibold">{avail} beds</b>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${
                            occPct >= 100 ? 'bg-red-500' : occPct >= 85 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(occPct, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Supply Status Quick Summary */}
                    <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 space-y-1">
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                        <span>Relief Supplies</span>
                        <Package className="w-3 h-3 text-slate-400" />
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[9px] font-bold text-center">
                        <span className="p-1 rounded bg-blue-50 text-blue-700 border border-blue-100">
                          Water: OK
                        </span>
                        <span className="p-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Food: OK
                        </span>
                        <span className="p-1 rounded bg-amber-50 text-amber-700 border border-amber-100">
                          Med: Low
                        </span>
                      </div>
                    </div>

                    {(shelter.contactNumber || shelter.contactPhone) && (
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="font-semibold text-slate-700">
                          {shelter.contactNumber || shelter.contactPhone}
                        </span>
                      </p>
                    )}

                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <Link
                        href="/authority/shelters"
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 hover:underline"
                      >
                        <Eye className="w-3 h-3" /> View Shelter
                      </Link>

                      <Link
                        href="/authority/supplies"
                        className="text-[10px] font-bold text-slate-700 hover:text-slate-900 inline-flex items-center gap-1 hover:underline"
                      >
                        <Package className="w-3 h-3 text-blue-600" /> View Supplies
                      </Link>

                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> Directions
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
      </MapContainer>

      {/* ─── Top-Right Operational Telemetry HUD ─── */}
      <div className="absolute right-3 top-3 z-[1000] flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-white/80 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-md backdrop-blur-md">
          <PulsingDot variant="live" size="sm" />
          <span className="capitalize">{scope} Jurisdiction</span>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-white/80 bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-md backdrop-blur-md">
          <span className="flex items-center gap-1.5 text-red-600 font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            {criticalCount} Critical
          </span>
          <span className="text-slate-300">|</span>
          <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
            <Shield className="w-3.5 h-3.5" />
            {availableTeamsCount} Ready
          </span>
        </div>
      </div>

      {/* ─── Top-Left Layer Controls ─── */}
      <div className="absolute left-3 top-3 z-[1000] rounded-xl border border-white/80 bg-white/95 p-2 shadow-md backdrop-blur-md text-xs max-w-[calc(100%-140px)] sm:max-w-none">
        <div className="flex items-center justify-between gap-3 font-bold text-slate-800 mb-1.5 pb-1 border-b border-slate-100 px-1">
          <div className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Map Layers</span>
          </div>
          {scope !== 'central' && (
            <span className="text-[10px] text-blue-600 font-semibold uppercase bg-blue-50 px-1.5 py-0.5 rounded">
              {district ? `${district}, ${state}` : state}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setShowIncidents(!showIncidents)}
            className={`px-2 py-1 rounded-lg font-semibold transition-all text-[11px] ${
              showIncidents ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-slate-100 text-slate-400'
            }`}
          >
            Incidents ({incidents.length})
          </button>

          <button
            type="button"
            onClick={() => setShowTeams(!showTeams)}
            className={`px-2 py-1 rounded-lg font-semibold transition-all text-[11px] ${
              showTeams ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-400'
            }`}
          >
            Squads ({teams.length})
          </button>

          <button
            type="button"
            onClick={() => setShowShelters(!showShelters)}
            className={`px-2 py-1 rounded-lg font-semibold transition-all text-[11px] ${
              showShelters ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-slate-100 text-slate-400'
            }`}
          >
            Shelters ({shelters.length})
          </button>
        </div>
      </div>

      {/* ─── Bottom-Left Legend ─── */}
      <div className="absolute bottom-3 left-3 z-[1000] rounded-xl border border-white/80 bg-white/90 px-3 py-2 shadow-md backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-[10px] font-semibold text-slate-600">
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-red-600 animate-pulse" />
            <span>P0 / Critical</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
            <span>High</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
            <span>Active Squad</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />
            <span>Shelter</span>
          </div>
        </div>
      </div>
    </div>
  );
}
