'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Package,
  Plus,
  Search,
  Filter,
  Layers,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Edit2,
  RefreshCw,
  TrendingUp,
  Shield,
  ArrowUpDown,
  ArrowRight,
  Sliders,
  Droplets,
  Utensils,
  HeartPulse,
  Bed,
  Tent,
  Check,
  X,
  Building2,
  Calendar,
  UserCheck,
} from 'lucide-react';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import {
  getCurrentUser,
  getUserJurisdiction,
  getAuthorityLevel,
} from '@/lib/auth';
import type { Supply, SupplyCategory, SupplyStatus, Shelter } from '@/types/authority';
import {
  computeSupplyStatus,
  getSupplyStatusColor,
  getSupplyStatusLabel,
} from '@/types/authority';
import { getStateNames, getDistrictsForState } from '@/data/indiaStatesDistricts';
import { MOCK_SUPPLIES_DATA } from '@/data/supplyMockData';
import { MOCK_SHELTERS_DATA } from '@/data/shelterMockData';
import PulsingDot from '@/components/ui/PulsingDot';

const SUPPLY_CATEGORIES: SupplyCategory[] = [
  'Water',
  'Food',
  'Medicine',
  'First Aid',
  'Blankets',
  'Tents',
  'Clothing',
  'Hygiene',
  'Baby Care',
  'Other',
];

