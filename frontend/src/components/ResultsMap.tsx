import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Link } from 'react-router-dom';

// Fix leaflet default marker icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface DealMapMarker {
  lat?: number | null;
  lon?: number | null;
  amount: number;
  settlement: string;
  nature: string;
  date: string;
  area_sqm: number;
  rooms: number;
  gush: string;
  helka: string;
  full_address?: string | null;
}

interface Props {
  deals: DealMapMarker[];
  loading?: boolean;
}

function MapBoundsFitter({ deals }: { deals: DealMapMarker[] }) {
  const map = useMap();

  useEffect(() => {
    const validDeals = deals.filter((d) => d.lat && d.lon);
    if (validDeals.length > 0) {
      const bounds = L.latLngBounds(validDeals.map((d) => [d.lat!, d.lon!]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [deals, map]);

  return null;
}

export default function ResultsMap({ deals, loading }: Props) {
  const validDeals = deals.filter((d) => d.lat && d.lon);

  return (
    <div className="relative w-full h-[400px] bg-slate-100 rounded-2xl overflow-hidden shadow-sm border border-slate-200">
      {loading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      <MapContainer
        center={[31.5, 34.8]}
        zoom={8}
        style={{ width: '100%', height: '100%', zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsFitter deals={validDeals} />
        {validDeals.map((deal, idx) => (
          <Marker key={idx} position={[deal.lat!, deal.lon!]}>
            <Popup>
              <div className="text-right" dir="rtl">
                <div className="font-bold text-slate-800 text-sm mb-1">
                  {deal.full_address || deal.settlement}
                </div>
                <div className="text-indigo-600 font-bold text-lg mb-2">
                  ₪{deal.amount ? deal.amount.toLocaleString('he-IL') : '—'}
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div>
                    <span className="font-medium">תאריך:</span>{' '}
                    {new Date(deal.date).toLocaleDateString('he-IL')}
                  </div>
                  <div>
                    <span className="font-medium">נכס:</span> {deal.nature},{' '}
                    {deal.rooms} חדרים, {deal.area_sqm} מ״ר
                  </div>
                </div>
                <div className="mt-3 text-xs">
                  <Link
                    to={`/parcel/${deal.gush}/${deal.helka}`}
                    className="text-indigo-600 hover:underline font-medium"
                  >
                    צפה בחלקה (גוש {deal.gush} חלקה {deal.helka})
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
