import { useState, useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { fetchSeries, fetchNatures } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import SettlementAutocomplete from '../components/SettlementAutocomplete';
import { SeriesPoint } from '../types';
import { BarChart2, Calendar, ExternalLink, Search } from 'lucide-react';
import clsx from 'clsx';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
const METRICS = [
  { key: 'median_amount', label: 'מחיר חציוני' },
  { key: 'median_ppsqm_normalized', label: 'מחיר למ״ר' },
  { key: 'deals', label: 'מספר עסקאות' },
  { key: 'median_area', label: 'שטח חציוני' },
];

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const settlements = (searchParams.get('settlements') || '').split(',').filter(Boolean);
  const nature = searchParams.get('nature') || '';
  const dateFrom = searchParams.get('date_from') || '';
  const dateTo = searchParams.get('date_to') || '';
  
  const [selectedMetric, setSelectedMetric] = useState('median_amount');

  const { data: naturesData } = useQuery({
    queryKey: ['natures'],
    queryFn: fetchNatures,
  });

  const queries = useQueries({
    queries: settlements.map(s => ({
      queryKey: ['series', s, nature, dateFrom, dateTo],
      queryFn: () => {
        const params: Record<string, string> = { settlement: s };
        if (nature) params.nature = nature;
        if (dateFrom) params.date_from = dateFrom;
        if (dateTo) params.date_to = dateTo;
        return fetchSeries(params);
      },
      staleTime: Infinity,
    }))
  });

  const updateParams = (updates: Record<string, string>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([k, v]) => {
      if (v) newParams.set(k, v);
      else newParams.delete(k);
    });
    setSearchParams(newParams);
  };

  const handleSettlementsChange = (newSettlements: string[]) => {
    updateParams({ settlements: newSettlements.join(',') });
  };

  // Merge data for Recharts
  const chartData = useMemo(() => {
    const yearDataMap = new Map<number, any>();
    queries.forEach((q, i) => {
      if (q.data) {
        q.data.data.forEach(d => {
          const existing = yearDataMap.get(d.year) || { year: d.year };
          existing[settlements[i]] = (d as any)[selectedMetric];
          yearDataMap.set(d.year, existing);
        });
      }
    });
    return Array.from(yearDataMap.values()).sort((a, b) => a.year - b.year);
  }, [queries, selectedMetric, settlements]);

  const latestStats = useMemo(() => {
    return settlements.map((s, i) => {
      const q = queries[i];
      if (!q.data?.data?.length) return null;
      const sorted = [...q.data.data].sort((a, b) => b.year - a.year);
      return { settlement: s, latest: sorted[0], color: COLORS[i] };
    }).filter(Boolean) as { settlement: string, latest: SeriesPoint, color: string }[];
  }, [queries, settlements]);

  return (
    <div className="space-y-8 animate-fade-in pb-12" dir="rtl">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-l from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-800/40">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-200 text-xs font-semibold backdrop-blur-xs border border-indigo-400/20">
              <BarChart2 size={14} className="text-amber-400" />
              <span>השוואה רב-עירונית</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">השוואת יישובים במקביל</h1>
            <p className="text-sm text-indigo-200/80 max-w-xl">
              השוואת מגמות מחירים, נפחי פעילות ושטח בין עד 5 יישובים שונים במקביל על גבי ציר זמן של 28 שנה.
            </p>
          </div>

          {settlements.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/search?settlements=${settlements.join(',')}`)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors shadow-2xs"
              >
                <Search size={14} />
                <span>חפש עסקאות בערים אלו</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Controls Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xs border border-slate-200/80 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Settlement Autocomplete */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">בחר יישובים להשוואה (עד 5):</label>
            <SettlementAutocomplete
              selected={settlements}
              onChange={handleSettlementsChange}
              maxSelections={5}
              placeholder="חפש והוסף יישוב..."
            />
          </div>

          {/* Property Nature */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">סינון סוג נכס:</label>
            <select
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium text-slate-800"
              value={nature}
              onChange={(e) => updateParams({ nature: e.target.value })}
            >
              <option value="">כל סוגי הנכסים</option>
              {naturesData?.data.map((n) => (
                <option key={n.nature} value={n.nature}>{n.nature}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100">
          {/* Metric Selector Tabs */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">מדד להשוואה:</span>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {METRICS.map(m => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setSelectedMetric(m.key)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    selectedMetric === m.key
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="flex items-center gap-2 text-xs">
            <Calendar size={14} className="text-slate-400" />
            <span className="text-slate-500 font-semibold">טווח תאריכים:</span>
            <input
              type="date"
              dir="rtl"
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              value={dateFrom}
              onChange={e => updateParams({ date_from: e.target.value })}
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              dir="rtl"
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              value={dateTo}
              onChange={e => updateParams({ date_to: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Overlaid Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80 h-[480px] flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              מגמות השוואתיות: {METRICS.find(m => m.key === selectedMetric)?.label}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">ציר השנים מ-1998 עד 2026</p>
          </div>
          <span className="text-xs font-semibold text-slate-500 font-mono">1998 - 2026</span>
        </div>

        <div className="flex-1 mt-4" dir="ltr">
          {settlements.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">
              בחר לפחות יישוב אחד למעלה כדי לצפות בהשוואה
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="year" stroke="#94A3B8" fontSize={11} />
                <YAxis
                  tickFormatter={(val) => {
                    if (selectedMetric === 'median_amount') return `₪${(val / 1000000).toFixed(1)}M`;
                    if (selectedMetric === 'median_ppsqm_normalized') return `₪${(val / 1000).toFixed(0)}k`;
                    return val.toLocaleString('he-IL');
                  }}
                  width={75}
                  stroke="#94A3B8"
                  fontSize={11}
                />
                <Tooltip
                  formatter={(val: number) => {
                    if (val == null) return ['—', ''];
                    if (selectedMetric === 'median_amount' || selectedMetric === 'median_ppsqm_normalized') {
                      return [`₪${Math.round(val).toLocaleString('he-IL')}`, ''];
                    }
                    if (selectedMetric === 'median_area') {
                      return [`${val.toLocaleString('he-IL')} מ״ר`, ''];
                    }
                    return [val.toLocaleString('he-IL'), ''];
                  }}
                  labelFormatter={(label) => `שנת ${label}`}
                  contentStyle={{ textAlign: 'right', direction: 'rtl' }}
                />
                <Legend />
                {settlements.map((s, i) => (
                  <Line
                    key={s}
                    type="monotone"
                    dataKey={s}
                    name={s}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Summary Table */}
      {latestStats.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">סיכום נתונים עדכניים</h2>
            <span className="text-xs text-slate-500 font-medium">נתוני השנה האחרונה המדווחת עבור כל יישוב</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">יישוב</th>
                  <th className="py-3 px-4">שנת נתונים</th>
                  <th className="py-3 px-4">עסקאות</th>
                  <th className="py-3 px-4">מחיר חציוני</th>
                  <th className="py-3 px-4">מחיר למ״ר חציוני</th>
                  <th className="py-3 px-4">שטח חציוני</th>
                  <th className="py-3 px-4 text-center">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestStats.map(({ settlement, latest, color }) => (
                  <tr key={settlement} className="hover:bg-indigo-50/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2.5">
                      <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: color }} />
                      <Link
                        to={`/settlement/${encodeURIComponent(settlement)}`}
                        className="hover:text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <span>{settlement}</span>
                        <ExternalLink size={12} className="text-slate-400" />
                      </Link>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{latest.year}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                      {latest.deals != null ? latest.deals.toLocaleString('he-IL') : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-black text-slate-900">
                      {latest.median_amount != null ? `₪${Math.round(latest.median_amount).toLocaleString('he-IL')}` : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                      {latest.median_ppsqm_normalized != null ? `₪${Math.round(latest.median_ppsqm_normalized).toLocaleString('he-IL')}` : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {latest.median_area != null ? `${latest.median_area.toLocaleString('he-IL')} מ״ר` : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link
                        to={`/search?settlements=${encodeURIComponent(settlement)}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-bold transition-colors"
                      >
                        <Search size={12} />
                        <span>עסקאות</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
