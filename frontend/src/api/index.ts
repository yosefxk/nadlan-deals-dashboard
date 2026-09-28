import { Stats, SettlementSummary, NatureSummary, SearchResponse, SeriesPoint, CompareResult, Deal } from '../types';

const API_BASE = '/api';

export async function fetchStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error('Network response was not ok');
  return res.json();
}

export async function fetchSettlements(): Promise<{ data: SettlementSummary[] }> {
  const res = await fetch(`${API_BASE}/settlements`);
  if (!res.ok) throw new Error('Network response was not ok');
  return res.json();
}

export async function fetchNatures(): Promise<{ data: NatureSummary[] }> {
  const res = await fetch(`${API_BASE}/natures`);
  if (!res.ok) throw new Error('Network response was not ok');
  return res.json();
}

export async function searchDeals(params: Record<string, string | number>): Promise<SearchResponse> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') {
      searchParams.append(k, String(v));
    }
  });
  const res = await fetch(`${API_BASE}/search?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Network response was not ok');
  return res.json();
}

export async function fetchSeries(params: Record<string, string>): Promise<{ data: SeriesPoint[], count: number }> {
  const searchParams = new URLSearchParams(params);
  const res = await fetch(`${API_BASE}/series?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Network response was not ok');
  return res.json();
}

export async function fetchBreakdown(settlement: string): Promise<{ data: NatureSummary[] }> {
  const res = await fetch(`${API_BASE}/breakdown?settlement=${encodeURIComponent(settlement)}`);
  if (!res.ok) throw new Error('Network response was not ok');
  return res.json();
}

export async function compareSettlements(params: Record<string, string>): Promise<{ data: CompareResult[] }> {
  const searchParams = new URLSearchParams(params);
  const res = await fetch(`${API_BASE}/compare?${searchParams.toString()}`);
  if (!res.ok) throw new Error('Network response was not ok');
  return res.json();
}

export async function fetchParcel(gush: string, helka: string): Promise<{ data: Deal[], total: number, gush: string, helka: string }> {
  const res = await fetch(`${API_BASE}/parcel/${gush}/${helka}`);
  if (!res.ok) throw new Error('Network response was not ok');
  return res.json();
}

export async function autocomplete(q: string): Promise<{ data: { settlement: string, deals: number }[] }> {
  const res = await fetch(`${API_BASE}/autocomplete?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('Network response was not ok');
  return res.json();
}

export async function fetchSettlementDetail(name: string): Promise<any> {
  const res = await fetch(`${API_BASE}/settlement/${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error('Network response was not ok');
  return res.json();
}
