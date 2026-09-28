import { Stats, SettlementSummary, NatureSummary, SearchResponse, SeriesPoint, CompareResult, Deal } from '../types';

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

export async function fetchSettlementDetail(name: string): Promise<any> {
  return fetchJson<any>(`${API_BASE}/settlement/${encodeURIComponent(name)}`);
}
