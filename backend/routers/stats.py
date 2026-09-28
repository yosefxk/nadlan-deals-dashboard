from fastapi import APIRouter, Depends
from typing import List
from database import get_db
from models import StatsResponse, SettlementInfo, NatureInfo
import aiosqlite

router = APIRouter(prefix="/api")

@router.get("/stats", response_model=StatsResponse)
async def get_stats(conn: aiosqlite.Connection = Depends(get_db)):
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

    return StatsResponse(
        deals=deals or 0,
        first_deal=first_deal or "",
        last_deal=last_deal or "",
        settlements=settlements or 0,
        parcels=parcels or 0,
        natures=natures or 0
    )

@router.get("/settlements", response_model=List[SettlementInfo])
async def get_settlements(conn: aiosqlite.Connection = Depends(get_db)):
    query = """
        SELECT settlement, settlement_code, COUNT(*) as deals, MAX(date) as last_deal 
        FROM deals 
        WHERE settlement IS NOT NULL
        GROUP BY settlement, settlement_code 
        ORDER BY deals DESC
    """
    async with conn.execute(query) as cur:
        rows = await cur.fetchall()
        return [dict(row) for row in rows]

@router.get("/natures", response_model=List[NatureInfo])
async def get_natures(conn: aiosqlite.Connection = Depends(get_db)):
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
        return [dict(row) for row in rows]
