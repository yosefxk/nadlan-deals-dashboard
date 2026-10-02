from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from database import get_db
from models import SearchResponse, DealRow
import aiosqlite
import httpx
import re
import json
from pathlib import Path

router = APIRouter(prefix="/api")

_street_parcels_cache: dict[tuple, list[tuple[str, str]]] = {}

def get_city_variants(city: str) -> list[str]:
    variants = {city}
    if 'יי' in city:
        variants.add(city.replace('יי', 'י'))
    if 'י' in city and 'יי' not in city:
        variants.add(city.replace('י', 'יי'))
    if 'וו' in city:
        variants.add(city.replace('וו', 'ו'))
    if 'קרית ' in city:
        variants.add(city.replace('קרית ', 'קריית '))
    if 'קריית ' in city:
        variants.add(city.replace('קריית ', 'קרית '))
    if ' - ' in city:
        variants.add(city.replace(' - ', ' -'))
        variants.add(city.replace(' - ', '-'))
    elif ' -' in city:
        variants.add(city.replace(' -', ' - '))
        variants.add(city.replace(' -', '-'))
    elif '-' in city:
        variants.add(city.replace('-', ' - '))
        variants.add(city.replace('-', ' -'))
    return list(variants)

async def resolve_street_parcels(settlement: str, street: str, house: Optional[str] = None) -> list[tuple[str, str]]:
    key = (settlement, street, house or "")
    if key in _street_parcels_cache:
        return _street_parcels_cache[key]

    cities_to_try = get_city_variants(settlement)
    for c in cities_to_try:
        params = {"city": c, "street": street}
        if house:
            params["number"] = house
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get("https://www.over.org.il/api/nadlan/address", params=params)
                if resp.status_code == 200:
                    data = resp.json().get("data", [])
                    pairs = []
                    for p in data:
                        ident = p.get("identity", {})
                        g, h = ident.get("gush"), ident.get("helka")
                        if g and h:
                            pairs.append((str(g), str(h)))
                    if pairs:
                        _street_parcels_cache[key] = pairs
                        return pairs
        except Exception:
            pass
    return []

