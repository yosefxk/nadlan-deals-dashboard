with open("routers/deals.py", "r") as f:
    content = f.read()

geo_endpoint = """
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
        gh_match = re.search(r'(\\d{4,8})[\\s/]+(\\d{1,5})', q_clean)
        if gh_match:
            query_parts.append("(d.gush = ? AND d.helka = ?)")
            params.extend([gh_match.group(1), gh_match.group(2)])
        elif q_clean.isdigit():
            query_parts.append("(d.gush = ? OR d.helka = ? OR d.settlement_code = ?)")
            params.extend([q_clean, q_clean, q_clean])
        else:
            query_parts.append("(d.settlement LIKE ? OR d.nature LIKE ?)")
            params.extend([f"%{q_clean}%", f"%{q_clean}%"])

    if settlement:
        query_parts.append("d.settlement = ?")
        params.append(settlement)
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
    if settlements:
        s_list = [s.strip() for s in settlements.split(",") if s.strip()]
        if s_list:
            placeholders = ",".join(["?"] * len(s_list))
            query_parts.append(f"d.settlement IN ({placeholders})")
            params.extend(s_list)
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
        if settlement:
            parcels = await resolve_street_parcels(settlement, street, house)
        if parcels:
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
        a = math.sin(dLat/2) * math.sin(dLat/2) + \
            math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
            math.sin(dLon/2) * math.sin(dLon/2)
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

"""

content = content.replace('@router.get("/parcel/{gush}/{helka}")', geo_endpoint + '\n@router.get("/parcel/{gush}/{helka}")')

with open("routers/deals.py", "w") as f:
    f.write(content)
