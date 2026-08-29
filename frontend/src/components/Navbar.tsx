'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  Menu,
  X,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  UserPlus,
  Home,
  Info,
  Sparkles,
  Workflow,
  TriangleAlert,
} from 'lucide-react';

import Dock from '@/components/Dock';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const navigateToSection = (path: string) => {
    closeMobileMenu();
    router.push(path);
  };

  const dockItems = [
    {
      icon: <Home size={17} className="text-blue-600" />,
      label: 'Home',
      onClick: () => navigateToSection('/'),
    },
    {
      icon: <Info size={17} className="text-blue-600" />,
      label: 'About',
      onClick: () => navigateToSection('/#about'),
    },
    {
      icon: <Sparkles size={17} className="text-indigo-600" />,
      label: 'Features',
      onClick: () => navigateToSection('/#features'),
    },
    {
      icon: <Workflow size={17} className="text-emerald-600" />,
      label: 'How It Works',
      onClick: () =>
        navigateToSection('/#how-it-works'),
    },
    {
      icon: (
        <TriangleAlert
          size={17}
          className="text-red-600"
        />
      ),
      label: 'Disaster Types',
      onClick: () =>
        navigateToSection('/#disaster-types'),
    },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-md">

      {/* Emergency bar */}
      <div className="border-b border-slate-200 bg-gradient-to-r from-blue-50/80 via-slate-50 to-red-50/80 px-4 py-1.5 text-xs text-slate-700">
        <div className="mx-auto flex max-w-7xl items-center justify-between">

          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center rounded border border-amber-500/25 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
              NATIONAL EMERGENCY NETWORK
            </span>

            <span className="hidden text-slate-300 sm:inline">
              |
            </span>

            <span className="hidden font-medium text-slate-600 sm:inline">
              Detect. Respond. Protect.
            </span>
          </div>

          <span className="flex items-center space-x-1 font-semibold text-red-400">
            <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
            <span>Emergency Hotline: 112 / 108</span>
          </span>

        </div>
      </div>

      {/* Main navbar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative flex h-16 items-center justify-between">

          {/* Logo */}
          <Link
            href="/"
            onClick={closeMobileMenu}
            className="group flex shrink-0 items-center space-x-3"
          >
            <div className="flex items-center justify-center rounded-lg border border-blue-500/30 bg-blue-600/10 p-1.5 transition group-hover:bg-blue-600/20">
              <img
                src="/pictures/india-map-logo.png"
                alt="India map logo"
                className="h-7 w-7 object-contain"
              />
            </div>

            <div>
              <div className="font-mono text-xl font-extrabold tracking-tight text-slate-900">
                ResQ<span className="text-blue-600">tech</span>
              </div>

              <p className="text-[10px] leading-none tracking-wide text-slate-500">
                Smart Disaster Management
              </p>
            </div>
          </Link>

          {/* Desktop Dock */}
          <div className="relative hidden h-16 flex-1 items-center justify-center md:flex">
            <Dock
              items={dockItems}
              panelHeight={50}
              baseItemSize={36}
              magnification={52}
              distance={135}
              dockHeight={64}
            />
          </div>

          {/* Desktop actions */}
          <div className="hidden shrink-0 items-center space-x-2 md:flex">

            <Link
              href="/citizen/login"
              className="inline-flex items-center space-x-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:shadow-md"
            >
              <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Citizen Login</span>
            </Link>

            <Link
              href="/authority/login"
              className="inline-flex items-center space-x-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Authority Login</span>
            </Link>

            <Link
              href="/citizen/register"
              className="inline-flex items-center space-x-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100"
            >
              <UserPlus className="h-3.5 w-3.5 text-emerald-600" />
              <span>Register</span>
            </Link>

            <div className="mx-1 h-7 w-px bg-slate-200" />

            <img
              src="/pictures/emblem-of-india.svg"
              alt="Emblem of India"
              className="h-10 w-auto max-w-[32px] object-contain drop-shadow-sm"
            />
          </div>

          {/* Mobile button */}
          <button
            type="button"
            onClick={() =>
              setMobileMenuOpen((prev) => !prev)
            }
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 md:hidden"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="space-y-4 border-b border-slate-200 bg-white px-4 pb-6 pt-3 shadow-lg md:hidden">

          <div className="flex flex-col space-y-2 text-sm font-medium text-slate-600">

            <Link href="/" onClick={closeMobileMenu} className="rounded-lg px-3 py-2 hover:bg-slate-50">
              Home
            </Link>

            <Link href="/#about" onClick={closeMobileMenu} className="rounded-lg px-3 py-2 hover:bg-slate-50">
              About
            </Link>

            <Link href="/#features" onClick={closeMobileMenu} className="rounded-lg px-3 py-2 hover:bg-slate-50">
              Features
            </Link>

            <Link href="/#how-it-works" onClick={closeMobileMenu} className="rounded-lg px-3 py-2 hover:bg-slate-50">
              How It Works
            </Link>

            <Link href="/#disaster-types" onClick={closeMobileMenu} className="rounded-lg px-3 py-2 hover:bg-slate-50">
              Disaster Types
            </Link>

          </div>

          <div className="grid gap-2 border-t border-slate-200 pt-3">

            <Link
              href="/citizen/login"
              onClick={closeMobileMenu}
              className="flex justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-semibold text-emerald-600"
            >
              Citizen Login
            </Link>

            <Link
              href="/authority/login"
              onClick={closeMobileMenu}
              className="flex justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white"
            >
              Authority Login
            </Link>

            <Link
              href="/citizen/register"
              onClick={closeMobileMenu}
              className="flex justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-700"
            >
              Create Account / Register
            </Link>

          </div>
        </div>
      )}
    </header>
  );
}