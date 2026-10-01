import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchDeals, fetchNatures, fetchSearchGeo } from '../api';
import SettlementAutocomplete from '../components/SettlementAutocomplete';
import ActiveFilters, { FilterPill } from '../components/ActiveFilters';
import ResultsMap from '../components/ResultsMap';
import { ChevronDown, ChevronUp, MapPin, BarChart3, Download, Layers } from 'lucide-react';
import { Deal } from '../types';

const FILTER_KEYS = [
  'settlements', 'street', 'gush', 'helka', 'nature',
  'min_rooms', 'max_rooms', 'min_area', 'max_area',
  'min_amount', 'max_amount', 'min_ppsqm', 'max_ppsqm',
  'date_from', 'date_to', 'min_floor', 'max_floor',
  'year_built_from', 'year_built_to', 'sort', 'offset'
];

const PRESET_AMOUNTS = [
  { label: '500K', value: 500000 },
  { label: '1M', value: 1000000 },
  { label: '2M', value: 2000000 },
  { label: '3M', value: 3000000 },
  { label: '5M', value: 5000000 },
];

function CollapsibleSection({ title, defaultOpen = false, children }: { title: string, defaultOpen?: boolean, children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0 py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-slate-800 font-bold focus:outline-none"
      >
        {title}
        {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>
      {isOpen && <div className="mt-4 space-y-4">{children}</div>}
    </div>
  );
}

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Local state for debounced inputs
  const [localText, setLocalText] = useState<{ [key: string]: string }>({});

  const [showMap, setShowMap] = useState(false);

  const currentParams = useMemo(() => {
    const params: Record<string, string | number> = {};
    for (const key of FILTER_KEYS) {
      const val = searchParams.get(key);
      if (val) params[key] = isNaN(Number(val)) || key === 'settlements' || key === 'street' || key.includes('date') || key === 'sort' ? val : Number(val);
    }
    return params;
  }, [searchParams]);

  const offset = Number(currentParams.offset) || 0;
  const limit = 50;

  const { data: naturesData } = useQuery({ queryKey: ['natures'], queryFn: fetchNatures });

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['search', currentParams],
    queryFn: () => searchDeals(currentParams),
  });

  const { data: geoData, isLoading: geoLoading } = useQuery({
    queryKey: ['searchGeo', currentParams],
    queryFn: () => fetchSearchGeo(currentParams),
    enabled: showMap,
  });

  // Keep local text in sync with URL on initial load / external change
  useEffect(() => {
    const newLocal = { ...localText };
    ['street', 'gush', 'helka'].forEach(k => {
      newLocal[k] = searchParams.get(k) || '';
    });
    setLocalText(newLocal);
  }, [searchParams]);

  // Debounce text inputs
  const textUpdateTimeout = useRef<any>(null);
  const handleTextChange = (key: string, value: string) => {
    setLocalText(prev => ({ ...prev, [key]: value }));
    if (textUpdateTimeout.current) clearTimeout(textUpdateTimeout.current);
    textUpdateTimeout.current = setTimeout(() => {
      handleFilterChange(key, value);
    }, 300);
  };

  const handleFilterChange = (key: string, value: any) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === '' || value === undefined || value === null) {
      newParams.delete(key);
    } else {
      newParams.set(key, String(value));
    }
    if (key !== 'offset') newParams.set('offset', '0');
    setSearchParams(newParams);
  };

  const handleClearAll = () => {
    setSearchParams(new URLSearchParams());
    setLocalText({});
  };

  const activeFilters = useMemo(() => {
    const filters: FilterPill[] = [];
    const add = (key: string, label: string, formatter?: (v: string) => string) => {
      const val = searchParams.get(key);
      if (val) filters.push({ key, label, value: formatter ? formatter(val) : val });
    };
    
    add('settlements', 'יישובים');
    add('street', 'רחוב');
    add('gush', 'גוש');
    add('helka', 'חלקה');
    add('nature', 'סוג נכס');
    add('min_rooms', 'חדרים מ-');
    add('max_rooms', 'חדרים עד');
    add('min_area', 'שטח מ-');
    add('max_area', 'שטח עד');
    add('min_amount', 'מחיר מ-', v => `₪${Number(v).toLocaleString('he-IL')}`);
    add('max_amount', 'מחיר עד', v => `₪${Number(v).toLocaleString('he-IL')}`);
    add('min_ppsqm', 'מחיר/מ״ר מ-', v => `₪${Number(v).toLocaleString('he-IL')}`);
    add('max_ppsqm', 'מחיר/מ״ר עד', v => `₪${Number(v).toLocaleString('he-IL')}`);
    add('date_from', 'מתאריך');
    add('date_to', 'עד תאריך');
    
    return filters;
  }, [searchParams]);

  const settlements = (searchParams.get('settlements') || '').split(',').filter(Boolean);

  const compareUrl = `/compare?settlements=${searchParams.get('settlements') || ''}&nature=${searchParams.get('nature') || ''}&date_from=${searchParams.get('date_from') || ''}&date_to=${searchParams.get('date_to') || ''}`;

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      
      {/* Right Side: Filters */}
      <div className="w-full lg:w-80 shrink-0">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              סינון תוצאות
            </h2>
          </div>

          <CollapsibleSection title="מיקום" defaultOpen>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">יישובים</label>
              <SettlementAutocomplete
                selected={settlements}
                onChange={(s) => handleFilterChange('settlements', s.join(','))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">רחוב</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="שם רחוב..."
                value={localText.street ?? ''}
                onChange={(e) => handleTextChange('street', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">גוש</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={localText.gush ?? ''}
                  onChange={(e) => handleTextChange('gush', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">חלקה</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  value={localText.helka ?? ''}
                  onChange={(e) => handleTextChange('helka', e.target.value)}
                />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="נכס">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">סוג נכס</label>
              <select
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                value={searchParams.get('nature') || ''}
                onChange={(e) => handleFilterChange('nature', e.target.value)}
              >
                <option value="">הכל</option>
                {naturesData?.data.map((n) => (
                  <option key={n.nature} value={n.nature}>{n.nature}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">חדרים</label>
              <div className="flex gap-2 mb-2">
                {[1, 2, 3, 4, '5+'].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      if (r === '5+') { handleFilterChange('min_rooms', 5); handleFilterChange('max_rooms', ''); }
                      else { handleFilterChange('min_rooms', r); handleFilterChange('max_rooms', r); }
                    }}
                    className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded border border-slate-200"
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="מ-" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" value={searchParams.get('min_rooms') || ''} onChange={(e) => handleFilterChange('min_rooms', e.target.value)} />
                <input type="number" placeholder="עד" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" value={searchParams.get('max_rooms') || ''} onChange={(e) => handleFilterChange('max_rooms', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">שטח (מ״ר)</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="מ-" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" value={searchParams.get('min_area') || ''} onChange={(e) => handleFilterChange('min_area', e.target.value)} />
                <input type="number" placeholder="עד" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" value={searchParams.get('max_area') || ''} onChange={(e) => handleFilterChange('max_area', e.target.value)} />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="מחיר">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">מחיר</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {PRESET_AMOUNTS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => handleFilterChange('max_amount', p.value)}
                    className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded border border-slate-200"
                  >
                    עד {p.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="מ-" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" value={searchParams.get('min_amount') || ''} onChange={(e) => handleFilterChange('min_amount', e.target.value)} />
                <input type="number" placeholder="עד" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" value={searchParams.get('max_amount') || ''} onChange={(e) => handleFilterChange('max_amount', e.target.value)} />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">מחיר למ״ר</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="מ-" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" value={searchParams.get('min_ppsqm') || ''} onChange={(e) => handleFilterChange('min_ppsqm', e.target.value)} />
                <input type="number" placeholder="עד" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" value={searchParams.get('max_ppsqm') || ''} onChange={(e) => handleFilterChange('max_ppsqm', e.target.value)} />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="תאריך ובנייה">
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">מתאריך</label>
                <input type="date" className="w-full px-2 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" value={searchParams.get('date_from') || ''} onChange={(e) => handleFilterChange('date_from', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">עד תאריך</label>
                <input type="date" className="w-full px-2 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" value={searchParams.get('date_to') || ''} onChange={(e) => handleFilterChange('date_to', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">שנת בנייה מ-</label>
                <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" value={searchParams.get('year_built_from') || ''} onChange={(e) => handleFilterChange('year_built_from', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">שנת בנייה עד</label>
                <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" value={searchParams.get('year_built_to') || ''} onChange={(e) => handleFilterChange('year_built_to', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">קומה מ-</label>
                <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" value={searchParams.get('min_floor') || ''} onChange={(e) => handleFilterChange('min_floor', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">קומה עד</label>
                <input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500" value={searchParams.get('max_floor') || ''} onChange={(e) => handleFilterChange('max_floor', e.target.value)} />
              </div>
            </div>
          </CollapsibleSection>

          <button
            onClick={handleClearAll}
            className="w-full mt-6 py-2 text-sm font-semibold text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg transition-colors"
          >
            איפוס כל הסינונים
          </button>
        </div>
      </div>

      {/* Left Side: Results */}
      <div className="flex-1 space-y-6">
        
        <ActiveFilters
          filters={activeFilters}
          onRemove={(key) => handleFilterChange(key, '')}
          onClearAll={handleClearAll}
        />

        {searchData?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
              <div className="text-sm text-slate-500 mb-1">מחיר חציוני</div>
              <div className="text-xl font-bold text-indigo-700">
                {searchData.summary.median_amount ? `₪${searchData.summary.median_amount.toLocaleString('he-IL')}` : '-'}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
              <div className="text-sm text-slate-500 mb-1">מחיר למ״ר חציוני</div>
              <div className="text-xl font-bold text-indigo-700">
                {searchData.summary.median_ppsqm ? `₪${searchData.summary.median_ppsqm.toLocaleString('he-IL')}` : '-'}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
              <div className="text-sm text-slate-500 mb-1">ממוצע חדרים</div>
              <div className="text-xl font-bold text-slate-800">
                {searchData.summary.avg_rooms ? searchData.summary.avg_rooms.toFixed(1) : '-'}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 text-center">
              <div className="text-sm text-slate-500 mb-1">ממוצע שטח</div>
              <div className="text-xl font-bold text-slate-800">
                {searchData.summary.avg_area ? `${searchData.summary.avg_area.toFixed(1)} מ״ר` : '-'}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            {searchData?.total != null && searchData.total <= 50 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowMap(!showMap)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${showMap ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                >
                  <MapPin size={18} />
                  {showMap ? 'הסתר מפה' : 'הצג מפה כאן'}
                </button>
                <button
                  onClick={() => {
                    const p = new URLSearchParams(searchParams);
                    p.set('mode', 'deals');
                    navigate(`/map?${p.toString()}`);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium rounded-lg text-sm transition-colors"
                  title="צפה בכל העסקאות הללו על מסך המפה המלא"
                >
                  <Layers size={16} />
                  פתח במפה גדולה
                </button>
              </div>
            )}
            {settlements.length > 0 && (
              <button
                onClick={() => navigate(compareUrl)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 font-medium transition-colors"
              >
                <BarChart3 size={18} />
                השוואת תוצאות אלה
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <select
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              value={searchParams.get('sort') || ''}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
            >
              <option value="">מיון ברירת מחדל</option>
              <option value="date_desc">תאריך ↓</option>
              <option value="date_asc">תאריך ↑</option>
              <option value="amount_desc">מחיר ↓</option>
              <option value="amount_asc">מחיר ↑</option>
              <option value="ppsqm_desc">מחיר/מ״ר ↓</option>
              <option value="ppsqm_asc">מחיר/מ״ר ↑</option>
              <option value="area_desc">שטח ↓</option>
              <option value="area_asc">שטח ↑</option>
              <option value="rooms_desc">חדרים ↓</option>
            </select>
            <button className="flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-100">
              <Download size={18} />
            </button>
          </div>
        </div>

        {showMap && (
          <ResultsMap
            deals={geoData?.data || []}
            loading={geoLoading}
          />
        )}

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="mb-4">
            <h2 className="text-xl font-bold">תוצאות ({searchData?.total ? searchData.total.toLocaleString('he-IL') : 0} {searchData?.total_capped && '+'})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 text-sm">
                  <th className="py-3 px-4 font-medium">תאריך</th>
                  <th className="py-3 px-4 font-medium">יישוב</th>
                  <th className="py-3 px-4 font-medium">סוג נכס</th>
                  <th className="py-3 px-4 font-medium">סכום (₪)</th>
                  <th className="py-3 px-4 font-medium">שטח (מ״ר)</th>
                  <th className="py-3 px-4 font-medium">חדרים</th>
                  <th className="py-3 px-4 font-medium">מחיר/מ״ר</th>
                  <th className="py-3 px-4 font-medium">גוש/חלקה</th>
                </tr>
              </thead>
              <tbody>
                {searchLoading ? (
                  <tr><td colSpan={8} className="py-8 text-center text-slate-500">טוען...</td></tr>
                ) : searchData?.data.length === 0 ? (
                  <tr><td colSpan={8} className="py-8 text-center text-slate-500">לא נמצאו תוצאות</td></tr>
                ) : (
                  searchData?.data.map((deal: Deal, i: number) => (
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">{new Date(deal.date).toLocaleDateString('he-IL')}</td>
                      <td className="py-3 px-4">
                        <button onClick={() => navigate(`/settlement/${encodeURIComponent(deal.settlement)}`)} className="text-indigo-600 hover:underline">
                          {deal.settlement}
                        </button>
                      </td>
                      <td className="py-3 px-4">{deal.nature}</td>
                      <td className="py-3 px-4 font-medium">₪{deal.amount ? deal.amount.toLocaleString('he-IL') : '-'}</td>
                      <td className="py-3 px-4">{deal.area_sqm ? deal.area_sqm.toLocaleString('he-IL') : '-'}</td>
                      <td className="py-3 px-4">{deal.rooms ? deal.rooms.toLocaleString('he-IL') : '-'}</td>
                      <td className="py-3 px-4">
                        {deal.price_per_sqm_normalized ? `₪${deal.price_per_sqm_normalized.toLocaleString('he-IL')}` : '-'}
                      </td>
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
              onClick={() => handleFilterChange('offset', Math.max(0, offset - limit))}
              className="px-4 py-2 border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors"
            >
              הקודם
            </button>
            <span className="text-sm text-slate-500">
              עמוד {Math.floor(offset / limit) + 1}
            </span>
            <button
              disabled={!searchData || searchData.data.length < limit}
              onClick={() => handleFilterChange('offset', offset + limit)}
              className="px-4 py-2 border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50 transition-colors"
            >
              הבא
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
