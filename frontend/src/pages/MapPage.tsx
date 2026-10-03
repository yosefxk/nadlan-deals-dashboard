import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, Tooltip as LeafletTooltip, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { fetchMapSummary, fetchNatures, fetchSettlementDetail, fetchSearchGeo, fetchSettlementPolygons } from '../api';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Deal } from '../types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  TrendingUp,
  Building,
  Layers,
  Search,
  ExternalLink,
  X,
  Calendar,
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

// Fix leaflet default marker icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultMarkerIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const YEARS = Array.from({ length: 2026 - 1998 + 1 }, (_, i) => 2026 - i);

function MapBoundsFitter({
  deals,
  selectedCoords
}: {
  deals?: Array<{ lat?: number | null; lon?: number | null }>;
  selectedCoords?: [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedCoords) {
      map.setView(selectedCoords, 12, { animate: true });
      return;
    }
    if (deals && deals.length > 0) {
      const valid = deals.filter((d) => d.lat && d.lon);
      if (valid.length > 0) {
        const bounds = L.latLngBounds(valid.map((d) => [d.lat!, d.lon!]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }
  }, [deals, selectedCoords, map]);

  return null;
}

export default function MapPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Mode: "national" (heat map of all settlements) vs "deals" (search deals on map)
  const isDealsMode = searchParams.get('mode') === 'deals';

  // Filters for National Map
  const [metric, setMetric] = useState<'median_amount' | 'median_ppsqm' | 'deals'>('median_amount');
  const [selectedNature, setSelectedNature] = useState<string>(searchParams.get('nature') || '');
  const [yearFrom, setYearFrom] = useState<number | undefined>(
    searchParams.get('year_from') ? Number(searchParams.get('year_from')) : undefined
  );
  const [yearTo, setYearTo] = useState<number | undefined>(
    searchParams.get('year_to') ? Number(searchParams.get('year_to')) : undefined
  );

  // Selected settlement in sidebar
  const [selectedSettlement, setSelectedSettlement] = useState<string | null>(null);
  const [hoveredSettlement, setHoveredSettlement] = useState<string | null>(null);

  // 1. Fetch National Heatmap Summary
  const { data: mapData, isLoading: mapLoading } = useQuery({
    queryKey: ['mapSummary', selectedNature, yearFrom, yearTo],
    queryFn: () => fetchMapSummary({
      nature: selectedNature || undefined,
      year_from: yearFrom,
      year_to: yearTo
    }),
    enabled: !isDealsMode,
    staleTime: 1000 * 60 * 10
  });

  // 1.1 Fetch Settlement Boundary Polygons
  const { data: polygonsData, isLoading: polygonsLoading } = useQuery({
    queryKey: ['settlementPolygons'],
    queryFn: fetchSettlementPolygons,
    staleTime: Infinity
  });

  // 2. Fetch Deals for Search Results Mode (Option 5)
  const dealsParams = useMemo(() => {
    return Object.fromEntries(searchParams.entries());
  }, [searchParams]);

  const { data: searchGeoData, isLoading: searchGeoLoading } = useQuery({
    queryKey: ['searchGeo', dealsParams],
    queryFn: () => fetchSearchGeo(dealsParams),
    enabled: isDealsMode,
    staleTime: 1000 * 60 * 5
  });

  // 3. Fetch Natures for dropdown
  const { data: naturesData } = useQuery({
    queryKey: ['natures'],
    queryFn: fetchNatures,
    staleTime: Infinity
  });

  // 4. Fetch Settlement Details when selected in sidebar
  const { data: settlementDetails, isLoading: detailsLoading } = useQuery({
    queryKey: ['settlementDetail', selectedSettlement],
    queryFn: () => fetchSettlementDetail(selectedSettlement!),
    enabled: !!selectedSettlement,
    staleTime: 1000 * 60 * 5
  });

  // Dynamic price scaling for heat colors
  const { minVal, maxVal } = useMemo(() => {
    if (!mapData?.data || mapData.data.length === 0) {
      return { minVal: 500000, maxVal: 3000000 };
    }
    const values = mapData.data
      .map((s) => s[metric])
      .filter((v): v is number => typeof v === 'number' && v > 0);
    if (values.length === 0) return { minVal: 1, maxVal: 100 };
    values.sort((a, b) => a - b);
    return {
      minVal: values[Math.floor(values.length * 0.05)] || values[0],
      maxVal: values[Math.floor(values.length * 0.95)] || values[values.length - 1],
    };
  }, [mapData, metric]);

  const getColor = (val: number | null) => {
    if (!val) return '#94a3b8'; // Slate 400
    const ratio = Math.max(0, Math.min(1, (val - minVal) / (maxVal - minVal || 1)));

    if (metric === 'deals') {
      // Blue to Purple scale for volume
      if (ratio < 0.25) return '#60a5fa'; // light blue
      if (ratio < 0.5) return '#3b82f6';  // blue
      if (ratio < 0.75) return '#6366f1'; // indigo
      return '#8b5cf6'; // purple
    }

    // Heat gradient: Green -> Yellow -> Orange -> Crimson Red -> Purple
    if (ratio < 0.2) return '#10b981'; // Green
    if (ratio < 0.4) return '#84cc16'; // Lime
    if (ratio < 0.6) return '#eab308'; // Yellow
    if (ratio < 0.8) return '#f97316'; // Orange
    if (ratio < 0.92) return '#ef4444'; // Red
    return '#9333ea'; // Deep Purple (luxury)
  };

  const selectedCoords = useMemo(() => {
    if (!selectedSettlement || !mapData?.data) return null;
    const found = mapData.data.find((s) => s.settlement === selectedSettlement);
    return found ? ([found.lat, found.lon] as [number, number]) : null;
  }, [selectedSettlement, mapData]);

  return (
    <div className="space-y-4">
      {/* Top Header / Mode Switcher */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
            <Layers size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {isDealsMode ? 'מפת עסקאות ממוקדת' : 'מפת נדל״ן ארצית'}
            </h1>
            <p className="text-xs text-slate-500">
              {isDealsMode
                ? `מציג עד 50 עסקאות מתוצאות הסינון בכתובותיהן המדויקות`
                : `מפה אינטראקטיבית של ${mapData?.total ? mapData.total.toLocaleString('he-IL') : '1,000+'} יישובים לפי מחירים ופעילות`}
            </p>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          {isDealsMode ? (
            <button
              onClick={() => {
                const p = new URLSearchParams(searchParams);
                p.delete('mode');
                setSearchParams(p);
              }}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              <Layers size={16} />
              חזרה למפה הארצית
            </button>
          ) : (
            <Link
              to="/search"
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-lg text-sm transition-colors flex items-center gap-2 border border-slate-200"
            >
              <Search size={16} />
              מעבר לסינון עסקאות ממוקד
            </Link>
          )}
        </div>
      </div>

      {/* Control Toolbar (Only on National Heatmap mode) */}
      {!isDealsMode && (
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center justify-between gap-4">
          {/* Metric Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">מדד צבע:</span>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setMetric('median_amount')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  metric === 'median_amount'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                מחיר חציוני
              </button>
              <button
                onClick={() => setMetric('median_ppsqm')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  metric === 'median_ppsqm'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                מחיר למ״ר
              </button>
              <button
                onClick={() => setMetric('deals')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  metric === 'deals'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                נפח עסקאות
              </button>
            </div>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Nature Selector */}
            <div className="flex items-center gap-2">
              <Building size={16} className="text-slate-400" />
              <select
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-indigo-500"
                value={selectedNature}
                onChange={(e) => setSelectedNature(e.target.value)}
              >
                <option value="">כל סוגי הנכסים</option>
                {naturesData?.data.map((n) => (
                  <option key={n.nature} value={n.nature}>
                    {n.nature}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filters */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              <Calendar size={14} className="text-slate-400" />
              <span>שנים:</span>
              <select
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold focus:ring-2 focus:ring-indigo-500"
                value={yearFrom || ''}
                onChange={(e) => setYearFrom(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">משנה (1998)</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <span>-</span>
              <select
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 font-semibold focus:ring-2 focus:ring-indigo-500"
                value={yearTo || ''}
                onChange={(e) => setYearTo(e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">עד שנה (2026)</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {(selectedNature || yearFrom || yearTo) && (
              <button
                onClick={() => {
                  setSelectedNature('');
                  setYearFrom(undefined);
                  setYearTo(undefined);
                }}
                className="text-xs text-red-500 hover:underline mr-1"
              >
                איפוס
              </button>
            )}
          </div>

          {/* Color Legend */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">נמוך</span>
            <div className="flex h-3 w-28 rounded-full overflow-hidden border border-slate-200">
              {metric === 'deals' ? (
                <>
                  <div className="w-1/4 bg-[#60a5fa]" />
                  <div className="w-1/4 bg-[#3b82f6]" />
                  <div className="w-1/4 bg-[#6366f1]" />
                  <div className="w-1/4 bg-[#8b5cf6]" />
                </>
              ) : (
                <>
                  <div className="w-1/5 bg-[#10b981]" />
                  <div className="w-1/5 bg-[#84cc16]" />
                  <div className="w-1/5 bg-[#eab308]" />
                  <div className="w-1/5 bg-[#f97316]" />
                  <div className="w-1/5 bg-[#9333ea]" />
                </>
              )}
            </div>
            <span className="text-slate-400">גבוה</span>
          </div>
        </div>
      )}

      {/* Main Map + Sidebar Workspace */}
      <div className="relative h-[calc(100vh-14rem)] min-h-[550px] w-full rounded-2xl overflow-hidden shadow-sm border border-slate-100 flex">
        {/* Map Container */}
        <div className="flex-1 h-full w-full relative z-0">
          {(mapLoading || searchGeoLoading || (!isDealsMode && (polygonsLoading || !polygonsData))) && (
            <div className="absolute inset-0 bg-white/40 backdrop-blur-xs z-50 flex items-center justify-center">
              <div className="bg-white/90 px-6 py-4 rounded-2xl shadow-lg border border-slate-100 flex items-center gap-3">
                <div className="w-6 h-6 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-medium text-slate-700">טוען מפת גבולות יישובים...</span>
              </div>
            </div>
          )}

          <MapContainer center={[31.6, 34.9]} zoom={8} className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* In Search Deals Mode: Render Individual Property Markers (Option 5) */}
            {isDealsMode && (
              <>
                <MapBoundsFitter deals={searchGeoData?.data} />
                {searchGeoData?.data
                  .filter((deal) => deal.lat && deal.lon)
                  .map((deal, idx) => (
                    <Marker
                      key={idx}
                      position={[deal.lat!, deal.lon!]}
                      icon={DefaultMarkerIcon}
                    >
                      <Popup>
                        <div className="text-right p-1" dir="rtl">
                          <div className="font-bold text-slate-800 text-sm">
                            {deal.settlement}
                          </div>
                          <div className="text-xs text-slate-500 mb-1">
                            {deal.addresses && deal.addresses.length > 0
                              ? deal.addresses[0]
                              : deal.gush && deal.helka
                              ? `גוש ${deal.gush} חלקה ${deal.helka}`
                              : ''}
                          </div>
                          <div className="text-indigo-600 font-bold text-base my-1">
                            ₪{deal.amount?.toLocaleString('he-IL') || '-'}
                          </div>
                          <div className="text-xs text-slate-600 space-y-0.5">
                            <div>
                              <span className="text-slate-400">נכס:</span> {deal.nature}
                            </div>
                            <div>
                              <span className="text-slate-400">פרטים:</span> {deal.rooms} חד׳ | {deal.area_sqm} מ״ר
                            </div>
                            <div>
                              <span className="text-slate-400">תאריך:</span> {deal.date}
                            </div>
                          </div>
                          {deal.gush && deal.helka && (
                            <div className="mt-2 pt-2 border-t border-slate-100">
                              <Link
                                to={`/parcel/${deal.gush}/${deal.helka}`}
                                className="text-xs text-indigo-600 hover:underline font-medium"
                              >
                                צפה בהיסטוריית החלקה ←
                              </Link>
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
              </>
            )}

            {/* In National Mode: Render Outlined City Polygons for all ~1,000+ Settlements */}
            {!isDealsMode && (
              <>
                <MapBoundsFitter selectedCoords={selectedCoords} />
                {mapData?.data.map((s) => {
                  const val = s[metric];
                  const color = getColor(val);
                  const isSelected = selectedSettlement === s.settlement;
                  const isHovered = hoveredSettlement === s.settlement;
                  const polyCoords = polygonsData ? (
                    polygonsData[s.settlement] ||
                    polygonsData[s.settlement.replace(' - ', ' -')] ||
                    polygonsData[s.settlement.replace(' -', ' - ')] ||
                    polygonsData[s.settlement.replace('יי', 'י')] ||
                    polygonsData[s.settlement.replace('י', 'יי')] ||
                    polygonsData[s.settlement.replace('קריית ', 'קרית ')] ||
                    polygonsData[s.settlement.replace('קרית ', 'קריית ')]
                  ) : null;

                  const popupContent = (
                    <Popup>
                      <div className="text-right p-1 min-w-[190px]" dir="rtl">
                        <h3 className="font-bold text-base text-slate-900 mb-1">{s.settlement}</h3>
                        <div className="space-y-1 text-xs text-slate-600 mb-3">
                          <div className="flex justify-between">
                            <span className="text-slate-400">סה״כ עסקאות:</span>
                            <span className="font-semibold text-slate-700">
                              {s.deals.toLocaleString('he-IL')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">מחיר חציוני:</span>
                            <span className="font-bold text-indigo-600">
                              {s.median_amount ? `₪${s.median_amount.toLocaleString('he-IL')}` : '-'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">מחיר למ״ר חציוני:</span>
                            <span className="font-semibold text-slate-700">
                              {s.median_ppsqm ? `₪${s.median_ppsqm.toLocaleString('he-IL')}` : '-'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedSettlement(s.settlement)}
                            className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition-colors"
                          >
                            פתח כרטיסייה
                          </button>
                          <button
                            onClick={() => navigate(`/settlement/${encodeURIComponent(s.settlement)}`)}
                            className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded transition-colors"
                          >
                            פרופיל מלא
                          </button>
                        </div>
                      </div>
                    </Popup>
                  );

                  const tooltipContent = (
                    <LeafletTooltip sticky direction="top" opacity={0.95}>
                      <div className="text-right p-0.5 font-sans" dir="rtl">
                        <div className="font-bold text-xs text-slate-900">{s.settlement}</div>
                        <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                          {metric === 'median_amount' && s.median_amount && `₪${s.median_amount.toLocaleString('he-IL')}`}
                          {metric === 'median_ppsqm' && s.median_ppsqm && `₪${s.median_ppsqm.toLocaleString('he-IL')} למ״ר`}
                          {metric === 'deals' && `${s.deals.toLocaleString('he-IL')} עסקאות`}
                        </div>
                      </div>
                    </LeafletTooltip>
                  );

                  if (polyCoords) {
                    return (
                      <Polygon
                        key={s.settlement}
                        positions={polyCoords}
                        pathOptions={{
                          color: isSelected ? '#1e1b4b' : (isHovered ? '#1e293b' : '#334155'),
                          fillColor: color,
                          fillOpacity: isSelected ? 0.88 : (isHovered ? 0.78 : 0.58),
                          weight: isSelected ? 3.5 : (isHovered ? 2.5 : 1.2),
                        }}
                        eventHandlers={{
                          click: () => {
                            setSelectedSettlement(s.settlement);
                          },
                          mouseover: () => {
                            setHoveredSettlement(s.settlement);
                          },
                          mouseout: () => {
                            setHoveredSettlement(null);
                          },
                        }}
                      >
                        {tooltipContent}
                        {popupContent}
                      </Polygon>
                    );
                  }

                  // No circular fallback in national polygon mode
                  return null;
                })}
              </>
            )}
          </MapContainer>
        </div>

        {/* Collapsible Interactive Settlement Sidebar */}
        {selectedSettlement && !isDealsMode && (
          <div className="absolute top-4 left-4 bottom-4 w-96 max-w-[calc(100%-2rem)] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 z-10 flex flex-col overflow-hidden animate-in slide-in-from-left duration-200">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 text-white rounded-lg">
                  <Building size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selectedSettlement}</h2>
                  <span className="text-xs text-slate-500">כרטיסיית מידע מהירה</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedSettlement(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {detailsLoading ? (
                <div className="py-12 text-center text-sm text-slate-500">טוען פרטי יישוב...</div>
              ) : settlementDetails ? (
                <>
                  {/* Quick Stat Cards */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100/50">
                      <div className="text-xs text-indigo-700 mb-1">מחיר ממוצע</div>
                      <div className="text-base font-bold text-indigo-900">
                        ₪{settlementDetails.avg_price?.toLocaleString('he-IL') || '-'}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="text-xs text-slate-500 mb-1">סה״כ עסקאות</div>
                      <div className="text-base font-bold text-slate-800">
                        {settlementDetails.total_deals?.toLocaleString('he-IL') || '-'}
                      </div>
                    </div>
                  </div>

                  {/* Yearly Trend Chart */}
                  {settlementDetails.series && settlementDetails.series.length > 1 && (
                    <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                      <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-indigo-600" />
                        מגמת מחיר חציוני לאורך שנים
                      </div>
                      <div className="h-36 w-full" dir="ltr">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={settlementDetails.series}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                            <YAxis
                              tickFormatter={(val) => `₪${(val / 1000000).toFixed(1)}M`}
                              width={55}
                              tick={{ fontSize: 10 }}
                            />
                            <Tooltip
                              formatter={(v: number) => [`₪${v.toLocaleString('he-IL')}`, 'חציון']}
                              labelFormatter={(label) => `שנת ${label}`}
                            />
                            <Line
                              type="monotone"
                              dataKey="median_amount"
                              stroke="#4f46e5"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Recent Deals in Settlement */}
                  <div>
                    <div className="text-xs font-bold text-slate-700 mb-2">עסקאות אחרונות שדווחו:</div>
                    <div className="space-y-2">
                      {settlementDetails.recent_deals?.slice(0, 5).map((deal: Deal, i: number) => (
                        <div
                          key={i}
                          className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-2xs text-xs flex justify-between items-center hover:border-indigo-100 transition-colors"
                        >
                          <div>
                            <div className="font-semibold text-slate-800">
                              ₪{deal.amount?.toLocaleString('he-IL') || '-'}
                            </div>
                            <div className="text-slate-500 text-[11px]">
                              {deal.nature} | {deal.rooms ? `${deal.rooms} חד׳` : ''} | {deal.area_sqm ? `${deal.area_sqm} מ״ר` : ''}
                            </div>
                          </div>
                          <div className="text-right text-[11px] text-slate-400">
                            {deal.date}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Sidebar Actions */}
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex gap-2">
              <button
                onClick={() => navigate(`/search?settlement=${encodeURIComponent(selectedSettlement)}`)}
                className="flex-1 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <Search size={14} />
                חיפוש עסקאות כאן
              </button>
              <button
                onClick={() => navigate(`/settlement/${encodeURIComponent(selectedSettlement)}`)}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                פרופיל מלא
                <ExternalLink size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
