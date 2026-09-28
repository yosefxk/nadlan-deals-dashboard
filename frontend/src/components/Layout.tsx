import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans" dir="rtl">
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 right-0 w-full bg-indigo-900 text-white p-3 px-4 flex justify-between items-center z-50 shadow-md">
        <div>
          <h1 className="text-lg font-bold leading-tight">עסקאות נדל״ן</h1>
          <p className="text-[11px] text-indigo-300 font-medium">hosted by BaileyTV</p>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="פתח תפריט"
          className="p-1.5 rounded-lg hover:bg-indigo-800 transition-colors"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile backdrop overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden animate-fade-in"
        />
      )}

      {/* Mobile Drawer */}
      <div
        className={`fixed top-0 right-0 h-full z-50 md:hidden transform transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <Navigation onNavigate={() => setMobileMenuOpen(false)} />
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Navigation />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden md:mt-0 mt-14">
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
