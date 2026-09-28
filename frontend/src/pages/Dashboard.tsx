import { useQuery } from '@tanstack/react-query';
import { fetchStats, fetchSeries, fetchSettlements, fetchOmnisearch } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Building, Home, ArrowLeft } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
  });

  const { data: seriesData, isLoading: seriesLoading } = useQuery({
    queryKey: ['series', 'national'],
    queryFn: () => fetchSeries({}),
  });

  const { data: settlementsData, isLoading: settlementsLoading } = useQuery({
    queryKey: ['settlements', 'top'],
    queryFn: fetchSettlements,
  });

  const { data: omniData } = useQuery({
    queryKey: ['omnisearch', searchQuery],
    queryFn: () => fetchOmnisearch(searchQuery),
    enabled: searchQuery.trim().length > 1,
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      if (year && month && day) {
        return `${day}/${month}/${year}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const dateRangeText = stats?.first_deal && stats?.last_deal
    ? `${formatDate(stats.first_deal)} — ${formatDate(stats.last_deal)}`
    : '01/01/1998 — 17/09/2026';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'רחוב':
        return <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium">רחוב</span>;
      case 'יישוב / עיר':
        return <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium">יישוב</span>;
      case 'גוש וחלקה':
      case 'גוש':
        return <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium">גוש/חלקה</span>;
      case 'סוג נכס':
        return <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium">נכס</span>;
      default:
        return <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">חיפוש</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto pt-2 pb-1 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium shadow-xs">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span>מאגר עסקאות מדווחות</span>
          <span>•</span>
          <span className="font-semibold">{dateRangeText}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          עסקאות נדל״ן
        </h1>
        <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase">
          hosted by BaileyTV
        </p>

        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          חיפוש, השוואה וניתוח מגמות של 3.8 מיליון עסקאות מיסוי מקרקעין שדווחו בישראל
          <span className="block text-xs text-slate-500 mt-1 font-medium">
            נתונים זמינים לתקופה מ-{dateRangeText}
          </span>
        </p>
      </div>

      {/* Omnisearch Bar */}
      <div className="relative max-w-2xl mx-auto z-30">
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            className="w-full pl-12 pr-4 py-4 rounded-2xl shadow-lg border border-slate-200 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            placeholder="חפש לפי עיר, רחוב, גוש/חלקה או סוג נכס..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            type="submit"
            className="absolute left-3 top-3 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-xs"
            title="חפש"
          >
            <Search size={20} />
          </button>
        </form>

        {/* Quick Example Links */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2 text-xs text-slate-500">
          <span className="text-slate-400">לדוגמה:</span>
          <button onClick={() => navigate('/settlement/תל אביב -יפו')} className="hover:text-indigo-600 underline">תל אביב</button>
          <button onClick={() => navigate('/settlement/ירושלים')} className="hover:text-indigo-600 underline">ירושלים</button>
          <button onClick={() => navigate('/search?street=דיזנגוף&settlement=תל אביב -יפו')} className="hover:text-indigo-600 underline">דיזנגוף ת״א</button>
          <button onClick={() => navigate('/parcel/6903/104')} className="hover:text-indigo-600 underline">גוש 6903/104</button>
          <button onClick={() => navigate('/search?nature=דירה בבית קומות')} className="hover:text-indigo-600 underline">דירה בבית קומות</button>
        </div>

        {/* Omnisearch Dropdown */}
        {searchQuery.trim().length > 1 && omniData && omniData.results && omniData.results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden divide-y divide-slate-50 max-h-96 overflow-y-auto">
            {omniData.results.map((res, idx) => (
              <button
                key={idx}
                className="w-full text-right px-4 py-3 hover:bg-indigo-50/60 transition-colors flex items-center justify-between gap-3 group"
                onClick={() => navigate(res.url)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-white text-slate-500 group-hover:text-indigo-600 transition-colors">
                    {res.type === 'street' ? <MapPin size={18} /> :
                     res.type === 'settlement' ? <Building size={18} /> :
                     res.type === 'nature' ? <Home size={18} /> :
                     <Search size={18} />}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 group-hover:text-indigo-900 text-sm">
                      {res.title}
                    </div>
                    {res.subtitle && (
                      <div className="text-xs text-slate-500">{res.subtitle}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getCategoryBadge(res.category)}
                  <ArrowLeft size={16} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'סה״כ עסקאות', value: stats?.deals, format: (v: number) => v.toLocaleString('he-IL') },
          { label: 'יישובים', value: stats?.settlements, format: (v: number) => v.toLocaleString('he-IL') },
          { label: 'חלקות', value: stats?.parcels, format: (v: number) => v.toLocaleString('he-IL') },
          { label: 'סוגי נכסים', value: stats?.natures, format: (v: number) => v.toLocaleString('he-IL') },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
            <h3 className="text-sm font-medium text-slate-500 mb-2">{stat.label}</h3>
            {statsLoading ? (
              <div className="h-8 w-24 bg-slate-200 animate-pulse rounded" />
            ) : (
              <div className="text-3xl font-bold text-indigo-900">
                {stat.value ? stat.format(stat.value) : '-'}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold mb-6 text-slate-800">מגמת מחיר חציוני ארצית</h2>
        <div className="h-80 w-full" dir="ltr">
          {seriesLoading ? (
            <div className="h-full flex items-center justify-center">טוען...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesData?.data || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" />
                <YAxis
                  tickFormatter={(val) => `₪${(val / 1000000).toFixed(1)}M`}
                  width={80}
                />
                <Tooltip
                  formatter={(val: number) => [`₪${val.toLocaleString('he-IL')}`, 'מחיר חציוני']}
                  labelFormatter={(label) => `שנה: ${label}`}
                  contentStyle={{ textAlign: 'right', direction: 'rtl' }}
                />
                <Line type="monotone" dataKey="median_amount" stroke="#4F46E5" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Settlements */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold mb-6 text-slate-800">היישובים הפעילים ביותר</h2>
        {settlementsLoading ? (
          <div>טוען...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {settlementsData?.data.slice(0, 10).map((s) => (
              <button
                key={s.settlement_code}
                onClick={() => navigate(`/settlement/${encodeURIComponent(s.settlement)}`)}
                className="p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors text-right"
              >
                <div className="font-bold text-slate-800 mb-1">{s.settlement}</div>
                <div className="text-sm text-slate-500">{s.deals.toLocaleString('he-IL')} עסקאות</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
