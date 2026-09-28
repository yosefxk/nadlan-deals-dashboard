from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from database import get_db
from models import SearchResponse, DealRow
import aiosqlite
import httpx
import re

router = APIRouter(prefix="/api")

async def resolve_street_parcels(settlement: str, street: str, house: Optional[str] = None) -> list[tuple[str, str]]:
    params = {"city": settlement, "street": street}
    if house:
        params["number"] = house
    try:
        async with httpx.AsyncClient(timeout=2.5) as client:
            resp = await client.get("https://www.over.org.il/api/nadlan/address", params=params)
            if resp.status_code == 200:
                data = resp.json().get("data", [])
                pairs = []
                for p in data:
                    ident = p.get("identity", {})
                    g, h = ident.get("gush"), ident.get("helka")
                    if g and h:
                        pairs.append((str(g), str(h)))
                return pairs
    except Exception:
        pass
    return []

@router.get("/search", response_model=SearchResponse)
async def search_deals(
    q: Optional[str] = None,
    settlement: Optional[str] = None,
    settlement_code: Optional[str] = None,
    gush: Optional[str] = None,
    helka: Optional[str] = None,
    sub_parcel: Optional[str] = None,
    nature: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    min_amount: Optional[int] = None,
    max_amount: Optional[int] = None,
    min_rooms: Optional[float] = None,
    max_rooms: Optional[float] = None,
    street: Optional[str] = None,
    house: Optional[str] = None,
    sort: Optional[str] = "date_desc",
    limit: int = Query(50, le=200),
    offset: int = 0,
    conn: aiosqlite.Connection = Depends(get_db)
):
    query_parts = []
    params = []

    # Free text search across attributes
    if q:
        q_clean = q.strip()
        gh_match = re.search(r'(\d{4,8})[\s/]+(\d{1,5})', q_clean)
        if gh_match:
            query_parts.append("(gush = ? AND helka = ?)")
            params.extend([gh_match.group(1), gh_match.group(2)])
        elif q_clean.isdigit():
            query_parts.append("(gush = ? OR helka = ? OR settlement_code = ?)")
            params.extend([q_clean, q_clean, q_clean])
        else:
            query_parts.append("(settlement LIKE ? OR nature LIKE ?)")
            params.extend([f"%{q_clean}%", f"%{q_clean}%"])

    if settlement:
        query_parts.append("settlement = ?")
        params.append(settlement)
    if settlement_code:
        query_parts.append("settlement_code = ?")
        params.append(settlement_code)
    if gush:
        query_parts.append("gush = ?")
        params.append(gush)
    if helka:
        query_parts.append("helka = ?")
        params.append(helka)
    if sub_parcel:
        query_parts.append("sub_parcel = ?")
        params.append(sub_parcel)
    if nature:
        query_parts.append("nature = ?")
        params.append(nature)
    if date_from:
        query_parts.append("date >= ?")
        params.append(date_from)
    if date_to:
        query_parts.append("date <= ?")
        params.append(date_to)
    if min_amount:
        query_parts.append("amount >= ?")
        params.append(min_amount)
    if max_amount:
        query_parts.append("amount <= ?")
        params.append(max_amount)
    if min_rooms:
        query_parts.append("rooms >= ?")
        params.append(min_rooms)
    if max_rooms:
        query_parts.append("rooms <= ?")
        params.append(max_rooms)

    if street:
        parcels = []
        if settlement:
            parcels = await resolve_street_parcels(settlement, street, house)
        if parcels:
            parcel_clauses = " OR ".join(["(gush = ? AND helka = ?)"] * len(parcels[:200]))
            query_parts.append(f"({parcel_clauses})")
            for g, h in parcels[:200]:
                params.extend([g, h])
        else:
            query_parts.append("(settlement LIKE ? OR addresses LIKE ?)")
            params.extend([f"%{street}%", f"%{street}%"])
    
    where_clause = " AND ".join(query_parts) if query_parts else "1=1"
    
    order_by = "date DESC"
    if sort == "date_asc":
        order_by = "date ASC"
    elif sort == "amount_desc":
        order_by = "amount DESC"
    elif sort == "amount_asc":
        order_by = "amount ASC"

    count_query = f"SELECT COUNT(*) as c FROM deals WHERE {where_clause}"
    async with conn.execute(count_query, params) as c_cur:
        count_row = await c_cur.fetchone()
        total = count_row['c'] if count_row else 0

    data_query = f"SELECT * FROM deals WHERE {where_clause} ORDER BY {order_by} LIMIT ? OFFSET ?"
    data_params = params + [limit, offset]
    
    async with conn.execute(data_query, data_params) as d_cur:
        rows = await d_cur.fetchall()
        data = [dict(row) for row in rows]

    return SearchResponse(
        data=data,
        total=total,
        total_capped=False,
        limit=limit,
        offset=offset
    )

