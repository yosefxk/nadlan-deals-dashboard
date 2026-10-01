import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchSeries, compareSettlements } from '../api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import SettlementAutocomplete from '../components/SettlementAutocomplete';
import { TrendingUp, TrendingDown, Calendar, Building2, ExternalLink, ArrowUpDown, BarChart3 } from 'lucide-react';
import clsx from 'clsx';

const POPULAR_CITIES = ['תל אביב -יפו', 'ירושלים', 'חיפה', 'ראשון לציון', 'רמת גן', 'נתניה'];

const YEARS = Array.from({ length: 2026 - 1998 + 1 }, (_, i) => String(2026 - i));

export default function Trends() {
  const [settlement, setSettlement] = useState('תל אביב -יפו');
  const [yearFrom, setYearFrom] = useState('2023');
  const [yearTo, setYearTo] = useState('2024');
  const [order, setOrder] = useState('ppsqm_change_desc');
  const [limit, setLimit] = useState('25');

  const { data: seriesData, isLoading: seriesLoading } = useQuery({
    queryKey: ['series', settlement],
    queryFn: () => fetchSeries({ settlement }),
    enabled: !!settlement,
  });

  const { data: compareData, isLoading: compareLoading } = useQuery({
    queryKey: ['compare', yearFrom, yearTo, order, limit],
    queryFn: () =>
      compareSettlements({
        year_from: yearFrom,
        year_to: yearTo,
        order,
        limit,
      }),
  });

  const formatAmount = (val?: number | null) => {
    if (val == null) return '—';
    return `₪${Math.round(val).toLocaleString('he-IL')}`;
  };

  const formatNumber = (val?: number | null) => {
    if (val == null) return '—';
    return val.toLocaleString('he-IL');
  };

  const formatPct = (val?: number | null) => {
    if (val == null) return '—';
    return `${val > 0 ? '+' : ''}${val.toFixed(1)}%`;
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-l from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-800/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 text-xs font-semibold backdrop-blur-xs border border-indigo-400/20">
              <TrendingUp size={14} className="text-amber-400" />
              <span>ניתוח רב-שנתי ומגמות</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">מגמות נדל״ן והשוואות מחירים</h1>
            <p className="text-sm text-indigo-200/80 max-w-xl">
              התפתחות המחירים וכמות העסקאות לאורך 28 שנות פעילות (1998–2026), לצד השוואת שינויי מחירים בין שנים ברחבי הארץ.
            </p>
          </div>

          {/* Quick Deep Dive Link */}
          {settlement && (
            <Link
              to={`/settlement/${encodeURIComponent(settlement)}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-bold border border-white/20 transition-colors shadow-xs"
            >
              <Building2 size={16} />
              <span>ניתוח מלא לעיר: {settlement}</span>
              <ExternalLink size={14} />
            </Link>
          )}
        </div>
      </div>

      {/* Settlement Selector */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="w-full sm:w-80">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">בחר יישוב לניתוח מגמות:</label>
            <SettlementAutocomplete
              selected={settlement ? [settlement] : []}
              onChange={(cities) => setSettlement(cities[0] || '')}
              singleSelect={true}
              placeholder="חפש יישוב..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
            <span className="text-xs font-semibold text-slate-500 ml-1">ערים נבחרות:</span>
            {POPULAR_CITIES.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => setSettlement(city)}
                className={clsx(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-all',
                  settlement === city
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                )}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Trend Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 h-[420px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-600" />
                <span>מגמת מחיר חציוני - {settlement}</span>
              </h2>
              <span className="text-xs text-slate-500 font-semibold font-mono">1998 - 2026</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">חציון סכומי העסקאות לפי שנה (שקלים חדשים)</p>
          </div>

          <div className="flex-1 mt-4" dir="ltr">
            {seriesLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">טוען נתונים...</div>
            ) : !seriesData?.data || seriesData.data.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">אין נתונים זמינים עבור יישוב זה</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seriesData.data}>
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
                      'מחיר חציוני',
                    ]}
                    labelFormatter={(label) => `שנת ${label}`}
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
            )}
          </div>
        </div>

        {/* Volume Trend Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 h-[420px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 size={18} className="text-blue-600" />
                <span>היקף עסקאות שנתי - {settlement}</span>
              </h2>
              <span className="text-xs text-slate-500 font-semibold font-mono">1998 - 2026</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">סך כל העסקאות שבוצעו בכל שנה</p>
          </div>

          <div className="flex-1 mt-4" dir="ltr">
            {seriesLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">טוען נתונים...</div>
            ) : !seriesData?.data || seriesData.data.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">אין נתונים זמינים עבור יישוב זה</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seriesData.data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="year" stroke="#94A3B8" fontSize={11} />
                  <YAxis
                    width={55}
                    stroke="#94A3B8"
                    fontSize={11}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                  />
                  <Tooltip
                    formatter={(val: number) => [
                      val != null ? `${val.toLocaleString('he-IL')} עסקאות` : '—',
                      'היקף פעילות',
                    ]}
                    labelFormatter={(label) => `שנת ${label}`}
                  />
                  <Bar dataKey="deals" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Section */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ArrowUpDown size={18} className="text-indigo-600" />
              <span>השוואת שינויי מחירים בין שנים ברחבי הארץ</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              יישובים עם פעילות מובהקת (לפחות 30 עסקאות בכל שנה)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Year From */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Calendar size={14} className="text-slate-400" />
              <span>משנת:</span>
              <select
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500/20"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Year To */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <span>עד שנת:</span>
              <select
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500/20"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort / Metric */}
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 text-xs font-bold focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ppsqm_change_desc">עליות חדות (מחיר למ״ר)</option>
              <option value="change_desc">עליות חדות (מחיר חציוני)</option>
              <option value="change_asc">ירידות חדות (מחיר חציוני)</option>
            </select>

            {/* Limit selector */}
            <div className="flex items-center gap-1 text-xs">
              {['10', '25', '50'].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLimit(l)}
                  className={clsx(
                    'px-2 py-1 rounded-md font-semibold transition-colors',
                    limit === l
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">יישוב</th>
                <th className="py-3 px-4">עסקאות ({yearFrom})</th>
                <th className="py-3 px-4">עסקאות ({yearTo})</th>
                <th className="py-3 px-4">מחיר חציוני ({yearFrom})</th>
                <th className="py-3 px-4">מחיר חציוני ({yearTo})</th>
                <th className="py-3 px-4">מחיר למ״ר ({yearFrom})</th>
                <th className="py-3 px-4">מחיר למ״ר ({yearTo})</th>
                <th className="py-3 px-4 text-center">שינוי כולל</th>
                <th className="py-3 px-4 text-center">שינוי למ״ר</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {compareLoading ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-indigo-600 border-t-transparent mb-2" />
                    <div>טוען נתוני השוואה...</div>
                  </td>
                </tr>
              ) : !compareData?.data || compareData.data.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    לא נמצאו יישובים עם מספיק עסקאות להשוואה בשנים אלו
                  </td>
                </tr>
              ) : (
                compareData.data.map((row, i) => {
                  const rank = i + 1;
                  const isPpsqmPositive = (row.ppsqm_change_pct ?? 0) > 0;
                  const isChangePositive = (row.change_pct ?? 0) > 0;

                  return (
                    <tr key={row.settlement || i} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center text-xs font-bold text-slate-400">
                        {rank}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <Link
                          to={`/settlement/${encodeURIComponent(row.settlement)}`}
                          className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5"
                        >
                          <span>{row.settlement}</span>
                          <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700">
                        {formatNumber(row.deals_from)}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-700">
                        {formatNumber(row.deals_to)}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-900 font-semibold">
                        {formatAmount(row.median_from)}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-900 font-semibold">
                        {formatAmount(row.median_to)}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {formatAmount(row.ppsqm_from)}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {formatAmount(row.ppsqm_to)}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {row.change_pct != null ? (
                          <span
                            className={clsx(
                              'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold font-mono',
                              isChangePositive
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            )}
                            dir="ltr"
                          >
                            {isChangePositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                            {formatPct(row.change_pct)}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {row.ppsqm_change_pct != null ? (
                          <span
                            className={clsx(
                              'inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono',
                              isPpsqmPositive
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            )}
                            dir="ltr"
                          >
                            {isPpsqmPositive ? '+' : ''}
                            {row.ppsqm_change_pct.toFixed(1)}%
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
