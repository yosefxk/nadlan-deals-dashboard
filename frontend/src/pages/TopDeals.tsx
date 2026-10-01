import { useState, useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Trophy, 
  Crown, 
  Flame, 
  Sparkles, 
  Building2, 
  MapPin, 
  Calendar, 
  Search as SearchIcon, 
  ExternalLink,
  Navigation as NavigationIcon
} from 'lucide-react';
import { fetchTopDeals } from '../api';
import SettlementAutocomplete from '../components/SettlementAutocomplete';
import clsx from 'clsx';

const LUXURY_CITIES = [
  'תל אביב -יפו',
  'ירושלים',
  'הרצליה',
  'רמת השרון',
  'סביון',
  'רעננה',
  'חיפה',
  'נתניה',
  'קיסריה',
  'כפר שמריהו'
];

const PROPERTY_TYPES = [
  { id: '', label: 'כל סוגי הנכסים' },
  { id: 'apartments', label: 'דירות בבית קומות' },
  { id: 'houses', label: 'בתים בודדים / צמודי קרקע' },
  { id: 'commercial', label: 'מסחר, משרדים וקרקע' },
];

export default function TopDeals() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters from URL
  const sort = searchParams.get('sort') || 'amount_desc';
  const settlement = searchParams.get('settlement') || '';
  const nature = searchParams.get('nature') || '';
  const street = searchParams.get('street') || '';
  const timeframe = searchParams.get('timeframe') || 'all';
  const limit = Number(searchParams.get('limit')) || 50;

  // Local street input state
  const [streetInput, setStreetInput] = useState(street);
  const streetInputId = useId();
  const natureSelectId = useId();
  const timeframeSelectId = useId();

  // Calculate min_year based on timeframe
  let min_year: number | undefined = undefined;
  if (timeframe === '5y') min_year = 2021;
  else if (timeframe === '10y') min_year = 2016;

  // Fetch top deals
  const { data, isLoading, error } = useQuery({
    queryKey: ['top-deals', { sort, settlement, nature, street, min_year, limit }],
    queryFn: () => fetchTopDeals({
      sort,
      settlement,
      nature,
      street,
      min_year: min_year || '',
      limit,
    }),
  });

  const updateParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (!val || val === 'all') {
      next.delete(key);
    } else {
      next.set(key, val);
    }
    setSearchParams(next);
  };

  const handleStreetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('street', streetInput.trim());
  };

  // Format with exact commas for numbers over 1,000
  const formatNumberWithCommas = (val?: number | null) => {
    if (val == null || val === undefined || isNaN(val)) return '—';
    return Number(val).toLocaleString('he-IL');
  };

  const formatAmountWithCommas = (val?: number | null) => {
    if (val == null || val === undefined) return '—';
    return `₪${Number(val).toLocaleString('he-IL')}`;
  };

  // Compact abbreviation tag
  const formatAmountTag = (val?: number | null) => {
    if (!val) return '';
    if (val >= 1_000_000_000) {
      return `${(val / 1_000_000_000).toFixed(2)} מיליארד ₪`;
    }
    if (val >= 1_000_000) {
      return `${(val / 1_000_000).toFixed(2)} מיליון ₪`;
    }
    return '';
  };

  const formatPricePerSqm = (val?: number | null) => {
    if (!val) return '—';
    return `₪${Math.round(val).toLocaleString('he-IL')}`;
  };

  // Generate Google Maps URL
  const getGoogleMapsUrl = (deal: {
    lat?: number | null;
    lon?: number | null;
    full_address?: string | null;
    street?: string | null;
    settlement?: string;
    gush?: string;
    helka?: string;
  }) => {
    // 1. If we have precise geographic coordinates, point directly to GPS pin
    if (deal.lat && deal.lon) {
      return `https://www.google.com/maps/search/?api=1&query=${deal.lat},${deal.lon}`;
    }
    // 2. If we have a named street address or settlement, query Google Maps with city + street
    const addressQuery = [deal.street, deal.settlement].filter(Boolean).join(', ');
    if (addressQuery) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery)}`;
    }
    if (deal.full_address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deal.full_address)}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(deal.settlement || 'ישראל')}`;
  };

  const getDisplayAddress = (deal: {
    full_address?: string | null;
    street?: string | null;
    house_num?: string | null;
    settlement?: string;
    gush?: string;
    helka?: string;
  }) => {
    // Priority: street name + house number
    if (deal.street) {
      const parts = [deal.street, deal.house_num].filter(Boolean).join(' ');
      return deal.settlement ? `${parts}, ${deal.settlement}` : parts;
    }
    // Clean full address without repeating gush/helka if already known
    if (deal.full_address && !deal.full_address.startsWith('גוש')) {
      return deal.full_address;
    }
    // If only settlement is available, state the settlement clearly
    if (deal.settlement) {
      return `אזור ${deal.settlement}`;
    }
    return 'כתובת מדויקת בבדיקה';
  };

  const deals = data?.data || [];
  const stats = data?.stats;
  const top3 = deals.slice(0, 3);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-l from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 md:p-10 shadow-xl border border-indigo-800/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold tracking-wide border border-amber-500/30">
              <Crown size={14} className="text-amber-400" />
              <span>מועדון האלפיון והעסקאות המובילות בישראל</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
              עסקאות שיא בנדל״ן
            </h1>
            <p className="text-sm sm:text-base text-indigo-200/90 max-w-2xl leading-relaxed">
              דירוג העסקאות היקרות ביותר בישראל מתוך מאגר 3.8 מיליון עסקאות רשות המיסים. כולל כתובות מדויקות, קישור ישיר ל-Google Maps, וסינון לפי עיר, רחוב ומחיר למ״ר.
            </p>
          </div>

          {/* Ranking Mode Toggle */}
          <div className="flex bg-indigo-950/80 p-1.5 rounded-2xl border border-indigo-700/60 shrink-0 self-start md:self-auto shadow-inner">
            <button
              onClick={() => updateParam('sort', 'amount_desc')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all',
                sort === 'amount_desc'
                  ? 'bg-amber-500 text-slate-950 shadow-md scale-102'
                  : 'text-indigo-200 hover:text-white hover:bg-indigo-900/60'
              )}
            >
              <Trophy size={16} />
              <span>סכום כולל (₪)</span>
            </button>
            <button
              onClick={() => updateParam('sort', 'ppsqm_desc')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all',
                sort === 'ppsqm_desc'
                  ? 'bg-amber-500 text-slate-950 shadow-md scale-102'
                  : 'text-indigo-200 hover:text-white hover:bg-indigo-900/60'
              )}
            >
              <Flame size={16} />
              <span>מחיר שיא למ״ר (₪/מ״ר)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 space-y-4">
        {/* Quick city chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs sm:text-sm">
          <span className="text-slate-500 font-medium shrink-0 flex items-center gap-1.5">
            <MapPin size={15} className="text-indigo-600" />
            שווקי צמרת:
          </span>
          <button
            onClick={() => updateParam('settlement', '')}
            className={clsx(
              'px-3 py-1.5 rounded-full font-medium transition-colors shrink-0',
              !settlement
                ? 'bg-indigo-600 text-white font-semibold'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            )}
          >
            כל הארץ
          </button>
          {LUXURY_CITIES.map((c) => (
            <button
              key={c}
              onClick={() => updateParam('settlement', c)}
              className={clsx(
                'px-3 py-1.5 rounded-full font-medium transition-colors shrink-0',
                settlement === c
                  ? 'bg-indigo-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Settlement Autocomplete Search */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              יישוב / עיר (הקלד לחיפוש)
            </label>
            <SettlementAutocomplete
              selected={settlement ? [settlement] : []}
              onChange={(cities) => updateParam('settlement', cities[0] || '')}
              singleSelect={true}
              placeholder="הקלד שם עיר (למשל: תל אביב, הרצליה...)"
            />
          </div>

          {/* Property Type Select */}
          <div>
            <label htmlFor={natureSelectId} className="block text-xs font-semibold text-slate-600 mb-1">
              סוג נכס
            </label>
            <select
              id={natureSelectId}
              value={nature}
              onChange={(e) => updateParam('nature', e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PROPERTY_TYPES.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Street / Prestigious Address */}
          <div>
            <label htmlFor={streetInputId} className="block text-xs font-semibold text-slate-600 mb-1">
              סינון לפי רחוב / כתובת
            </label>
            <form onSubmit={handleStreetSubmit} className="relative">
              <input
                id={streetInputId}
                type="text"
                placeholder="לדוגמה: הירקון, רוטשילד, זרובבל..."
                value={streetInput}
                onChange={(e) => setStreetInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                aria-label="חפש לפי רחוב"
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600"
              >
                <SearchIcon size={16} />
              </button>
            </form>
          </div>

          {/* Timeframe */}
          <div>
            <label htmlFor={timeframeSelectId} className="block text-xs font-semibold text-slate-600 mb-1">
              תקופת זמן
            </label>
            <select
              id={timeframeSelectId}
              value={timeframe}
              onChange={(e) => updateParam('timeframe', e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">כל השנים (1998 — 2026)</option>
              <option value="5y">5 שנים אחרונות (מ-2021)</option>
              <option value="10y">10 שנים אחרונות (מ-2016)</option>
            </select>
          </div>
        </div>

        {/* Active filters pill list */}
        {(settlement || nature || street || timeframe !== 'all') && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap text-xs">
            <span className="text-slate-500 font-medium">מסננים פעילים:</span>
            {settlement && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                עיר: {settlement}
                <button onClick={() => updateParam('settlement', '')} className="hover:text-indigo-900 mr-1">×</button>
              </span>
            )}
            {nature && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                סוג: {PROPERTY_TYPES.find(p => p.id === nature)?.label || nature}
                <button onClick={() => updateParam('nature', '')} className="hover:text-indigo-900 mr-1">×</button>
              </span>
            )}
            {street && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                רחוב: {street}
                <button onClick={() => { setStreetInput(''); updateParam('street', ''); }} className="hover:text-indigo-900 mr-1">×</button>
              </span>
            )}
            {timeframe !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                תקופה: {timeframe === '5y' ? '5 שנים אחרונות' : '10 שנים אחרונות'}
                <button onClick={() => updateParam('timeframe', 'all')} className="hover:text-indigo-900 mr-1">×</button>
              </span>
            )}
            <button
              onClick={() => {
                setStreetInput('');
                const next = new URLSearchParams();
                if (sort) next.set('sort', sort);
                setSearchParams(next);
              }}
              className="text-indigo-600 hover:text-indigo-800 font-semibold underline mr-2"
            >
              נקה הכל
            </button>
          </div>
        )}
      </div>

      {/* Highlights / Stats cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Highest Deal Card */}
          <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-800">
              <span className="text-xs font-bold uppercase tracking-wider">עסקת השיא שנמצאה</span>
              <Trophy size={18} className="text-amber-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-amber-950 font-mono tracking-tight">
                {formatAmountWithCommas(stats.highest_deal?.amount)}
              </div>
              {stats.highest_deal?.amount ? (
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-900 text-xs font-bold">
                  {formatAmountTag(stats.highest_deal.amount)}
                </span>
              ) : null}
              <p className="text-xs font-semibold text-amber-800/90 mt-2 flex items-center gap-1">
                <MapPin size={12} className="shrink-0 text-amber-600" />
                <span>{getDisplayAddress(stats.highest_deal || {})}</span>
              </p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-amber-200/60 text-[11px] text-slate-500">
                <span>{stats.highest_deal?.date}</span>
                {stats.highest_deal && (
                  <a
                    href={getGoogleMapsUrl(stats.highest_deal)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-bold hover:underline"
                  >
                    <span>Google Maps</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Highest PPSQM Card */}
          <div className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent border border-indigo-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-indigo-800">
              <span className="text-xs font-bold uppercase tracking-wider">שיא מחיר למ״ר</span>
              <Flame size={18} className="text-indigo-600" />
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-indigo-950 font-mono tracking-tight">
                {formatPricePerSqm(stats.highest_ppsqm_deal?.calc_ppsqm)} / מ״ר
              </div>
              <p className="text-xs font-semibold text-indigo-800/90 mt-2 flex items-center gap-1">
                <MapPin size={12} className="shrink-0 text-indigo-600" />
                <span>{getDisplayAddress(stats.highest_ppsqm_deal || {})}</span>
              </p>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-indigo-200/60 text-[11px] text-slate-500">
                <span>סכום {formatAmountWithCommas(stats.highest_ppsqm_deal?.amount)}</span>
                {stats.highest_ppsqm_deal && (
                  <a
                    href={getGoogleMapsUrl(stats.highest_ppsqm_deal)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-indigo-700 hover:text-indigo-900 font-bold hover:underline"
                  >
                    <span>Google Maps</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Top Luxury Cities */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-xs font-bold uppercase tracking-wider">ערי צמרת מובילות</span>
              <Building2 size={18} className="text-slate-500" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {stats.top_cities?.slice(0, 4).map((tc) => (
                <span
                  key={tc.settlement}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-xs font-medium"
                >
                  <span className="font-bold">{tc.settlement}:</span> {formatNumberWithCommas(tc.count)} עסקאות
                </span>
              ))}
            </div>
          </div>

          {/* Average of Top Deals */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-xs font-bold uppercase tracking-wider">ממוצע עסקאות מובילות</span>
              <Sparkles size={18} className="text-amber-500" />
            </div>
            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                {formatAmountWithCommas(stats.avg_top_amount)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                ממוצע הדירוג ({formatNumberWithCommas(deals.length)} עסקאות מתוך {formatNumberWithCommas(data?.total)})
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading & Error States */}
      {isLoading && (
        <div className="bg-white rounded-2xl p-12 text-center shadow-xs border border-slate-200">
          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent mb-4" />
          <p className="text-slate-600 font-medium">טוען את עסקאות השיא...</p>
        </div>
      )}

      {error && (
        <div className="bg-rose-50 text-rose-800 p-6 rounded-2xl border border-rose-200">
          <p className="font-bold">שגיאה בטעינת עסקאות השיא</p>
          <p className="text-sm mt-1">{(error as Error).message}</p>
        </div>
      )}

      {/* Podium Top 3 Cards */}
      {!isLoading && top3.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Crown size={20} className="text-amber-500" />
            <h2 className="text-xl font-bold text-slate-900">שלישיית הפסגה (מקומות 1-3)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {top3.map((deal, idx) => {
              const rank = idx + 1;
              const isGold = rank === 1;
              const isSilver = rank === 2;
              const isBronze = rank === 3;
              const gmapsUrl = getGoogleMapsUrl(deal);
              const addressText = getDisplayAddress(deal);

              return (
                <div
                  key={deal.id || `${deal.gush}-${deal.helka}-${deal.date}-${idx}`}
                  className={clsx(
                    'relative rounded-2xl p-6 transition-all shadow-md flex flex-col justify-between border',
                    isGold && 'bg-gradient-to-br from-amber-50 via-white to-amber-100/50 border-amber-300 ring-2 ring-amber-400/40',
                    isSilver && 'bg-gradient-to-br from-slate-100/80 via-white to-slate-200/50 border-slate-300',
                    isBronze && 'bg-gradient-to-br from-orange-50 via-white to-amber-100/30 border-orange-200'
                  )}
                >
                  {/* Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={clsx(
                        'w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shadow-xs',
                        isGold && 'bg-amber-400 text-slate-950',
                        isSilver && 'bg-slate-300 text-slate-800',
                        isBronze && 'bg-amber-600 text-white'
                      )}
                    >
                      #{rank}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                      <Calendar size={13} />
                      {deal.date}
                    </span>
                  </div>

                  {/* Main Value */}
                  <div className="space-y-1 mb-4">
                    <div className="text-2xl sm:text-3xl font-black text-slate-950 font-mono tracking-tight">
                      {formatAmountWithCommas(deal.amount)}
                    </div>
                    {formatAmountTag(deal.amount) ? (
                      <span className="inline-block text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md">
                        {formatAmountTag(deal.amount)}
                      </span>
                    ) : null}
                    {deal.calc_ppsqm ? (
                      <div className="text-sm font-bold text-indigo-700 mt-1">
                        {formatPricePerSqm(deal.calc_ppsqm)} למ״ר
                      </div>
                    ) : null}
                  </div>

                  {/* Address & Google Maps button */}
                  <div className="mb-4 p-3 bg-white/80 rounded-xl border border-slate-200/70 space-y-2">
                    <div className="flex items-start gap-1.5 text-xs font-semibold text-slate-800 leading-snug">
                      <MapPin size={14} className="text-rose-500 shrink-0 mt-0.5" />
                      <span>{addressText}</span>
                    </div>

                    <a
                      href={gmapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 w-full justify-center px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      <NavigationIcon size={12} />
                      <span>פתח ב-Google Maps</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-xs text-slate-700 pt-3 border-t border-slate-200/60">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">עיר:</span>
                      <Link
                        to={`/settlement/${encodeURIComponent(deal.settlement)}`}
                        className="font-bold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        {deal.settlement}
                      </Link>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">סוג נכס:</span>
                      <span className="font-semibold">{deal.nature || '—'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">שטח וחדרים:</span>
                      <span className="font-semibold font-mono">
                        {deal.area_sqm ? `${formatNumberWithCommas(deal.area_sqm)} מ״ר` : '—'}
                        {deal.rooms ? ` • ${formatNumberWithCommas(deal.rooms)} חד׳` : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">גוש / חלקה:</span>
                      {deal.gush && deal.helka ? (
                        <Link
                          to={`/parcel/${deal.gush}/${deal.helka}`}
                          className="font-medium text-slate-600 hover:text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          {deal.gush} / {deal.helka}
                          <ExternalLink size={12} />
                        </Link>
                      ) : (
                        <span>—</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Ranking Table */}
      {!isLoading && deals.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                טבלת דירוג עסקאות השיא ({formatNumberWithCommas(data?.total)} עסקאות נמצאו)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                מציג את {formatNumberWithCommas(deals.length)} העסקאות הראשונות לפי {sort === 'amount_desc' ? 'מחיר כולל' : 'מחיר למ״ר'}
              </p>
            </div>

            {/* Quick limit selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">הצג:</span>
              {[25, 50, 100].map((l) => (
                <button
                  key={l}
                  onClick={() => updateParam('limit', String(l))}
                  className={clsx(
                    'px-2.5 py-1 rounded-md font-semibold transition-colors',
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

          <div className="overflow-x-auto">
            <table className="w-full text-right text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-4">סכום עסקה</th>
                  <th className="py-3 px-4">מחיר למ״ר</th>
                  <th className="py-3 px-4">יישוב</th>
                  <th className="py-3 px-4">כתובת ומיקום</th>
                  <th className="py-3 px-3 text-center">Google Maps</th>
                  <th className="py-3 px-4">סוג נכס</th>
                  <th className="py-3 px-4">שטח (מ״ר)</th>
                  <th className="py-3 px-3">חדרים</th>
                  <th className="py-3 px-4">תאריך</th>
                  <th className="py-3 px-4">גוש / חלקה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deals.map((deal, idx) => {
                  const rank = idx + 1;
                  const gmapsUrl = getGoogleMapsUrl(deal);
                  const addressText = getDisplayAddress(deal);

                  return (
                    <tr
                      key={deal.id || `${deal.gush}-${deal.helka}-${deal.date}-${idx}`}
                      className="hover:bg-indigo-50/40 transition-colors group"
                    >
                      <td className="py-3 px-3 text-center">
                        <span
                          className={clsx(
                            'inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold',
                            rank === 1 && 'bg-amber-400 text-slate-950 font-black',
                            rank === 2 && 'bg-slate-300 text-slate-800 font-black',
                            rank === 3 && 'bg-amber-600 text-white font-black',
                            rank > 3 && 'text-slate-500 font-medium'
                          )}
                        >
                          {rank}
                        </span>
                      </td>

                      {/* Amount with commas and tag */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-black text-slate-900 font-mono tracking-tight group-hover:text-indigo-900">
                          {formatAmountWithCommas(deal.amount)}
                        </div>
                        {formatAmountTag(deal.amount) ? (
                          <div className="text-[11px] text-amber-700 font-semibold mt-0.5">
                            {formatAmountTag(deal.amount)}
                          </div>
                        ) : null}
                      </td>

                      {/* Price per sqm with commas */}
                      <td className="py-3 px-4 font-bold text-indigo-700 font-mono whitespace-nowrap">
                        {formatPricePerSqm(deal.calc_ppsqm)}
                      </td>

                      {/* Settlement */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <Link
                          to={`/settlement/${encodeURIComponent(deal.settlement)}`}
                          className="font-semibold text-slate-800 hover:text-indigo-600 hover:underline"
                        >
                          {deal.settlement}
                        </Link>
                      </td>

                      {/* Address */}
                      <td className="py-3 px-4 max-w-xs text-xs">
                        <div className="flex items-center gap-1 font-medium text-slate-800 line-clamp-2">
                          <MapPin size={12} className="text-rose-500 shrink-0" />
                          <span>{addressText}</span>
                        </div>
                      </td>

                      {/* Google Maps Link Button */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <a
                          href={gmapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 hover:text-emerald-800 font-bold text-xs border border-emerald-200 transition-colors shadow-2xs"
                          title="פתח מיקום מדויק ב-Google Maps"
                        >
                          <NavigationIcon size={12} />
                          <span>מפה ↗</span>
                        </a>
                      </td>

                      {/* Nature */}
                      <td className="py-3 px-4 text-slate-600 text-xs whitespace-nowrap">
                        {deal.nature || '—'}
                      </td>

                      {/* Area with commas */}
                      <td className="py-3 px-4 font-semibold text-slate-700 font-mono whitespace-nowrap">
                        {deal.area_sqm ? formatNumberWithCommas(deal.area_sqm) : '—'}
                      </td>

                      {/* Rooms */}
                      <td className="py-3 px-3 font-semibold text-slate-700 font-mono text-center whitespace-nowrap">
                        {deal.rooms ? formatNumberWithCommas(deal.rooms) : '—'}
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap font-mono">
                        {deal.date}
                      </td>

                      {/* Gush / Helka */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {deal.gush && deal.helka ? (
                          <Link
                            to={`/parcel/${deal.gush}/${deal.helka}`}
                            className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                          >
                            <span>{deal.gush}/{deal.helka}</span>
                            <ExternalLink size={12} />
                          </Link>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && deals.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center shadow-xs border border-slate-200">
          <Trophy size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-bold text-slate-800">לא נמצאו עסקאות העונות לסינון זה</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            נסה להרחיב את החיפוש לכל הארץ או לבטל חלק מהמסננים (כגון רחוב או סוג נכס).
          </p>
          <button
            onClick={() => {
              setStreetInput('');
              const next = new URLSearchParams();
              if (sort) next.set('sort', sort);
              setSearchParams(next);
            }}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            איפוס כל המסננים
          </button>
        </div>
      )}
    </div>
  );
}
