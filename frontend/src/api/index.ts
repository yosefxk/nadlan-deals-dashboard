import { Stats, SettlementSummary, NatureSummary, SearchResponse, SeriesPoint, CompareResult, Deal, TopDealsResponse } from '../types';

const API_BASE = '/api';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchStats(): Promise<Stats> {
  return fetchJson<Stats>(`${API_BASE}/stats`);
}

export async function fetchSettlements(): Promise<{ data: SettlementSummary[] }> {
  const json = await fetchJson<any>(`${API_BASE}/settlements`);
  if (Array.isArray(json)) return { data: json };
  if (json && Array.isArray(json.data)) return json;
  return { data: [] };
}

export async function fetchNatures(): Promise<{ data: NatureSummary[] }> {
  const json = await fetchJson<any>(`${API_BASE}/natures`);
  if (Array.isArray(json)) return { data: json };
  if (json && Array.isArray(json.data)) return json;
  return { data: [] };
}

export async function searchDeals(params: Record<string, string | number>): Promise<SearchResponse> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') {
      searchParams.append(k, String(v));
    }
  });
  const json = await fetchJson<any>(`${API_BASE}/search?${searchParams.toString()}`);
  if (Array.isArray(json)) {
    return { data: json, total: json.length, total_capped: false, limit: 50, offset: 0 };
  }
  return json;
}

export async function fetchSeries(params: Record<string, string>): Promise<{ data: SeriesPoint[], count: number }> {
  const searchParams = new URLSearchParams(params);
  const json = await fetchJson<any>(`${API_BASE}/series?${searchParams.toString()}`);
  if (Array.isArray(json)) {
    return { data: json, count: json.length };
  }
  return json;
}

export async function fetchBreakdown(settlement: string): Promise<{ data: NatureSummary[] }> {
  const json = await fetchJson<any>(`${API_BASE}/breakdown?settlement=${encodeURIComponent(settlement)}`);
  if (Array.isArray(json)) return { data: json };
  if (json && Array.isArray(json.data)) return json;
  return { data: [] };
}

export async function compareSettlements(params: Record<string, string>): Promise<{ data: CompareResult[] }> {
  const searchParams = new URLSearchParams(params);
  const json = await fetchJson<any>(`${API_BASE}/compare?${searchParams.toString()}`);
  if (Array.isArray(json)) return { data: json };
  if (json && Array.isArray(json.data)) return json;
  return { data: [] };
}

export async function fetchParcel(gush: string, helka: string): Promise<{ data: Deal[], total: number, gush: string, helka: string }> {
  const json = await fetchJson<any>(`${API_BASE}/parcel/${gush}/${helka}`);
  if (Array.isArray(json)) {
    return { data: json, total: json.length, gush, helka };
  }
  return json;
}

export async function autocomplete(q: string): Promise<{ data: { settlement: string, deals: number }[] }> {
  const json = await fetchJson<any>(`${API_BASE}/autocomplete?q=${encodeURIComponent(q)}`);
  if (Array.isArray(json)) return { data: json };
  if (json && Array.isArray(json.data)) return json;
  return { data: [] };
}

export async function autocompleteStreets(q: string, settlements?: string[]): Promise<{ data: { street_name: string; city_name: string }[] }> {
  const searchParams = new URLSearchParams();
  searchParams.append('q', q);
  if (settlements && settlements.length > 0) {
    searchParams.append('settlements', settlements.join(','));
  }
  const json = await fetchJson<any>(`${API_BASE}/streets/autocomplete?${searchParams.toString()}`);
  if (Array.isArray(json)) return { data: json };
  if (json && Array.isArray(json.data)) return json;
  return { data: [] };
}

export async function fetchSettlementDetail(name: string): Promise<any> {
  return fetchJson<any>(`${API_BASE}/settlement/${encodeURIComponent(name)}`);
}

export interface OmniResult {
  category: string;
  type: string;
  title: string;
  subtitle?: string;
  url: string;
}

export async function fetchOmnisearch(q: string): Promise<{ results: OmniResult[] }> {
  return fetchJson<{ results: OmniResult[] }>(`${API_BASE}/omnisearch?q=${encodeURIComponent(q)}`);
}

export async function fetchTopDeals(params: Record<string, string | number>): Promise<TopDealsResponse> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') {
      searchParams.append(k, String(v));
    }
  });
  return fetchJson<TopDealsResponse>(`${API_BASE}/top-deals?${searchParams.toString()}`);
}


export async function fetchSearchGeo(params: Record<string, string | number>): Promise<import('../types').GeoSearchResponse> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') searchParams.append(k, String(v));
  });
  return fetchJson<import('../types').GeoSearchResponse>(`${API_BASE}/search/geo?${searchParams.toString()}`);
}

export async function fetchMapSummary(params?: { nature?: string; year_from?: number; year_to?: number }): Promise<{ data: import('../types').MapSettlement[]; total: number }> {
  const searchParams = new URLSearchParams();
  if (params?.nature) searchParams.append('nature', params.nature);
  if (params?.year_from) searchParams.append('year_from', String(params.year_from));
  if (params?.year_to) searchParams.append('year_to', String(params.year_to));
  const qs = searchParams.toString();
  return fetchJson<{ data: import('../types').MapSettlement[]; total: number }>(`${API_BASE}/map/summary${qs ? '?' + qs : ''}`);
}

export async function fetchSettlementPolygons(): Promise<Record<string, any>> {
  return fetchJson<Record<string, any>>(`${API_BASE}/map/polygons`);
}
