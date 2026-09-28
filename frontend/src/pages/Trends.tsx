import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSeries, compareSettlements } from '../api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Trends() {
  const [settlement, setSettlement] = useState('תל אביב -יפו');
  const [yearFrom, setYearFrom] = useState('2023');
  const [yearTo, setYearTo] = useState('2024');

  const { data: seriesData, isLoading: seriesLoading } = useQuery({
    queryKey: ['series', settlement],
    queryFn: () => fetchSeries({ settlement }),
  });

  const { data: compareData, isLoading: compareLoading } = useQuery({
    queryKey: ['compare', yearFrom, yearTo],
    queryFn: () => compareSettlements({ year_from: yearFrom, year_to: yearTo, limit: '10' }),
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <input
          type="text"
          value={settlement}
          onChange={(e) => setSettlement(e.target.value)}
          placeholder="יישוב לניתוח מגמות"
          className="px-4 py-2 border border-slate-200 rounded-lg w-64"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Trend */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-96 flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-slate-800">מגמת מחירים - {settlement}</h2>
          <div className="flex-1" dir="ltr">
            {seriesLoading ? <div>טוען...</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={seriesData?.data || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(val) => `₪${(val / 1000000).toFixed(1)}M`} width={80} />
                  <Tooltip />
                  <Line type="monotone" dataKey="median_amount" stroke="#4F46E5" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Volume Trend */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-96 flex flex-col">
          <h2 className="text-xl font-bold mb-4 text-slate-800">היקף עסקאות - {settlement}</h2>
          <div className="flex-1" dir="ltr">
            {seriesLoading ? <div>טוען...</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={seriesData?.data || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="year" />
                  <YAxis width={60} />
                  <Tooltip />
                  <Bar dataKey="deals" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top Risers/Fallers */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">שינויי מחירים בולטים</h2>
          <div className="flex gap-2">
            <input type="number" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} className="px-3 py-1 border rounded w-24" />
            <span className="self-center">לעומת</span>
            <input type="number" value={yearTo} onChange={(e) => setYearTo(e.target.value)} className="px-3 py-1 border rounded w-24" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 px-4">יישוב</th>
                <th className="py-3 px-4">עסקאות ({yearFrom})</th>
                <th className="py-3 px-4">עסקאות ({yearTo})</th>
                <th className="py-3 px-4">מחיר למ״ר ({yearFrom})</th>
                <th className="py-3 px-4">מחיר למ״ר ({yearTo})</th>
                <th className="py-3 px-4">שינוי</th>
              </tr>
            </thead>
            <tbody>
              {compareLoading ? <tr><td colSpan={6} className="py-4 text-center">טוען...</td></tr> : (
                compareData?.data.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-3 px-4 font-medium">{row.settlement}</td>
                    <td className="py-3 px-4">{row.deals_from}</td>
                    <td className="py-3 px-4">{row.deals_to}</td>
                    <td className="py-3 px-4">₪{row.ppsqm_from.toLocaleString('he-IL')}</td>
                    <td className="py-3 px-4">₪{row.ppsqm_to.toLocaleString('he-IL')}</td>
                    <td className={`py-3 px-4 font-bold ${row.ppsqm_change_pct > 0 ? 'text-green-600' : 'text-red-600'}`} dir="ltr">
                      {row.ppsqm_change_pct > 0 ? '+' : ''}{row.ppsqm_change_pct.toFixed(1)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
