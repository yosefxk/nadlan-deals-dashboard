import re

with open("routers/trends.py", "r") as f:
    content = f.read()

new_series = """
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
            
        series_dict = {}
        for s_name in s_list:
            query_parts = ["settlement = ?"]
            params = [s_name]
            
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
        query_parts.append("settlement = ?")
        params.append(settlement)
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
"""

pattern = re.compile(r'@router\.get\("/series", response_model=SeriesResponse\).*?return SeriesResponse\(data=data, count=len\(data\)\)', re.DOTALL)
content = pattern.sub(new_series.strip(), content)

with open("routers/trends.py", "w") as f:
    f.write(content)
