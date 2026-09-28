import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import { fetchSettlements } from '../api';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';

// Static coordinates for major cities
const CITIES: Record<string, [number, number]> = {
  'ירושלים': [31.7683, 35.2137],
  'תל אביב -יפו': [32.0853, 34.7818],
  'חיפה': [32.7940, 34.9896],
  'ראשון לציון': [31.9730, 34.7925],
  'פתח תקווה': [32.0840, 34.8878],
  'אשדוד': [31.8014, 34.6435],
  'נתניה': [32.3215, 34.8532],
  'באר שבע': [31.2518, 34.7913],
  'חולון': [32.0163, 34.7744],
  'בני ברק': [32.0847, 34.8255],
  'רמת גן': [32.0823, 34.8107],
  'אשקלון': [31.6668, 34.5744],
  'רחובות': [31.8945, 34.8113],
  'בת ים': [32.0223, 34.7441],
  'בית שמש': [31.7470, 34.9881],
  'כפר סבא': [32.1714, 34.9083],
  'הרצליה': [32.1624, 34.8447],
  'חדרה': [32.4340, 34.9197],
  'מודיעין-מכבים-רעות': [31.8903, 35.0064],
  'רעננה': [32.1848, 34.8712]
};

// Custom icon since default leaflet icon can have loading issues in vite
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function MapPage() {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ['settlements', 'all'],
    queryFn: fetchSettlements,
  });

  return (
    <div className="h-[calc(100vh-8rem)] w-full relative rounded-2xl overflow-hidden shadow-sm border border-slate-100 z-10">
      <MapContainer center={[31.5, 34.8]} zoom={8} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {data?.data.map((s) => {
          const coords = CITIES[s.settlement];
          if (!coords) return null;
          return (
            <Marker key={s.settlement_code} position={coords} icon={customIcon}>
              <Popup>
                <div className="text-right" dir="rtl">
                  <h3 className="font-bold text-lg mb-1">{s.settlement}</h3>
                  <div className="text-slate-600 mb-3">{s.deals.toLocaleString('he-IL')} עסקאות</div>
                  <button
                    onClick={() => navigate(`/settlement/${encodeURIComponent(s.settlement)}`)}
                    className="w-full px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-sm"
                  >
                    למידע נוסף
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