@router.get("/search", response_model=SearchResponse)
async def search_deals(
    q: Optional[str] = None,
    settlement: Optional[str] = None,
    settlements: Optional[str] = None,
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
    min_ppsqm: Optional[int] = None,
    max_ppsqm: Optional[int] = None,
    min_area: Optional[float] = None,
    max_area: Optional[float] = None,
    min_floor: Optional[int] = None,
    max_floor: Optional[int] = None,
    year_built_from: Optional[int] = None,
    year_built_to: Optional[int] = None,
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

    active_cities = []
    if settlements:
        s_list = [s.strip() for s in settlements.split(",") if s.strip()]
        expanded = []
        for s in s_list:
            expanded.extend(get_city_variants(s))
        if expanded:
            expanded = list(dict.fromkeys(expanded))
            placeholders = ",".join(["?"] * len(expanded))
            query_parts.append(f"settlement IN ({placeholders})")
            params.extend(expanded)
            active_cities = s_list
    elif settlement:
        expanded = get_city_variants(settlement)
        placeholders = ",".join(["?"] * len(expanded))
        query_parts.append(f"settlement IN ({placeholders})")
        params.extend(expanded)
        active_cities = [settlement]

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
    if min_ppsqm is not None:
        query_parts.append("price_per_sqm_normalized >= ?")
        params.append(min_ppsqm)
    if max_ppsqm is not None:
        query_parts.append("price_per_sqm_normalized <= ?")
        params.append(max_ppsqm)
    if min_area is not None:
        query_parts.append("area_sqm >= ?")
        params.append(min_area)
    if max_area is not None:
        query_parts.append("area_sqm <= ?")
        params.append(max_area)
    if min_floor is not None:
        query_parts.append("floor >= ?")
        params.append(min_floor)
    if max_floor is not None:
        query_parts.append("floor <= ?")
        params.append(max_floor)
    if year_built_from is not None:
        query_parts.append("year_built >= ?")
        params.append(year_built_from)
    if year_built_to is not None:
        query_parts.append("year_built <= ?")
        params.append(year_built_to)

    if street:
        parcels = []
        if active_cities:
            for c in active_cities:
                p_list = await resolve_street_parcels(c, street, house)
                if p_list:
                    parcels.extend(p_list)
        else:
            try:
                async with conn.execute(
                    "SELECT DISTINCT city_name FROM streets WHERE street_name = ? OR street_name LIKE ? LIMIT 3",
                    (street, f"%{street}%")
                ) as cur:
                    candidate_cities = [r["city_name"] for r in await cur.fetchall()]
                for c in candidate_cities:
                    p_list = await resolve_street_parcels(c, street, house)
                    if p_list:
                        parcels.extend(p_list)
                        break
            except Exception:
                pass

        if parcels:
            parcels = list(dict.fromkeys(parcels))
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
    elif sort == "ppsqm_desc":
        order_by = "price_per_sqm_normalized DESC"
    elif sort == "ppsqm_asc":
        order_by = "price_per_sqm_normalized ASC"
    elif sort == "area_desc":
        order_by = "area_sqm DESC"
    elif sort == "area_asc":
        order_by = "area_sqm ASC"
    elif sort == "rooms_desc":
        order_by = "rooms DESC"

    count_query = f"SELECT COUNT(*) as c FROM deals WHERE {where_clause}"
    async with conn.execute(count_query, params) as c_cur:
        count_row = await c_cur.fetchone()
        total = count_row['c'] if count_row else 0

    summary_stats = None
    if total > 0:
        summary_query = f"""
            SELECT median(amount) as median_amount, 
                   median(price_per_sqm_normalized) as median_ppsqm,
                   AVG(rooms) as avg_rooms, 
                   AVG(area_sqm) as avg_area
            FROM deals WHERE {where_clause}
        """
        async with conn.execute(summary_query, params) as s_cur:
            s_row = await s_cur.fetchone()
            if s_row:
                summary_stats = {
                    "median_amount": s_row["median_amount"],
                    "median_ppsqm": s_row["median_ppsqm"],
                    "avg_rooms": round(s_row["avg_rooms"], 1) if s_row["avg_rooms"] is not None else None,
                    "avg_area": round(s_row["avg_area"], 1) if s_row["avg_area"] is not None else None
                }

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
        offset=offset,
        summary=summary_stats
    )


