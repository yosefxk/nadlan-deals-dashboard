import { useQuery } from '@tanstack/react-query';
import { fetchStats, fetchSeries, fetchSettlements, fetchOmnisearch } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, MapPin, Building, Home, ArrowLeft, Trophy, TrendingUp, Building2, Layers } from 'lucide-react';
import { useGooglePlaces } from '../hooks/useGooglePlaces';

export default function Dashboard() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
  });

  const { data: seriesData, isLoading: seriesLoading } = useQuery({
    queryKey: ['series', 'national'],
    queryFn: () => fetchSeries({}),
  });

  const { data: settlementsData, isLoading: settlementsLoading } = useQuery({
    queryKey: ['settlements', 'top'],
    queryFn: fetchSettlements,
  });

  const { data: omniData } = useQuery({
    queryKey: ['omnisearch', searchQuery],
    queryFn: () => fetchOmnisearch(searchQuery),
    enabled: searchQuery.trim().length > 1,
  });

  const {
    isConfigured: isGoogleMapsConfigured,
    predictions: googlePredictions,
    searchPlaces,
    getDetails: getGoogleDetails,
  } = useGooglePlaces();

  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      searchPlaces(searchQuery);
    }
  }, [searchQuery]);

  const handleSelectGooglePlace = async (placeId: string, description: string) => {
    try {
      const details = await getGoogleDetails(placeId);
      if (details.settlement && details.street) {
        navigate(`/search?settlements=${encodeURIComponent(details.settlement)}&street=${encodeURIComponent(details.street)}`);
      } else if (details.settlement) {
        navigate(`/settlement/${encodeURIComponent(details.settlement)}`);
      } else {
        navigate(`/search?q=${encodeURIComponent(description)}`);
      }
    } catch {
      navigate(`/search?q=${encodeURIComponent(description)}`);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const [year, month, day] = dateStr.split('-');
      if (year && month && day) {
        return `${day}/${month}/${year}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const dateRangeText = stats?.first_deal && stats?.last_deal
    ? `${formatDate(stats.first_deal)} — ${formatDate(stats.last_deal)}`
    : '01/01/1998 — 17/09/2026';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'מפות Google':
        return <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-semibold border border-amber-200/70">Google Maps</span>;
      case 'רחוב':
        return <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/60">רחוב</span>;
      case 'יישוב / עיר':
        return <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60">יישוב</span>;
      case 'גוש וחלקה':
      case 'גוש':
        return <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-semibold border border-purple-200/60">גוש/חלקה</span>;
      case 'סוג נכס':
        return <span className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-200/60">נכס</span>;
      default:
        return <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold border border-slate-200">חיפוש</span>;
    }
  };

  const formatNumberWithCommas = (val?: number | null) => {
    if (val == null) return '—';
    return val.toLocaleString('he-IL');
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12" dir="rtl">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto pt-2 pb-1 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-medium shadow-xs">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <span>מאגר עסקאות מדווחות</span>
          <span>•</span>
          <span className="font-semibold">{dateRangeText}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          עסקאות נדל״ן בישראל
        </h1>
        <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase">
          hosted by BaileyTV
        </p>

        <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
          חיפוש, השוואה וניתוח מגמות של 3.8 מיליון עסקאות מיסוי מקרקעין שדווחו בישראל
          <span className="block text-xs text-slate-500 mt-1 font-medium">
            נתונים מלאים מ-{dateRangeText}
          </span>
        </p>
      </div>

      {/* Omnisearch Bar */}
      <div className="relative max-w-2xl mx-auto z-30">
        <form onSubmit={handleSearchSubmit} className="relative">
          <input
            type="text"
            dir="rtl"
            className="w-full pl-14 pr-5 py-4 rounded-2xl shadow-lg border border-slate-200 text-base sm:text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-right placeholder:text-slate-400 font-medium"
            placeholder="חפש לפי עיר, רחוב, גוש/חלקה או סוג נכס..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            type="submit"
            className="absolute left-3 top-3 p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors shadow-xs"
            title="חפש"
          >
            <Search size={20} />
          </button>
        </form>

        {/* Quick Example Links */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-xs text-slate-500">
          <Link
            to="/top-deals"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold transition-colors shadow-2xs border border-amber-300"
          >
            <Trophy size={13} className="text-amber-600" />
            <span>עסקאות שיא</span>
          </Link>
          <span className="text-slate-400 font-medium mr-1">לדוגמה:</span>
          <button onClick={() => navigate('/settlement/תל אביב -יפו')} className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-slate-700 transition-colors">תל אביב</button>
          <button onClick={() => navigate('/settlement/ירושלים')} className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-slate-700 transition-colors">ירושלים</button>
          <button onClick={() => navigate('/search?street=דיזנגוף&settlements=תל אביב -יפו')} className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-slate-700 transition-colors">דיזנגוף ת״א</button>
          <button onClick={() => navigate('/parcel/6903/104')} className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-slate-700 transition-colors">גוש 6903/104</button>
          <button onClick={() => navigate('/search?nature=דירה בבית קומות')} className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 text-slate-700 transition-colors">דירה בבית קומות</button>
        </div>

        {/* Omnisearch Dropdown */}
        {searchQuery.trim().length > 1 && (
          ((omniData?.results && omniData.results.length > 0) || googlePredictions.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 max-h-96 overflow-y-auto z-40">
              {/* Google Places Results */}
              {googlePredictions.map((pred) => (
                <button
                  key={pred.placeId}
                  className="w-full text-right px-4 py-3 hover:bg-amber-50/60 transition-colors flex items-center justify-between gap-3 group"
                  onClick={() => handleSelectGooglePlace(pred.placeId, pred.description)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-50 group-hover:bg-white text-amber-600 transition-colors shadow-2xs">
                      <MapPin size={18} />
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-800 group-hover:text-amber-900 text-sm">
                        {pred.mainText}
                      </div>
                      {pred.secondaryText && (
                        <div className="text-xs text-slate-500 mt-0.5">{pred.secondaryText}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getCategoryBadge('מפות Google')}
                    <ArrowLeft size={16} className="text-slate-300 group-hover:text-amber-600 transition-colors" />
                  </div>
                </button>
              ))}

              {/* Database Results */}
              {omniData?.results.map((res, idx) => (
                <button
                  key={idx}
                  className="w-full text-right px-4 py-3 hover:bg-indigo-50/60 transition-colors flex items-center justify-between gap-3 group"
                  onClick={() => navigate(res.url)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-white text-slate-500 group-hover:text-indigo-600 transition-colors shadow-2xs">
                      {res.type === 'street' ? <MapPin size={18} /> :
                       res.type === 'settlement' ? <Building size={18} /> :
                       res.type === 'nature' ? <Home size={18} /> :
                       <Search size={18} />}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-800 group-hover:text-indigo-900 text-sm">
                        {res.title}
                      </div>
                      {res.subtitle && (
                        <div className="text-xs text-slate-500 mt-0.5">{res.subtitle}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getCategoryBadge(res.category)}
                    <ArrowLeft size={16} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
                  </div>
                </button>
              ))}

              {/* Autocomplete status badge */}
              <div className="px-4 py-2 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
                <span>חיפוש חכם מתוך 158,000 רחובות ו-1,020 יישובים</span>
                {isGoogleMapsConfigured ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    Google Places פעיל
                  </span>
                ) : (
                  <span className="text-slate-400">תמיכה ב-Google Places מוכנה</span>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: 'סה״כ עסקאות', value: stats?.deals, icon: TrendingUp, color: 'text-indigo-600' },
          { label: 'יישובים', value: stats?.settlements, icon: Building2, color: 'text-emerald-600' },
          { label: 'חלקות', value: stats?.parcels, icon: Layers, color: 'text-blue-600' },
          { label: 'סוגי נכסים', value: stats?.natures, icon: Home, color: 'text-amber-600' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 mb-1">{stat.label}</h3>
              {statsLoading ? (
                <div className="h-8 w-24 bg-slate-200 animate-pulse rounded" />
              ) : (
                <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
                  {formatNumberWithCommas(stat.value)}
                </div>
              )}
            </div>
            <div className={`p-3 rounded-xl bg-slate-50 border border-slate-100 ${stat.color}`}>
              <stat.icon size={22} />
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-600" />
              <span>מגמת מחיר חציוני ארצית</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">נתונים שנתיים מתוך 3.8 מיליון עסקאות מדווחות</p>
          </div>
          <span className="text-xs font-semibold text-slate-500 font-mono">1998 - 2026</span>
        </div>

        <div className="h-80 w-full" dir="ltr">
          {seriesLoading ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm">טוען...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesData?.data || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="year" stroke="#94A3B8" fontSize={11} />
                <YAxis
                  tickFormatter={(val) => `₪${(val / 1000000).toFixed(1)}M`}
                  width={75}
                  stroke="#94A3B8"
                  fontSize={11}
                />
                <Tooltip
                  formatter={(val: number) => [
                    val != null ? `₪${Math.round(val).toLocaleString('he-IL')}` : '—',
                    'מחיר חציוני'
                  ]}
                  labelFormatter={(label) => `שנה: ${label}`}
                  contentStyle={{ textAlign: 'right', direction: 'rtl' }}
                />
                <Line type="monotone" dataKey="median_amount" stroke="#4F46E5" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Settlements */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Building2 size={18} className="text-indigo-600" />
              <span>היישובים הפעילים ביותר</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">דירוג יישובים לפי כמות העסקאות הכוללת במאגר</p>
          </div>
          <Link
            to="/map"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
          >
            <span>לכל היישובים במפה</span>
            <ArrowLeft size={13} />
          </Link>
        </div>

        {settlementsLoading ? (
          <div className="py-8 text-center text-slate-400 text-sm">טוען יישובים...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {settlementsData?.data.slice(0, 10).map((s) => (
              <button
                key={s.settlement_code || s.settlement}
                onClick={() => navigate(`/settlement/${encodeURIComponent(s.settlement)}`)}
                className="p-4 rounded-xl border border-slate-200/80 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-right group shadow-2xs hover:shadow-xs"
              >
                <div className="font-bold text-slate-800 group-hover:text-indigo-900 text-sm mb-1">{s.settlement}</div>
                <div className="text-xs text-slate-500 font-mono">{formatNumberWithCommas(s.deals)} עסקאות</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
