import { useState, useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { fetchSeries, fetchNatures } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSearchParams } from 'react-router-dom';
import SettlementAutocomplete from '../components/SettlementAutocomplete';
import { SeriesPoint } from '../types';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
const METRICS = [
  { key: 'median_amount', label: 'מחיר חציוני' },
  { key: 'median_ppsqm_normalized', label: 'מחיר למ״ר' },
  { key: 'deals', label: 'מספר עסקאות' },
  { key: 'median_area', label: 'שטח חציוני' },
];

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
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
    <div className="space-y-8">
      {/* Controls */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold mb-4">השוואת יישובים</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">יישובים (עד 5)</label>
            <SettlementAutocomplete
              selected={settlements}
              onChange={handleSettlementsChange}
              maxSelections={5}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">סוג נכס</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={nature}
                onChange={(e) => updateParams({ nature: e.target.value })}
              >
                <option value="">הכל</option>
                {naturesData?.data.map((n) => (
                  <option key={n.nature} value={n.nature}>{n.nature}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">מדד</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
              >
                {METRICS.map(m => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 col-span-1 md:col-span-3 lg:col-span-1">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">מתאריך</label>
              <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" value={dateFrom} onChange={e => updateParams({ date_from: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">עד תאריך</label>
              <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" value={dateTo} onChange={e => updateParams({ date_to: e.target.value })} />
            </div>
          </div>
        </div>
      </div>

      {/* Overlaid Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-[500px] flex flex-col">
        <h2 className="text-xl font-bold mb-6">מגמות לאורך זמן</h2>
        <div className="flex-1" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" />
              <YAxis
                tickFormatter={(val) => {
                  if (selectedMetric === 'median_amount') return `₪${(val / 1000000).toFixed(1)}M`;
                  if (selectedMetric === 'median_ppsqm_normalized') return `₪${(val / 1000).toFixed(1)}k`;
                  return val.toLocaleString('he-IL');
                }}
                width={80}
              />
              <Tooltip
                formatter={(val: number) => {
                  if (val == null) return ['—', ''];
                  if (selectedMetric === 'median_amount' || selectedMetric === 'median_ppsqm_normalized') {
                    return [`₪${val.toLocaleString('he-IL')}`, ''];
                  }
                  if (selectedMetric === 'median_area') {
                    return [`${val.toLocaleString('he-IL')} מ״ר`, ''];
                  }
                  return [val.toLocaleString('he-IL'), ''];
                }}
                labelFormatter={(label) => `שנת ${label}`}
              />
              <Legend />
              {settlements.map((s, i) => (
                <Line
                  key={s}
                  type="monotone"
                  dataKey={s}
                  name={s}
                  stroke={COLORS[i]}
                  strokeWidth={3}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Comparison Table */}
      {latestStats.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold mb-4">נתונים עדכניים (שנה אחרונה)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-sm">
                  <th className="py-3 px-4 font-medium">יישוב</th>
                  <th className="py-3 px-4 font-medium">שנה</th>
                  <th className="py-3 px-4 font-medium">עסקאות</th>
                  <th className="py-3 px-4 font-medium">מחיר חציוני</th>
                  <th className="py-3 px-4 font-medium">מחיר למ״ר</th>
                  <th className="py-3 px-4 font-medium">שטח חציוני</th>
                </tr>
              </thead>
              <tbody>
                {latestStats.map(({ settlement, latest, color }) => (
                  <tr key={settlement} className="border-b border-slate-100">
                    <td className="py-3 px-4 flex items-center gap-2 font-medium">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                      {settlement}
                    </td>
                    <td className="py-3 px-4">{latest.year}</td>
                    <td className="py-3 px-4">{latest.deals != null ? latest.deals.toLocaleString('he-IL') : '—'}</td>
                    <td className="py-3 px-4">{latest.median_amount != null ? `₪${latest.median_amount.toLocaleString('he-IL')}` : '—'}</td>
                    <td className="py-3 px-4">{latest.median_ppsqm_normalized != null ? `₪${latest.median_ppsqm_normalized.toLocaleString('he-IL')}` : '—'}</td>
                    <td className="py-3 px-4">{latest.median_area != null ? `${latest.median_area.toLocaleString('he-IL')} מ״ר` : '—'}</td>
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
