from pydantic import BaseModel
from typing import List, Optional

class DealRow(BaseModel):
    id: int
    date: str
    date_src: Optional[str] = None
    amount: Optional[int] = None
    declared_amount: Optional[int] = None
    nature: Optional[str] = None
    area_sqm: Optional[float] = None
    rooms: Optional[float] = None
    year_built: Optional[int] = None
    portion: Optional[str] = None
    portion_fraction: Optional[float] = None
    price_per_sqm: Optional[int] = None
    price_per_sqm_normalized: Optional[int] = None
    sub_parcel: Optional[str] = None
    settlement: Optional[str] = None
    settlement_code: Optional[str] = None
    gush: Optional[str] = None
    helka: Optional[str] = None
    addresses: Optional[str] = None
    addresses_total: Optional[int] = None
    year: Optional[int] = None
    floor: Optional[int] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    distance: Optional[float] = None

class SearchSummary(BaseModel):
    median_amount: Optional[float] = None
    median_ppsqm: Optional[float] = None
    avg_rooms: Optional[float] = None
    avg_area: Optional[float] = None

class SearchResponse(BaseModel):
    data: List[DealRow]
    total: int
    total_capped: bool
    limit: int
    offset: int
    summary: Optional[SearchSummary] = None

class StatsResponse(BaseModel):
    deals: int
    first_deal: str
    last_deal: str
    settlements: int
    parcels: int
    natures: int

class SettlementInfo(BaseModel):
    settlement: str
    settlement_code: Optional[str] = None
    deals: int
    last_deal: Optional[str] = None

class NatureInfo(BaseModel):
    nature: str
    deals: int
    median_amount: Optional[float] = None
    median_ppsqm_normalized: Optional[float] = None

class SeriesPoint(BaseModel):
    year: int
    deals: int
    median_amount: Optional[float] = None
    median_area: Optional[float] = None
    median_ppsqm_normalized: Optional[float] = None

class SeriesResponse(BaseModel):
    data: List[SeriesPoint]
    count: int

class BreakdownItem(BaseModel):
    nature: str
    deals: int
    median_amount: Optional[float] = None
    median_ppsqm_normalized: Optional[float] = None

class CompareItem(BaseModel):
    settlement: str
    deals_from: int
    deals_to: int
    median_from: Optional[float] = None
    median_to: Optional[float] = None
    ppsqm_from: Optional[float] = None
    ppsqm_to: Optional[float] = None
    change_pct: Optional[float] = None
    ppsqm_change_pct: Optional[float] = None

class SettlementProfile(BaseModel):
    settlement: str
    settlement_code: str
    total_deals: int
    first_deal: Optional[str] = None
    last_deal: Optional[str] = None
    avg_price: Optional[float] = None
    avg_area: Optional[float] = None
