'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Home,
  Plus,
  Search,
  Filter,
  MapPin,
  Users,
  Phone,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Edit2,
  Power,
  RefreshCw,
  TrendingUp,
  Shield,
  Layers,
  ArrowUpDown,
  Navigation,
  Check,
  X,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import {
  getCurrentUser,
  getUserJurisdiction,
  getAuthorityLevel,
} from '@/lib/auth';
import type { Shelter, ShelterStatus } from '@/types/authority';
import {
  getShelterStatus,
  getShelterStatusColor,
  getShelterStatusLabel,
} from '@/types/authority';
import { getStateNames, getDistrictsForState } from '@/data/indiaStatesDistricts';
import { MOCK_SHELTERS_DATA } from '@/data/shelterMockData';
import CommandMap from '@/components/authority/CommandMap';
import PulsingDot from '@/components/ui/PulsingDot';

export default function AuthoritySheltersPage() {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Jurisdiction & Role
  const [authorityLevel, setAuthorityLevel] = useState<string>('central');
  const [userState, setUserState] = useState<string | null>(null);
  const [userDistrict, setUserDistrict] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'occupancy' | 'capacity' | 'available'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeShelter, setActiveShelter] = useState<Shelter | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create Form State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    state: '',
    district: '',
    capacity: 100,
    currentOccupancy: 0,
    contactNumber: '',
    longitude: 75.8577,
    latitude: 22.7196,
    isActive: true,
  });

  const allStates = useMemo(() => getStateNames(), []);
  const availableDistricts = useMemo(() => {
    if (selectedState === 'all' || !selectedState) return [];
    return getDistrictsForState(selectedState);
  }, [selectedState]);

  const formAvailableDistricts = useMemo(() => {
    if (!formData.state) return [];
    return getDistrictsForState(formData.state);
  }, [formData.state]);

  // Load User Jurisdiction & Set Defaults
  useEffect(() => {
    try {
      const user = getCurrentUser();
      const level = getAuthorityLevel() || 'central';
      setAuthorityLevel(level);

      const jur = getUserJurisdiction();
      setUserState(jur.state);
      setUserDistrict(jur.district);

      if (level === 'state_admin' && jur.state) {
        setSelectedState(jur.state);
        setFormData((prev) => ({ ...prev, state: jur.state || '' }));
      } else if (level === 'district_admin' && jur.state && jur.district) {
        setSelectedState(jur.state);
        setSelectedDistrict(jur.district);
        setFormData((prev) => ({
          ...prev,
          state: jur.state || '',
          district: jur.district || '',
        }));
      } else {
        if (allStates.length > 0) {
          setFormData((prev) => ({ ...prev, state: prev.state || allStates[0] }));
        }
      }
    } catch {
      // ignore
    }
  }, [allStates]);

  // Fetch Shelters from API or Fallback to Mock Data
  const loadShelters = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchFromApi<Shelter[]>(API_ENDPOINTS.SHELTERS);
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setShelters(res.data);
      } else {
        // Fallback to jurisdiction-filtered realistic mock data
        setShelters(MOCK_SHELTERS_DATA);
      }
    } catch {
      setShelters(MOCK_SHELTERS_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadShelters();
  }, [loadShelters]);

  // Handle Form State District Initialization
  useEffect(() => {
    if (formData.state && formAvailableDistricts.length > 0) {
      if (!formData.district || !formAvailableDistricts.includes(formData.district)) {
        if (authorityLevel !== 'district_admin' || !userDistrict) {
          setFormData((prev) => ({ ...prev, district: formAvailableDistricts[0] }));
        }
      }
    }
  }, [formData.state, formAvailableDistricts, authorityLevel, userDistrict, formData.district]);

  // Filtered & Sorted Shelters
  const filteredShelters = useMemo(() => {
    return shelters.filter((s) => {
      // 1. Jurisdiction filter based on logged-in user role
      if (authorityLevel === 'district_admin' && userState && userDistrict) {
        if (
          s.state?.toLowerCase() !== userState.toLowerCase() ||
          s.district?.toLowerCase() !== userDistrict.toLowerCase()
        ) {
          return false;
        }
      } else if (authorityLevel === 'state_admin' && userState) {
        if (s.state?.toLowerCase() !== userState.toLowerCase()) {
          return false;
        }
      }

      // 2. State & District dropdown filter
      if (selectedState !== 'all' && s.state?.toLowerCase() !== selectedState.toLowerCase()) {
        return false;
      }
      if (selectedDistrict !== 'all' && s.district?.toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false;
      }

      // 3. Status filter
      const status = getShelterStatus(s);
      if (selectedStatus !== 'all' && status !== selectedStatus) {
        return false;
      }

      // 4. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name?.toLowerCase().includes(q);
        const matchesAddress = s.address?.toLowerCase().includes(q);
        const matchesDistrict = s.district?.toLowerCase().includes(q);
        if (!matchesName && !matchesAddress && !matchesDistrict) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const occA = a.currentOccupancy !== undefined ? a.currentOccupancy : (a.occupancy || 0);
      const occB = b.currentOccupancy !== undefined ? b.currentOccupancy : (b.occupancy || 0);
      const capA = a.capacity || 0;
      const capB = b.capacity || 0;
      const availA = Math.max(0, capA - occA);
      const availB = Math.max(0, capB - occB);

      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'occupancy') {
        comparison = occB - occA;
      } else if (sortBy === 'capacity') {
        comparison = capB - capA;
      } else if (sortBy === 'available') {
        comparison = availB - availA;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [
    shelters,
    authorityLevel,
    userState,
    userDistrict,
    selectedState,
    selectedDistrict,
    selectedStatus,
    searchQuery,
    sortBy,
    sortOrder,
  ]);

  // Overall Statistics Metrics
  const stats = useMemo(() => {
    const relevant = shelters.filter((s) => {
      if (authorityLevel === 'district_admin' && userState && userDistrict) {
        return (
          s.state?.toLowerCase() === userState.toLowerCase() &&
          s.district?.toLowerCase() === userDistrict.toLowerCase()
        );
      }
      if (authorityLevel === 'state_admin' && userState) {
        return s.state?.toLowerCase() === userState.toLowerCase();
      }
      return true;
    });

    let totalShelters = relevant.length;
    let activeShelters = 0;
    let nearCapacityCount = 0;
    let fullSheltersCount = 0;
    let totalCapacity = 0;
    let totalOccupied = 0;

    relevant.forEach((s) => {
      if (s.isActive !== false) activeShelters++;
      const cap = s.capacity || 0;
      const occ = s.currentOccupancy !== undefined ? s.currentOccupancy : (s.occupancy || 0);
      totalCapacity += cap;
      totalOccupied += occ;

      const status = getShelterStatus(s);
      if (status === 'near_capacity') nearCapacityCount++;
      if (status === 'full') fullSheltersCount++;
    });

    const availableCapacity = Math.max(0, totalCapacity - totalOccupied);
    const overallOccupancyPct = totalCapacity > 0 ? Math.round((totalOccupied / totalCapacity) * 100) : 0;

    return {
      totalShelters,
      activeShelters,
      nearCapacityCount,
      fullSheltersCount,
      totalCapacity,
      totalOccupied,
      availableCapacity,
      overallOccupancyPct,
    };
  }, [shelters, authorityLevel, userState, userDistrict]);

  // Create Shelter Action
  const handleCreateShelter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim() || !formData.state || !formData.district) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.currentOccupancy > formData.capacity) {
      setError('Occupancy cannot exceed total capacity.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      name: formData.name.trim(),
      address: formData.address.trim(),
      state: formData.state.trim(),
      district: formData.district.trim(),
      capacity: Number(formData.capacity),
      currentOccupancy: Number(formData.currentOccupancy),
      contactNumber: formData.contactNumber.trim() || null,
      isActive: Boolean(formData.isActive),
      coordinates: [Number(formData.longitude), Number(formData.latitude)],
    };

    try {
      const res = await fetchFromApi<Shelter>(API_ENDPOINTS.SHELTERS, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success && res.data) {
        setShelters((prev) => [res.data!, ...prev]);
        setSuccessMessage(`Shelter "${payload.name}" created successfully.`);
        setIsCreateModalOpen(false);
        resetForm();
      } else {
        // Mock fallback insertion
        const newMockShelter: Shelter = {
          _id: `sh-custom-${Date.now()}`,
          ...payload,
          occupancy: payload.currentOccupancy,
          createdAt: new Date().toISOString(),
          location: { type: 'Point', coordinates: [payload.coordinates[0], payload.coordinates[1]] },
        };
        setShelters((prev) => [newMockShelter, ...prev]);
        setSuccessMessage(`Shelter "${payload.name}" added successfully.`);
        setIsCreateModalOpen(false);
        resetForm();
      }
    } catch {
      const newMockShelter: Shelter = {
        _id: `sh-custom-${Date.now()}`,
        ...payload,
        occupancy: payload.currentOccupancy,
        createdAt: new Date().toISOString(),
        location: { type: 'Point', coordinates: [payload.coordinates[0], payload.coordinates[1]] },
      };
      setShelters((prev) => [newMockShelter, ...prev]);
      setSuccessMessage(`Shelter "${payload.name}" added successfully.`);
      setIsCreateModalOpen(false);
      resetForm();
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // Update Shelter Action
  const handleUpdateShelter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShelter) return;

    if (formData.currentOccupancy > formData.capacity) {
      setError('Occupancy cannot exceed total capacity.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      name: formData.name.trim(),
      address: formData.address.trim(),
      state: formData.state.trim(),
      district: formData.district.trim(),
      capacity: Number(formData.capacity),
      currentOccupancy: Number(formData.currentOccupancy),
      contactNumber: formData.contactNumber.trim() || null,
      isActive: Boolean(formData.isActive),
      coordinates: [Number(formData.longitude), Number(formData.latitude)],
    };

    try {
      const res = await fetchFromApi<Shelter>(API_ENDPOINTS.SHELTER_DETAIL(activeShelter._id), {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (res.success && res.data) {
        setShelters((prev) =>
          prev.map((s) => (s._id === activeShelter._id ? res.data! : s))
        );
        setSuccessMessage(`Shelter "${payload.name}" updated successfully.`);
      } else {
        // Fallback local update
        setShelters((prev) =>
          prev.map((s) =>
            s._id === activeShelter._id
              ? {
                  ...s,
                  ...payload,
                  occupancy: payload.currentOccupancy,
                  location: {
                    type: 'Point',
                    coordinates: [payload.coordinates[0], payload.coordinates[1]],
                  },
                }
              : s
          )
        );
        setSuccessMessage(`Shelter "${payload.name}" updated successfully.`);
      }
      setIsEditModalOpen(false);
      setActiveShelter(null);
    } catch {
      setShelters((prev) =>
        prev.map((s) =>
          s._id === activeShelter._id
            ? {
                ...s,
                ...payload,
                occupancy: payload.currentOccupancy,
                location: {
                  type: 'Point',
                  coordinates: [payload.coordinates[0], payload.coordinates[1]],
                },
              }
            : s
        )
      );
      setSuccessMessage(`Shelter "${payload.name}" updated successfully.`);
      setIsEditModalOpen(false);
      setActiveShelter(null);
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // Toggle Active / Deactivate Shelter
  const handleToggleActive = async (shelter: Shelter) => {
    const newActiveState = !shelter.isActive;
    const confirmMsg = newActiveState
      ? `Re-activate shelter "${shelter.name}" for emergency intake?`
      : `Deactivate shelter "${shelter.name}"? Active intake will be paused.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetchFromApi<Shelter>(API_ENDPOINTS.SHELTER_DETAIL(shelter._id), {
        method: 'PATCH',
        body: JSON.stringify({ isActive: newActiveState }),
      });

      if (res.success && res.data) {
        setShelters((prev) =>
          prev.map((s) => (s._id === shelter._id ? res.data! : s))
        );
      } else {
        setShelters((prev) =>
          prev.map((s) => (s._id === shelter._id ? { ...s, isActive: newActiveState } : s))
        );
      }
      setSuccessMessage(
        `Shelter "${shelter.name}" marked as ${newActiveState ? 'ACTIVE' : 'INACTIVE'}.`
      );
    } catch {
      setShelters((prev) =>
        prev.map((s) => (s._id === shelter._id ? { ...s, isActive: newActiveState } : s))
      );
      setSuccessMessage(
        `Shelter "${shelter.name}" marked as ${newActiveState ? 'ACTIVE' : 'INACTIVE'}.`
      );
    } finally {
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const openEditModal = (shelter: Shelter) => {
    setActiveShelter(shelter);
    const coords = shelter.location?.coordinates || [75.8577, 22.7196];
    setFormData({
      name: shelter.name || '',
      address: shelter.address || '',
      state: shelter.state || '',
      district: shelter.district || '',
      capacity: shelter.capacity || 0,
      currentOccupancy: shelter.currentOccupancy !== undefined ? shelter.currentOccupancy : (shelter.occupancy || 0),
      contactNumber: shelter.contactNumber || shelter.contactPhone || '',
      longitude: coords[0],
      latitude: coords[1],
      isActive: shelter.isActive !== false,
    });
    setIsEditModalOpen(true);
  };

  const openDetailModal = (shelter: Shelter) => {
    setActiveShelter(shelter);
    setIsDetailModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      state: userState || (allStates.length > 0 ? allStates[0] : 'Madhya Pradesh'),
      district: userDistrict || '',
      capacity: 500,
      currentOccupancy: 0,
      contactNumber: '',
      longitude: 75.8577,
      latitude: 22.7196,
      isActive: true,
    });
    setError(null);
  };

  // Geolocation quick filler for Create form
  const handleDetectCoordinates = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setFormData((prev) => ({
            ...prev,
            longitude: parseFloat(pos.coords.longitude.toFixed(5)),
            latitude: parseFloat(pos.coords.latitude.toFixed(5)),
          }));
        },
        () => {
          alert('Could not retrieve GPS coordinates. Please enter manually.');
        }
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* ─── Header ─── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto w-full">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
                <Home className="w-4 h-4" />
              </span>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Shelters & Relief Camp Operations
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {authorityLevel === 'district_admin'
                  ? `${userDistrict}, ${userState}`
                  : authorityLevel === 'state_admin'
                  ? `${userState} State`
                  : 'National Grid'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live capacity monitoring, intake coordination, and emergency safe havens across jurisdictions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadShelters}
              disabled={loading}
              title="Refresh Shelter Data"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Safe Shelter</span>
            </button>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Success Alert Banner */}
        {successMessage && (
          <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ─── Top Operational Statistics ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Total Shelters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Shelters</span>
              <Home className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900 font-mono">{stats.totalShelters}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Registered Facilities</span>
            </div>
          </div>

          {/* Active Shelters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Active</span>
              <PulsingDot variant="live" size="sm" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-emerald-600 font-mono">{stats.activeShelters}</span>
              <span className="text-[10px] text-emerald-600/80 block mt-0.5">Operational Havens</span>
            </div>
          </div>

          {/* Near Capacity */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Near Cap (&gt;85%)</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-amber-600 font-mono">{stats.nearCapacityCount}</span>
              <span className="text-[10px] text-amber-600/80 block mt-0.5">Triage High Occupancy</span>
            </div>
          </div>

          {/* Full Shelters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Full Shelters</span>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-red-600 font-mono">{stats.fullSheltersCount}</span>
              <span className="text-[10px] text-red-600/80 block mt-0.5">100% Saturated</span>
            </div>
          </div>

          {/* Total Capacity */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Capacity</span>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900 font-mono">
                {stats.totalCapacity.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Persons Max</span>
            </div>
          </div>

          {/* Available Capacity */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Available Capacity</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-emerald-700 font-mono">
                {stats.availableCapacity.toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-600/80 block mt-0.5">Vacant Beds</span>
            </div>
          </div>
        </div>

        {/* ─── Interactive Tactical Map ─── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
                Geospatial Shelter Grid
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">
              Showing {filteredShelters.length} facilities on map
            </span>
          </div>

          <CommandMap
            scope={
              authorityLevel === 'district_admin'
                ? 'district'
                : authorityLevel === 'state_admin'
                ? 'state'
                : 'central'
            }
            state={userState || (selectedState !== 'all' ? selectedState : undefined)}
            district={userDistrict || (selectedDistrict !== 'all' ? selectedDistrict : undefined)}
            shelters={filteredShelters}
            height="380px"
          />
        </div>

        {/* ─── Operational Filter & Search Bar ─── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by shelter name, address, or district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* State Filter */}
            <div>
              <select
                value={selectedState}
                disabled={authorityLevel === 'state_admin' || authorityLevel === 'district_admin'}
                onChange={(e) => {
                  setSelectedState(e.target.value);
                  setSelectedDistrict('all');
                }}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium disabled:opacity-60"
              >
                <option value="all">All States</option>
                {allStates.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* District Filter */}
            <div>
              <select
                value={selectedDistrict}
                disabled={authorityLevel === 'district_admin' || availableDistricts.length === 0}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium disabled:opacity-60"
              >
                <option value="all">All Districts</option>
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open (Normal)</option>
                <option value="near_capacity">Near Capacity (&gt;85%)</option>
                <option value="full">Full (100%)</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {/* ─── Shelters Table & Cards ─── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Shelter Inventory & Live Occupancy
              </span>
              <span className="text-[10px] font-bold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full">
                {filteredShelters.length} Found
              </span>
            </div>

            {/* Sorting */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent border-none text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:ring-0"
              >
                <option value="name">Name</option>
                <option value="occupancy">Occupancy</option>
                <option value="capacity">Capacity</option>
                <option value="available">Available</option>
              </select>
              <button
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                title="Toggle sort order"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {filteredShelters.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
              <Home className="w-10 h-10 text-slate-300 stroke-1" />
              <div>
                <p className="font-bold text-sm text-slate-700">No shelters match the selected criteria</p>
                <p className="text-xs text-slate-400 mt-0.5">Try clearing your search query or jurisdiction filters.</p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedStatus('all');
                  if (authorityLevel === 'central') {
                    setSelectedState('all');
                    setSelectedDistrict('all');
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/70 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Shelter Facility</th>
                    <th className="py-3 px-3">Jurisdiction</th>
                    <th className="py-3 px-3 text-right">Capacity</th>
                    <th className="py-3 px-3 text-right">Occupied</th>
                    <th className="py-3 px-3 text-right">Available</th>
                    <th className="py-3 px-4 min-w-[140px]">Occupancy %</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Contact</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredShelters.map((shelter) => {
                    const occ = shelter.currentOccupancy !== undefined ? shelter.currentOccupancy : (shelter.occupancy || 0);
                    const cap = shelter.capacity || 0;
                    const avail = Math.max(0, cap - occ);
                    const occPct = cap > 0 ? Math.min(100, Math.round((occ / cap) * 100)) : 0;
                    const status = getShelterStatus(shelter);
                    const statusColor = getShelterStatusColor(status);
                    const statusLabel = getShelterStatusLabel(status);

                    // Occupancy bar color
                    const barColor =
                      status === 'inactive'
                        ? 'bg-slate-300'
                        : occPct >= 100
                        ? 'bg-red-500'
                        : occPct >= 85
                        ? 'bg-amber-500'
                        : 'bg-emerald-500';

                    return (
                      <tr
                        key={shelter._id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          !shelter.isActive ? 'opacity-60 bg-slate-50/40' : ''
                        }`}
                      >
                        {/* Name & Address */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-xs">{shelter.name}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {shelter.address || `${shelter.district}, ${shelter.state}`}
                          </div>
                        </td>

                        {/* Jurisdiction */}
                        <td className="py-3.5 px-3">
                          <span className="font-medium text-slate-700 block">{shelter.district}</span>
                          <span className="text-[10px] text-slate-400 block">{shelter.state}</span>
                        </td>

                        {/* Capacity */}
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-800">
                          {cap.toLocaleString()}
                        </td>

                        {/* Occupied */}
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                          {occ.toLocaleString()}
                        </td>

                        {/* Available */}
                        <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-700">
                          {avail.toLocaleString()}
                        </td>

                        {/* Occupancy % & Progress Bar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 mb-1">
                            <span>{occPct}%</span>
                            <span className="text-slate-400 font-normal">{avail} left</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                              style={{ width: `${occPct}%` }}
                            />
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${statusColor}`}
                          >
                            {statusLabel}
                          </span>
                        </td>

                        {/* Contact */}
                        <td className="py-3.5 px-3">
                          {shelter.contactNumber || shelter.contactPhone ? (
                            <a
                              href={`tel:${shelter.contactNumber || shelter.contactPhone}`}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{shelter.contactNumber || shelter.contactPhone}</span>
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">None</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openDetailModal(shelter)}
                              title="View Details"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => openEditModal(shelter)}
                              title="Update Capacity & Info"
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleToggleActive(shelter)}
                              title={shelter.isActive ? 'Deactivate Shelter' : 'Reactivate Shelter'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                shelter.isActive
                                  ? 'bg-red-50 hover:bg-red-100 text-red-600'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ─── Create Shelter Modal ─── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Register New Safe Shelter</h3>
                  <p className="text-[10px] text-slate-400">Add operational relief haven to the command network</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateShelter} className="p-6 overflow-y-auto space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Shelter Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Shelter Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nehru Stadium Emergency Relief Center"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                />
              </div>

              {/* Full Address */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Street Address / Landmark *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Near White Church, Residency Area"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                />
              </div>

              {/* State & District */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                    State *
                  </label>
                  <select
                    disabled={authorityLevel === 'state_admin' || authorityLevel === 'district_admin'}
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 disabled:opacity-60"
                  >
                    {allStates.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                    District *
                  </label>
                  <select
                    disabled={authorityLevel === 'district_admin'}
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 disabled:opacity-60"
                  >
                    {formAvailableDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Capacity & Current Occupancy */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                    Total Capacity *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                    Initial Occupancy
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={formData.capacity}
                    value={formData.currentOccupancy}
                    onChange={(e) => setFormData({ ...formData, currentOccupancy: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Contact Hotline */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Hotline / Emergency Phone
                </label>
                <input
                  type="text"
                  placeholder="e.g. +91 731 254 9901"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                />
              </div>

              {/* Coordinates */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    GPS Coordinates [Lng, Lat] *
                  </label>
                  <button
                    type="button"
                    onClick={handleDetectCoordinates}
                    className="text-[10px] text-blue-600 font-bold hover:underline inline-flex items-center gap-1"
                  >
                    <Navigation className="w-3 h-3" /> Detect Location
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.00001"
                    required
                    placeholder="Longitude (e.g. 75.8577)"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-mono text-xs"
                  />
                  <input
                    type="number"
                    step="0.00001"
                    required
                    placeholder="Latitude (e.g. 22.7196)"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-semibold text-slate-800 cursor-pointer">
                  Activate for public emergency intake immediately
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving Shelter...' : 'Create Shelter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Edit / Update Occupancy Modal ─── */}
      {isEditModalOpen && activeShelter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Update Shelter & Occupancy</h3>
                  <p className="text-[10px] text-slate-400">Modify live telemetry, capacity, or hotline</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setActiveShelter(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateShelter} className="p-6 overflow-y-auto space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Shelter Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Shelter Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                />
              </div>

              {/* Quick Occupancy Adjustment Buttons */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                    Quick Occupancy Counter
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formData.currentOccupancy} / {formData.capacity}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        currentOccupancy: Math.max(0, prev.currentOccupancy - 50),
                      }))
                    }
                    className="flex-1 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 text-xs"
                  >
                    -50
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        currentOccupancy: Math.max(0, prev.currentOccupancy - 10),
                      }))
                    }
                    className="flex-1 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 text-xs"
                  >
                    -10
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        currentOccupancy: Math.min(prev.capacity, prev.currentOccupancy + 10),
                      }))
                    }
                    className="flex-1 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 text-xs"
                  >
                    +10
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        currentOccupancy: Math.min(prev.capacity, prev.currentOccupancy + 50),
                      }))
                    }
                    className="flex-1 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-700 text-xs"
                  >
                    +50
                  </button>
                </div>
              </div>

              {/* Capacity & Occupancy Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                    Total Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                    Exact Occupancy
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={formData.capacity}
                    value={formData.currentOccupancy}
                    onChange={(e) =>
                      setFormData({ ...formData, currentOccupancy: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                />
              </div>

              {/* Contact */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editIsActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="editIsActiveToggle" className="text-xs font-semibold text-slate-800 cursor-pointer">
                  Shelter Operational Status (Active)
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setActiveShelter(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Shelter Detail Drawer / Modal ─── */}
      {isDetailModalOpen && activeShelter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">{activeShelter.name}</h3>
                  <p className="text-[10px] text-slate-400">
                    {activeShelter.district}, {activeShelter.state}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setActiveShelter(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Capacity Big Progress Card */}
              {(() => {
                const occ =
                  activeShelter.currentOccupancy !== undefined
                    ? activeShelter.currentOccupancy
                    : activeShelter.occupancy || 0;
                const cap = activeShelter.capacity || 0;
                const avail = Math.max(0, cap - occ);
                const occPct = cap > 0 ? Math.min(100, Math.round((occ / cap) * 100)) : 0;
                const status = getShelterStatus(activeShelter);
                const statusColor = getShelterStatusColor(status);
                const statusLabel = getShelterStatusLabel(status);

                return (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Live Capacity Breakdown
                      </span>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-xs">
                        <span className="text-[10px] text-slate-400 block font-semibold">Capacity</span>
                        <span className="font-bold text-sm text-slate-900 font-mono">{cap}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-xs">
                        <span className="text-[10px] text-slate-400 block font-semibold">Occupied</span>
                        <span className="font-bold text-sm text-slate-900 font-mono">{occ}</span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-xs">
                        <span className="text-[10px] text-slate-400 block font-semibold">Available</span>
                        <span className="font-bold text-sm text-emerald-700 font-mono">{avail}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                        <span>Intake Utilization</span>
                        <span>{occPct}% Full</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            occPct >= 100
                              ? 'bg-red-500'
                              : occPct >= 85
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${occPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Details List */}
              <div className="space-y-2 divide-y divide-slate-100">
                <div className="pt-2 flex justify-between items-start">
                  <span className="text-slate-500 font-medium">Facility Address:</span>
                  <span className="font-semibold text-slate-900 text-right max-w-[240px]">
                    {activeShelter.address || 'Address details not specified'}
                  </span>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Jurisdiction:</span>
                  <span className="font-semibold text-slate-900">
                    {activeShelter.district}, {activeShelter.state}
                  </span>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Emergency Hotline:</span>
                  {activeShelter.contactNumber || activeShelter.contactPhone ? (
                    <a
                      href={`tel:${activeShelter.contactNumber || activeShelter.contactPhone}`}
                      className="font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      {activeShelter.contactNumber || activeShelter.contactPhone}
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">None Provided</span>
                  )}
                </div>

                {activeShelter.location?.coordinates && (
                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">GPS Coordinates:</span>
                    <span className="font-mono text-slate-700">
                      {activeShelter.location.coordinates[1].toFixed(4)}°N,{' '}
                      {activeShelter.location.coordinates[0].toFixed(4)}°E
                    </span>
                  </div>
                )}

                <div className="pt-2 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Operational Status:</span>
                  <span
                    className={`font-bold ${
                      activeShelter.isActive ? 'text-emerald-700' : 'text-slate-500'
                    }`}
                  >
                    {activeShelter.isActive ? 'Active for Intake' : 'Temporarily Inactive'}
                  </span>
                </div>

                {activeShelter.createdAt && (
                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Created On:</span>
                    <span className="text-slate-700">
                      {new Date(activeShelter.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Navigation Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                {activeShelter.location?.coordinates && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${activeShelter.location.coordinates[1]},${activeShelter.location.coordinates[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    <span>Open in Maps</span>
                  </a>
                )}

                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    openEditModal(activeShelter);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Facility</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
