from fastapi import APIRouter, Depends, Query, Response
from typing import Optional, List
from database import get_db
import aiosqlite
import json
from pathlib import Path

router = APIRouter(prefix="/api/map")

# Load precomputed settlement coordinates
COORD_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "settlement_coordinates.json"
POLYGON_FILE = Path(__file__).resolve().parent.parent.parent / "data" / "settlement_polygons.json"
_cached_polygons_bytes: Optional[bytes] = None

COORDS = {}
if COORD_FILE.exists():
    try:
        with open(COORD_FILE, "r", encoding="utf-8") as f:
            COORDS = json.load(f)
    except Exception:
        COORDS = {}

@router.get("/summary")
async def get_map_summary(
    nature: Optional[str] = None,
    year_from: Optional[int] = None,
    year_to: Optional[int] = None,
    conn: aiosqlite.Connection = Depends(get_db)
):
    # Fast-path: default national view uses precalculated map_summary table
    if not nature and not year_from and not year_to:
        try:
            async with conn.execute(
                "SELECT settlement, lat, lon, deals, median_amount, median_ppsqm, avg_amount, avg_area FROM map_summary ORDER BY deals DESC"
            ) as cur:
                rows = await cur.fetchall()
                if rows:
                    return {"data": [dict(r) for r in rows], "total": len(rows)}
        except Exception:
            pass

    clauses = ["settlement IS NOT NULL", "settlement != ''", "amount > 0"]
    params = []

    if nature:
        clauses.append("nature = ?")
        params.append(nature)
    if year_from:
        clauses.append("year >= ?")
        params.append(year_from)
    if year_to:
        clauses.append("year <= ?")
        params.append(year_to)

    where_sql = " AND ".join(clauses)

    query = f"""
        SELECT 
            settlement,
            COUNT(*) as deals_count,
            median(amount) as median_amount,
            median(price_per_sqm_normalized) as median_ppsqm,
            AVG(amount) as avg_amount,
            AVG(area_sqm) as avg_area
        FROM deals
        WHERE {where_sql}
        GROUP BY settlement
        HAVING deals_count >= 5
        ORDER BY deals_count DESC
    """

    async with conn.execute(query, params) as cur:
        rows = await cur.fetchall()

    results = []
    for r in rows:
        settlement = r["settlement"]
        # Look up coordinates
        coords = COORDS.get(settlement)
        if not coords:
            # Try stripped / hyphen variations
            s_clean = settlement.strip().replace(" -", "-").replace("- ", "-")
            coords = COORDS.get(s_clean) or COORDS.get(settlement.split("-")[0].strip())

        if coords:
            results.append({
                "settlement": settlement,
                "lat": coords[0],
                "lon": coords[1],
                "deals": r["deals_count"],
                "median_amount": round(r["median_amount"]) if r["median_amount"] else None,
                "median_ppsqm": round(r["median_ppsqm"]) if r["median_ppsqm"] else None,
                "avg_amount": round(r["avg_amount"]) if r["avg_amount"] else None,
                "avg_area": round(r["avg_area"], 1) if r["avg_area"] else None,
            })

    return {"data": results, "total": len(results)}

@router.get("/clusters")
async def get_clusters(conn: aiosqlite.Connection = Depends(get_db)):
    # Keep backward compatibility
    res = await get_map_summary(conn=conn)
    return [{"settlement": x["settlement"], "count": x["deals"]} for x in res["data"]]

@router.get("/polygons")
async def get_settlement_polygons():
    global _cached_polygons_bytes
    if _cached_polygons_bytes is None:
        if POLYGON_FILE.exists():
            try:
                with open(POLYGON_FILE, "rb") as f:
                    _cached_polygons_bytes = f.read()
            except Exception:
                _cached_polygons_bytes = b"{}"
        else:
            _cached_polygons_bytes = b"{}"
    return Response(
        content=_cached_polygons_bytes,
        media_type="application/json",
        headers={"Cache-Control": "public, max-age=86400"}
    )

