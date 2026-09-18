'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  registerSchema,
  RegisterFormData,
} from '@/lib/validations/auth';

import {
  UserPlus,
  ShieldCheck,
  User,
  Mail,
  Lock,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Building2,
  MapPin,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';

import {
  API_ENDPOINTS,
  fetchFromApi,
} from '@/lib/api';

interface RegisterFormProps {
  role: 'citizen' | 'authority';
}

export default function RegisterForm({ role }: RegisterFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [submissionFeedback, setSubmissionFeedback] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const isCitizen = role === 'citizen';

  const roleTitle = isCitizen
    ? 'Citizen Registration'
    : 'Authority Officer Registration';

  const roleSubtitle = isCitizen
    ? 'Create your account to report emergencies, stay informed and help your community.'
    : 'Request an authorized account for disaster response and emergency command operations.';

  const loginLink = isCitizen
    ? '/citizen/login'
    : '/authority/login';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      departmentId: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setSubmissionFeedback(null);

    try {
      console.log('🚀 Sending registration request for role:', role);

      const response = await fetchFromApi(API_ENDPOINTS.REGISTER, {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      });

      console.log('📥 Registration backend response:', response);

      if (response.success) {
        setSubmissionFeedback({
          type: 'success',
          message: `Account created successfully! You can now log in as ${role.toUpperCase()}.`,
        });
      } else {
        setSubmissionFeedback({
          type: 'error',
          message:
            response.error ||
            response.message ||
            'Registration failed. Please try again.',
        });
      }
    } catch (err) {
      console.error('❌ Registration request error:', err);

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
      <div className="relative mx-auto w-full max-w-5xl">

        {/* Back to home */}
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to Platform Home
        </Link>

        {/* ======================================================
            MAIN REGISTRATION CONTAINER
        ====================================================== */}
        <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">

          {/* Soft top glow */}
          <div
            className={`absolute inset-x-0 top-0 h-1 ${
              isCitizen ? 'bg-emerald-500' : 'bg-blue-600'
            }`}
          />

          {/* Background accent */}
          <div
            className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl ${
              isCitizen
                ? 'bg-emerald-300/20'
                : 'bg-blue-300/20'
            }`}
          />

          <div
            className={`pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full blur-3xl ${
              isCitizen
                ? 'bg-blue-300/10'
                : 'bg-indigo-300/10'
            }`}
          />

          <div className="relative grid lg:grid-cols-[0.85fr_1.15fr]">

            {/* ==================================================
                LEFT INFO / BRAND PANEL
            ================================================== */}
            <div
              className={`relative hidden min-h-[720px] overflow-hidden lg:block ${
                isCitizen
                  ? 'bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950'
                  : 'bg-gradient-to-br from-blue-950 via-slate-950 to-indigo-950'
              }`}
            >

              {/* Background image */}
              <img
                src={
                  isCitizen
                    ? '/pictures/registration-bg.png'
                    : '/pictures/authority-bg.jpg'
                }
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-center opacity-75"
              />

              <div className="absolute inset-0 bg-slate-950/20" />

              <div
                className={`absolute inset-0 ${
                  isCitizen
                    ? 'bg-gradient-to-br from-emerald-950/15 via-transparent to-slate-950/25'
                    : 'bg-gradient-to-br from-blue-950/25 via-transparent to-indigo-950/35'
                }`}
              />

              {/* Content */}
              <div className="relative flex h-full flex-col justify-between p-10">

                <div>
                  <div className="mb-8 flex items-center gap-2">
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                        isCitizen
                          ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-300'
                          : 'border-blue-300/20 bg-blue-400/10 text-blue-300'
                      }`}
                    >
                      {isCitizen ? (
                        <UserPlus className="h-5 w-5" />
                      ) : (
                        <ShieldCheck className="h-5 w-5" />
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-white">
                        ResQtech
                      </p>

                      <p className="text-[10px] text-white/50">
                        Smart Disaster Management
                      </p>
                    </div>
                  </div>

                  <div
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] ${
                      isCitizen
                        ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-200'
                        : 'border-blue-300/20 bg-blue-400/10 text-blue-200'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {isCitizen
                      ? 'Join the Response Network'
                      : 'Official Account Request'}
                  </div>

                  <h2 className="mt-8 max-w-md text-4xl font-black leading-[1.05] tracking-tight text-white xl:text-5xl">
                    {isCitizen ? (
                      <>
                        Be Ready.
                        <br />
                        <span className="text-emerald-300">
                          Stay Connected.
                        </span>
                      </>
                    ) : (
                      <>
                        Strengthen.
                        <br />
                        <span className="text-blue-300">
                          The Response.
                        </span>
                      </>
                    )}
                  </h2>

                  <p className="mt-6 max-w-md text-sm leading-7 text-white/70">
                    {isCitizen
                      ? 'Create your ResQtech account to report incidents, share your location and receive emergency information relevant to your area.'
                      : 'Join the operational network used to coordinate incidents, departments and responders during emergencies.'}
                  </p>
                </div>

                {/* Feature cards */}
                <div className="space-y-3">

                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                        <ShieldCheck className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-white">
                          Secure account
                        </p>

                        <p className="mt-1 text-xs leading-5 text-white/55">
                          Your account is protected through authenticated access.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-xl">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white">
                        {isCitizen ? (
                          <MapPin className="h-5 w-5" />
                        ) : (
                          <Building2 className="h-5 w-5" />
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-white">
                          {isCitizen
                            ? 'Location-aware response'
                            : 'Department coordination'}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-white/55">
                          {isCitizen
                            ? 'Support emergency response with location-based information.'
                            : 'Connect your authority identity with operational departments.'}
                        </p>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>

            {/* ==================================================
                RIGHT FORM PANEL
            ================================================== */}
            <div className="bg-white/90 px-6 py-10 sm:px-10 lg:px-12 xl:px-14">

              <div className="mx-auto w-full max-w-xl">

                {/* Mobile image */}
                <div className="mb-8 overflow-hidden rounded-2xl lg:hidden">
                  <div className="relative h-40">

                    <img
                      src={
                        isCitizen
                          ? '/pictures/registration-bg.png'
                          : '/pictures/authority-bg.jpg'
                      }
                      alt=""
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute inset-0 bg-slate-950/55" />

                    <div className="absolute bottom-4 left-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
                        {isCitizen
                          ? 'Public Account'
                          : 'Official Account'}
                      </p>

                      <p className="mt-1 text-xl font-black text-white">
                        Create your account
                      </p>
                    </div>
                  </div>
                </div>

                {/* Header */}
                <div className="mb-8">

                  <div className="flex items-center gap-3">

                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                        isCitizen
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
                          : 'border-blue-200 bg-blue-50 text-blue-600'
                      }`}
                    >
                      {isCitizen ? (
                        <UserPlus className="h-6 w-6" />
                      ) : (
                        <ShieldCheck className="h-6 w-6" />
                      )}
                    </div>

                    <div>
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                          isCitizen
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-blue-200 bg-blue-50 text-blue-700'
                        }`}
                      >
                        {isCitizen
                          ? 'Public Account'
                          : 'Official Credentials'}
                      </span>
                    </div>

                  </div>

                  <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950">
                    {roleTitle}
                  </h1>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                    {roleSubtitle}
                  </p>
                </div>

                {/* Success / Error */}
                {submissionFeedback && (
                  <div
                    className={`mb-7 rounded-2xl border p-4 ${
                      submissionFeedback.type === 'success'
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">

                      {submissionFeedback.type === 'success' ? (
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                      ) : (
                        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
                      )}

                      <div>

                        <p
                          className={`text-sm font-semibold ${
                            submissionFeedback.type === 'success'
                              ? 'text-emerald-800'
                              : 'text-red-800'
                          }`}
                        >
                          {submissionFeedback.message}
                        </p>

                        {submissionFeedback.type === 'success' && (
                          <Link
                            href={loginLink}
                            className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 hover:underline"
                          >
                            Go to Login
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}

                      </div>
                    </div>
                  </div>
                )}

                {/* Form */}
                <form
                  onSubmit={handleSubmit(
                    onSubmit,
                    (errors) => {
                      console.log(
                        '❌ ZOD VALIDATION ERRORS:',
                        errors
                      );
                    }
                  )}
                  className="space-y-5"
                >

                  {/* Name + Email */}
                  <div className="grid gap-5 md:grid-cols-2">

                    {/* Full name */}
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.11em] text-slate-700">
                        Full Name
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          type="text"
                          placeholder="John Doe"
                          {...register('name')}
                          className={`w-full rounded-xl border bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition ${
                            errors.name
                              ? 'border-red-400 focus:ring-4 focus:ring-red-100'
                              : isCitizen
                              ? 'border-slate-200 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100'
                              : 'border-slate-200 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100'
                          }`}
                        />
                      </div>

                      {errors.name && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                          <AlertCircle className="h-3 w-3" />
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.11em] text-slate-700">
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

                  </div>

                  {/* Authority Department ID */}
                  {!isCitizen && (
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">

                      <div className="mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />

                        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-blue-700">
                          Officer Identification
                        </span>
                      </div>

                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.11em] text-slate-700">
                        Officer / Department ID
                        <span className="ml-1 font-normal normal-case text-slate-400">
                          (optional)
                        </span>
                      </label>

                      <input
                        type="text"
                        placeholder="e.g. NDRF-DEPT-88"
                        {...register('departmentId')}
                        className="w-full rounded-xl border border-blue-100 bg-white px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      />

                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Use the department or officer identifier assigned to your unit.
                      </p>
                    </div>
                  )}

                  {/* Passwords */}
                  <div className="grid gap-5 md:grid-cols-2">

                    {/* Password */}
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.11em] text-slate-700">
                        Password
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...register('password')}
                          className={`w-full rounded-xl border bg-slate-50 py-3.5 pl-11 pr-11 text-sm text-slate-900 outline-none transition ${
                            errors.password
                              ? 'border-red-400 focus:ring-4 focus:ring-red-100'
                              : isCitizen
                              ? 'border-slate-200 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100'
                              : 'border-slate-200 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100'
                          }`}
                        />

                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition"
                          tabIndex={-1}
                          title={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {errors.password && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                          <AlertCircle className="h-3 w-3" />
                          {errors.password.message}
                        </p>
                      )}
                    </div>

                    {/* Confirm password */}
                    <div>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-[0.11em] text-slate-700">
                        Confirm Password
                        <span className="ml-1 text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          {...register('confirmPassword')}
                          className={`w-full rounded-xl border bg-slate-50 py-3.5 pl-11 pr-11 text-sm text-slate-900 outline-none transition ${
                            errors.confirmPassword
                              ? 'border-red-400 focus:ring-4 focus:ring-red-100'
                              : isCitizen
                              ? 'border-slate-200 focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100'
                              : 'border-slate-200 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100'
                          }`}
                        />

                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition"
                          tabIndex={-1}
                          title={showConfirmPassword ? 'Hide password' : 'Show password'}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      {errors.confirmPassword && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                          <AlertCircle className="h-3 w-3" />
                          {errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                  </div>

                  {/* Trust note */}
                  <div
                    className={`rounded-xl border p-4 ${
                      isCitizen
                        ? 'border-emerald-100 bg-emerald-50/60'
                        : 'border-blue-100 bg-blue-50/60'
                    }`}
                  >
                    <div className="flex items-start gap-3">

                      <ShieldCheck
                        className={`mt-0.5 h-5 w-5 shrink-0 ${
                          isCitizen
                            ? 'text-emerald-600'
                            : 'text-blue-600'
                        }`}
                      />

                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          {isCitizen
                            ? 'Your account connects you to the emergency network.'
                            : 'Authority access is intended for authorized personnel.'}
                        </p>

                        <p className="mt-1 text-[11px] leading-5 text-slate-500">
                          Your credentials are used to securely access the ResQtech platform.
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`group flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${
                      isCitizen
                        ? 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-emerald-600/30'
                        : 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-700 hover:shadow-blue-600/30'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        Create {isCitizen ? 'Citizen' : 'Authority'} Account
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </>
                    )}
                  </button>

                </form>

                {/* Login link */}
                <div className="mt-7 border-t border-slate-200 pt-5 text-center text-sm text-slate-500">
                  <span>Already registered? </span>

                  <Link
                    href={loginLink}
                    className={`font-semibold transition-colors ${
                      isCitizen
                        ? 'text-emerald-600 hover:text-emerald-700'
                        : 'text-blue-600 hover:text-blue-700'
                    }`}
                  >
                    Log in here →
                  </Link>
                </div>

                {/* API info */}
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
    </div>
  );
}