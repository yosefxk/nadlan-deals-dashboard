import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Search, TrendingUp, Map as MapIcon, BarChart2 } from 'lucide-react';
import clsx from 'clsx';

interface NavigationProps {
  onNavigate?: () => void;
}

export default function Navigation({ onNavigate }: NavigationProps) {
  const navItems = [
    { to: '/', label: 'לוח מחוונים', icon: LayoutDashboard },
    { to: '/search', label: 'חיפוש', icon: Search },
    { to: '/trends', label: 'מגמות', icon: TrendingUp },
    { to: '/map', label: 'מפה', icon: MapIcon },
    { to: '/compare', label: 'השוואה', icon: BarChart2 },
  ];

  return (
    <nav className="w-64 bg-indigo-900 text-white min-h-screen flex flex-col shrink-0">
      <div className="p-6 border-b border-indigo-800/60 mb-2">
        <h1 className="text-2xl font-bold tracking-tight">עסקאות נדל״ן</h1>
        <p className="text-xs text-indigo-300 mt-1 font-medium tracking-wide">hosted by BaileyTV</p>
      </div>
      <div className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
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
