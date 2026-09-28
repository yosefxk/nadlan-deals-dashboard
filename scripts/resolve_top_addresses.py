#!/usr/bin/env python3
"""
Resolves addresses and GPS coordinates for top parcels from over.org.il and reverse geocoding,
and stores them in the parcel_addresses table in deals.db.
"""

import sqlite3
import urllib.request
import json
import time
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "deals.db")

def init_db(conn):
    conn.execute("""
    CREATE TABLE IF NOT EXISTS parcel_addresses (
        gush TEXT,
        helka TEXT,
        settlement TEXT,
        street TEXT,
        house_num TEXT,
        full_address TEXT,
        lat REAL,
        lon REAL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (gush, helka)
    )
    """)
    conn.commit()

def fetch_parcel_info(gush: str, helka: str):
    url = f"https://www.over.org.il/api/nadlan/parcel/{gush}/{helka}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=4) as resp:
            data = json.loads(resp.read().decode())
            if not data.get("data"):
                return None
            identity = data["data"][0].get("identity", {})
            point = identity.get("point") or {}
            sources = data["data"][0].get("sources", {})
            street = sources.get("gazetteer", {}).get("fields", {}).get("street_name_src")
            settlement = identity.get("settlement", {}).get("name")
            lat = point.get("lat")
            lon = point.get("lon")
            return {
                "lat": lat,
                "lon": lon,
                "street": street,
                "settlement": settlement
            }
    except Exception:
        return None

def reverse_geocode(lat: float, lon: float):
    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json&accept-language=he"
    req = urllib.request.Request(url, headers={"User-Agent": "NadlanDealsDashboard/1.0 (contact@baileytv.co.il)"})
    try:
        with urllib.request.urlopen(req, timeout=3) as resp:
            res = json.loads(resp.read().decode())
            addr = res.get("address", {})
            road = addr.get("road") or addr.get("suburb") or addr.get("neighbourhood")
            house_num = addr.get("house_number")
            city = addr.get("city") or addr.get("town") or addr.get("village")
            parts = []
            if road:
                parts.append(road)
            if house_num:
                parts.append(house_num)
            if city:
                parts.append(city)
            full = ", ".join(parts) if parts else res.get("display_name", "")
            return {
                "street": road,
                "house_num": house_num,
                "full_address": full
            }
    except Exception:
        return None

def main():
    conn = sqlite3.connect(DB_PATH)
    init_db(conn)
    cur = conn.cursor()

    # Query distinct top parcels: top by amount, top by price per sqm, and top in major luxury cities
    query = """
    WITH candidate_deals AS (
        SELECT gush, helka, settlement, amount, 1 as priority
        FROM deals
        WHERE amount >= 10000000 AND gush IS NOT NULL AND helka IS NOT NULL AND gush != '' AND helka != ''
        ORDER BY amount DESC
        LIMIT 100
    ),
    cand_ppsqm AS (
        SELECT gush, helka, settlement, amount, 2 as priority
        FROM deals
        WHERE amount >= 5000000 AND area_sqm >= 30 AND gush IS NOT NULL AND helka IS NOT NULL AND gush != '' AND helka != ''
        ORDER BY (amount / area_sqm) DESC
        LIMIT 60
    ),
    cand_telaviv AS (
        SELECT gush, helka, settlement, amount, 3 as priority
        FROM deals
        WHERE settlement = 'תל אביב -יפו' AND amount >= 8000000 AND gush IS NOT NULL AND helka IS NOT NULL AND gush != '' AND helka != ''
        ORDER BY amount DESC
        LIMIT 40
    ),
    cand_jerusalem AS (
        SELECT gush, helka, settlement, amount, 4 as priority
        FROM deals
        WHERE settlement = 'ירושלים' AND amount >= 6000000 AND gush IS NOT NULL AND helka IS NOT NULL AND gush != '' AND helka != ''
        ORDER BY amount DESC
        LIMIT 40
    )
    SELECT DISTINCT gush, helka, settlement FROM (
        SELECT * FROM candidate_deals
        UNION ALL SELECT * FROM cand_ppsqm
        UNION ALL SELECT * FROM cand_telaviv
        UNION ALL SELECT * FROM cand_jerusalem
    )
    """
    cur.execute(query)
    parcels = cur.fetchall()
    print(f"Total candidate top parcels to resolve: {len(parcels)}")

    resolved_count = 0
    for idx, (gush, helka, deal_settlement) in enumerate(parcels):
        # Check if already resolved
        cur.execute("SELECT gush FROM parcel_addresses WHERE gush = ? AND helka = ?", (gush, helka))
        if cur.fetchone():
            continue

        info = fetch_parcel_info(gush, helka)
        if not info:
            continue

        lat = info.get("lat")
        lon = info.get("lon")
        street = info.get("street")
        settlement = info.get("settlement") or deal_settlement
        house_num = None
        full_address = None

        if street and settlement:
            full_address = f"{street}, {settlement}"

        # If lat and lon exist but no street, reverse geocode
        if lat and lon and not street:
            time.sleep(0.3)
            rev = reverse_geocode(lat, lon)
            if rev:
                street = rev.get("street")
                house_num = rev.get("house_num")
                full_address = rev.get("full_address")

        if not full_address and settlement:
            full_address = f"גוש {gush} חלקה {helka}, {settlement}"

        cur.execute("""
            INSERT OR REPLACE INTO parcel_addresses
            (gush, helka, settlement, street, house_num, full_address, lat, lon)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (gush, helka, settlement, street, house_num, full_address, lat, lon))
        conn.commit()
        resolved_count += 1
        print(f"[{resolved_count}] Gush {gush}/{helka} -> {full_address} ({lat}, {lon})")

        time.sleep(0.1)

    print(f"Done! Successfully resolved {resolved_count} parcels.")

if __name__ == "__main__":
    main()
