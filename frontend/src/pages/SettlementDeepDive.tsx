import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchSettlementDetail } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MapPin, Search, BarChart2, Layers, ArrowRight, ExternalLink, Building, TrendingUp } from 'lucide-react';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function SettlementDeepDive() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['settlement', name],
    queryFn: () => fetchSettlementDetail(name!),
    enabled: !!name,
  });

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-500 animate-fade-in" dir="rtl">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent mb-4" />
        <p className="text-base font-semibold">טוען נתונים מעמיקים ליישוב...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-rose-50 text-rose-800 p-8 rounded-2xl border border-rose-200 text-center my-8" dir="rtl">
        <h2 className="text-xl font-bold mb-2">לא נמצאו נתונים עבור יישוב זה</h2>
        <p className="text-sm mb-4">ייתכן ששם היישוב נרשם באופן שונה במאגר רשות המסים.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors"
        >
          <span>חזרה לדף הראשי</span>
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const formatAmount = (val?: number | null) => {
    if (val == null) return '—';
    return `₪${Math.round(val).toLocaleString('he-IL')}`;
  };

  const formatNumber = (val?: number | null) => {
    if (val == null) return '—';
    return val.toLocaleString('he-IL');
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12" dir="rtl">
      {/* Back button */}
      <div>
        <Link
          to="/search"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowRight size={14} />
          <span>חזרה לרשימת החיפוש</span>
        </Link>
      </div>

      {/* Hero Header Banner */}
      <div className="relative overflow-hidden bg-gradient-to-l from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-800/40">
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={22} className="text-amber-400" />
                <span className="text-xs font-semibold text-indigo-200">פרופיל נדל״ן יישובי</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{data.settlement}</h1>
              <p className="text-xs text-indigo-200/80 mt-1">
                מבוסס על {formatNumber(data.total_deals)} עסקאות שדווחו לרשות המסים
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/search?settlements=${encodeURIComponent(data.settlement)}`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors shadow-2xs"
              >
                <Search size={14} />
                <span>חפש עסקאות ביישוב</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(`/compare?settlements=${encodeURIComponent(data.settlement)}`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors shadow-2xs"
              >
                <BarChart2 size={14} />
                <span>השווה יישוב זה</span>
              </button>
              <button
                type="button"
                onClick={() => navigate(`/map`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors shadow-2xs"
              >
                <Layers size={14} />
                <span>הצג במפה</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-indigo-800/60">
            <div>
              <div className="text-indigo-300 text-xs font-medium mb-1">סה״כ עסקאות במאגר</div>
              <div className="text-2xl font-black font-mono text-white tracking-tight">
                {formatNumber(data.total_deals)}
              </div>
            </div>
            <div>
              <div className="text-indigo-300 text-xs font-medium mb-1">מחיר ממוצע עכשווי</div>
              <div className="text-2xl font-black font-mono text-amber-400 tracking-tight">
                {formatAmount(data.avg_price)}
              </div>
            </div>
            <div>
              <div className="text-indigo-300 text-xs font-medium mb-1">עסקה מוקדמת ביותר</div>
              <div className="text-lg font-bold font-mono text-white/90">
                {data.first_deal || '—'}
              </div>
            </div>
            <div>
              <div className="text-indigo-300 text-xs font-medium mb-1">עסקה אחרונה שדווחה</div>
              <div className="text-lg font-bold font-mono text-white/90">
                {data.last_deal || '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Price History Line Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 h-[420px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-600" />
                <span>היסטוריית מחירים חציוניים (1998–2026)</span>
              </h2>
              <span className="text-xs text-slate-500 font-semibold font-mono">חציון שנתי</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">התפתחות סכומי העסקאות לפי שנים ב-{data.settlement}</p>
          </div>

          <div className="flex-1 mt-4" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="year" stroke="#94A3B8" fontSize={11} />
                <YAxis
                  tickFormatter={(val) => `₪${(val / 1000000).toFixed(1)}M`}
                  width={75}
                  stroke="#94A3B8"
                  fontSize={11}
                />
                <Tooltip
                  formatter={(val: number) => [
                    val != null ? `₪${Math.round(val).toLocaleString('he-IL')}` : '—',
                    'מחיר חציוני'
                  ]}
                  labelFormatter={(label) => `שנת ${label}`}
                  contentStyle={{ textAlign: 'right', direction: 'rtl' }}
                />
                <Line
                  type="monotone"
                  dataKey="median_amount"
                  stroke="#4F46E5"
                  strokeWidth={3}
                  dot={{ r: 3, fill: '#4F46E5' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Nature Breakdown Pie Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 h-[420px] flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building size={18} className="text-indigo-600" />
              <span>התפלגות סוגי נכסים</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">חלוקת העסקאות לפי אופי הנכס</p>
          </div>

          <div className="flex-1 my-2" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.natures || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="deals"
                  nameKey="nature"
                >
                  {(data.natures || []).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [`${val.toLocaleString('he-IL')} עסקאות`, '']}
                  contentStyle={{ textAlign: 'right', direction: 'rtl' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Clean Legend */}
          <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-100 pt-3">
            {(data.natures || []).slice(0, 6).map((n: any, i: number) => (
              <div key={n.nature} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="truncate text-slate-700 font-medium" title={n.nature}>{n.nature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Deals Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">עסקאות אחרונות שדווחו ב-{data.settlement}</h2>
            <p className="text-xs text-slate-500 mt-0.5">מדגם עסקאות אחרונות שהתקבלו ממיסוי מקרקעין</p>
          </div>
          <Link
            to={`/search?settlements=${encodeURIComponent(data.settlement)}`}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
          >
            <span>לכל העסקאות בחיפוש המלא</span>
            <ExternalLink size={13} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">תאריך</th>
                <th className="py-3 px-4">גוש / חלקה</th>
                <th className="py-3 px-4">סוג נכס</th>
                <th className="py-3 px-3">חדרים</th>
                <th className="py-3 px-4">סכום עסקה</th>
                <th className="py-3 px-4">מחיר למ״ר</th>
                <th className="py-3 px-4 text-center">פרטים</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data.recent_deals || []).map((deal: any, i: number) => (
                <tr key={i} className="hover:bg-indigo-50/40 transition-colors">
                  <td className="py-3 px-4 text-xs font-mono text-slate-600 whitespace-nowrap">
                    {deal.date}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-xs">
                    {deal.gush && deal.helka ? (
                      <Link
                        to={`/parcel/${deal.gush}/${deal.helka}`}
                        className="font-medium text-slate-700 hover:text-indigo-600 hover:underline font-mono"
                      >
                        גוש {deal.gush} / חלקה {deal.helka}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="py-3 px-4 text-xs font-medium text-slate-700">
                    {deal.nature || '—'}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-700">
                    {deal.rooms ? `${deal.rooms} חד׳` : '—'}
                  </td>
                  <td className="py-3 px-4 font-black font-mono text-slate-900 whitespace-nowrap">
                    {formatAmount(deal.amount)}
                  </td>
                  <td className="py-3 px-4 font-bold font-mono text-indigo-700 whitespace-nowrap">
                    {formatAmount(deal.price_per_sqm_normalized)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {deal.gush && deal.helka && (
                      <Link
                        to={`/parcel/${deal.gush}/${deal.helka}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-bold transition-colors"
                      >
                        <span>היסטוריה</span>
                        <ExternalLink size={11} />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
