'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Search,
  Building2,
  MapPin,
  Radio,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Mail,
  Phone,
  User,
  Shield,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { API_ENDPOINTS, fetchFromApi } from '@/lib/api';
import { INDIA_STATES } from '@/data/indiaStatesDistricts';

interface Officer {
  _id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'authority' | 'admin';
  authorityLevel: 'central' | 'state_admin' | 'district_admin' | 'field_responder' | 'department';
  jurisdictionId?: string | null;
  state?: string | null;
  district?: string | null;
  department?: string | null;
  isAvailable?: boolean;
  createdAt?: string;
  jurisdiction?: {
    id: string | null;
    name: string;
    level: string;
    state: string | null;
    district: string | null;
  } | null;
}

const DEPARTMENTS = [
  'Disaster Management Authority',
  'NDRF (National Disaster Response)',
  'SDRF (State Disaster Response)',
  'Fire & Emergency Services',
  'Police & Law Enforcement',
  'Public Health & Emergency Medicine',
  'Civil Defence & Home Guards',
  'Municipal Rapid Action Team',
];

export default function OfficersManagementPage() {
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form inputs
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formLevel, setFormLevel] = useState<'district_admin' | 'state_admin' | 'field_responder' | 'department'>('district_admin');
  const [formState, setFormState] = useState('');
  const [formDistrict, setFormDistrict] = useState('');
  const [formDept, setFormDept] = useState(DEPARTMENTS[0]);

  // Current logged in user info
  const [currentUserLevel, setCurrentUserLevel] = useState<string>('central');
  const [userState, setUserState] = useState<string | null>(null);
  const [userDistrict, setUserDistrict] = useState<string | null>(null);

  useEffect(() => {
    try {
      const user = getCurrentUser();
      if (user) {
        const level = user.role === 'admin' ? 'central' : user.authorityLevel || 'central';
        setCurrentUserLevel(level);
        setUserState(user.jurisdictionState || user.state || null);
        setUserDistrict(user.jurisdictionDistrict || user.district || null);

        // Pre-configure initial form values based on logged in user level
        if (level === 'state_admin' && (user.jurisdictionState || user.state)) {
          setFormState(user.jurisdictionState || user.state || '');
          setFormLevel('district_admin');
        } else if (level === 'district_admin') {
          setFormState(user.jurisdictionState || user.state || '');
          setFormDistrict(user.jurisdictionDistrict || user.district || '');
          setFormLevel('field_responder');
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch Officers List
  const fetchOfficers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchFromApi<{ data: Officer[]; count: number }>(API_ENDPOINTS.OFFICERS, {
        method: 'GET',
      });
      if (res.success && res.data) {
        setOfficers(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load officers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOfficers();
  }, [fetchOfficers]);

  // Available districts based on selected state in modal
  const modalDistricts = useMemo(() => {
    if (!formState) return [];
    const found = INDIA_STATES.find((s) => s.name.toLowerCase() === formState.toLowerCase());
    return found ? found.districts : [];
  }, [formState]);

  // Handle Form Submit
  const handleProvisionOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!formName || !formEmail || !formPassword) {
      setErrorMsg('Full name, official email, and temporary password are required.');
      return;
    }

    if (formLevel === 'state_admin' && !formState) {
      setErrorMsg('State is required for State Administrator.');
      return;
    }

    if (formLevel === 'district_admin' && (!formState || !formDistrict)) {
      setErrorMsg('Both State and District are required for District Administrator.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: formName,
        email: formEmail,
        password: formPassword,
        phone: formPhone || undefined,
        authorityLevel: formLevel,
        state: formState || undefined,
        district: formDistrict || undefined,
        department: formDept,
      };

      const res = await fetchFromApi<{ data: Officer }>(API_ENDPOINTS.OFFICERS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.success) {
        setSuccessMsg(`Officer ${formName} provisioned successfully!`);
        // Reset form
        setFormName('');
        setFormEmail('');
        setFormPhone('');
        setFormPassword('');
        fetchOfficers();
        setTimeout(() => {
          setIsModalOpen(false);
          setSuccessMsg(null);
        }, 1800);
      } else {
        setErrorMsg(res.error || res.message || 'Failed to provision officer.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered officers list
  const filteredOfficers = useMemo(() => {
    return officers.filter((off) => {
      const matchesSearch =
        !search ||
        off.name.toLowerCase().includes(search.toLowerCase()) ||
        off.email.toLowerCase().includes(search.toLowerCase()) ||
        (off.department && off.department.toLowerCase().includes(search.toLowerCase())) ||
        (off.jurisdictionId && off.jurisdictionId.toLowerCase().includes(search.toLowerCase())) ||
        (off.district && off.district.toLowerCase().includes(search.toLowerCase())) ||
        (off.state && off.state.toLowerCase().includes(search.toLowerCase()));

      const matchesLevel = selectedLevel === 'all' || off.authorityLevel === selectedLevel;
      const matchesDept = selectedDept === 'all' || off.department === selectedDept;

      return matchesSearch && matchesLevel && matchesDept;
    });
  }, [officers, search, selectedLevel, selectedDept]);

  // Statistics calculation
  const stats = useMemo(() => {
    return {
      total: officers.length,
      stateAdmins: officers.filter((o) => o.authorityLevel === 'state_admin').length,
      districtAdmins: officers.filter((o) => o.authorityLevel === 'district_admin').length,
      responders: officers.filter((o) => o.authorityLevel === 'field_responder').length,
    };
  }, [officers]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-blue-600" />
            <span>Officers & Personnel Management</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Provision, manage, and monitor disaster response authorities and regional command jurisdictions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOfficers}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md shadow-blue-600/20 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Provision Officer</span>
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Officers</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{stats.total}</p>
          <span className="text-[11px] text-slate-400 font-medium">In your jurisdiction scope</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">State Leads</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{stats.stateAdmins}</p>
          <span className="text-[11px] text-slate-400 font-medium">State-level administrators</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">District Leads</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{stats.districtAdmins}</p>
          <span className="text-[11px] text-slate-400 font-medium">District command officers</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Field Responders</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Radio className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-2">{stats.responders}</p>
          <span className="text-[11px] text-slate-400 font-medium">Ground response personnel</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by officer name, official email, department, or jurisdiction ID..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer text-slate-700 font-semibold"
            >
              <option value="all">All Tiers</option>
              <option value="central">Central / National</option>
              <option value="state_admin">State Admin</option>
              <option value="district_admin">District Admin</option>
              <option value="field_responder">Field Responder</option>
              <option value="department">Department</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-600">
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer text-slate-700 font-semibold max-w-[160px] truncate"
            >
              <option value="all">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Officers Directory Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3.5 px-4">Officer / Official Contact</th>
                <th className="py-3.5 px-4">Tier & Role</th>
                <th className="py-3.5 px-4">Assigned Jurisdiction</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      <span>Loading active officers...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOfficers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">No officers found</p>
                      <p className="text-xs text-slate-400">Try adjusting your filters or provision a new officer above.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredOfficers.map((officer) => {
                  const levelColors: Record<string, string> = {
                    central: 'bg-purple-50 text-purple-700 border-purple-200',
                    state_admin: 'bg-indigo-50 text-indigo-700 border-indigo-200',
                    district_admin: 'bg-blue-50 text-blue-700 border-blue-200',
                    field_responder: 'bg-amber-50 text-amber-700 border-amber-200',
                    department: 'bg-slate-100 text-slate-700 border-slate-200',
                  };

                  return (
                    <tr key={officer._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-bold text-xs shadow-xs shrink-0">
                            {officer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-xs">{officer.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{officer.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Tier & Role */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider border ${
                            levelColors[officer.authorityLevel] || levelColors.central
                          }`}
                        >
                          {officer.authorityLevel?.replace('_', ' ') || 'Authority'}
                        </span>
                      </td>

                      {/* Jurisdiction */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            {officer.district && officer.state
                              ? `${officer.district}, ${officer.state}`
                              : officer.state
                              ? `${officer.state} (Statewide)`
                              : 'National / Central Scope'}
                          </span>
                          {officer.jurisdictionId && (
                            <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded w-fit">
                              ID: {officer.jurisdictionId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3.5 px-4">
                        <span className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          {officer.department || 'General Disaster Ops'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Active
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROVISION OFFICER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Provision Disaster Authority</h3>
                  <p className="text-xs text-slate-500">Create officer credentials and bind regional jurisdiction scope.</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleProvisionOfficer} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Officer Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Officer Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Ramesh Patil"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Official Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Official Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. ramesh.pune@disaster.gov.in"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Phone / Emergency Contact</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Initial Temporary Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Initial Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition"
                      tabIndex={-1}
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Authority Level */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Authority Tier <span className="text-red-500">*</span>
                </label>
                <select
                  value={formLevel}
                  onChange={(e) => setFormLevel(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-800"
                >
                  {currentUserLevel === 'central' && <option value="state_admin">State Administrator</option>}
                  {(currentUserLevel === 'central' || currentUserLevel === 'state_admin') && (
                    <option value="district_admin">District Administrator</option>
                  )}
                  <option value="field_responder">Field Responder / Team Member</option>
                  <option value="department">Department Lead</option>
                </select>
              </div>

              {/* Jurisdiction State & District Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                {/* State Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Assigned State {currentUserLevel !== 'central' && <span className="text-[10px] text-blue-600 font-normal">(Locked)</span>}
                  </label>
                  <select
                    value={formState}
                    disabled={currentUserLevel === 'state_admin' || currentUserLevel === 'district_admin'}
                    onChange={(e) => {
                      setFormState(e.target.value);
                      setFormDistrict('');
                    }}
                    className={`w-full px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold ${
                      currentUserLevel !== 'central'
                        ? 'bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200'
                        : 'bg-slate-50 text-slate-800 border border-slate-200'
                    }`}
                  >
                    <option value="">Select State</option>
                    {INDIA_STATES.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* District Dropdown */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Assigned District {currentUserLevel === 'district_admin' && <span className="text-[10px] text-blue-600 font-normal">(Locked)</span>}
                  </label>
                  <select
                    value={formDistrict}
                    disabled={currentUserLevel === 'district_admin' || (!formState && currentUserLevel === 'central')}
                    onChange={(e) => setFormDistrict(e.target.value)}
                    className={`w-full px-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold ${
                      currentUserLevel === 'district_admin'
                        ? 'bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200'
                        : 'bg-slate-50 text-slate-800 border border-slate-200'
                    }`}
                  >
                    <option value="">Select District</option>
                    {modalDistricts.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Department Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Disaster Department</label>
                <select
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold text-slate-800"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/20 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-3.5 h-3.5" />
                      <span>Create & Assign Officer</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
