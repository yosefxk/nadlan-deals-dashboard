from fastapi import APIRouter, Depends
from typing import List, Optional
from database import get_db
from models import StatsResponse, SettlementInfo, NatureInfo
import aiosqlite

router = APIRouter(prefix="/api")

_cached_stats: Optional[StatsResponse] = None

@router.get("/stats", response_model=StatsResponse)
async def get_stats(conn: aiosqlite.Connection = Depends(get_db)):
    global _cached_stats
    if _cached_stats is not None:
        return _cached_stats

    # Fast-path: use precalculated kpi_stats table
    try:
        async with conn.execute(
            "SELECT deals, first_deal, last_deal, settlements, parcels, natures FROM kpi_stats WHERE id = 1"
        ) as cur:
            row = await cur.fetchone()
            if row:
                _cached_stats = StatsResponse(
                    deals=row['deals'] or 0,
                    first_deal=row['first_deal'] or "",
                    last_deal=row['last_deal'] or "",
                    settlements=row['settlements'] or 0,
                    parcels=row['parcels'] or 0,
                    natures=row['natures'] or 0
                )
                return _cached_stats
    except Exception:
        pass

    async with conn.execute("SELECT COUNT(*) as c, MIN(date) as mn, MAX(date) as mx FROM deals") as c:
        row = await c.fetchone()
        deals = row['c']
        first_deal = row['mn']
        last_deal = row['mx']
        
    async with conn.execute("SELECT COUNT(DISTINCT settlement) as c FROM deals") as c:
        row = await c.fetchone()
        settlements = row['c']

    async with conn.execute("SELECT COUNT(DISTINCT gush || '-' || helka) as c FROM deals WHERE gush IS NOT NULL") as c:
        row = await c.fetchone()
        parcels = row['c']

    async with conn.execute("SELECT COUNT(DISTINCT nature) as c FROM deals") as c:
        row = await c.fetchone()
        natures = row['c']

    _cached_stats = StatsResponse(
        deals=deals or 0,
        first_deal=first_deal or "",
        last_deal=last_deal or "",
        settlements=settlements or 0,
        parcels=parcels or 0,
        natures=natures or 0
    )
    return _cached_stats

@router.get("/settlements")
async def get_settlements(conn: aiosqlite.Connection = Depends(get_db)):
    # Fast-path: use precalculated settlements_summary table
    try:
        fast_query = """
            SELECT settlement, settlement_code, total_deals as deals, last_deal 
            FROM settlements_summary 
            WHERE settlement IS NOT NULL AND settlement != ''
            ORDER BY total_deals DESC
        """
        async with conn.execute(fast_query) as cur:
            rows = await cur.fetchall()
            if rows:
                return {"data": [dict(row) for row in rows]}
    except Exception:
        pass

    query = """
        SELECT settlement, settlement_code, COUNT(*) as deals, MAX(date) as last_deal 
        FROM deals 
        WHERE settlement IS NOT NULL
        GROUP BY settlement, settlement_code 
        ORDER BY deals DESC
    """
    async with conn.execute(query) as cur:
        rows = await cur.fetchall()
        return {"data": [dict(row) for row in rows]}

@router.get("/natures")
async def get_natures(conn: aiosqlite.Connection = Depends(get_db)):
    # Fast-path: use precalculated natures_summary table
    try:
        fast_query = """
            SELECT nature, deals, median_amount, median_ppsqm_normalized
            FROM natures_summary
            WHERE nature IS NOT NULL AND nature != ''
            ORDER BY deals DESC
        """
        async with conn.execute(fast_query) as cur:
            rows = await cur.fetchall()
            if rows:
                return {"data": [dict(row) for row in rows]}
    except Exception:
        pass

    query = """
        SELECT nature, COUNT(*) as deals, 
               median(amount) as median_amount, 
               median(price_per_sqm_normalized) as median_ppsqm_normalized
        FROM deals 
        WHERE nature IS NOT NULL
        GROUP BY nature 
        ORDER BY deals DESC
    """
    async with conn.execute(query) as cur:
        rows = await cur.fetchall()
        return {"data": [dict(row) for row in rows]}
