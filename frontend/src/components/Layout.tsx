import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import { Menu } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans" dir="rtl">
      {/* Mobile nav toggle */}
      <div className="md:hidden fixed top-0 right-0 w-full bg-indigo-900 text-white p-4 flex justify-between items-center z-50">
        <h1 className="text-xl font-bold">נדל״ן עסקאות</h1>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <Menu size={24} />
        </button>
      </div>

      {/* Sidebar */}
      <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block fixed md:static h-full z-40`}>
        <Navigation />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden md:mt-0 mt-14">
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
