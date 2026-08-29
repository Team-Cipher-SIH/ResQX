import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import RegisterForm from '@/components/RegisterForm';

export const metadata = {
  title: 'Authority Registration | ResQtech Platform',
  description: 'Authorized emergency management and first responder officer registration.',
};

export default function AuthorityRegisterPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
      <Navbar />

      <main className="grow flex items-center justify-center px-4 py-16 relative overflow-hidden">
        {/* Background Grid and Glow Accent */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-100 h-75 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 w-full max-w-md">
          <RegisterForm role="authority" />
        </div>
      </main>

      <Footer />
    </div>
  );
}
