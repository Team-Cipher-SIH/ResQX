'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchFromApi, clearStoredTokens } from '@/lib/api';
import { Mail, Phone, MapPin, Shield, Edit3, LogOut, Check, X, Loader2, AlertCircle } from 'lucide-react';

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  role: 'citizen' | 'authority' | 'admin';
  phone?: string | null;
  address?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export default function ProfileCard() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        const response = await fetchFromApi<UserProfile>('/auth/profile');
        if (isMounted) {
          if (response.success && response.data) {
            const user = response.data;
            setProfile(user);
            setEditName(user.name || '');
            setEditPhone(user.phone || '');
            setEditAddress(user.address || '');
            setError(null);
          } else {
            setError(response.message || response.error || 'Failed to load profile');
          }
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
        if (isMounted) {
          setError('Unable to load citizen profile information');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setIsSaving(true);
    setError(null);

    // Only send fields that actually changed per API contract
    const payload: Record<string, string> = {};
    if (editName.trim() && editName.trim() !== profile.name) {
      payload.name = editName.trim();
    }
    if (editPhone.trim() !== (profile.phone || '')) {
      payload.phone = editPhone.trim();
    }
    if (editAddress.trim() !== (profile.address || '')) {
      payload.address = editAddress.trim();
    }

    if (Object.keys(payload).length === 0) {
      setIsEditing(false);
      setIsSaving(false);
      return;
    }

    try {
      const response = await fetchFromApi<UserProfile>('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      if (response.success) {
        const updated = (response.data || response) as UserProfile;
        setProfile((prev) => ({
          ...prev!,
          ...updated,
          name: updated.name || prev!.name,
          phone: updated.phone !== undefined ? updated.phone : prev!.phone,
          address: updated.address !== undefined ? updated.address : prev!.address,
        }));
        setIsEditing(false);
      } else {
        setError(response.message || response.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(err instanceof Error ? err.message : 'Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetchFromApi('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout endpoint call completed with warning:', err);
    } finally {
      clearStoredTokens();
      router.push('/citizen/login');
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-center py-10 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600 mr-2" />
        <span className="text-xs">Loading profile...</span>
      </div>
    );
  }

  if (!profile && error) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-xs text-red-800 flex items-center justify-between">
        <span>{error}</span>
        <button
          type="button"
          onClick={() => handleLogout()}
          className="font-bold underline ml-4 hover:text-red-950"
        >
          Sign in again
        </button>
      </div>
    );
  }

  return (
    <section id="profile-card" className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8 hover:border-slate-300 transition-all duration-200">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 font-extrabold text-xl text-white shadow-md shadow-emerald-500/20">
            {profile?.name ? profile.name.charAt(0).toUpperCase() : 'C'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900">{profile?.name || 'Citizen'}</h3>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                {profile?.role || 'Citizen'}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Mail className="h-3 w-3 text-slate-400" />
              {profile?.email}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEditing ? (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-all duration-180 active:scale-95 shadow-xs"
            >
              <Edit3 className="h-3.5 w-3.5 text-slate-500" />
              Edit Profile
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all duration-180 active:scale-95 shadow-xs"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200/80 bg-red-50/50 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 transition-all duration-180 active:scale-95 shadow-xs disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {isLoggingOut ? 'Logging out...' : 'Sign Out'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSaveProfile} className="space-y-4 pt-2 border-t border-slate-100">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                placeholder="Your full name"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                placeholder="+91 9876543210"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Address / Location
              </label>
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                placeholder="District, State"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save Profile Changes
            </button>
          </div>
        </form>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3 pt-2 border-t border-slate-100 text-xs">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Contact Phone
            </span>
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-slate-400" />
              {profile?.phone || 'Not provided'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Registered Address
            </span>
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              {profile?.address || 'Not specified'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Account Status
            </span>
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-600" />
              Verified Citizen Account
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
