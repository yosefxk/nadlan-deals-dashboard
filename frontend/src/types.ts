export interface Deal {
  date: string;
  amount: number;
  nature: string;
  area_sqm: number;
  rooms: number;
  year_built: number;
  portion_fraction: number;
  price_per_sqm_normalized: number;
  sub_parcel: string;
  settlement: string;
  settlement_code: string;
  gush: string;
  helka: string;
  addresses: string[];
  floor: number | null;
}

export interface Stats {
  deals: number;
  first_deal: string;
  last_deal: string;
  settlements: number;
  parcels: number;
  natures: number;
}

export interface SettlementSummary {
  settlement: string;
  settlement_code: string;
  deals: number;
  last_deal: string;
}

export interface NatureSummary {
  nature: string;
  deals: number;
  median_amount: number;
  median_ppsqm_normalized: number;
}

export interface SeriesPoint {
  year: number;
  deals: number;
  median_amount: number;
  median_area: number;
  median_ppsqm_normalized: number;
}

export interface CompareResult {
  settlement: string;
  deals_from: number;
  deals_to: number;
  median_from: number | null;
  median_to: number | null;
  ppsqm_from: number | null;
  ppsqm_to: number | null;
  change_pct: number | null;
  ppsqm_change_pct: number | null;
}

export interface SearchResponse {
  data: Deal[];
  total: number;
  total_capped: boolean;
  limit: number;
  offset: number;
  summary?: SearchSummary;
}

export interface TopDeal extends Deal {
  id?: number;
  calc_ppsqm?: number | null;
  full_address?: string | null;
  street?: string | null;
  house_num?: string | null;
  lat?: number | null;
  lon?: number | null;
}

export interface TopDealsStats {
  highest_deal?: {
    id: number;
    date: string;
    amount: number;
    nature: string;
    settlement: string;
    area_sqm: number;
    rooms: number;
    gush: string;
    helka: string;
    calc_ppsqm?: number | null;
    full_address?: string | null;
    street?: string | null;
    lat?: number | null;
    lon?: number | null;
  } | null;
  highest_ppsqm_deal?: {
    id: number;
    date: string;
    amount: number;
    nature: string;
    settlement: string;
    area_sqm: number;
    rooms: number;
    gush: string;
    helka: string;
    calc_ppsqm?: number | null;
    full_address?: string | null;
    street?: string | null;
    lat?: number | null;
    lon?: number | null;
  } | null;
  avg_top_amount: number;
  top_cities: Array<{ settlement: string; count: number }>;
}

export interface TopDealsResponse {
  data: TopDeal[];
  total: number;
  limit: number;
  offset: number;
  stats: TopDealsStats;
}


export interface SearchSummary {
  median_amount: number | null;
  median_ppsqm: number | null;
  avg_rooms: number | null;
  avg_area: number | null;
}

export interface GeoSearchResponse {
  data: Array<Deal & { lat?: number | null; lon?: number | null; full_address?: string | null }>;
  total: number;
  resolved: number;
  unresolved: number;
}

export interface NearbyDeal extends Deal {
  lat: number;
  lon: number;
  full_address?: string;
  distance_km: number;
}

export interface MapSettlement {
  settlement: string;
  lat: number;
  lon: number;
  deals: number;
  median_amount: number | null;
  median_ppsqm: number | null;
  avg_amount: number | null;
  avg_area: number | null;
}

