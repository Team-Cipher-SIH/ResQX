import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LoginForm from '@/components/LoginForm';

export const metadata = {
  title: 'Citizen Login | ResQtech Disaster Platform',
  description:
    'Public citizen portal for emergency disaster reporting and tracking.',
};

export default function CitizenLoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      <Navbar />

      <main className="relative flex grow items-center justify-center overflow-hidden px-4 py-12 sm:px-6 lg:px-8">

        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-30" />

        <div className="pointer-events-none absolute left-1/4 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/5 blur-[120px]" />

        <div className="pointer-events-none absolute bottom-0 right-1/4 h-80 w-80 translate-x-1/2 rounded-full bg-emerald-500/5 blur-[110px]" />

        <div className="relative z-10 w-full max-w-6xl">
          <LoginForm role="citizen" />
        </div>

      </main>

      <Footer />
    </div>
  );
}