export default function AuthoritySuppliesPage() {
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // User Jurisdiction
  const [authorityLevel, setAuthorityLevel] = useState<string>('central');
  const [userState, setUserState] = useState<string | null>(null);
  const [userDistrict, setUserDistrict] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedShelterId, setSelectedShelterId] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'status' | 'updatedAt'>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeSupply, setActiveSupply] = useState<Supply | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    category: 'Water' as SupplyCategory,
    shelterId: '',
    quantity: 100,
    unit: 'litres',
    minimumStock: 20,
  });

  // Stock Adjustment Form State
  const [stockForm, setStockForm] = useState({
    action: 'ADD' as 'ADD' | 'REMOVE' | 'SET',
    amount: 10,
    note: '',
  });

  // Edit Form State
  const [editForm, setEditForm] = useState({
    name: '',
    category: 'Water' as SupplyCategory,
    unit: '',
    minimumStock: 10,
  });

  const allStates = useMemo(() => getStateNames(), []);
  const availableDistricts = useMemo(() => {
    if (selectedState === 'all' || !selectedState) return [];
    return getDistrictsForState(selectedState);
  }, [selectedState]);

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
      } else if (level === 'district_admin' && jur.state && jur.district) {
        setSelectedState(jur.state);
        setSelectedDistrict(jur.district);
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch Supplies & Shelters
  const loadInventory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [suppliesRes, sheltersRes] = await Promise.all([
        fetchFromApi<Supply[]>(API_ENDPOINTS.SUPPLIES),
        fetchFromApi<Shelter[]>(API_ENDPOINTS.SHELTERS),
      ]);

      if (suppliesRes.success && Array.isArray(suppliesRes.data) && suppliesRes.data.length > 0) {
        setSupplies(suppliesRes.data);
      } else {
        setSupplies(MOCK_SUPPLIES_DATA);
      }

      if (sheltersRes.success && Array.isArray(sheltersRes.data) && sheltersRes.data.length > 0) {
        setShelters(sheltersRes.data);
      } else {
        setShelters(MOCK_SHELTERS_DATA);
      }
    } catch {
      setSupplies(MOCK_SUPPLIES_DATA);
      setShelters(MOCK_SHELTERS_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Filter shelters accessible to the logged-in authority for creation modal
  const accessibleShelters = useMemo(() => {
    return shelters.filter((s) => {
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
  }, [shelters, authorityLevel, userState, userDistrict]);

  // Filtered & Sorted Supplies
  const filteredSupplies = useMemo(() => {
    return supplies.filter((s) => {
      // 1. Jurisdiction filter
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

      // 3. Category Filter
      if (selectedCategory !== 'all' && s.category !== selectedCategory) {
        return false;
      }

      // 4. Status Filter
      if (selectedStatus !== 'all' && s.status !== selectedStatus) {
        return false;
      }

      // 5. Shelter Filter
      if (selectedShelterId !== 'all') {
        const itemShelterId = typeof s.shelter === 'object' && s.shelter ? s.shelter._id : s.shelter;
        if (itemShelterId !== selectedShelterId) {
          return false;
        }
      }

      // 6. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = s.name?.toLowerCase().includes(q);
        const matchesDistrict = s.district?.toLowerCase().includes(q);
        const matchesCategory = s.category?.toLowerCase().includes(q);
        const matchesUnit = s.unit?.toLowerCase().includes(q);
        if (!matchesName && !matchesDistrict && !matchesCategory && !matchesUnit) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let comp = 0;
      if (sortBy === 'name') {
        comp = a.name.localeCompare(b.name);
      } else if (sortBy === 'quantity') {
        comp = a.quantity - b.quantity;
      } else if (sortBy === 'status') {
        comp = a.status.localeCompare(b.status);
      } else {
        const dateA = new Date(a.updatedAt || a.lastUpdated || 0).getTime();
        const dateB = new Date(b.updatedAt || b.lastUpdated || 0).getTime();
        comp = dateA - dateB;
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [
    supplies,
    authorityLevel,
    userState,
    userDistrict,
    selectedState,
    selectedDistrict,
    selectedCategory,
    selectedStatus,
    selectedShelterId,
    searchQuery,
    sortBy,
    sortOrder,
  ]);

  // Aggregate KPI Statistics
  const stats = useMemo(() => {
    const relevant = supplies.filter((s) => {
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

    let totalItems = relevant.length;
    let availableCount = 0;
    let lowCount = 0;
    let criticalCount = 0;
    let outOfStockCount = 0;

    let waterLitres = 0;
    let foodPackets = 0;
    let medicalKits = 0;
    let blanketsCount = 0;

    relevant.forEach((s) => {
      if (s.status === 'AVAILABLE') availableCount++;
      else if (s.status === 'LOW') lowCount++;
      else if (s.status === 'CRITICAL') criticalCount++;
      else if (s.status === 'OUT_OF_STOCK') outOfStockCount++;

      const cat = s.category.toLowerCase();
      if (cat === 'water') waterLitres += s.quantity;
      else if (cat === 'food') foodPackets += s.quantity;
      else if (cat === 'medicine' || cat === 'first aid') medicalKits += s.quantity;
      else if (cat === 'blankets') blanketsCount += s.quantity;
    });

    return {
      totalItems,
      availableCount,
      lowCount,
      criticalCount,
      outOfStockCount,
      waterLitres,
      foodPackets,
      medicalKits,
      blanketsCount,
    };
  }, [supplies, authorityLevel, userState, userDistrict]);

  // Create Supply Item Handler
  const handleCreateSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.shelterId || !createForm.unit.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      name: createForm.name.trim(),
      category: createForm.category,
      shelter: createForm.shelterId,
      quantity: Number(createForm.quantity),
      unit: createForm.unit.trim(),
      minimumStock: Number(createForm.minimumStock),
    };

    try {
      const res = await fetchFromApi<Supply>(API_ENDPOINTS.SUPPLIES, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.success && res.data) {
        setSupplies((prev) => [res.data!, ...prev]);
        setSuccessMessage(`Supply item "${payload.name}" registered successfully.`);
      } else {
        // Fallback local mock insertion
        const matchedShelter = shelters.find((s) => s._id === createForm.shelterId);
        const newMockSupply: Supply = {
          _id: `sup-local-${Date.now()}`,
          ...payload,
          state: matchedShelter?.state || userState || 'Madhya Pradesh',
          district: matchedShelter?.district || userDistrict || 'Indore',
          status: computeSupplyStatus(payload.quantity, payload.minimumStock),
          isAvailable: payload.quantity > 0,
          lastUpdated: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        setSupplies((prev) => [newMockSupply, ...prev]);
        setSuccessMessage(`Supply item "${payload.name}" added to inventory.`);
      }
      setIsCreateModalOpen(false);
      resetCreateForm();
    } catch {
      const matchedShelter = shelters.find((s) => s._id === createForm.shelterId);
      const newMockSupply: Supply = {
        _id: `sup-local-${Date.now()}`,
        ...payload,
        state: matchedShelter?.state || userState || 'Madhya Pradesh',
        district: matchedShelter?.district || userDistrict || 'Indore',
        status: computeSupplyStatus(payload.quantity, payload.minimumStock),
        isAvailable: payload.quantity > 0,
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      setSupplies((prev) => [newMockSupply, ...prev]);
      setSuccessMessage(`Supply item "${payload.name}" added to inventory.`);
      setIsCreateModalOpen(false);
      resetCreateForm();
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // Stock Adjustment Handler
  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupply) return;

    setSubmitting(true);
    setError(null);

    const payload = {
      action: stockForm.action,
      amount: Number(stockForm.amount),
      note: stockForm.note.trim() || undefined,
    };

    try {
      const res = await fetchFromApi<Supply>(API_ENDPOINTS.SUPPLY_STOCK(activeSupply._id), {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (res.success && res.data) {
        setSupplies((prev) =>
          prev.map((s) => (s._id === activeSupply._id ? res.data! : s))
        );
        setSuccessMessage(`Stock for "${activeSupply.name}" updated successfully.`);
      } else {
        // Fallback local update
        let newQty = activeSupply.quantity;
        if (payload.action === 'ADD') newQty += payload.amount;
        else if (payload.action === 'REMOVE') newQty = Math.max(0, newQty - payload.amount);
        else if (payload.action === 'SET') newQty = payload.amount;

        const updated: Supply = {
          ...activeSupply,
          quantity: newQty,
          status: computeSupplyStatus(newQty, activeSupply.minimumStock),
          isAvailable: newQty > 0,
          lastUpdated: new Date().toISOString(),
        };

        setSupplies((prev) => prev.map((s) => (s._id === activeSupply._id ? updated : s)));
        setSuccessMessage(`Stock for "${activeSupply.name}" updated to ${newQty} ${activeSupply.unit}.`);
      }
      setIsStockModalOpen(false);
      setActiveSupply(null);
    } catch {
      let newQty = activeSupply.quantity;
      if (payload.action === 'ADD') newQty += payload.amount;
      else if (payload.action === 'REMOVE') newQty = Math.max(0, newQty - payload.amount);
      else if (payload.action === 'SET') newQty = payload.amount;

      const updated: Supply = {
        ...activeSupply,
        quantity: newQty,
        status: computeSupplyStatus(newQty, activeSupply.minimumStock),
        isAvailable: newQty > 0,
        lastUpdated: new Date().toISOString(),
      };

      setSupplies((prev) => prev.map((s) => (s._id === activeSupply._id ? updated : s)));
      setSuccessMessage(`Stock for "${activeSupply.name}" updated to ${newQty} ${activeSupply.unit}.`);
      setIsStockModalOpen(false);
      setActiveSupply(null);
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  // Edit Supply Metadata Handler
  const handleEditSupply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupply) return;

    setSubmitting(true);
    setError(null);

    const payload = {
      name: editForm.name.trim(),
      category: editForm.category,
      unit: editForm.unit.trim(),
      minimumStock: Number(editForm.minimumStock),
    };

    try {
      const res = await fetchFromApi<Supply>(API_ENDPOINTS.SUPPLY_DETAIL(activeSupply._id), {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (res.success && res.data) {
        setSupplies((prev) =>
          prev.map((s) => (s._id === activeSupply._id ? res.data! : s))
        );
      } else {
        const updated: Supply = {
          ...activeSupply,
          ...payload,
          status: computeSupplyStatus(activeSupply.quantity, payload.minimumStock),
          lastUpdated: new Date().toISOString(),
        };
        setSupplies((prev) => prev.map((s) => (s._id === activeSupply._id ? updated : s)));
      }
      setSuccessMessage(`Supply "${payload.name}" updated successfully.`);
      setIsEditModalOpen(false);
      setActiveSupply(null);
    } catch {
      const updated: Supply = {
        ...activeSupply,
        ...payload,
        status: computeSupplyStatus(activeSupply.quantity, payload.minimumStock),
        lastUpdated: new Date().toISOString(),
      };
      setSupplies((prev) => prev.map((s) => (s._id === activeSupply._id ? updated : s)));
      setSuccessMessage(`Supply "${payload.name}" updated successfully.`);
      setIsEditModalOpen(false);
      setActiveSupply(null);
    } finally {
      setSubmitting(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const openStockModal = (supply: Supply) => {
    setActiveSupply(supply);
    setStockForm({
      action: 'ADD',
      amount: 50,
      note: '',
    });
    setIsStockModalOpen(true);
  };

  const openDetailModal = (supply: Supply) => {
    setActiveSupply(supply);
    setIsDetailModalOpen(true);
  };

  const openEditModal = (supply: Supply) => {
    setActiveSupply(supply);
    setEditForm({
      name: supply.name,
      category: supply.category,
      unit: supply.unit,
      minimumStock: supply.minimumStock,
    });
    setIsEditModalOpen(true);
  };

  const resetCreateForm = () => {
    setCreateForm({
      name: '',
      category: 'Water',
      shelterId: accessibleShelters.length > 0 ? accessibleShelters[0]._id : '',
      quantity: 500,
      unit: 'litres',
      minimumStock: 100,
    });
    setError(null);
  };

  const openCreateModal = () => {
    resetCreateForm();
    setIsCreateModalOpen(true);
  };

  // Helper to get shelter name from string/object
  const getShelterName = (shelterField: string | Shelter) => {
    if (typeof shelterField === 'object' && shelterField) {
      return shelterField.name;
    }
    const matched = shelters.find((s) => s._id === shelterField);
    return matched ? matched.name : 'Emergency Safe Haven';
  };

  // Helper for category icon
  const getCategoryIcon = (category: SupplyCategory) => {
    switch (category) {
      case 'Water':
        return <Droplets className="w-3.5 h-3.5 text-blue-500" />;
      case 'Food':
        return <Utensils className="w-3.5 h-3.5 text-amber-500" />;
      case 'Medicine':
      case 'First Aid':
        return <HeartPulse className="w-3.5 h-3.5 text-red-500" />;
      case 'Blankets':
        return <Bed className="w-3.5 h-3.5 text-indigo-500" />;
      case 'Tents':
        return <Tent className="w-3.5 h-3.5 text-emerald-500" />;
      default:
        return <Package className="w-3.5 h-3.5 text-slate-500" />;
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
                <Package className="w-4 h-4" />
              </span>
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Relief Supply & Inventory Operations
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {authorityLevel === 'district_admin'
                  ? `${userDistrict}, ${userState}`
                  : authorityLevel === 'state_admin'
                  ? `${userState} State Grid`
                  : 'National Grid'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Live shelter-level stock tracking, threshold warnings, and emergency resource dispatching.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadInventory}
              disabled={loading}
              title="Refresh Inventory"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors shadow-xs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Supply</span>
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

        {/* ─── Top Statistics KPI Grid ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Total Items */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Total Supply Items</span>
              <Package className="w-4 h-4 text-blue-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-slate-900 font-mono">{stats.totalItems}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Tracked SKUs</span>
            </div>
          </div>

          {/* Available Stock */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Available (&gt;2x min)</span>
              <PulsingDot variant="live" size="sm" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-emerald-600 font-mono">{stats.availableCount}</span>
              <span className="text-[10px] text-emerald-600/80 block mt-0.5">Adequate Reserves</span>
            </div>
          </div>

          {/* Low Stock */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Low Stock (&le;2x min)</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-amber-600 font-mono">{stats.lowCount}</span>
              <span className="text-[10px] text-amber-600/80 block mt-0.5">Replenishment Needed</span>
            </div>
          </div>

          {/* Critical Stock */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Critical (&le; min)</span>
              <AlertTriangle className="w-4 h-4 text-orange-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-orange-600 font-mono">{stats.criticalCount}</span>
              <span className="text-[10px] text-orange-600/80 block mt-0.5">Near Depletion</span>
            </div>
          </div>

          {/* Out of Stock */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Depleted (0)</span>
              <XCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-red-600 font-mono">{stats.outOfStockCount}</span>
              <span className="text-[10px] text-red-600/80 block mt-0.5">Emergency Shortage</span>
            </div>
          </div>
        </div>

        {/* ─── Resource Highlights Strip ─── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Essential Resource Telemetry:</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs">
              <Droplets className="w-4 h-4 text-blue-600" />
              <div>
                <span className="text-[10px] text-blue-800 font-bold block">Water</span>
                <span className="font-mono font-bold text-slate-900">{stats.waterLitres.toLocaleString()} L</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50/70 border border-amber-100 text-xs">
              <Utensils className="w-4 h-4 text-amber-600" />
              <div>
                <span className="text-[10px] text-amber-800 font-bold block">Food Kits</span>
                <span className="font-mono font-bold text-slate-900">{stats.foodPackets.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50/70 border border-red-100 text-xs">
              <HeartPulse className="w-4 h-4 text-red-600" />
              <div>
                <span className="text-[10px] text-red-800 font-bold block">Medical / First Aid</span>
                <span className="font-mono font-bold text-slate-900">{stats.medicalKits.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs">
              <Bed className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="text-[10px] text-indigo-800 font-bold block">Blankets</span>
                <span className="font-mono font-bold text-slate-900">{stats.blanketsCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Operational Filter & Search Bar ─── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search supply item, district, or unit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium"
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

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium"
              >
                <option value="all">All Categories</option>
                {SUPPLY_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
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
                <option value="AVAILABLE">Available</option>
                <option value="LOW">Low Stock</option>
                <option value="CRITICAL">Critical</option>
                <option value="OUT_OF_STOCK">Out of Stock</option>
              </select>
            </div>

            {/* State Filter (locked for state/district admins) */}
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
                {allStates.map((s: string) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* District Filter (locked for district admin) */}
            <div>
              <select
                value={selectedDistrict}
                disabled={authorityLevel === 'district_admin' || availableDistricts.length === 0}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-medium disabled:opacity-60"
              >
                <option value="all">All Districts</option>
                {availableDistricts.map((d: string) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ─── Inventory Table / Cards ─── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                Relief Supplies Inventory
              </span>
              <span className="text-[10px] font-bold bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded-full">
                {filteredSupplies.length} Items Listed
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
                <option value="updatedAt">Last Updated</option>
                <option value="name">Name</option>
                <option value="quantity">Quantity</option>
                <option value="status">Status</option>
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

          {filteredSupplies.length === 0 ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center space-y-3">
              <Package className="w-10 h-10 text-slate-300 stroke-1" />
              <div>
                <p className="font-bold text-sm text-slate-700">No supply items match your search filters</p>
                <p className="text-xs text-slate-400 mt-0.5">Try resetting search keywords or category filters.</p>
              </div>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
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
                    <th className="py-3 px-4">Supply Item</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Shelter & Location</th>
                    <th className="py-3 px-3 text-right">In Stock</th>
                    <th className="py-3 px-3 text-right">Min Threshold</th>
                    <th className="py-3 px-4 min-w-[140px]">Stock Health</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSupplies.map((supply) => {
                    const statusColor = getSupplyStatusColor(supply.status);
                    const statusLabel = getSupplyStatusLabel(supply.status);
                    const shelterName = getShelterName(supply.shelter);

                    // Health indicator (target is minimumStock * 2)
                    const targetStock = Math.max(1, supply.minimumStock * 2);
                    const healthPct = Math.min(100, Math.round((supply.quantity / targetStock) * 100));

                    const barColor =
                      supply.status === 'OUT_OF_STOCK'
                        ? 'bg-red-600'
                        : supply.status === 'CRITICAL'
                        ? 'bg-orange-500'
                        : supply.status === 'LOW'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500';

                    return (
                      <tr key={supply._id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Supply Name */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            {getCategoryIcon(supply.category)}
                            <span>{supply.name}</span>
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            ID: {supply._id.slice(-6)} &bull; Unit: {supply.unit}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-3">
                          <span className="font-semibold text-slate-700 text-xs">{supply.category}</span>
                        </td>

                        {/* Shelter & District */}
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-slate-800 text-xs block">{shelterName}</span>
                          <span className="text-[10px] text-slate-400 block">
                            {supply.district}, {supply.state}
                          </span>
                        </td>

                        {/* Current Quantity */}
                        <td className="py-3.5 px-3 text-right">
                          <span className="font-mono font-black text-sm text-slate-900">
                            {supply.quantity.toLocaleString()}
                          </span>{' '}
                          <span className="text-[10px] text-slate-500 font-semibold">{supply.unit}</span>
                        </td>

                        {/* Min Stock */}
                        <td className="py-3.5 px-3 text-right font-mono font-semibold text-slate-500 text-xs">
                          {supply.minimumStock.toLocaleString()} {supply.unit}
                        </td>

                        {/* Stock Health Bar */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 mb-1">
                            <span>{supply.quantity} {supply.unit}</span>
                            <span className="text-slate-400 font-normal">min {supply.minimumStock}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                              style={{ width: `${Math.max(4, healthPct)}%` }}
                            />
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-3">
                          <span
                            className={`inline-block px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border ${statusColor}`}
                          >
                            {statusLabel}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openDetailModal(supply)}
                              title="View Details"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => openStockModal(supply)}
                              title="Adjust Stock (+/- / Set)"
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] transition-colors inline-flex items-center gap-1"
                            >
                              <Sliders className="w-3 h-3" />
                              <span>Stock</span>
                            </button>

                            <button
                              onClick={() => openEditModal(supply)}
                              title="Edit Supply Info"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
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

      {/* ─── Create Supply Modal ─── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Register Relief Supply Item</h3>
                  <p className="text-[10px] text-slate-400">Link emergency inventory directly to an operational shelter</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSupply} className="p-6 overflow-y-auto space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Supply Name */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Supply Item Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Drinking Water Cans (20L)"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                />
              </div>

              {/* Category & Linked Shelter */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                    Category *
                  </label>
                  <select
                    value={createForm.category}
                    onChange={(e) => setCreateForm({ ...createForm, category: e.target.value as SupplyCategory })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                  >
                    {SUPPLY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                    Linked Shelter *
                  </label>
                  <select
                    required
                    value={createForm.shelterId}
                    onChange={(e) => setCreateForm({ ...createForm, shelterId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                  >
                    <option value="" disabled>
                      Select Shelter
                    </option>
                    {accessibleShelters.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name} ({s.district})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Initial Quantity & Measurement Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                    Initial Quantity *
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={createForm.quantity}
                    onChange={(e) => setCreateForm({ ...createForm, quantity: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-mono font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                    Unit of Measurement *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. litres, packets, kits, pieces"
                    value={createForm.unit}
                    onChange={(e) => setCreateForm({ ...createForm, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Minimum Stock Threshold */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Minimum Stock Threshold (Critical Warning Level) *
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={createForm.minimumStock}
                  onChange={(e) => setCreateForm({ ...createForm, minimumStock: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-mono font-bold"
                />
                <p className="text-[10px] text-slate-400">
                  When stock falls below this quantity, it will be flagged as CRITICAL for urgent replenishment.
                </p>
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
                  {submitting ? 'Registering...' : 'Register Supply'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Update Stock Modal ─── */}
      {isStockModalOpen && activeSupply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Adjust Supply Stock</h3>
                  <p className="text-[10px] text-slate-400">{activeSupply.name}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsStockModalOpen(false);
                  setActiveSupply(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustment} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Mode Toggle */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Adjustment Action
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setStockForm({ ...stockForm, action: 'ADD' })}
                    className={`py-1.5 rounded-lg font-bold text-xs transition-all ${
                      stockForm.action === 'ADD'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    + Add Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockForm({ ...stockForm, action: 'REMOVE' })}
                    className={`py-1.5 rounded-lg font-bold text-xs transition-all ${
                      stockForm.action === 'REMOVE'
                        ? 'bg-red-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    - Dispatch
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockForm({ ...stockForm, action: 'SET' })}
                    className={`py-1.5 rounded-lg font-bold text-xs transition-all ${
                      stockForm.action === 'SET'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    = Set Exact
                  </button>
                </div>
              </div>

              {/* Adjustment Amount */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Quantity Amount ({activeSupply.unit})
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={stockForm.amount}
                  onChange={(e) => setStockForm({ ...stockForm, amount: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-mono font-bold text-base"
                />
              </div>

              {/* Real-time Calculation Preview Box */}
              {(() => {
                const cur = activeSupply.quantity;
                const amt = Number(stockForm.amount) || 0;
                let next = cur;
                if (stockForm.action === 'ADD') next = cur + amt;
                else if (stockForm.action === 'REMOVE') next = Math.max(0, cur - amt);
                else if (stockForm.action === 'SET') next = amt;

                const nextStatus = computeSupplyStatus(next, activeSupply.minimumStock);
                const nextStatusLabel = getSupplyStatusLabel(nextStatus);
                const nextStatusColor = getSupplyStatusColor(nextStatus);

                return (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Current Stock:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {cur} {activeSupply.unit}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500 font-medium">Adjustment:</span>
                      <span
                        className={`font-mono font-bold ${
                          stockForm.action === 'ADD'
                            ? 'text-emerald-700'
                            : stockForm.action === 'REMOVE'
                            ? 'text-red-700'
                            : 'text-blue-700'
                        }`}
                      >
                        {stockForm.action === 'ADD' ? `+${amt}` : stockForm.action === 'REMOVE' ? `-${amt}` : `=${amt}`} {activeSupply.unit}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/80 flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-900">Resulting Stock:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-slate-900">
                          {next} {activeSupply.unit}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase ${nextStatusColor}`}>
                          {nextStatusLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Optional Note */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Adjustment Log Note (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received convoy delivery batch #104"
                  value={stockForm.note}
                  onChange={(e) => setStockForm({ ...stockForm, note: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsStockModalOpen(false);
                    setActiveSupply(null);
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
                  {submitting ? 'Updating...' : 'Update Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Supply Detail Modal ─── */}
      {isDetailModalOpen && activeSupply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 shadow-xs">
                  {getCategoryIcon(activeSupply.category)}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">{activeSupply.name}</h3>
                  <p className="text-[10px] text-slate-400">
                    Category: {activeSupply.category} &bull; {activeSupply.district}, {activeSupply.state}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setActiveSupply(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              {/* Stock Threshold Visualizer */}
              {(() => {
                const targetStock = Math.max(1, activeSupply.minimumStock * 2);
                const healthPct = Math.min(100, Math.round((activeSupply.quantity / targetStock) * 100));
                const statusColor = getSupplyStatusColor(activeSupply.status);
                const statusLabel = getSupplyStatusLabel(activeSupply.status);

                return (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                        Live Stock Health Indicator
                      </span>
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-xs">
                        <span className="text-[10px] text-slate-400 block font-semibold">Available Stock</span>
                        <span className="font-bold text-base text-slate-900 font-mono">
                          {activeSupply.quantity.toLocaleString()} {activeSupply.unit}
                        </span>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-xs">
                        <span className="text-[10px] text-slate-400 block font-semibold">Minimum Threshold</span>
                        <span className="font-bold text-base text-slate-600 font-mono">
                          {activeSupply.minimumStock.toLocaleString()} {activeSupply.unit}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold text-slate-600">
                        <span>Threshold Margin</span>
                        <span>
                          {activeSupply.quantity > activeSupply.minimumStock
                            ? `${activeSupply.quantity - activeSupply.minimumStock} ${activeSupply.unit} above threshold`
                            : `Short by ${activeSupply.minimumStock - activeSupply.quantity} ${activeSupply.unit}`}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            activeSupply.status === 'OUT_OF_STOCK'
                              ? 'bg-red-600'
                              : activeSupply.status === 'CRITICAL'
                              ? 'bg-orange-500'
                              : activeSupply.status === 'LOW'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.max(4, healthPct)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Key Details List */}
              <div className="space-y-2.5 divide-y divide-slate-100">
                <div className="pt-2 flex justify-between items-start">
                  <span className="text-slate-500 font-medium">Shelter Facility:</span>
                  <span className="font-semibold text-slate-900 text-right max-w-[240px]">
                    {getShelterName(activeSupply.shelter)}
                  </span>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Jurisdiction:</span>
                  <span className="font-semibold text-slate-900">
                    {activeSupply.district}, {activeSupply.state}
                  </span>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Category:</span>
                  <span className="font-semibold text-slate-900">{activeSupply.category}</span>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Last Inventory Update:</span>
                  <span className="text-slate-700">
                    {new Date(activeSupply.updatedAt || activeSupply.lastUpdated || Date.now()).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    openStockModal(activeSupply);
                  }}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs inline-flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Adjust Stock</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Edit Supply Modal ─── */}
      {isEditModalOpen && activeSupply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900">Edit Supply Specifications</h3>
                  <p className="text-[10px] text-slate-400">Modify threshold settings and naming</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setActiveSupply(null);
                }}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSupply} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Supply Item Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                    Category
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value as SupplyCategory })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                  >
                    {SUPPLY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                    Unit
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.unit}
                    onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">
                  Minimum Stock Threshold
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  value={editForm.minimumStock}
                  onChange={(e) => setEditForm({ ...editForm, minimumStock: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-900 font-mono font-bold"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setActiveSupply(null);
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
                  {submitting ? 'Saving...' : 'Save Specifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
