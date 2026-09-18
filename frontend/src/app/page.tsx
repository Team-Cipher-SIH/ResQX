import Navbar from '@/components/Navbar';

import Hero from '@/components/Hero';
import AboutResQtech from '@/components/About';
import Stats from '@/components/Stats';
import Features from '@/components/Features';
import HowItWorks from '@/components/HowItWorks';
import DisasterTypes from '@/components/DisasterTypes';
import RoleSection from '@/components/RoleSection';
import EmergencyCTA from '@/components/EmergencyCTA';
import Footer from '@/components/Footer';
import DisasterGuidelines from '@/components/DisasterGuidelines';
import LiveDisasterMap from '@/components/LiveDisasterMap';
export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-800">
      {/* 1. Navbar */}
      <Navbar />

      <main className="grow">
        {/* 2. Hero Section */}
        <Hero />
        <AboutResQtech />

        {/* 3. Live Situation Statistics */}
        <Stats />

        {/* 4. Disaster Guidelines */}
        <DisasterGuidelines />

        {/* 5. What We Do & Platform Features */}
        <Features />

        {/* 6. Disaster Types */}
        <DisasterTypes />

        {/* 7. Citizen vs Authority Section */}
        <RoleSection />
        {/* 8. How It Works */}
        <HowItWorks />

        {/* 9. Emergency CTA */}
        <EmergencyCTA />

      </main>

      {/* 10. Footer */}
      <Footer />
    </div>
  );
}
