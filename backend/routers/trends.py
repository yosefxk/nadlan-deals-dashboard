from fastapi import APIRouter, Depends
from typing import Optional, List
from database import get_db
from models import SeriesResponse, SeriesPoint, CompareItem, BreakdownItem
import aiosqlite

router = APIRouter(prefix="/api")

@router.get("/series", response_model=SeriesResponse)
async def get_series(
    settlement: Optional[str] = None,
    nature: Optional[str] = None,
    conn: aiosqlite.Connection = Depends(get_db)
):
    query_parts = []
    params = []
    
    if settlement:
        query_parts.append("settlement = ?")
        params.append(settlement)
    if nature:
        query_parts.append("nature = ?")
        params.append(nature)
        
    where_clause = ("WHERE " + " AND ".join(query_parts)) if query_parts else ""
    
    query = f"""
        SELECT year, 
               COUNT(*) as deals, 
               median(amount) as median_amount, 
               median(area_sqm) as median_area,
               median(price_per_sqm_normalized) as median_ppsqm_normalized
        FROM deals
        {where_clause}
        GROUP BY year
        ORDER BY year ASC
    """
    
    async with conn.execute(query, params) as cur:
        rows = await cur.fetchall()
        data = [dict(row) for row in rows if row['year'] is not None]
        return SeriesResponse(data=data, count=len(data))

@router.get("/compare", response_model=List[CompareItem])
async def compare_years(
    year_from: int,
    year_to: int,
    nature: Optional[str] = None,
    min_deals: int = 30,
    limit: int = 30,
    order: str = "change_desc",
    conn: aiosqlite.Connection = Depends(get_db)
):
    nature_filter = "AND nature = ?" if nature else ""
    params = [year_from]
    if nature:
        params.append(nature)
    params_to = [year_to]
    if nature:
        params_to.append(nature)
        
    query = f"""
        WITH 
        YearFrom AS (
            SELECT settlement, COUNT(*) as deals, 
                   median(amount) as med_amt, median(price_per_sqm_normalized) as med_ppsqm
            FROM deals
            WHERE year = ? {nature_filter}
            GROUP BY settlement
        ),
        YearTo AS (
            SELECT settlement, COUNT(*) as deals, 
                   median(amount) as med_amt, median(price_per_sqm_normalized) as med_ppsqm
            FROM deals
            WHERE year = ? {nature_filter}
            GROUP BY settlement
        )
        SELECT f.settlement, 
               f.deals as deals_from, t.deals as deals_to,
               f.med_amt as median_from, t.med_amt as median_to,
               f.med_ppsqm as ppsqm_from, t.med_ppsqm as ppsqm_to
        FROM YearFrom f
        JOIN YearTo t ON f.settlement = t.settlement
        WHERE f.deals >= ? AND t.deals >= ?
    """
    params.extend(params_to)
    params.extend([min_deals, min_deals])
    
    async with conn.execute(query, params) as cur:
        rows = await cur.fetchall()
        
    items = []
    for row in rows:
        mf = row['median_from']
        mt = row['median_to']
        pf = row['ppsqm_from']
        pt = row['ppsqm_to']
        
        change_pct = ((mt - mf) / mf * 100) if mf and mt else None
        ppsqm_change_pct = ((pt - pf) / pf * 100) if pf and pt else None
        
        items.append({
            "settlement": row['settlement'],
            "deals_from": row['deals_from'],
            "deals_to": row['deals_to'],
            "median_from": mf,
            "median_to": mt,
            "ppsqm_from": pf,
            "ppsqm_to": pt,
            "change_pct": change_pct,
            "ppsqm_change_pct": ppsqm_change_pct
        })
        
    if order == "change_desc":
        items.sort(key=lambda x: x["change_pct"] or -9999, reverse=True)
    elif order == "change_asc":
        items.sort(key=lambda x: x["change_pct"] or 9999)
    elif order == "ppsqm_change_desc":
        items.sort(key=lambda x: x["ppsqm_change_pct"] or -9999, reverse=True)
        
    return items[:limit]

@router.get("/breakdown", response_model=List[BreakdownItem])
async def get_breakdown(
    settlement: str,
    conn: aiosqlite.Connection = Depends(get_db)
):
    query = """
        SELECT nature, COUNT(*) as deals, 
               median(amount) as median_amount, 
               median(price_per_sqm_normalized) as median_ppsqm_normalized
        FROM deals 
        WHERE settlement = ? AND nature IS NOT NULL
        GROUP BY nature
        ORDER BY deals DESC
    """
    async with conn.execute(query, (settlement,)) as cur:
        rows = await cur.fetchall()
        return [dict(row) for row in rows]
