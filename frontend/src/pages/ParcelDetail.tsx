import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchParcel } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Map, ArrowRight, ExternalLink, Navigation as NavigationIcon, Search } from 'lucide-react';

export default function ParcelDetail() {
  const { gush, helka } = useParams<{ gush: string, helka: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['parcel', gush, helka],
    queryFn: () => fetchParcel(gush!, helka!),
    enabled: !!gush && !!helka,
  });

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500 animate-fade-in" dir="rtl">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent mb-4" />
        <p className="text-base font-semibold">טוען היסטוריית חלקה...</p>
      </div>
    );
  }

  if (!data || !data.data || data.data.length === 0) {
    return (
      <div className="bg-rose-50 text-rose-800 p-8 rounded-2xl border border-rose-200 text-center my-8" dir="rtl">
        <h2 className="text-xl font-bold mb-2">לא נמצאו עסקאות בחלקה זו</h2>
        <p className="text-sm mb-4">ייתכן שאין עסקאות מדווחות עבור גוש {gush} חלקה {helka}.</p>
        <Link
          to="/search"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
        >
          <ArrowRight size={14} />
          <span>חזרה לחיפוש עסקאות</span>
        </Link>
      </div>
    );
  }

  const settlement = data.data[0].settlement;

  // Format data for chart (sort by date ascending)
  const chartData = [...data.data]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((d) => ({
      date: d.date,
      amount: d.amount,
      nature: d.nature,
    }));

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    settlement || 'ישראל'
  )}`;

  const formatAmount = (val?: number | null) => {
    if (val == null) return '—';
    return `₪${Math.round(val).toLocaleString('he-IL')}`;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12" dir="rtl">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to={`/settlement/${encodeURIComponent(settlement)}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowRight size={14} />
          <span>חזרה ליישוב: {settlement}</span>
        </Link>
      </div>

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-l from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-800/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/20">
              <Map size={30} className="text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-semibold text-indigo-300 mb-0.5">כרטיס חלקה קדסטרלית</div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight font-mono">
                גוש {gush} / חלקה {helka}
              </h1>
              <div className="text-sm font-bold text-indigo-200 mt-1">{settlement}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-2xs"
            >
              <NavigationIcon size={13} />
              <span>פתח ב-Google Maps</span>
              <ExternalLink size={12} />
            </a>

            <Link
              to={`/search?gush=${gush}&helka=${helka}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors shadow-2xs"
            >
              <Search size={13} />
              <span>סנן בחיפוש המלא</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal History Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              היסטוריית עסקאות שדווחו ({data.data.length})
            </h2>
            <span className="text-xs text-slate-500 font-medium">לפי סדר דיווח</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">תאריך</th>
                  <th className="py-3 px-4">כתובת</th>
                  <th className="py-3 px-4">סוג נכס</th>
                  <th className="py-3 px-3">חדרים</th>
                  <th className="py-3 px-3">שטח (מ״ר)</th>
                  <th className="py-3 px-4">סכום עסקה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.data.map((deal, i) => (
                  <tr key={i} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono text-slate-600 whitespace-nowrap">
                      {deal.date}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-800">
                      {deal.addresses?.[0] || '—'}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-700">
                      {deal.nature || '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {deal.rooms ? `${deal.rooms} חד׳` : '—'}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-700">
                      {deal.area_sqm ? deal.area_sqm : '—'}
                    </td>
                    <td className="py-3 px-4 font-black font-mono text-indigo-700 whitespace-nowrap">
                      {formatAmount(deal.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Price History Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 h-[400px] flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">התפתחות מחירי החלקה</h2>
            <p className="text-xs text-slate-500 mt-0.5">ציר מחירי העסקאות שבוצעו בחלקה</p>
          </div>

          <div className="flex-1 mt-4" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => v.split('-')[0]}
                  stroke="#94A3B8"
                  fontSize={11}
                />
                <YAxis
                  tickFormatter={(val) => `₪${(val / 1000000).toFixed(1)}M`}
                  width={65}
                  stroke="#94A3B8"
                  fontSize={11}
                />
                <Tooltip
                  formatter={(val: number) => [formatAmount(val), 'סכום עסקה']}
                  labelFormatter={(label) => `תאריך: ${label}`}
                  contentStyle={{ textAlign: 'right', direction: 'rtl' }}
                />
                <Line
                  type="stepAfter"
                  dataKey="amount"
                  stroke="#4F46E5"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#4F46E5' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