@router.get("/parcel/{gush}/{helka}")
async def get_parcel_deals(
    gush: str,
    helka: str,
    conn: aiosqlite.Connection = Depends(get_db)
):
    query = "SELECT * FROM deals WHERE gush = ? AND helka = ? ORDER BY date DESC"
    async with conn.execute(query, (gush, helka)) as cur:
        rows = await cur.fetchall()
        data = [dict(row) for row in rows]
        return {"data": data, "total": len(data), "gush": gush, "helka": helka}

@router.get("/omnisearch")
async def omnisearch(
    q: str,
    conn: aiosqlite.Connection = Depends(get_db)
):
    q_clean = q.strip()
    if not q_clean or len(q_clean) < 2:
        return {"results": []}

    results = []

    # 1. Parcel parsing (e.g. 6903/104 or גוש 6903 חלקה 104)
    gh_match = re.search(r'(\d{4,8})[\s/]+(\d{1,5})', q_clean)
    if gh_match:
        g, h = gh_match.group(1), gh_match.group(2)
        results.append({
            "category": "גוש וחלקה",
            "type": "parcel",
            "title": f"גוש {g} חלקה {h}",
            "subtitle": "מעבר ישיר לכל עסקאות החלקה",
            "url": f"/parcel/{g}/{h}"
        })
    elif q_clean.isdigit() and len(q_clean) >= 4:
        results.append({
            "category": "גוש",
            "type": "gush",
            "title": f"גוש {q_clean}",
            "subtitle": "סינון עסקאות לפי מספר גוש",
            "url": f"/search?gush={q_clean}"
        })

    # 2. Local Database: Settlements matching
    async with conn.execute(
        """SELECT settlement, COUNT(*) as deals 
           FROM deals 
           WHERE settlement LIKE ? 
           GROUP BY settlement 
           ORDER BY deals DESC LIMIT 4""",
        (f"%{q_clean}%",)
    ) as cur:
        for row in await cur.fetchall():
            results.append({
                "category": "יישוב / עיר",
                "type": "settlement",
                "title": row["settlement"],
                "subtitle": f"{row['deals']:,} עסקאות מדווחות",
                "url": f"/settlement/{row['settlement']}"
            })

    # 3. Streets autocomplete from over.org.il
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(
                "https://www.over.org.il/api/nadlan/streets",
                params={"q": q_clean, "limit": 4}
            )
            if resp.status_code == 200:
                for s in resp.json().get("data", []):
                    st_name = s.get("name")
                    city_name = s.get("settlement_name")
                    if st_name and city_name:
                        results.append({
                            "category": "רחוב",
                            "type": "street",
                            "title": f"רחוב {st_name}",
                            "subtitle": city_name,
                            "url": f"/search?settlement={city_name}&street={st_name}"
                        })
    except Exception:
        pass

    # 4. Local Database: Property natures matching
    async with conn.execute(
        """SELECT nature, COUNT(*) as deals 
           FROM deals 
           WHERE nature LIKE ? 
           GROUP BY nature 
           ORDER BY deals DESC LIMIT 2""",
        (f"%{q_clean}%",)
    ) as cur:
        for row in await cur.fetchall():
            results.append({
                "category": "סוג נכס",
                "type": "nature",
                "title": row["nature"],
                "subtitle": f"סינון לפי {row['deals']:,} עסקאות מסוג זה",
                "url": f"/search?nature={row['nature']}"
            })

    # 5. Universal search fallback
    results.append({
        "category": "חיפוש חופשי",
        "type": "all",
        "title": f"חפש \"{q_clean}\" בכל המאגר",
        "subtitle": "חיפוש בכל השדות (עיר, רחוב, גוש/חלקה)",
        "url": f"/search?q={q_clean}"
    })

    return {"results": results}

@router.get("/autocomplete")
async def autocomplete(
    q: str,
    conn: aiosqlite.Connection = Depends(get_db)
):
    query = """
        SELECT settlement, COUNT(*) as deals 
        FROM deals 
        WHERE settlement LIKE ? 
        GROUP BY settlement 
        ORDER BY deals DESC 
        LIMIT 10
    """
    async with conn.execute(query, (f"%{q}%",)) as cur:
        rows = await cur.fetchall()
        return {"data": [dict(row) for row in rows]}