@router.get("/search/geo", response_model=SearchResponse)
async def search_deals_geo(
    q: Optional[str] = None,
    settlement: Optional[str] = None,
    settlements: Optional[str] = None,
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
    min_ppsqm: Optional[int] = None,
    max_ppsqm: Optional[int] = None,
    min_area: Optional[float] = None,
    max_area: Optional[float] = None,
    min_floor: Optional[int] = None,
    max_floor: Optional[int] = None,
    year_built_from: Optional[int] = None,
    year_built_to: Optional[int] = None,
    street: Optional[str] = None,
    house: Optional[str] = None,
    sort: Optional[str] = "date_desc",
    conn: aiosqlite.Connection = Depends(get_db)
):
    query_parts = []
    params = []

    if q:
        q_clean = q.strip()
        gh_match = re.search(r'(\d{4,8})[\s/]+(\d{1,5})', q_clean)
        if gh_match:
            query_parts.append("(d.gush = ? AND d.helka = ?)")
            params.extend([gh_match.group(1), gh_match.group(2)])
        elif q_clean.isdigit():
            query_parts.append("(d.gush = ? OR d.helka = ? OR d.settlement_code = ?)")
            params.extend([q_clean, q_clean, q_clean])
        else:
            query_parts.append("(d.settlement LIKE ? OR d.nature LIKE ?)")
            params.extend([f"%{q_clean}%", f"%{q_clean}%"])

    active_cities = []
    if settlements:
        s_list = [s.strip() for s in settlements.split(",") if s.strip()]
        expanded = []
        for s in s_list:
            expanded.extend(get_city_variants(s))
        if expanded:
            expanded = list(dict.fromkeys(expanded))
            placeholders = ",".join(["?"] * len(expanded))
            query_parts.append(f"d.settlement IN ({placeholders})")
            params.extend(expanded)
            active_cities = s_list
    elif settlement:
        expanded = get_city_variants(settlement)
        placeholders = ",".join(["?"] * len(expanded))
        query_parts.append(f"d.settlement IN ({placeholders})")
        params.extend(expanded)
        active_cities = [settlement]

    if settlement_code:
        query_parts.append("d.settlement_code = ?")
        params.append(settlement_code)
    if gush:
        query_parts.append("d.gush = ?")
        params.append(gush)
    if helka:
        query_parts.append("d.helka = ?")
        params.append(helka)
    if sub_parcel:
        query_parts.append("d.sub_parcel = ?")
        params.append(sub_parcel)
    if nature:
        query_parts.append("d.nature = ?")
        params.append(nature)
    if date_from:
        query_parts.append("d.date >= ?")
        params.append(date_from)
    if date_to:
        query_parts.append("d.date <= ?")
        params.append(date_to)
    if min_amount:
        query_parts.append("d.amount >= ?")
        params.append(min_amount)
    if max_amount:
        query_parts.append("d.amount <= ?")
        params.append(max_amount)
    if min_rooms:
        query_parts.append("d.rooms >= ?")
        params.append(min_rooms)
    if max_rooms:
        query_parts.append("d.rooms <= ?")
        params.append(max_rooms)
    if min_ppsqm is not None:
        query_parts.append("d.price_per_sqm_normalized >= ?")
        params.append(min_ppsqm)
    if max_ppsqm is not None:
        query_parts.append("d.price_per_sqm_normalized <= ?")
        params.append(max_ppsqm)
    if min_area is not None:
        query_parts.append("d.area_sqm >= ?")
        params.append(min_area)
    if max_area is not None:
        query_parts.append("d.area_sqm <= ?")
        params.append(max_area)
    if min_floor is not None:
        query_parts.append("d.floor >= ?")
        params.append(min_floor)
    if max_floor is not None:
        query_parts.append("d.floor <= ?")
        params.append(max_floor)
    if year_built_from is not None:
        query_parts.append("d.year_built >= ?")
        params.append(year_built_from)
    if year_built_to is not None:
        query_parts.append("d.year_built <= ?")
        params.append(year_built_to)

    if street:
        parcels = []
        if active_cities:
            for c in active_cities:
                p_list = await resolve_street_parcels(c, street, house)
                if p_list:
                    parcels.extend(p_list)
        else:
            try:
                async with conn.execute(
                    "SELECT DISTINCT city_name FROM streets WHERE street_name = ? OR street_name LIKE ? LIMIT 3",
                    (street, f"%{street}%")
                ) as cur:
                    candidate_cities = [r["city_name"] for r in await cur.fetchall()]
                for c in candidate_cities:
                    p_list = await resolve_street_parcels(c, street, house)
                    if p_list:
                        parcels.extend(p_list)
                        break
            except Exception:
                pass

        if parcels:
            parcels = list(dict.fromkeys(parcels))
            parcel_clauses = " OR ".join(["(d.gush = ? AND d.helka = ?)"] * len(parcels[:200]))
            query_parts.append(f"({parcel_clauses})")
            for g, h in parcels[:200]:
                params.extend([g, h])
        else:
            query_parts.append("(d.settlement LIKE ? OR d.addresses LIKE ?)")
            params.extend([f"%{street}%", f"%{street}%"])
    
    where_clause = " AND ".join(query_parts) if query_parts else "1=1"
    
    order_by = "d.date DESC"
    if sort == "date_asc":
        order_by = "d.date ASC"
    elif sort == "amount_desc":
        order_by = "d.amount DESC"
    elif sort == "amount_asc":
        order_by = "d.amount ASC"
    elif sort == "ppsqm_desc":
        order_by = "d.price_per_sqm_normalized DESC"
    elif sort == "ppsqm_asc":
        order_by = "d.price_per_sqm_normalized ASC"
    elif sort == "area_desc":
        order_by = "d.area_sqm DESC"
    elif sort == "area_asc":
        order_by = "d.area_sqm ASC"
    elif sort == "rooms_desc":
        order_by = "d.rooms DESC"

    data_query = f'''
        SELECT d.*, pa.lat, pa.lon, pa.street as pa_street
        FROM deals d 
        LEFT JOIN parcel_addresses pa ON d.gush = pa.gush AND d.helka = pa.helka
        WHERE {where_clause} 
        ORDER BY {order_by} 
        LIMIT 50
    '''
    
    async with conn.execute(data_query, params) as d_cur:
        rows = await d_cur.fetchall()
        data = [dict(row) for row in rows]
        
    resolved_count = 0
    for row in data:
        if row.get("lat") is None and row.get("gush") and row.get("helka"):
            if resolved_count >= 10:
                continue
            g = row["gush"]
            h = row["helka"]
            try:
                async with httpx.AsyncClient(timeout=1.0) as client:
                    resp = await client.get(f"https://www.over.org.il/api/nadlan/parcel/{g}/{h}")
                    if resp.status_code == 200:
                        pdata = resp.json()
                        lat = pdata.get('lat')
                        lon = pdata.get('lon')
                        street_r = pdata.get('street')
                        if lat and lon:
                            row["lat"] = lat
                            row["lon"] = lon
                            await conn.execute(
                                "INSERT OR IGNORE INTO parcel_addresses (gush, helka, lat, lon, street, settlement) VALUES (?, ?, ?, ?, ?, ?)",
                                (g, h, lat, lon, street_r, row.get("settlement"))
                            )
                            await conn.commit()
                            resolved_count += 1
            except Exception:
                pass

    # Fallback to settlement coordinates if parcel lat/lon is missing
    coord_file = Path(__file__).resolve().parent.parent.parent / "data" / "settlement_coordinates.json"
    city_coords = {}
    if coord_file.exists():
        try:
            with open(coord_file, "r", encoding="utf-8") as f:
                city_coords = json.load(f)
        except Exception:
            pass

    for row in data:
        if row.get("lat") is None and row.get("settlement"):
            s_name = row["settlement"]
            coords = city_coords.get(s_name) or city_coords.get(s_name.strip().replace(" -", "-").replace("- ", "-")) or city_coords.get(s_name.split("-")[0].strip())
            if coords:
                # Add slight random jitter (up to ~50m) so multiple deals in the same city don't completely overlap
                import random
                jitter_lat = (random.random() - 0.5) * 0.003
                jitter_lon = (random.random() - 0.5) * 0.003
                row["lat"] = coords[0] + jitter_lat
                row["lon"] = coords[1] + jitter_lon

    return SearchResponse(
        data=data,
        total=len(data),
        total_capped=True,
        limit=50,
        offset=0
    )

