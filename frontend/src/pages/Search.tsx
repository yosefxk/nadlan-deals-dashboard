import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { searchDeals, fetchNatures, fetchSearchGeo } from '../api';
import SettlementAutocomplete from '../components/SettlementAutocomplete';
import StreetAutocomplete from '../components/StreetAutocomplete';
import ActiveFilters, { FilterPill } from '../components/ActiveFilters';
import ResultsMap from '../components/ResultsMap';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  BarChart3,
  Download,
  Layers,
  ArrowRight,
  ArrowLeft,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { Deal } from '../types';

const FILTER_KEYS = [
  'settlements', 'street', 'gush', 'helka', 'nature',
  'min_rooms', 'max_rooms', 'min_area', 'max_area',
  'min_amount', 'max_amount', 'min_ppsqm', 'max_ppsqm',
  'date_from', 'date_to', 'min_floor', 'max_floor',
  'year_built_from', 'year_built_to', 'sort', 'offset'
];

const PRESET_AMOUNTS = [
  { label: 'עד 500 אלף ₪', value: 500000 },
  { label: 'עד 1 מיליון ₪', value: 1000000 },
  { label: 'עד 2 מיליון ₪', value: 2000000 },
  { label: 'עד 3 מיליון ₪', value: 3000000 },
  { label: 'עד 5 מיליון ₪', value: 5000000 },
];

