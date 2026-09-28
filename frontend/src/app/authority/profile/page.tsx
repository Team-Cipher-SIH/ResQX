'use client';

import { useState, useEffect, useCallback } from 'react';
import AuthorityHeader from '@/components/authority/AuthorityHeader';
import { fetchFromApi, API_ENDPOINTS } from '@/lib/api';
import { LoadingState, ErrorState } from '@/components/authority/LoadingStates';
import {
  User, Mail, Phone, MapPin, Building2, Shield, Clock, Save, Loader2,
} from 'lucide-react';
import { JurisdictionBadge } from '@/components/authority/Badges';

interface ProfileData {
  _id: string;
  name: string;
  email: string;
  role: string;
  authorityLevel: string | null;
  state: string | null;
  district: string | null;
  department: string | null;
  phone: string | null;
  address: string | null;
  isAvailable: boolean;
  createdAt: string;
}

export default function AuthorityProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formDepartment, setFormDepartment] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchFromApi<ProfileData>(API_ENDPOINTS.PROFILE);
    if (res.success && res.data) {
      setProfile(res.data);
      setFormName(res.data.name || '');
      setFormPhone(res.data.phone || '');
      setFormAddress(res.data.address || '');
      setFormDepartment(res.data.department || '');
    } else {
      setError(res.message || 'Failed to load profile');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    const res = await fetchFromApi(API_ENDPOINTS.PROFILE, {
      method: 'PATCH',
      body: JSON.stringify({
        name: formName,
        phone: formPhone,
        address: formAddress,
        department: formDepartment,
      }),
    });
    if (res.success) {
      setSaveMessage('Profile updated successfully');
      setEditing(false);
      // Update localStorage
      try {
        const stored = localStorage.getItem('resqtech_user_data');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.name = formName;
          localStorage.setItem('resqtech_user_data', JSON.stringify(parsed));
        }
      } catch { /* ignore */ }
      fetchProfile();
    } else {
      setSaveMessage(res.message || 'Failed to update profile');
    }
    setSaving(false);
  };

  const levelLabel = profile?.authorityLevel?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) || 'Authority';

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <AuthorityHeader />

      <div className="p-6 max-w-4xl mx-auto w-full space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-slate-900">Authority Profile</h1>

        {loading ? (
          <LoadingState message="Loading profile..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchProfile} />
        ) : profile ? (
          <div className="space-y-6">
            {/* Profile Header Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition-all duration-200">
              <div className="flex items-start gap-5">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white text-2xl font-bold shrink-0 shadow-xs">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{profile.email}</p>
                  <div className="mt-2">
                    <JurisdictionBadge level={profile.authorityLevel} state={profile.state} district={profile.district} />
                  </div>
                </div>
                <button
                  onClick={() => setEditing(!editing)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-180 active:scale-95 ${
                    editing ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  {editing ? 'Cancel' : 'Edit Profile'}
                </button>
              </div>
            </div>

            {saveMessage && (
              <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
                saveMessage.includes('success') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {saveMessage}
              </div>
            )}

            {/* Account Information */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Account Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoField icon={User} label="Full Name" value={editing ? undefined : profile.name}>
                  {editing && (
                    <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300" />
                  )}
                </InfoField>
                <InfoField icon={Mail} label="Email" value={profile.email} readonly />
                <InfoField icon={Phone} label="Phone" value={editing ? undefined : (profile.phone || 'Not set')}>
                  {editing && (
                    <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="+91 XXXXX XXXXX"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300" />
                  )}
                </InfoField>
                <InfoField icon={MapPin} label="Address" value={editing ? undefined : (profile.address || 'Not set')}>
                  {editing && (
                    <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Office address..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300" />
                  )}
                </InfoField>
              </div>
            </div>

            {/* Authority Details */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">Authority Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoField icon={Shield} label="Role" value={profile.role.charAt(0).toUpperCase() + profile.role.slice(1)} readonly />
                <InfoField icon={Shield} label="Authority Level" value={levelLabel} readonly />
                <InfoField icon={MapPin} label="State" value={profile.state || 'Not assigned'} readonly />
                <InfoField icon={MapPin} label="District" value={profile.district || 'Not assigned'} readonly />
                <InfoField icon={Building2} label="Department" value={editing ? undefined : (profile.department || 'Not set')}>
                  {editing && (
                    <input type="text" value={formDepartment} onChange={(e) => setFormDepartment(e.target.value)} placeholder="e.g. NDRF, Fire Services..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300" />
                  )}
                </InfoField>
                <InfoField icon={Clock} label="Member Since"
                  value={new Date(profile.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })} readonly />
              </div>

              <div className="mt-4 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-xs text-blue-600">
                  <Shield className="w-3 h-3 inline mr-1" />
                  State, district, and authority level can only be changed by a system administrator.
                </p>
              </div>
            </div>

            {editing && (
              <div className="flex justify-end">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function InfoField({
  icon: Icon,
  label,
  value,
  readonly,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
  readonly?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-slate-400" />
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
        {readonly && <span className="text-[10px] text-slate-300">(read-only)</span>}
      </div>
      {children || <p className="text-sm text-slate-800 font-medium">{value}</p>}
    </div>
  );
}