@router.get("/nearby", response_model=SearchResponse)
async def get_nearby_deals(
    lat: float,
    lon: float,
    radius_km: float = 1.0,
    limit: int = Query(25, le=50),
    nature: Optional[str] = None,
    min_date: Optional[str] = None,
    conn: aiosqlite.Connection = Depends(get_db)
):
    import math

    lat_delta = radius_km / 111.0
    lon_delta = radius_km / 94.6

    min_lat = lat - lat_delta
    max_lat = lat + lat_delta
    min_lon = lon - lon_delta
    max_lon = lon + lon_delta

    query = '''
        SELECT d.*, pa.lat, pa.lon
        FROM deals d
        JOIN parcel_addresses pa ON d.gush = pa.gush AND d.helka = pa.helka
        WHERE pa.lat BETWEEN ? AND ? AND pa.lon BETWEEN ? AND ?
    '''
    params = [min_lat, max_lat, min_lon, max_lon]
    
    if nature:
        query += " AND d.nature = ?"
        params.append(nature)
    if min_date:
        query += " AND d.date >= ?"
        params.append(min_date)

    async with conn.execute(query, params) as cur:
        rows = await cur.fetchall()
        data = [dict(row) for row in rows]
        
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371
        dLat = math.radians(lat2 - lat1)
        dLon = math.radians(lon2 - lon1)
        a = math.sin(dLat/2) * math.sin(dLat/2) +             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *             math.sin(dLon/2) * math.sin(dLon/2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c

    filtered_data = []
    for row in data:
        r_lat = row.get("lat")
        r_lon = row.get("lon")
        if r_lat and r_lon:
            dist = haversine(lat, lon, r_lat, r_lon)
            if dist <= radius_km:
                row["distance"] = dist
                filtered_data.append(row)
                
    filtered_data.sort(key=lambda x: x.get("date", ""), reverse=True)
    filtered_data = filtered_data[:limit]

    return SearchResponse(
        data=filtered_data,
        total=len(filtered_data),
        total_capped=False,
        limit=limit,
        offset=0
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
    city_variants = get_city_variants(q_clean)
    settlement_clauses = " OR ".join(["settlement LIKE ?"] * len(city_variants))
    settlement_params = [f"%{v}%" for v in city_variants]
    async with conn.execute(
        f"""SELECT settlement, COUNT(*) as deals 
           FROM deals 
           WHERE {settlement_clauses} 
           GROUP BY settlement 
           ORDER BY deals DESC LIMIT 4""",
        settlement_params
    ) as cur:
        for row in await cur.fetchall():
            results.append({
                "category": "יישוב / עיר",
                "type": "settlement",
                "title": row["settlement"],
                "subtitle": f"{row['deals']:,} עסקאות מדווחות",
                "url": f"/settlement/{row['settlement']}"
            })

    # 3. Streets autocomplete from local streets database
    try:
        async with conn.execute(
            """SELECT DISTINCT street_name, city_name 
               FROM streets 
               WHERE street_name LIKE ? OR street_name LIKE ? 
               ORDER BY 
                   CASE WHEN street_name LIKE ? THEN 0 ELSE 1 END,
                   is_official DESC,
                   LENGTH(street_name) ASC 
               LIMIT 4""",
            (f"{q_clean}%", f"%{q_clean}%", f"{q_clean}%")
        ) as cur:
            for row in await cur.fetchall():
                st_name = row["street_name"]
                city_name = row["city_name"]
                results.append({
                    "category": "רחוב",
                    "type": "street",
                    "title": f"רחוב {st_name}",
                    "subtitle": city_name,
                    "url": f"/search?settlements={city_name}&street={st_name}"
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
    q_clean = q.strip()
    if not q_clean:
        return {"data": []}
    variants = get_city_variants(q_clean)
    clauses = " OR ".join(["settlement LIKE ?"] * len(variants))
    params = [f"%{v}%" for v in variants]
    query = f"""
        SELECT settlement, COUNT(*) as deals 
        FROM deals 
        WHERE {clauses}
        GROUP BY settlement 
        ORDER BY deals DESC 
        LIMIT 10
    """
    async with conn.execute(query, params) as cur:
        rows = await cur.fetchall()
        return {"data": [dict(row) for row in rows]}

@router.get("/streets/autocomplete")
async def autocomplete_streets(
    q: str = Query(..., min_length=1),
    settlements: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=50),
    conn: aiosqlite.Connection = Depends(get_db)
):
    q_clean = q.strip()
    if not q_clean:
        return {"data": []}

    prefix = f"{q_clean}%"
    contains = f"%{q_clean}%"

    if settlements:
        raw_cities = [s.strip() for s in settlements.split(",") if s.strip()]
        cities = []
        for rc in raw_cities:
            cities.extend(get_city_variants(rc))
        cities = list(dict.fromkeys(cities))
        if cities:
            placeholders = ",".join(["?"] * len(cities))
            query = f"""
                SELECT DISTINCT street_name, city_name
                FROM streets
                WHERE city_name IN ({placeholders})
                  AND (street_name LIKE ? OR street_name LIKE ?)
                ORDER BY 
                    CASE WHEN street_name LIKE ? THEN 0 ELSE 1 END,
                    is_official DESC,
                    LENGTH(street_name) ASC
                LIMIT ?
            """
            params = cities + [prefix, contains, prefix, limit]
            try:
                async with conn.execute(query, params) as cur:
                    rows = await cur.fetchall()
                    return {"data": [dict(r) for r in rows]}
            except Exception:
                return {"data": []}

    query = """
        SELECT DISTINCT street_name, city_name
        FROM streets
        WHERE street_name LIKE ? OR street_name LIKE ?
        ORDER BY 
            CASE WHEN street_name LIKE ? THEN 0 ELSE 1 END,
            is_official DESC,
            LENGTH(street_name) ASC
        LIMIT ?
    """
    params = [prefix, contains, prefix, limit]
    try:
        async with conn.execute(query, params) as cur:
            rows = await cur.fetchall()
            return {"data": [dict(r) for r in rows]}
    except Exception:
        return {"data": []}

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

    # City coordinates fallback for any top deals missing precise coordinates
    coord_file = Path(__file__).resolve().parent.parent.parent / "data" / "settlement_coordinates.json"
    city_coords = {}
    if coord_file.exists():
        try:
            with open(coord_file, "r", encoding="utf-8") as f:
                city_coords = json.load(f)
        except Exception:
            pass

    for row in data:
        if not row.get("lat") and row.get("settlement"):
            s_name = row["settlement"]
            coords = city_coords.get(s_name) or city_coords.get(s_name.strip().replace(" -", "-").replace("- ", "-")) or city_coords.get(s_name.split("-")[0].strip())
            if coords:
                row["lat"] = coords[0]
                row["lon"] = coords[1]
                if not row.get("full_address"):
                    row["full_address"] = s_name

    # 2. Count total (avoid joining parcel_addresses unless street filter is active)
    if not settlement and not nature and not street and not min_year and not max_year and sort != "ppsqm_desc":
        total = 3844200
    else:
        from_table = "deals d" if not street else "deals d LEFT JOIN parcel_addresses pa ON (d.gush = pa.gush AND d.helka = pa.helka)"
        count_query = f"SELECT COUNT(*) as cnt FROM {from_table} WHERE {where_clause}"
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
    if sort != "ppsqm_desc" and data and offset == 0:
        highest_deal = dict(data[0])
    else:
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
    if sort == "ppsqm_desc" and data and offset == 0:
        highest_ppsqm_deal = dict(data[0])
    else:
        index_hint = ""
        if not settlement and not nature and not street and not min_year and not max_year:
            index_hint = "INDEXED BY idx_deals_ppsqm_calc"
        elif settlement and not nature and not street and not min_year and not max_year:
            index_hint = "INDEXED BY idx_deals_settlement_ppsqm"

        deals_ppsqm_clauses = [c.replace("d.", "") for c in clauses]
        if "area_sqm >= 25" not in deals_ppsqm_clauses:
            deals_ppsqm_clauses.append("area_sqm >= 25")
        if "amount >= 500000" not in deals_ppsqm_clauses:
            deals_ppsqm_clauses.append("amount >= 500000")
        deals_ppsqm_where = " AND ".join(deals_ppsqm_clauses)

        pp_fast_query = f"""
            SELECT id, date, amount, nature, settlement, area_sqm, rooms, gush, helka,
                   ROUND(amount / area_sqm) as calc_ppsqm
            FROM deals {index_hint}
            WHERE {deals_ppsqm_where}
            ORDER BY (amount / area_sqm) DESC
            LIMIT 1
        """
        async with conn.execute(pp_fast_query, params) as cur:
            pp_row = await cur.fetchone()
            if pp_row:
                highest_ppsqm_deal = dict(pp_row)
                if highest_ppsqm_deal.get("gush") and highest_ppsqm_deal.get("helka"):
                    async with conn.execute(
                        "SELECT full_address, street, house_num, lat, lon FROM parcel_addresses WHERE gush = ? AND helka = ?",
                        (highest_ppsqm_deal["gush"], highest_ppsqm_deal["helka"])
                    ) as pa_cur:
                        pa_row = await pa_cur.fetchone()
                        if pa_row:
                            highest_ppsqm_deal.update(dict(pa_row))

    for h_target in (highest_deal, highest_ppsqm_deal):
        if h_target and not h_target.get("lat") and h_target.get("settlement"):
            s_name = h_target["settlement"]
            coords = city_coords.get(s_name) or city_coords.get(s_name.strip().replace(" -", "-").replace("- ", "-")) or city_coords.get(s_name.split("-")[0].strip())
            if coords:
                h_target["lat"] = coords[0]
                h_target["lon"] = coords[1]
                if not h_target.get("full_address"):
                    h_target["full_address"] = s_name

    # Top cities for top deals in this filter
    top_cities_from = "deals d" if not street else "deals d LEFT JOIN parcel_addresses pa ON (d.gush = pa.gush AND d.helka = pa.helka)"
    top_cities_query = f"""
        SELECT settlement, COUNT(*) as count
        FROM (
            SELECT d.settlement FROM {top_cities_from}
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



