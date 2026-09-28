import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchDeals, fetchNatures } from '../api';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const currentParams = Object.fromEntries(searchParams.entries());
  const limit = 50;
  const offset = parseInt(currentParams.offset || '0');

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['search', currentParams],
    queryFn: () => searchDeals({ ...currentParams, limit, offset }),
  });

  const { data: naturesData } = useQuery({
    queryKey: ['natures'],
    queryFn: fetchNatures,
  });

  const handleFilterChange = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.delete('offset'); // Reset pagination on filter change
    setSearchParams(newParams);
  };

  const setPage = (newOffset: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('offset', newOffset.toString());
    setSearchParams(newParams);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Filters Sidebar */}
      <div className="w-full lg:w-72 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit shrink-0">
        <h2 className="text-xl font-bold mb-6">סינון תוצאות</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">יישוב</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              placeholder="שם יישוב..."
              value={currentParams.settlement || ''}
              onChange={(e) => handleFilterChange('settlement', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">סוג נכס</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg"
              value={currentParams.nature || ''}
              onChange={(e) => handleFilterChange('nature', e.target.value)}
            >
              <option value="">הכל</option>
              {naturesData?.data.map((n) => (
                <option key={n.nature} value={n.nature}>{n.nature}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">מחיר מינימום</label>
              <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg" value={currentParams.min_amount || ''} onChange={(e) => handleFilterChange('min_amount', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">מחיר מקסימום</label>
              <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg" value={currentParams.max_amount || ''} onChange={(e) => handleFilterChange('max_amount', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">תאריך מ-</label>
              <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg" value={currentParams.date_from || ''} onChange={(e) => handleFilterChange('date_from', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">תאריך עד</label>
              <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-lg" value={currentParams.date_to || ''} onChange={(e) => handleFilterChange('date_to', e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">תוצאות ({searchData?.total ? searchData.total.toLocaleString('he-IL') : 0} {searchData?.total_capped && '+'})</h2>
          <button className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium transition-colors">
            ייצוא ל-CSV
          </button>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 text-sm">
                <th className="py-3 px-4 font-medium">תאריך</th>
                <th className="py-3 px-4 font-medium">יישוב</th>
                <th className="py-3 px-4 font-medium">סוג נכס</th>
                <th className="py-3 px-4 font-medium">סכום (₪)</th>
                <th className="py-3 px-4 font-medium">שטח (מ״ר)</th>
                <th className="py-3 px-4 font-medium">חדרים</th>
                <th className="py-3 px-4 font-medium">גוש/חלקה</th>
              </tr>
            </thead>
            <tbody>
              {searchLoading ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">טוען...</td></tr>
              ) : searchData?.data.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-slate-500">לא נמצאו תוצאות</td></tr>
              ) : (
                searchData?.data.map((deal, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">{deal.date}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => navigate(`/settlement/${encodeURIComponent(deal.settlement)}`)} className="text-indigo-600 hover:underline">
                        {deal.settlement}
                      </button>
                    </td>
                    <td className="py-3 px-4">{deal.nature}</td>
                    <td className="py-3 px-4 font-medium">₪{deal.amount.toLocaleString('he-IL')}</td>
                    <td className="py-3 px-4">{deal.area_sqm || '-'}</td>
                    <td className="py-3 px-4">{deal.rooms || '-'}</td>
                    <td className="py-3 px-4">
                      {deal.gush && deal.helka ? (
                        <button onClick={() => navigate(`/parcel/${deal.gush}/${deal.helka}`)} className="text-indigo-600 hover:underline">
                          {deal.gush}/{deal.helka}
                        </button>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex justify-between items-center">
          <button
            disabled={offset === 0}
            onClick={() => setPage(Math.max(0, offset - limit))}
            className="px-4 py-2 border border-slate-200 rounded-lg disabled:opacity-50"
          >
            הקודם
          </button>
          <span className="text-sm text-slate-500">
            עמוד {Math.floor(offset / limit) + 1}
          </span>
          <button
            disabled={!searchData || searchData.data.length < limit}
            onClick={() => setPage(offset + limit)}
            className="px-4 py-2 border border-slate-200 rounded-lg disabled:opacity-50"
          >
            הבא
          </button>
        </div>
      </div>
    </div>
  );
}