@router.get("/settlement/{name}")
async def get_settlement_profile(
    name: str,
    conn: aiosqlite.Connection = Depends(get_db)
):
    # Basic stats
    async with conn.execute(
        """SELECT COUNT(*) as total_deals, MIN(date) as first_deal, MAX(date) as last_deal,
                  AVG(amount) as avg_price, AVG(area_sqm) as avg_area, settlement_code
           FROM deals WHERE settlement = ?""",
        (name,)
    ) as cur:
        stats = dict(await cur.fetchone())

    if not stats.get("total_deals"):
        return {"error": "Settlement not found"}, 404

    # Series (yearly medians)
    async with conn.execute(
        """SELECT year, COUNT(*) as deals, median(amount) as median_amount,
                  median(area_sqm) as median_area, median(price_per_sqm_normalized) as median_ppsqm_normalized
           FROM deals WHERE settlement = ? AND year IS NOT NULL
           GROUP BY year ORDER BY year""",
        (name,)
    ) as cur:
        series = [dict(row) for row in await cur.fetchall()]

    # Breakdown by nature
    async with conn.execute(
        """SELECT nature, COUNT(*) as deals, median(amount) as median_amount,
                  median(price_per_sqm_normalized) as median_ppsqm_normalized
           FROM deals WHERE settlement = ? AND nature IS NOT NULL
           GROUP BY nature ORDER BY deals DESC""",
        (name,)
    ) as cur:
        natures = [dict(row) for row in await cur.fetchall()]

    # Recent deals
    async with conn.execute(
        "SELECT * FROM deals WHERE settlement = ? ORDER BY date DESC LIMIT 50",
        (name,)
    ) as cur:
        recent = [dict(row) for row in await cur.fetchall()]

    return {
        "settlement": name,
        "settlement_code": stats.get("settlement_code"),
        "total_deals": stats["total_deals"],
        "first_deal": stats["first_deal"],
        "last_deal": stats["last_deal"],
        "avg_price": round(stats["avg_price"]) if stats["avg_price"] else None,
        "avg_area": round(stats["avg_area"], 1) if stats["avg_area"] else None,
        "series": series,
        "natures": natures,
        "recent_deals": recent,
    }

