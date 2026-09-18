import Link from 'next/link';
import { ShieldAlert, ArrowLeft, LockKeyhole } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'Authority Access | ResQtech Platform',
  description: 'Authority accounts are provisioned exclusively by system administrators.',
};

export default function AuthorityRegisterPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <main className="relative flex grow items-center justify-center overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
        {/* Background grid */}
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-30" />

        {/* Blue command glow */}
        <div className="pointer-events-none absolute left-1/4 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-1/4 h-80 w-80 translate-x-1/2 rounded-full bg-blue-600/5 blur-[110px]" />

        <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200/80 bg-white/90 p-8 shadow-xl shadow-slate-200/50 backdrop-blur-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
            <LockKeyhole className="h-7 w-7" />
          </div>

          <h1 className="text-xl font-bold text-slate-900">Restricted Provisioning</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Authority accounts and jurisdiction assignments are restricted and provisioned exclusively by disaster management administrators.
          </p>

          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-left text-xs text-blue-800">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
            <span>If you are an authorized government or response officer, please contact your central or district administrator to receive your credentials.</span>
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/authority/login"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Authority Login</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
