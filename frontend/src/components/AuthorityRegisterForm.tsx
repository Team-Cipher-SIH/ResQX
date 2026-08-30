'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import {
  ShieldAlert,
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Radio,
  Activity,
  MapPin,
  Building2,
} from 'lucide-react';

import { API_ENDPOINTS, fetchFromApi } from '@/lib/api';
import { getStateNames, getDistrictsForState } from '@/data/indiaStatesDistricts';

type AuthorityLevelOption = 'central' | 'state_admin' | 'district_admin';

export default function AuthorityRegisterForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authorityLevel, setAuthorityLevel] = useState<AuthorityLevelOption>('district_admin');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const allStates = useMemo(() => getStateNames(), []);
  const availableDistricts = useMemo(() => {
    if (!state) return [];
    return getDistrictsForState(state);
  }, [state]);

  const requiresState = authorityLevel === 'state_admin' || authorityLevel === 'district_admin';
  const requiresDistrict = authorityLevel === 'district_admin';

  const validate = (): string | null => {
    if (!name.trim() || !email.trim() || !password) {
      return 'Please fill in all required fields.';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }
    if (requiresState && !state) {
      return 'Please select your jurisdiction state.';
    }
    if (requiresDistrict && !district) {
      return 'Please select your jurisdiction district.';
    }
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const validationError = validate();
    if (validationError) {
      setFeedback({ type: 'error', message: validationError });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetchFromApi<{
        _id: string;
        name: string;
        email: string;
        role: string;
        authorityLevel?: string;
        state?: string;
        district?: string;
        accessToken: string;
        refreshToken: string;
      }>(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          role: 'authority',
          authorityLevel,
          state: requiresState ? state : null,
          district: requiresDistrict ? district : null,
        }),
      });

      const responseData = (response.data || response) as {
        _id?: string;
        name?: string;
        email?: string;
        role?: string;
        authorityLevel?: string;
        state?: string;
        district?: string;
        accessToken?: string;
        refreshToken?: string;
      };

      if (response.success && responseData?.accessToken) {
        localStorage.setItem('resqtech_access_token', responseData.accessToken);
        if (responseData.refreshToken) {
          localStorage.setItem('resqtech_refresh_token', responseData.refreshToken);
        }

        const userSession = {
          _id: responseData._id,
          name: responseData.name,
          email: responseData.email,
          role: (responseData.role || 'authority') as 'authority',
          authorityLevel: (responseData.authorityLevel as any) || authorityLevel,
          state: responseData.state || null,
          district: responseData.district || null,
          jurisdictionState: responseData.state || null,
          jurisdictionDistrict: responseData.district || null,
          department: null,
        };

        localStorage.setItem('resqtech_user_data', JSON.stringify(userSession));

        setFeedback({ type: 'success', message: 'Authority account created. Redirecting to command center...' });

        let targetRoute = '/authority/dashboard';
        switch (userSession.authorityLevel) {
          case 'state_admin':
            targetRoute = '/authority/state';
            break;
          case 'district_admin':
            targetRoute = '/authority/district';
            break;
          case 'central':
          default:
            targetRoute = '/authority/dashboard';
            break;
        }

        setTimeout(() => router.push(targetRoute), 800);
        return;
      }

      setFeedback({
        type: 'error',
        message: response.error || response.message || 'Registration failed. Please try again.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to communicate with backend',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="relative mx-auto w-full max-w-6xl">

        <Link
          href="/authority/login"
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Authority Login
        </Link>

        <div className="grid overflow-hidden rounded-[2rem] border border-blue-200 bg-white shadow-[0_25px_70px_rgba(15,23,42,0.12)] lg:grid-cols-2">

          {/* ===================== LEFT PANEL ===================== */}
          <div className="relative hidden min-h-[650px] overflow-hidden bg-slate-950 lg:block">
            <img
              src="/pictures/authority-bg.png"
              alt="Emergency command center"
              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-blue-950/45" />
            <div className="absolute inset-0 bg-gradient-to-t from-blue-950 via-blue-950/30 to-slate-950/10" />
            <div className="absolute inset-y-0 right-0 w-1/3 bg-gradient-to-l from-blue-500/20 to-transparent" />

            <div className="absolute right-7 top-7 flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-950/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100 backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5" />
              Restricted Command Portal
            </div>

            <div className="absolute inset-x-0 bottom-0 p-8 sm:p-10">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-950/50 px-3.5 py-2 backdrop-blur-md">
                  <Radio className="h-3.5 w-3.5 text-blue-300" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100">
                    Secure Network
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-300">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  Operational
                </div>
              </div>

              <h2 className="max-w-[470px] text-5xl font-black leading-[1.02] tracking-tight text-white sm:text-[4rem]">
                Join the
                <br />
                <span className="text-blue-300">Command</span>
                <br />
                Network.
              </h2>

              <p className="mt-6 max-w-[440px] text-sm leading-7 text-blue-50/80 sm:text-[15px]">
                Register as a disaster-management authority. Select your jurisdiction level to get
                a command center scoped to your area of responsibility.
              </p>

              <div className="mt-7 max-w-[450px] rounded-2xl border border-blue-300/15 bg-blue-950/40 p-5 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-400/10 text-blue-300">
                    <Activity className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Jurisdiction-Scoped Access</p>
                    <p className="mt-1 text-xs text-blue-100/60">National • State • District</p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-center">
                    <p className="text-sm font-bold text-white">National</p>
                    <p className="mt-1 text-[9px] uppercase tracking-wider text-blue-100/50">
                      Full Access
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-center">
                    <p className="text-sm font-bold text-white">State</p>
                    <p className="mt-1 text-[9px] uppercase tracking-wider text-blue-100/50">
                      All Districts
                    </p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-center">
                    <p className="text-sm font-bold text-white">District</p>
                    <p className="mt-1 text-[9px] uppercase tracking-wider text-blue-100/50">
                      Local Scope
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===================== RIGHT PANEL ===================== */}
          <div className="flex min-h-[650px] items-center px-6 py-10 sm:px-10 lg:px-12 xl:px-14 bg-gradient-to-b from-blue-50/30 via-white to-white">
            <div className="mx-auto w-full max-w-md">

              {/* Mobile image */}
              <div className="mb-8 overflow-hidden rounded-2xl lg:hidden">
                <div className="relative h-48">
                  <img
                    src="/pictures/authority-bg.png"
                    alt="Emergency command center"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-blue-950/60" />
                  <div className="absolute bottom-4 left-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-200">
                      Restricted Command Portal
                    </p>
                    <h2 className="mt-1 text-2xl font-black text-white">
                      Join the Command Network.
                    </h2>
                  </div>
                </div>
              </div>

              {/* Header */}
              <div className="mb-9 max-w-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-600">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-blue-700">
                    Restricted Access
                  </span>
                </div>

                <h1 className="text-4xl font-black leading-tight tracking-[-0.03em] text-slate-950 sm:text-[2.7rem]">
                  Authority Register
                </h1>

                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
                  Create your command account and select your jurisdiction level.
                </p>

                <div className="mt-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Secure command access
                  <span className="h-3 w-px bg-slate-200" />
                  Encrypted session
                </div>
              </div>

              {/* Feedback */}
              {feedback && (
                <div
                  className={`mb-6 rounded-2xl border p-4 text-xs ${
                    feedback.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-red-200 bg-red-50 text-red-800'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {feedback.type === 'success' ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    )}
                    <p className="font-semibold">{feedback.message}</p>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={onSubmit} className="space-y-5">

                {/* Name */}
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-700">
                    Full Name
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Kumar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-700">
                    Email Address
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      placeholder="officer@disaster-dept.gov"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Jurisdiction Level */}
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-700">
                      Jurisdiction Level
                    </span>
                  </div>

                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-700">
                    Authority Level
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <select
                    value={authorityLevel}
                    onChange={(e) => {
                      const val = e.target.value as AuthorityLevelOption;
                      setAuthorityLevel(val);
                      if (val === 'central') {
                        setState('');
                        setDistrict('');
                      } else if (val === 'state_admin') {
                        setDistrict('');
                      }
                    }}
                    className="w-full rounded-xl border border-blue-100 bg-white py-3.5 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  >
                    <option value="central">National (Central Authority)</option>
                    <option value="state_admin">State Admin</option>
                    <option value="district_admin">District Admin</option>
                  </select>

                  {requiresState && (
                    <div className="mt-3">
                      <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-slate-700">
                        <MapPin className="h-3.5 w-3.5 text-blue-500" />
                        State
                        <span className="ml-1 text-red-500">*</span>
                      </label>
                      <select
                        value={state}
                        onChange={(e) => {
                          setState(e.target.value);
                          setDistrict('');
                        }}
                        className="w-full rounded-xl border border-blue-100 bg-white py-3.5 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="">Select state...</option>
                        {allStates.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {requiresDistrict && (
                    <div className="mt-3">
                      <label className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-slate-700">
                        <MapPin className="h-3.5 w-3.5 text-blue-500" />
                        District
                        <span className="ml-1 text-red-500">*</span>
                      </label>
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        disabled={!state}
                        className="w-full rounded-xl border border-blue-100 bg-white py-3.5 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:opacity-60"
                      >
                        <option value="">Select district...</option>
                        {availableDistricts.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <p className="mt-3 text-[11px] leading-5 text-slate-500">
                    National authorities can view all states. State admins can view every district
                    within their state. District admins are scoped to a single district.
                  </p>
                </div>

                {/* Password */}
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-700">
                    Password
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-700">
                    Confirm Password
                    <span className="ml-1 text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-blue-600/30 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Provisioning access...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Authority Account</span>
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              {/* Login link */}
              <div className="mt-7 border-t border-slate-200 pt-5 text-center text-sm text-slate-500">
                <span>Already have a command account? </span>
                <Link
                  href="/authority/login"
                  className="font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Sign in →
                </Link>
              </div>

              <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                Secure encrypted command access
              </div>

              <div className="mt-4 text-center">
                <code className="text-[10px] text-slate-300">
                  POST {API_ENDPOINTS.REGISTER}
                </code>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}