@router.get("/top-deals")
async def get_top_deals(
    settlement: Optional[str] = None,
    nature: Optional[str] = None,
    street: Optional[str] = None,
    min_year: Optional[int] = None,
    max_year: Optional[int] = None,
    sort: str = "amount_desc",
    limit: int = Query(50, le=200),
    offset: int = 0,
    conn: aiosqlite.Connection = Depends(get_db)
):
    clauses = ["d.amount > 0", "d.settlement IS NOT NULL", "d.settlement != ''"]
    params = []

    if settlement:
        clauses.append("d.settlement = ?")
        params.append(settlement)

    if nature:
        if nature == 'apartments':
            clauses.append("d.nature LIKE '%דירה%'")
        elif nature == 'houses':
            clauses.append("(d.nature LIKE '%בית%' OR d.nature LIKE '%קוטג%')")
        elif nature == 'commercial':
            clauses.append("(d.nature LIKE '%מסחר%' OR d.nature LIKE '%משרד%' OR d.nature LIKE '%חנות%' OR d.nature LIKE '%תעשי%')")
        else:
            clauses.append("d.nature = ?")
            params.append(nature)

    if street:
        clauses.append("(pa.full_address LIKE ? OR pa.street LIKE ? OR d.settlement LIKE ?)")
        params.extend([f"%{street}%", f"%{street}%", f"%{street}%"])

    if min_year:
        clauses.append("d.year >= ?")
        params.append(min_year)

    if max_year:
        clauses.append("d.year <= ?")
        params.append(max_year)

    if sort == "ppsqm_desc":
        clauses.append("d.amount >= 500000")
        clauses.append("d.area_sqm >= 25")
        order_by = "(d.amount / d.area_sqm) DESC"
    else:
        order_by = "d.amount DESC"

    where_clause = " AND ".join(clauses)

    # 1. Fetch ranking rows with address and coordinates
    data_query = f"""
        SELECT d.id, d.date, d.amount, d.declared_amount, d.nature, d.area_sqm, d.rooms, d.year_built,
               d.portion, d.portion_fraction, d.price_per_sqm, d.price_per_sqm_normalized,
               d.sub_parcel, d.settlement, d.settlement_code, d.gush, d.helka, d.year, d.floor,
               ROUND(CASE WHEN d.area_sqm >= 10 THEN (d.amount / d.area_sqm) ELSE d.price_per_sqm_normalized END) as calc_ppsqm,
               pa.full_address, pa.street, pa.house_num, pa.lat, pa.lon
        FROM deals d
        LEFT JOIN parcel_addresses pa ON (d.gush = pa.gush AND d.helka = pa.helka)
        WHERE {where_clause}
        ORDER BY {order_by}
        LIMIT ? OFFSET ?
    """
    async with conn.execute(data_query, params + [limit, offset]) as cur:
        rows = await cur.fetchall()
        data = [dict(row) for row in rows]

    # 2. Count total
    count_query = f"SELECT COUNT(*) as cnt FROM deals d LEFT JOIN parcel_addresses pa ON (d.gush = pa.gush AND d.helka = pa.helka) WHERE {where_clause}"
    async with conn.execute(count_query, params) as cur:
        count_row = await cur.fetchone()
        total = count_row["cnt"] if count_row else 0

    # 3. Overall luxury highlights for current filter
    highest_deal = None
    highest_ppsqm_deal = None
    avg_top_amount = 0

    if data:
        avg_top_amount = round(sum(d["amount"] for d in data if d.get("amount")) / len(data))

    # Highest total amount deal
    h_query = f"""
        SELECT d.id, d.date, d.amount, d.nature, d.settlement, d.area_sqm, d.rooms, d.gush, d.helka,
               ROUND(CASE WHEN d.area_sqm >= 10 THEN (d.amount / d.area_sqm) ELSE d.price_per_sqm_normalized END) as calc_ppsqm,
               pa.full_address, pa.street, pa.house_num, pa.lat, pa.lon
        FROM deals d
        LEFT JOIN parcel_addresses pa ON (d.gush = pa.gush AND d.helka = pa.helka)
        WHERE {where_clause}
        ORDER BY d.amount DESC
        LIMIT 1
    """
    async with conn.execute(h_query, params) as cur:
        h_row = await cur.fetchone()
        if h_row:
            highest_deal = dict(h_row)

    # Highest price per sqm deal
    h_ppsqm_clauses = list(clauses)
    if "d.area_sqm >= 25" not in h_ppsqm_clauses:
        h_ppsqm_clauses.append("d.area_sqm >= 25")
    if "d.amount >= 500000" not in h_ppsqm_clauses:
        h_ppsqm_clauses.append("d.amount >= 500000")
    h_ppsqm_where = " AND ".join(h_ppsqm_clauses)
    pp_query = f"""
        SELECT d.id, d.date, d.amount, d.nature, d.settlement, d.area_sqm, d.rooms, d.gush, d.helka,
               ROUND(d.amount / d.area_sqm) as calc_ppsqm,
               pa.full_address, pa.street, pa.house_num, pa.lat, pa.lon
        FROM deals d
        LEFT JOIN parcel_addresses pa ON (d.gush = pa.gush AND d.helka = pa.helka)
        WHERE {h_ppsqm_where}
        ORDER BY (d.amount / d.area_sqm) DESC
        LIMIT 1
    """
    async with conn.execute(pp_query, params) as cur:
        pp_row = await cur.fetchone()
        if pp_row:
            highest_ppsqm_deal = dict(pp_row)

    # Top cities for top deals in this filter
    top_cities_query = f"""
        SELECT settlement, COUNT(*) as count
        FROM (
            SELECT d.settlement FROM deals d
            LEFT JOIN parcel_addresses pa ON (d.gush = pa.gush AND d.helka = pa.helka)
            WHERE {where_clause}
            ORDER BY {order_by}
            LIMIT 100
        )
        GROUP BY settlement
        ORDER BY count DESC
        LIMIT 6
    """
    async with conn.execute(top_cities_query, params) as cur:
        c_rows = await cur.fetchall()
        top_cities = [dict(r) for r in c_rows]

    return {
        "data": data,
        "total": total,
        "limit": limit,
        "offset": offset,
        "stats": {
            "highest_deal": highest_deal,
            "highest_ppsqm_deal": highest_ppsqm_deal,
            "avg_top_amount": avg_top_amount,
            "top_cities": top_cities
        }
    }