function CollapsibleSection({
  title,
  defaultOpen = false,
  children
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-100 last:border-0 py-3.5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-slate-800 font-bold focus:outline-none hover:text-indigo-600 transition-colors"
      >
        <span className="text-sm">{title}</span>
        {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {isOpen && <div className="mt-3 space-y-3.5">{children}</div>}
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
    add('min_floor', 'קומה מ-');
    add('max_floor', 'קומה עד');
    add('year_built_from', 'שנת בנייה מ-');
    add('year_built_to', 'שנת בנייה עד');
    
    return filters;
  }, [searchParams]);

  const settlements = (searchParams.get('settlements') || searchParams.get('settlement') || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const compareUrl = `/compare?settlements=${searchParams.get('settlements') || searchParams.get('settlement') || ''}&nature=${searchParams.get('nature') || ''}&date_from=${searchParams.get('date_from') || ''}&date_to=${searchParams.get('date_to') || ''}`;

  // Export search results to CSV with UTF-8 BOM for Excel
  const exportToCsv = () => {
    if (!searchData?.data || searchData.data.length === 0) return;
    const headers = [
      'תאריך',
      'יישוב',
      'סוג נכס',
      'סכום עסקה (₪)',
      'מחיר למ״ר (₪)',
      'שטח (מ״ר)',
      'חדרים',
      'קומה',
      'שנת בנייה',
      'גוש',
      'חלקה'
    ];
    const rows = searchData.data.map((d: Deal) => [
      d.date,
      `"${(d.settlement || '').replace(/"/g, '""')}"`,
      `"${(d.nature || '').replace(/"/g, '""')}"`,
      d.amount ?? '',
      d.price_per_sqm_normalized ?? '',
      d.area_sqm ?? '',
      d.rooms ?? '',
      d.floor ?? '',
      d.year_built ?? '',
      d.gush ?? '',
      d.helka ?? ''
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nadlan_deals_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 animate-fade-in pb-12" dir="rtl">
      
      {/* Right Side: Filters Sidebar */}
      <div className="w-full lg:w-80 shrink-0">
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 sticky top-4">
          <div className="flex justify-between items-center mb-3 pb-3 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Filter size={18} className="text-indigo-600" />
              <span>מסנני חיפוש</span>
            </h2>
            {activeFilters.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-rose-600 hover:text-rose-700 hover:underline font-semibold flex items-center gap-1"
              >
                <RotateCcw size={12} />
                <span>איפוס</span>
              </button>
            )}
          </div>

          {/* Location Filters */}
          <CollapsibleSection title="מיקום וכתובת" defaultOpen>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">יישובים</label>
              <SettlementAutocomplete
                selected={settlements}
                onChange={(s) => handleFilterChange('settlements', s.join(','))}
                placeholder="חפש יישוב..."
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>שם רחוב</span>
                {settlements.length > 0 && (
                  <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/60">
                    {settlements.length === 1 ? `מותאם ל${settlements[0]}` : `מותאם ל-${settlements.length} ערים`}
                  </span>
                )}
              </label>
              <StreetAutocomplete
                value={localText.street ?? ''}
                settlements={settlements}
                onChange={(streetVal) => {
                  handleTextChange('street', streetVal);
                }}
                onSelect={(streetVal, selectedCity) => {
                  if (textUpdateTimeout.current) clearTimeout(textUpdateTimeout.current);
                  setLocalText((prev) => ({ ...prev, street: streetVal }));
                  const newParams = new URLSearchParams(searchParams);
                  if (streetVal) {
                    newParams.set('street', streetVal);
                  } else {
                    newParams.delete('street');
                  }
                  if (selectedCity && settlements.length === 0) {
                    newParams.set('settlements', selectedCity);
                  }
                  newParams.set('offset', '0');
                  setSearchParams(newParams);
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">גוש</label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="מספר גוש"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-right placeholder:text-slate-400 font-medium"
                  value={localText.gush ?? ''}
                  onChange={(e) => handleTextChange('gush', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">חלקה</label>
                <input
                  type="text"
                  dir="rtl"
                  placeholder="מספר חלקה"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-right placeholder:text-slate-400 font-medium"
                  value={localText.helka ?? ''}
                  onChange={(e) => handleTextChange('helka', e.target.value)}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* Property Filters */}
          <CollapsibleSection title="מאפייני נכס" defaultOpen>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">סוג נכס</label>
              <select
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                value={searchParams.get('nature') || ''}
                onChange={(e) => handleFilterChange('nature', e.target.value)}
              >
                <option value="">כל סוגי הנכסים</option>
                {naturesData?.data.map((n) => (
                  <option key={n.nature} value={n.nature}>{n.nature}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">מספר חדרים</label>
              <div className="flex gap-1.5 mb-2">
                {[1, 2, 3, 4, '5+'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      if (r === '5+') { handleFilterChange('min_rooms', 5); handleFilterChange('max_rooms', ''); }
                      else { handleFilterChange('min_rooms', r); handleFilterChange('max_rooms', r); }
                    }}
                    className="flex-1 py-1 text-xs font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg border border-slate-200 transition-colors"
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" dir="rtl" placeholder="מ-" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-right placeholder:text-slate-400" value={searchParams.get('min_rooms') || ''} onChange={(e) => handleFilterChange('min_rooms', e.target.value)} />
                <input type="number" dir="rtl" placeholder="עד" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-right placeholder:text-slate-400" value={searchParams.get('max_rooms') || ''} onChange={(e) => handleFilterChange('max_rooms', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">שטח בנוי (מ״ר)</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" dir="rtl" placeholder="מ-" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-right placeholder:text-slate-400" value={searchParams.get('min_area') || ''} onChange={(e) => handleFilterChange('min_area', e.target.value)} />
                <input type="number" dir="rtl" placeholder="עד" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-right placeholder:text-slate-400" value={searchParams.get('max_area') || ''} onChange={(e) => handleFilterChange('max_area', e.target.value)} />
              </div>
            </div>
          </CollapsibleSection>

          {/* Price Filters */}
          <CollapsibleSection title="מחיר ומחיר למ״ר" defaultOpen>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">סכום עסקה</label>
              <div className="flex flex-wrap gap-1 mb-2">
                {PRESET_AMOUNTS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleFilterChange('max_amount', p.value)}
                    className="px-2 py-1 text-[11px] font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg border border-slate-200 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" dir="rtl" placeholder="מחיר מ-" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-right placeholder:text-slate-400" value={searchParams.get('min_amount') || ''} onChange={(e) => handleFilterChange('min_amount', e.target.value)} />
                <input type="number" dir="rtl" placeholder="מחיר עד" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-right placeholder:text-slate-400" value={searchParams.get('max_amount') || ''} onChange={(e) => handleFilterChange('max_amount', e.target.value)} />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-700 mb-1.5">מחיר למ״ר (₪)</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" dir="rtl" placeholder="למ״ר מ-" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-right placeholder:text-slate-400" value={searchParams.get('min_ppsqm') || ''} onChange={(e) => handleFilterChange('min_ppsqm', e.target.value)} />
                <input type="number" dir="rtl" placeholder="למ״ר עד" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm text-right placeholder:text-slate-400" value={searchParams.get('max_ppsqm') || ''} onChange={(e) => handleFilterChange('max_ppsqm', e.target.value)} />
              </div>
            </div>
          </CollapsibleSection>

          {/* Dates & Building Details */}
          <CollapsibleSection title="תאריכים וקומה">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">מתאריך</label>
                <input type="date" dir="rtl" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs text-right" value={searchParams.get('date_from') || ''} onChange={(e) => handleFilterChange('date_from', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">עד תאריך</label>
                <input type="date" dir="rtl" className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs text-right" value={searchParams.get('date_to') || ''} onChange={(e) => handleFilterChange('date_to', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">שנת בנייה מ-</label>
                <input type="number" dir="rtl" placeholder="שנה" className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs text-right placeholder:text-slate-400" value={searchParams.get('year_built_from') || ''} onChange={(e) => handleFilterChange('year_built_from', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">שנת בנייה עד</label>
                <input type="number" dir="rtl" placeholder="שנה" className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs text-right placeholder:text-slate-400" value={searchParams.get('year_built_to') || ''} onChange={(e) => handleFilterChange('year_built_to', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">קומה מ-</label>
                <input type="number" dir="rtl" placeholder="קומה" className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs text-right placeholder:text-slate-400" value={searchParams.get('min_floor') || ''} onChange={(e) => handleFilterChange('min_floor', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">קומה עד</label>
                <input type="number" dir="rtl" placeholder="קומה" className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs text-right placeholder:text-slate-400" value={searchParams.get('max_floor') || ''} onChange={(e) => handleFilterChange('max_floor', e.target.value)} />
              </div>
            </div>
          </CollapsibleSection>

          <button
            type="button"
            onClick={handleClearAll}
            className="w-full mt-4 py-2.5 text-xs font-bold text-slate-600 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw size={13} />
            <span>איפוס כל הסינונים</span>
          </button>
        </div>
      </div>

      {/* Left Side: Results */}
      <div className="flex-1 space-y-5 min-w-0">
        
        <ActiveFilters
          filters={activeFilters}
          onRemove={(key) => handleFilterChange(key, '')}
          onClearAll={handleClearAll}
        />

        {searchData?.summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 text-right">
              <div className="text-xs font-semibold text-slate-500 mb-1">מחיר חציוני</div>
              <div className="text-xl font-black text-indigo-700 font-mono tracking-tight">
                {searchData.summary.median_amount ? `₪${searchData.summary.median_amount.toLocaleString('he-IL')}` : '—'}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 text-right">
              <div className="text-xs font-semibold text-slate-500 mb-1">מחיר חציוני למ״ר</div>
              <div className="text-xl font-black text-indigo-700 font-mono tracking-tight">
                {searchData.summary.median_ppsqm ? `₪${searchData.summary.median_ppsqm.toLocaleString('he-IL')}` : '—'}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 text-right">
              <div className="text-xs font-semibold text-slate-500 mb-1">ממוצע חדרים</div>
              <div className="text-xl font-black text-slate-800 font-mono tracking-tight">
                {searchData.summary.avg_rooms ? searchData.summary.avg_rooms.toFixed(1) : '—'}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80 text-right">
              <div className="text-xs font-semibold text-slate-500 mb-1">ממוצע שטח</div>
              <div className="text-xl font-black text-slate-800 font-mono tracking-tight">
                {searchData.summary.avg_area ? `${searchData.summary.avg_area.toFixed(1)} מ״ר` : '—'}
              </div>
            </div>
          </div>
        )}

        {/* Toolbar & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80">
          <div className="flex flex-wrap items-center gap-2">
            {searchData?.total != null && searchData.total <= 50 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMap(!showMap)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    showMap
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <MapPin size={15} />
                  <span>{showMap ? 'הסתר מפה' : 'הצג במפה קטנה'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const p = new URLSearchParams(searchParams);
                    p.set('mode', 'deals');
                    navigate(`/map?${p.toString()}`);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl text-xs transition-colors border border-indigo-200/60"
                  title="צפה בכל העסקאות הללו על מסך המפה המלא"
                >
                  <Layers size={15} />
                  <span>פתח במפה מלאה</span>
                </button>
              </div>
            )}
            {settlements.length > 0 && (
              <button
                type="button"
                onClick={() => navigate(compareUrl)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 font-bold text-xs transition-colors border border-indigo-200/60"
              >
                <BarChart3 size={15} />
                <span>השוואת נתונים</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs font-semibold text-slate-700"
              value={searchParams.get('sort') || ''}
              onChange={(e) => handleFilterChange('sort', e.target.value)}
            >
              <option value="">מיון ברירת מחדל</option>
              <option value="date_desc">תאריך ↓</option>
              <option value="date_asc">תאריך ↑</option>
              <option value="amount_desc">מחיר עסקה ↓</option>
              <option value="amount_asc">מחיר עסקה ↑</option>
              <option value="ppsqm_desc">מחיר למ״ר ↓</option>
              <option value="ppsqm_asc">מחיר למ״ר ↑</option>
              <option value="area_desc">שטח ↓</option>
              <option value="area_asc">שטח ↑</option>
              <option value="rooms_desc">חדרים ↓</option>
            </select>

            {/* Functional CSV Export Button */}
            <button
              type="button"
              onClick={exportToCsv}
              disabled={!searchData?.data || searchData.data.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 disabled:opacity-40 rounded-xl transition-colors border border-slate-200 hover:border-emerald-200 text-xs font-bold shadow-2xs"
              title="ייצוא תוצאות לקובץ CSV"
            >
              <Download size={14} className="text-emerald-600" />
              <span>ייצוא CSV</span>
            </button>
          </div>
        </div>

        {showMap && (
          <ResultsMap
            deals={geoData?.data || []}
            loading={geoLoading}
          />
        )}

        {/* Results Table */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              תוצאות חיפוש ({searchData?.total ? searchData.total.toLocaleString('he-IL') : 0} {searchData?.total_capped && '+'})
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              מציג עד {limit} תוצאות לעמוד
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">תאריך</th>
                  <th className="py-3 px-4">יישוב</th>
                  <th className="py-3 px-4">סוג נכס</th>
                  <th className="py-3 px-4">סכום עסקה</th>
                  <th className="py-3 px-4">שטח (מ״ר)</th>
                  <th className="py-3 px-3">חדרים</th>
                  <th className="py-3 px-4">מחיר/מ״ר</th>
                  <th className="py-3 px-4">גוש / חלקה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {searchLoading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="inline-block animate-spin rounded-full h-7 w-7 border-2 border-indigo-600 border-t-transparent mb-2" />
                      <div>טוען תוצאות...</div>
                    </td>
                  </tr>
                ) : searchData?.data.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      לא נמצאו עסקאות התואמות את החיפוש
                    </td>
                  </tr>
                ) : (
                  searchData?.data.map((deal: Deal, i: number) => (
                    <tr key={i} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600 font-mono">
                        {deal.date}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => navigate(`/settlement/${encodeURIComponent(deal.settlement)}`)}
                          className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                        >
                          {deal.settlement}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-700">
                        {deal.nature || '—'}
                      </td>
                      <td className="py-3 px-4 font-black font-mono text-slate-900 whitespace-nowrap">
                        {deal.amount ? `₪${deal.amount.toLocaleString('he-IL')}` : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 whitespace-nowrap">
                        {deal.area_sqm ? deal.area_sqm.toLocaleString('he-IL') : '—'}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700 whitespace-nowrap">
                        {deal.rooms ? deal.rooms.toLocaleString('he-IL') : '—'}
                      </td>
                      <td className="py-3 px-4 font-bold font-mono text-indigo-700 whitespace-nowrap">
                        {deal.price_per_sqm_normalized ? `₪${deal.price_per_sqm_normalized.toLocaleString('he-IL')}` : '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs">
                        {deal.gush && deal.helka ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/parcel/${deal.gush}/${deal.helka}`)}
                            className="font-medium text-slate-600 hover:text-indigo-600 hover:underline font-mono"
                          >
                            {deal.gush}/{deal.helka}
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination with explicit RTL arrows */}
          <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => handleFilterChange('offset', Math.max(0, offset - limit))}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-100 transition-colors shadow-2xs"
            >
              <ArrowRight size={14} />
              <span>הקודם</span>
            </button>
            <span className="text-xs font-semibold text-slate-600">
              עמוד {Math.floor(offset / limit) + 1}
            </span>
            <button
              type="button"
              disabled={!searchData || searchData.data.length < limit}
              onClick={() => handleFilterChange('offset', offset + limit)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-100 transition-colors shadow-2xs"
            >
              <span>הבא</span>
              <ArrowLeft size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
