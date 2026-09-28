import { useQuery } from '@tanstack/react-query';
import { fetchStats, fetchSeries, fetchSettlements, autocomplete } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

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

  const { data: autocompleteResults } = useQuery({
    queryKey: ['autocomplete', searchQuery],
    queryFn: () => autocomplete(searchQuery),
    enabled: searchQuery.length > 1,
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

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto pt-2 pb-1 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium shadow-xs">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span>מאגר עסקאות היסטורי סגור</span>
          <span>•</span>
          <span className="font-semibold">{dateRangeText}</span>
          <span>•</span>
          <span className="text-amber-800">אינו מתעדכן שוטף</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          עסקאות נדל״ן
        </h1>
        <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase">
          hosted by BaileyTV
        </p>

        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          חיפוש, השוואה וניתוח מגמות של עסקאות מיסוי מקרקעין שדווחו בישראל.
          <span className="block text-xs text-slate-600 mt-1 font-medium">
            הנתונים משקפים פרסום חד-פעמי לתקופה {dateRangeText} ואינם כוללים עסקאות חדשות מעבר לתאריך זה.
          </span>
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto z-30">
        <div className="relative">
          <input
            type="text"
            className="w-full pl-12 pr-4 py-4 rounded-full shadow-lg border border-slate-200 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="חיפוש יישוב (לדוגמה: תל אביב -יפו)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-4 top-4 text-slate-400" size={24} />
        </div>
        {searchQuery.length > 1 && autocompleteResults && autocompleteResults.data.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden">
            {autocompleteResults.data.map((res) => (
              <button
                key={res.settlement}
                className="w-full text-right px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-0 flex justify-between items-center"
                onClick={() => navigate(`/settlement/${encodeURIComponent(res.settlement)}`)}
              >
                <span className="font-medium text-slate-700">{res.settlement}</span>
                <span className="text-sm text-slate-400">{res.deals.toLocaleString('he-IL')} עסקאות</span>
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
