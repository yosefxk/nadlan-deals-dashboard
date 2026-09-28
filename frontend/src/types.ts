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
  median_from: number;
  median_to: number;
  ppsqm_from: number;
  ppsqm_to: number;
  change_pct: number;
  ppsqm_change_pct: number;
}

export interface SearchResponse {
  data: Deal[];
  total: number;
  total_capped: boolean;
  limit: number;
  offset: number;
}
