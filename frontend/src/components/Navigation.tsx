import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Search, Trophy, TrendingUp, Map as MapIcon, BarChart2, X, Database } from 'lucide-react';
import clsx from 'clsx';

interface NavigationProps {
  onNavigate?: () => void;
}

export default function Navigation({ onNavigate }: NavigationProps) {
  const navItems = [
    { to: '/', label: 'לוח מחוונים', icon: LayoutDashboard },
    { to: '/search', label: 'חיפוש עסקאות', icon: Search },
    { to: '/top-deals', label: 'עסקאות שיא', icon: Trophy },
    { to: '/trends', label: 'מגמות שוק', icon: TrendingUp },
    { to: '/map', label: 'מפה ארצית', icon: MapIcon },
    { to: '/compare', label: 'השוואת יישובים', icon: BarChart2 },
  ];

  return (
    <nav className="w-64 bg-indigo-900 text-white min-h-screen flex flex-col justify-between shrink-0 shadow-lg md:shadow-none" dir="rtl">
      <div>
        <div className="p-6 border-b border-indigo-800/60 mb-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">עסקאות נדל״ן</h1>
            <p className="text-xs text-indigo-300 mt-0.5 font-medium tracking-wide">hosted by BaileyTV</p>
          </div>
          {onNavigate && (
            <button
              onClick={onNavigate}
              aria-label="סגור תפריט"
              className="md:hidden p-1.5 rounded-lg text-indigo-300 hover:text-white hover:bg-indigo-800 transition-colors"
            >
              <X size={22} />
            </button>
          )}
        </div>

        <div className="px-3 space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all text-sm font-semibold',
                  isActive
                    ? 'bg-indigo-800 text-white shadow-xs border-r-4 border-amber-400'
                    : 'text-indigo-200/80 hover:bg-indigo-800/50 hover:text-white'
                )
              }
            >
              <item.icon size={18} className="shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>

      {/* Database status footer */}
      <div className="p-4 m-3 rounded-xl bg-indigo-950/60 border border-indigo-800/40 text-xs text-indigo-300/90 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <Database size={13} className="text-amber-400" />
            <span>מאגר עסקאות</span>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            מחובר
          </span>
        </div>
        <p className="text-[11px] text-indigo-300/70 leading-relaxed">
          3.8M עסקאות מדווחות
          <br />
          טווח מלא: 1998–2026
        </p>
      </div>
    </nav>
  );
}
