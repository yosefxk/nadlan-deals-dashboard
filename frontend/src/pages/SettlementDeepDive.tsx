import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchSettlementDetail } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MapPin } from 'lucide-react';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function SettlementDeepDive() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['settlement', name],
    queryFn: () => fetchSettlementDetail(name!),
    enabled: !!name,
  });

  if (isLoading) return <div className="text-xl text-center py-12">טוען נתונים...</div>;
  if (!data) return <div className="text-xl text-center py-12 text-red-500">לא נמצאו נתונים עבור יישוב זה</div>;

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4">
            <MapPin size={32} className="text-indigo-300" />
            <h1 className="text-4xl font-bold">{data.settlement}</h1>
          </div>
          <div className="flex flex-wrap gap-8 mt-8">
            <div>
              <div className="text-indigo-200 text-sm mb-1">סה״כ עסקאות</div>
              <div className="text-2xl font-bold">{data.total_deals.toLocaleString('he-IL')}</div>
            </div>
            <div>
              <div className="text-indigo-200 text-sm mb-1">מחיר ממוצע עכשווי</div>
              <div className="text-2xl font-bold">₪{data.avg_price?.toLocaleString('he-IL') || '-'}</div>
            </div>
            <div>
              <div className="text-indigo-200 text-sm mb-1">עסקה ראשונה</div>
              <div className="text-xl">{data.first_deal || '-'}</div>
            </div>
            <div>
              <div className="text-indigo-200 text-sm mb-1">עסקה אחרונה</div>
              <div className="text-xl">{data.last_deal || '-'}</div>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Price History */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-96 flex flex-col">
          <h2 className="text-xl font-bold mb-4">היסטוריית מחירים (חציון)</h2>
          <div className="flex-1" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.series || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="year" />
                <YAxis tickFormatter={(val) => `₪${(val / 1000000).toFixed(1)}M`} width={80} />
                <Tooltip />
                <Line type="monotone" dataKey="median_amount" stroke="#4F46E5" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Nature Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-96 flex flex-col">
          <h2 className="text-xl font-bold mb-4">התפלגות סוגי נכסים</h2>
          <div className="flex-1" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.natures || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="deals"
                  nameKey="nature"
                >
                  {(data.natures || []).map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
            {(data.natures || []).slice(0, 6).map((n: any, i: number) => (
              <div key={n.nature} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="truncate" title={n.nature}>{n.nature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Deals Table */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold mb-6">עסקאות אחרונות</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-sm">
                <th className="py-3 px-4">תאריך</th>
                <th className="py-3 px-4">כתובת / גוש וחלקה</th>
                <th className="py-3 px-4">סוג נכס</th>
                <th className="py-3 px-4">חדרים</th>
                <th className="py-3 px-4">סכום</th>
                <th className="py-3 px-4">מחיר למ״ר</th>
              </tr>
            </thead>
            <tbody>
              {(data.recent_deals || []).map((deal: any, i: number) => (
                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">{deal.date}</td>
                  <td className="py-3 px-4">
                    {deal.gush && deal.helka ? (
                      <button onClick={() => navigate(`/parcel/${deal.gush}/${deal.helka}`)} className="text-indigo-600 hover:underline">
                        גוש {deal.gush} חלקה {deal.helka}
                      </button>
                    ) : '-'}
                  </td>
                  <td className="py-3 px-4">{deal.nature}</td>
                  <td className="py-3 px-4">{deal.rooms || '-'}</td>
                  <td className="py-3 px-4 font-medium">₪{deal.amount?.toLocaleString('he-IL')}</td>
                  <td className="py-3 px-4">{deal.price_per_sqm_normalized ? `₪${deal.price_per_sqm_normalized.toLocaleString('he-IL')}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
