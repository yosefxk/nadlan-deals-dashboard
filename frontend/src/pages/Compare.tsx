import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { fetchSeries } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { X } from 'lucide-react';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Compare() {
  const [settlements, setSettlements] = useState<string[]>(['תל אביב -יפו', 'ירושלים']);
  const [newSettlement, setNewSettlement] = useState('');

  const queries = useQueries({
    queries: settlements.map(s => ({
      queryKey: ['series', s],
      queryFn: () => fetchSeries({ settlement: s }),
      staleTime: Infinity,
    }))
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSettlement && !settlements.includes(newSettlement) && settlements.length < 5) {
      setSettlements([...settlements, newSettlement]);
      setNewSettlement('');
    }
  };

  const handleRemove = (s: string) => {
    setSettlements(settlements.filter(x => x !== s));
  };

  // Merge data for Recharts
  const yearDataMap = new Map<number, any>();
  queries.forEach((q, i) => {
    if (q.data) {
      q.data.data.forEach(d => {
        const existing = yearDataMap.get(d.year) || { year: d.year };
        existing[settlements[i]] = d.median_amount;
        yearDataMap.set(d.year, existing);
      });
    }
  });

  const chartData = Array.from(yearDataMap.values()).sort((a, b) => a.year - b.year);

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold mb-4">השוואת יישובים</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <form onSubmit={handleAdd} className="flex gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">הוסף יישוב (עד 5)</label>
              <input
                type="text"
                value={newSettlement}
                onChange={(e) => setNewSettlement(e.target.value)}
                placeholder="הזן שם יישוב..."
                className="px-4 py-2 border border-slate-200 rounded-lg w-64"
                disabled={settlements.length >= 5}
              />
            </div>
            <button type="submit" disabled={settlements.length >= 5 || !newSettlement} className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">
              הוסף
            </button>
          </form>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {settlements.map((s, i) => (
            <div key={s} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-white" style={{ backgroundColor: COLORS[i] }}>
              <span>{s}</span>
              <button onClick={() => handleRemove(s)} className="hover:text-black/50">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Overlaid Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-[500px] flex flex-col">
        <h2 className="text-xl font-bold mb-6">מחירי נדל״ן לאורך זמן (חציון)</h2>
        <div className="flex-1" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(val) => `₪${(val / 1000000).toFixed(1)}M`} width={80} />
              <Tooltip formatter={(val: number) => `₪${val.toLocaleString('he-IL')}`} />
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
    </div>
  );
}
