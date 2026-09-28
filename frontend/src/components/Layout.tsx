import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans" dir="rtl">
      {/* Mobile top bar with menu button placed on the right */}
      <header className="md:hidden fixed top-0 right-0 left-0 bg-indigo-900 text-white p-3 px-4 flex items-center justify-between z-50 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="פתח תפריט"
            className="p-2 rounded-lg bg-indigo-800/80 hover:bg-indigo-800 active:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <div>
            <h1 className="text-lg font-bold leading-tight">עסקאות נדל״ן</h1>
            <p className="text-[11px] text-indigo-300 font-medium">hosted by BaileyTV</p>
          </div>
        </div>
      </header>

      {/* Mobile backdrop overlay */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 md:hidden animate-fade-in"
        />
      )}

      {/* Mobile Drawer (sliding in from right) */}
      <div
        className={`fixed top-0 right-0 h-full z-50 md:hidden transform transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <Navigation onNavigate={() => setMobileMenuOpen(false)} />
      </div>

      {/* Desktop Sidebar (docked on the right in RTL) */}
      <aside className="hidden md:flex shrink-0 border-l border-indigo-950/20">
        <Navigation />
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-x-hidden md:mt-0 mt-14">
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

