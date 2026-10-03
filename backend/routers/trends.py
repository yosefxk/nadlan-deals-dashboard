from fastapi import APIRouter, Depends
from typing import Optional, List
from database import get_db
from models import SeriesResponse, SeriesPoint, CompareItem, BreakdownItem
from settlements import get_city_variants
import aiosqlite

router = APIRouter(prefix="/api")

@router.get("/series")
async def get_series(
    settlement: Optional[str] = None,
    settlements: Optional[str] = None,
    nature: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    conn: aiosqlite.Connection = Depends(get_db)
):
    # Multi-settlement mode
    if settlements and not settlement:
        s_list = [s.strip() for s in settlements.split(",") if s.strip()]
        if not s_list:
            return {"series": {}}
            
        series_dict = {s: [] for s in s_list}
        if not nature and not date_from and not date_to:
            try:
                all_variants = []
                variant_to_original = {}
                for s in s_list:
                    vars_for_s = get_city_variants(s)
                    for v in vars_for_s:
                        all_variants.append(v)
                        variant_to_original[v] = s
                all_variants = list(dict.fromkeys(all_variants))
                placeholders = ",".join(["?"] * len(all_variants))
                async with conn.execute(
                    f"SELECT settlement, year, deals, median_amount, median_area, median_ppsqm_normalized FROM settlement_series WHERE settlement IN ({placeholders}) ORDER BY year ASC",
                    all_variants
                ) as cur:
                    rows = await cur.fetchall()
                    for r in rows:
                        s_name = r["settlement"]
                        orig_s = variant_to_original.get(s_name)
                        if orig_s and orig_s in series_dict:
                            series_dict[orig_s].append({
                                "year": r["year"],
                                "deals": r["deals"],
                                "median_amount": r["median_amount"],
                                "median_area": r["median_area"],
                                "median_ppsqm_normalized": r["median_ppsqm_normalized"]
                            })
                    return {"series": series_dict}
            except Exception:
                pass

        for s_name in s_list:
            expanded = get_city_variants(s_name)
            placeholders = ",".join(["?"] * len(expanded))
            query_parts = [f"settlement IN ({placeholders})"]
            params = list(expanded)
            
            if nature:
                query_parts.append("nature = ?")
                params.append(nature)
            if date_from:
                query_parts.append("date >= ?")
                params.append(date_from)
            if date_to:
                query_parts.append("date <= ?")
                params.append(date_to)
                
            where_clause = "WHERE " + " AND ".join(query_parts)
            
            query = f'''
                SELECT year, 
                       COUNT(*) as deals, 
                       median(amount) as median_amount, 
                       median(area_sqm) as median_area,
                       median(price_per_sqm_normalized) as median_ppsqm_normalized
                FROM deals
                {where_clause}
                GROUP BY year
                ORDER BY year ASC
            '''
            async with conn.execute(query, params) as cur:
                rows = await cur.fetchall()
                data = [dict(row) for row in rows if row['year'] is not None]
                series_dict[s_name] = data
                
        return {"series": series_dict}

    # Single settlement or general mode
    query_parts = []
    params = []
    
    if settlement:
        expanded = get_city_variants(settlement)
        placeholders = ",".join(["?"] * len(expanded))
        query_parts.append(f"settlement IN ({placeholders})")
        params.extend(expanded)
    if nature:
        query_parts.append("nature = ?")
        params.append(nature)
    if date_from:
        query_parts.append("date >= ?")
        params.append(date_from)
    if date_to:
        query_parts.append("date <= ?")
        params.append(date_to)
        
    where_clause = ("WHERE " + " AND ".join(query_parts)) if query_parts else ""
    
    # Fast-path for national mode (Home page): use precomputed national_series table
    if not where_clause:
        try:
            async with conn.execute(
                "SELECT year, deals, median_amount, median_area, median_ppsqm_normalized FROM national_series ORDER BY year ASC"
            ) as cur:
                rows = await cur.fetchall()
                if rows:
                    data = [dict(row) for row in rows]
                    return SeriesResponse(data=data, count=len(data))
        except Exception:
            pass

    # Fast-path for settlement drilldown: use precomputed settlement_series table
    if settlement and not nature and not date_from and not date_to:
        expanded = get_city_variants(settlement)
        placeholders = ",".join(["?"] * len(expanded))
        try:
            async with conn.execute(
                f"SELECT year, deals, median_amount, median_area, median_ppsqm_normalized FROM settlement_series WHERE settlement IN ({placeholders}) ORDER BY year ASC",
                expanded
            ) as cur:
                rows = await cur.fetchall()
                if rows:
                    data = [dict(row) for row in rows]
                    return SeriesResponse(data=data, count=len(data))
        except Exception:
            pass

    query = f'''
        SELECT year, 
               COUNT(*) as deals, 
               median(amount) as median_amount, 
               median(area_sqm) as median_area,
               median(price_per_sqm_normalized) as median_ppsqm_normalized
        FROM deals
        {where_clause}
        GROUP BY year
        ORDER BY year ASC
    '''
    
    async with conn.execute(query, params) as cur:
        rows = await cur.fetchall()
        data = [dict(row) for row in rows if row['year'] is not None]
        return SeriesResponse(data=data, count=len(data))

@router.get("/compare")
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
        
    return {"data": items[:limit]}

@router.get("/breakdown")
async def get_breakdown(
    settlement: str,
    conn: aiosqlite.Connection = Depends(get_db)
):
    expanded = get_city_variants(settlement)
    placeholders = ",".join(["?"] * len(expanded))
    query = f"""
        SELECT nature, COUNT(*) as deals, 
               median(amount) as median_amount, 
               median(price_per_sqm_normalized) as median_ppsqm_normalized
        FROM deals 
        WHERE settlement IN ({placeholders}) AND nature IS NOT NULL
        GROUP BY nature
        ORDER BY deals DESC
    """
    async with conn.execute(query, expanded) as cur:
        rows = await cur.fetchall()
        return {"data": [dict(row) for row in rows]}

