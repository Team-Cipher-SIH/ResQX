'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  loginSchema,
  LoginFormData,
} from '@/lib/validations/auth';

import {
  UserCheck,
  ShieldAlert,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Building2,
  Radio,
  ShieldCheck,
  Activity,
} from 'lucide-react';

import {
  API_ENDPOINTS,
  fetchFromApi,
} from '@/lib/api';

interface LoginFormProps {
  role: 'citizen' | 'authority';
}

type SubmissionPayload = {
  email: string;
  role: 'citizen' | 'authority';
  timestamp: string;
};

export default function LoginForm({ role }: LoginFormProps) {
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [submissionFeedback, setSubmissionFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    payload?: SubmissionPayload;
  } | null>(null);

  const isCitizen = role === 'citizen';

  // Use a dedicated command-center image for authority users.
  const loginBackground = isCitizen
    ? '/pictures/disaster-bg.jpg'
    : '/pictures/authority-bg.png';

  const roleTitle = isCitizen
    ? 'Citizen Login'
    : 'Authority Login';

  const roleSubtitle = isCitizen
    ? 'Access citizen emergency reporting & personal alert notifications.'
    : 'Authorized disaster management officers and emergency command dispatch.';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      departmentId: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setSubmissionFeedback(null);

    try {
      console.log('🚀 Sending login request for:', data.email);

      const response = await fetchFromApi<{
        _id: string;
        name: string;
        email: string;
        role: string;
        authorityLevel?: string;
        state?: string;
        district?: string;
        department?: string;
        accessToken: string;
        refreshToken: string;
      }>(API_ENDPOINTS.LOGIN, {
        method: 'POST',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      console.log('📥 Backend response:', response);

      const responseData = (response.data || response) as {
        _id?: string;
        name?: string;
        email?: string;
        role?: string;
        authorityLevel?: string;
        state?: string;
        district?: string;
        department?: string;
        accessToken?: string;
        refreshToken?: string;
      };

      if (response.success && responseData?.accessToken) {
        console.log('✅ Access token received, saving session...');

        localStorage.setItem(
          'resqtech_access_token',
          responseData.accessToken
        );

        if (responseData.refreshToken) {
          localStorage.setItem(
            'resqtech_refresh_token',
            responseData.refreshToken
          );
        }

        const userSession = {
          _id: responseData._id,
          name: responseData.name,
          email: responseData.email,
          role: (responseData.role || role) as 'citizen' | 'authority' | 'admin',
          authorityLevel: (responseData.authorityLevel as any) || (role === 'citizen' ? null : 'central'),
          state: responseData.state || null,
          district: responseData.district || null,
          jurisdictionState: responseData.state || null,
          jurisdictionDistrict: responseData.district || null,
          department: responseData.department || null,
        };

        localStorage.setItem(
          'resqtech_user_data',
          JSON.stringify(userSession)
        );

        // Determine target dashboard based on role & authority level
        let targetRoute = '/citizen/dashboard';
        if (userSession.role === 'citizen') {
          targetRoute = '/citizen/dashboard';
        } else if (userSession.role === 'admin') {
          targetRoute = '/authority/dashboard';
        } else {
          switch (userSession.authorityLevel) {
            case 'state_admin':
              targetRoute = '/authority/state';
              break;
            case 'district_admin':
              targetRoute = '/authority/district';
              break;
            case 'field_responder':
              targetRoute = '/responder/dashboard';
              break;
            case 'central':
            case 'department':
            default:
              targetRoute = '/authority/dashboard';
              break;
          }
        }

        router.push(targetRoute);
        return;
      }

      setSubmissionFeedback({
        type: 'error',
        message:
          response.error ||
          response.message ||
          'Login failed. Please check your credentials.',
      });
    } catch (err) {
      console.error('❌ Login request failed:', err);

      setSubmissionFeedback({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : 'Failed to communicate with backend',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="relative mx-auto w-full max-w-6xl">

        {/* Back */}
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Platform Home
        </Link>

        {/* =====================================================
            MAIN CARD
        ===================================================== */}
        <div
          className={`grid overflow-hidden rounded-[2rem] border bg-white shadow-[0_25px_70px_rgba(15,23,42,0.12)] lg:grid-cols-2 ${
            isCitizen
              ? 'border-slate-200'
              : 'border-blue-200'
          }`}
        >

          {/* ===================================================
              LEFT PANEL
          =================================================== */}
          <div
            className={`relative hidden min-h-[650px] overflow-hidden lg:block ${
              isCitizen
                ? 'bg-slate-950'
                : 'bg-slate-950'
            }`}
          >

            <img
              src={loginBackground}
              alt={
                isCitizen
                  ? 'Citizen emergency response'
                  : 'Emergency command center'
              }
              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 hover:scale-[1.02]"
            />

            {/* Citizen vs Authority overlay */}
            <div
              className={`absolute inset-0 ${
                isCitizen
                  ? 'bg-slate-950/50'
                  : 'bg-blue-950/45'
              }`}
            />

            <div
              className={`absolute inset-0 ${
                isCitizen
                  ? 'bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-slate-950/10'
                  : 'bg-gradient-to-t from-blue-950 via-blue-950/30 to-slate-950/10'
              }`}
            />

            {/* Subtle accent */}
            <div
              className={`absolute inset-y-0 right-0 w-1/3 ${
                isCitizen
                  ? 'bg-gradient-to-l from-emerald-500/10 to-transparent'
                  : 'bg-gradient-to-l from-blue-500/20 to-transparent'
              }`}
            />

            {/* =================================================
                AUTHORITY TOP COMMAND BADGE
            ================================================= */}
            {!isCitizen && (
              <div className="absolute right-7 top-7 flex items-center gap-2 rounded-full border border-blue-300/30 bg-blue-950/40 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100 backdrop-blur-md">
                <ShieldCheck className="h-3.5 w-3.5" />
                Restricted Command Portal
              </div>
            )}

            {isCitizen && (
              <div className="absolute left-8 top-8 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                Citizen Emergency Portal
              </div>
            )}

            {/* =================================================
                LEFT CONTENT
            ================================================= */}
            <div className="absolute inset-x-0 bottom-0 p-8 sm:p-10">

              {/* Citizen */}
              {isCitizen ? (
                <>
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-md">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    System Ready
                  </div>

                  <h2 className="max-w-[460px] text-4xl font-black leading-[1.08] tracking-tight text-white sm:text-[3.25rem]">
                    Report Fast.
                    <br />
                    <span className="text-emerald-300">
                      Stay Connected.
                    </span>
                    <br />
                    Stay Safe.
                  </h2>

                  <p className="mt-6 max-w-[430px] text-sm leading-7 text-white/80 sm:text-[15px]">
                    Report emergencies, share your location and stay informed
                    with alerts relevant to your area.
                  </p>

                  <div className="mt-7 flex max-w-[430px] items-center gap-4 rounded-2xl border border-white/15 bg-black/20 p-4 backdrop-blur-xl">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                      <UserCheck className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-white">
                        Your safety matters
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/65">
                        Connected reporting and coordinated emergency response.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                /* =================================================
                   AUTHORITY CONTENT
                ================================================= */
                <>
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
                    Command.
                    <br />

                    <span className="text-blue-300">
                      Coordinate.
                    </span>

                    <br />

                    Respond.
                  </h2>

                  <p className="mt-6 max-w-[440px] text-sm leading-7 text-blue-50/80 sm:text-[15px]">
                    A secure command interface for disaster-management
                    authorities to monitor incidents, coordinate responders
                    and make faster operational decisions.
                  </p>

                  {/* Command info */}
                  <div className="mt-7 max-w-[450px] rounded-2xl border border-blue-300/15 bg-blue-950/40 p-5 backdrop-blur-xl">

                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-400/10 text-blue-300">
                        <Activity className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-white">
                          Emergency Command Access
                        </p>

                        <p className="mt-1 text-xs text-blue-100/60">
                          Incident monitoring • Dispatch • Coordination
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-center">
                        <p className="text-sm font-bold text-white">LIVE</p>
                        <p className="mt-1 text-[9px] uppercase tracking-wider text-blue-100/50">
                          Incidents
                        </p>
                      </div>

                      <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-center">
                        <p className="text-sm font-bold text-white">GPS</p>
                        <p className="mt-1 text-[9px] uppercase tracking-wider text-blue-100/50">
                          Tracking
                        </p>
                      </div>

                      <div className="rounded-lg border border-white/10 bg-white/5 p-2.5 text-center">
                        <p className="text-sm font-bold text-white">24/7</p>
                        <p className="mt-1 text-[9px] uppercase tracking-wider text-blue-100/50">
                          Response
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>

          {/* ===================================================
              RIGHT PANEL
          =================================================== */}
          <div
            className={`flex min-h-[650px] items-center px-6 py-10 sm:px-10 lg:px-12 xl:px-14 ${
              isCitizen
                ? 'bg-white'
                : 'bg-gradient-to-b from-blue-50/30 via-white to-white'
            }`}
          >

            <div className="mx-auto w-full max-w-md">

              {/* Mobile image */}
              <div className="mb-8 overflow-hidden rounded-2xl lg:hidden">
                <div className="relative h-48">

                  <img
                    src={loginBackground}
                    alt={
                      isCitizen
                        ? 'Citizen emergency response'
                        : 'Emergency command center'
                    }
                    className="h-full w-full object-cover"
                  />

                  <div
                    className={`absolute inset-0 ${
                      isCitizen
                        ? 'bg-slate-950/50'
                        : 'bg-blue-950/60'
                    }`}
                  />

                  <div className="absolute bottom-4 left-4">

                    <p
                      className={`text-[11px] font-bold uppercase tracking-[0.15em] ${
                        isCitizen
                          ? 'text-emerald-300'
                          : 'text-blue-200'
                      }`}
                    >
                      {isCitizen
                        ? 'Citizen Emergency Portal'
                        : 'Restricted Command Portal'}
                    </p>

                    <h2 className="mt-1 text-2xl font-black text-white">
                      {isCitizen
                        ? 'Report Fast. Stay Safe.'
                        : 'Command. Coordinate. Respond.'}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Header */}
              <div className="mb-9 max-w-sm">

                <div className="mb-4 flex items-center gap-3">

                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                      isCitizen
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                        : 'border-blue-200 bg-blue-50 text-blue-600'
                    }`}
                  >
                    {isCitizen ? (
                      <UserCheck className="h-6 w-6" />
                    ) : (
                      <ShieldAlert className="h-6 w-6" />
                    )}
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] ${
                      isCitizen
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-blue-200 bg-blue-50 text-blue-700'
                    }`}
                  >
                    {isCitizen
                      ? 'Public Portal'
                      : 'Restricted Access'}
                  </span>
                </div>

                <h1 className="text-4xl font-black leading-tight tracking-[-0.03em] text-slate-950 sm:text-[2.7rem]">
                  {roleTitle}
                </h1>

                <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
                  {roleSubtitle}
                </p>

                {/* Authority status line */}
                {!isCitizen && (
                  <div className="mt-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Secure command access
                    <span className="h-3 w-px bg-slate-200" />
                    Encrypted session
                  </div>
                )}
              </div>

              {/* Feedback */}
              {submissionFeedback && (
                <div
                  className={`mb-6 rounded-2xl border p-4 text-xs ${
                    submissionFeedback.type === 'success'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : submissionFeedback.type === 'error'
                      ? 'border-red-200 bg-red-50 text-red-800'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-2">

                    {submissionFeedback.type === 'success' ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                    )}

                    <div>
                      <p className="font-semibold">
                        {submissionFeedback.message}
                      </p>

                      {submissionFeedback.payload && (
                        <pre className="mt-2 overflow-auto rounded-lg border border-slate-200 bg-white p-2 font-mono text-[10px] text-slate-600">
                          {JSON.stringify(
                            submissionFeedback.payload,
                            null,
                            2
                          )}
                        </pre>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Form */}
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-5"
              >

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
                      placeholder={
                        isCitizen
                          ? 'citizen@example.com'
                          : 'officer@disaster-dept.gov'
                      }
                      {...register('email')}
                      className={`w-full rounded-xl border bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition ${
                        errors.email
                          ? 'border-red-400 focus:ring-4 focus:ring-red-100'
                          : isCitizen
                          ? 'border-slate-200 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100'
                          : 'border-slate-200 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100'
                      }`}
                    />
                  </div>

                  {errors.email && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Department ID */}
                {!isCitizen && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">

                    <div className="mb-3 flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-600" />

                      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-700">
                        Officer Identification
                      </span>
                    </div>

                    <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-slate-700">
                      Officer / Department ID
                      <span className="ml-1 font-normal normal-case text-slate-400">
                        (optional)
                      </span>
                    </label>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. NDRF-DEPT-88"
                        {...register('departmentId')}
                        className="w-full rounded-xl border border-blue-100 bg-white py-3.5 px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>

                    <p className="mt-2 text-[11px] leading-5 text-slate-500">
                      Use the department or officer identifier assigned to your unit.
                    </p>
                  </div>
                )}

                {/* Password */}
                <div>
                  <div className="mb-2 flex items-center justify-between">

                    <label className="block text-xs font-bold uppercase tracking-[0.12em] text-slate-700">
                      Password
                      <span className="ml-1 text-red-500">*</span>
                    </label>

                    <a
                      href="#forgot-password"
                      onClick={(e) => {
                        e.preventDefault();

                        alert(
                          'Forgot password functionality will connect to Express Mailer in Phase 2.'
                        );
                      }}
                      className="text-xs font-medium text-blue-600 transition hover:text-blue-800 hover:underline"
                    >
                      Forgot password?
                    </a>
                  </div>

                  <div className="relative">

                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                    <input
                      type="password"
                      placeholder="••••••••"
                      {...register('password')}
                      className={`w-full rounded-xl border bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition ${
                        errors.password
                          ? 'border-red-400 focus:ring-4 focus:ring-red-100'
                          : isCitizen
                          ? 'border-slate-200 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100'
                          : 'border-slate-200 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100'
                      }`}
                    />
                  </div>

                  {errors.password && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                      <AlertCircle className="h-3 w-3" />
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`group mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                    isCitizen
                      ? 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-emerald-600/30'
                      : 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-600/30'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Validating credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {isCitizen
                          ? 'Sign In to Citizen Login'
                          : 'Enter Command Center'}
                      </span>

                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              {/* Register */}
              <div className="mt-7 border-t border-slate-200 pt-5 text-center text-sm text-slate-500">

                {isCitizen ? (
                  <>
                    <span>Don&apos;t have an account? </span>

                    <Link
                      href="/citizen/register"
                      className="font-semibold text-emerald-600 transition hover:text-emerald-700"
                    >
                      Register here →
                    </Link>
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                    Authority accounts are provisioned by administrators.
                  </div>
                )}

              </div>

              {/* Secure access */}
              <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isCitizen
                      ? 'bg-emerald-500'
                      : 'bg-blue-500'
                  }`}
                />

                {isCitizen
                  ? 'Secure authenticated access'
                  : 'Secure encrypted command access'}
              </div>

              {/* API */}
              <div className="mt-4 text-center">
                <code className="text-[10px] text-slate-300">
                  POST{' '}
                  {isCitizen
                    ? API_ENDPOINTS.CITIZEN_LOGIN
                    : API_ENDPOINTS.AUTHORITY_LOGIN}
                </code>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}