import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchParcel } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Map, ArrowRight } from 'lucide-react';

export default function ParcelDetail() {
  const { gush, helka } = useParams<{ gush: string, helka: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['parcel', gush, helka],
    queryFn: () => fetchParcel(gush!, helka!),
    enabled: !!gush && !!helka,
  });

  if (isLoading) return <div className="text-xl text-center py-12">טוען נתונים...</div>;
  if (!data || !data.data || data.data.length === 0) {
    return <div className="text-xl text-center py-12 text-red-500">לא נמצאו עסקאות בחלקה זו</div>;
  }

  const settlement = data.data[0].settlement;

  // Format data for chart (sort by date ascending)
  const chartData = [...data.data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map(d => ({
    date: d.date,
    amount: d.amount,
  }));

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden">
        <Link to={`/settlement/${encodeURIComponent(settlement)}`} className="inline-flex items-center gap-2 text-indigo-200 hover:text-white mb-6 transition-colors">
          <ArrowRight size={20} />
          חזרה ליישוב
        </Link>
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-sm">
            <Map size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-2">גוש {gush} חלקה {helka}</h1>
            <div className="text-xl text-indigo-200">{settlement}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal History Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold mb-6">היסטוריית עסקאות</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-sm">
                  <th className="py-3 px-4">תאריך</th>
                  <th className="py-3 px-4">כתובת</th>
                  <th className="py-3 px-4">סוג נכס</th>
                  <th className="py-3 px-4">חדרים</th>
                  <th className="py-3 px-4">שטח</th>
                  <th className="py-3 px-4">סכום</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((deal, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">{deal.date}</td>
                    <td className="py-3 px-4">{deal.addresses?.[0] || '-'}</td>
                    <td className="py-3 px-4">{deal.nature}</td>
                    <td className="py-3 px-4">{deal.rooms || '-'}</td>
                    <td className="py-3 px-4">{deal.area_sqm || '-'}</td>
                    <td className="py-3 px-4 font-medium text-indigo-600">₪{deal.amount != null ? deal.amount.toLocaleString('he-IL') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-96 flex flex-col">
          <h2 className="text-xl font-bold mb-4">היסטוריית מחירים</h2>
          <div className="flex-1" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(v) => v.split('-')[0]} />
                <YAxis tickFormatter={(val) => `₪${(val / 1000000).toFixed(1)}M`} width={80} />
                <Tooltip
                  formatter={(val: number) => [`₪${val.toLocaleString('he-IL')}`, 'סכום עסקה']}
                  labelFormatter={(label) => `תאריך: ${label}`}
                  contentStyle={{ textAlign: 'right', direction: 'rtl' }}
                />
                <Line type="stepAfter" dataKey="amount" stroke="#4F46E5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
