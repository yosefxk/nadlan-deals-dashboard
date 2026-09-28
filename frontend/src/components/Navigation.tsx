import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Search, TrendingUp, Map as MapIcon, BarChart2 } from 'lucide-react';
import clsx from 'clsx';

export default function Navigation() {
  const navItems = [
    { to: '/', label: 'לוח מחוונים', icon: LayoutDashboard },
    { to: '/search', label: 'חיפוש', icon: Search },
    { to: '/trends', label: 'מגמות', icon: TrendingUp },
    { to: '/map', label: 'מפה', icon: MapIcon },
    { to: '/compare', label: 'השוואה', icon: BarChart2 },
  ];

  return (
    <nav className="w-64 bg-indigo-900 text-white min-h-screen flex flex-col hidden md:flex shrink-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold">נדל״ן עסקאות</h1>
      </div>
      <div className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive ? 'bg-indigo-800 font-medium' : 'hover:bg-indigo-800/50'
              )
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
