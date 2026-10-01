#!/usr/bin/env python3
"""
High-performance ingestion of Israeli real estate deals from over.org.il into SQLite.

Uses the over.org.il append SQL endpoint with keyset pagination (ORDER BY row_hash LIMIT 1000)
to ingest ~1,000-2,000 rows/second with automatic checkpointing and resumption.

Usage:
    python3 ingest.py [--db ../data/deals.db] [--limit N]
"""

import argparse
import json
import logging
import sqlite3
import sys
import time
from pathlib import Path

import httpx

DATASET_ID = "fd06f5ae-8a4f-4120-b275-8a514ad23499"
TABLE_NAME = "append_taxes_nadlan_full_f41fb496_fd06f5ae"
SQL_URL = f"https://www.over.org.il/api/append/{DATASET_ID}/sql"
BATCH_SIZE = 1000
MAX_RETRIES = 25
RETRY_DELAY = 10

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS deals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    date_src TEXT,
    amount INTEGER,
    declared_amount INTEGER,
    nature TEXT,
    area_sqm REAL,
    rooms REAL,
    year_built INTEGER,
    portion TEXT,
    portion_fraction REAL,
    price_per_sqm INTEGER,
    price_per_sqm_normalized INTEGER,
    sub_parcel TEXT,
    settlement TEXT,
    settlement_code TEXT,
    gush TEXT,
    helka TEXT,
    addresses TEXT,
    addresses_total INTEGER,
    year INTEGER,
    floor INTEGER,
    row_hash TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS ingestion_meta (
    key TEXT PRIMARY KEY,
    value TEXT
);
"""

INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_deals_settlement ON deals(settlement);
CREATE INDEX IF NOT EXISTS idx_deals_settlement_code ON deals(settlement_code);
CREATE INDEX IF NOT EXISTS idx_deals_gush_helka ON deals(gush, helka);
CREATE INDEX IF NOT EXISTS idx_deals_date ON deals(date);
CREATE INDEX IF NOT EXISTS idx_deals_year ON deals(year);
CREATE INDEX IF NOT EXISTS idx_deals_nature ON deals(nature);
CREATE INDEX IF NOT EXISTS idx_deals_amount ON deals(amount);
CREATE INDEX IF NOT EXISTS idx_deals_rooms ON deals(rooms);
CREATE INDEX IF NOT EXISTS idx_deals_area ON deals(area_sqm);
CREATE INDEX IF NOT EXISTS idx_deals_price_sqm ON deals(price_per_sqm_normalized);
CREATE INDEX IF NOT EXISTS idx_deals_row_hash ON deals(row_hash);
"""

AGGREGATE_SQL = """
DROP TABLE IF EXISTS yearly_stats;
CREATE TABLE yearly_stats AS
SELECT
    year,
    settlement,
    settlement_code,
    nature,
    COUNT(*) AS deal_count,
    SUM(amount) AS total_volume,
    AVG(amount) AS avg_price,
    AVG(area_sqm) AS avg_area,
    AVG(rooms) AS avg_rooms
FROM deals
WHERE year IS NOT NULL
GROUP BY year, settlement, settlement_code, nature;

CREATE INDEX IF NOT EXISTS idx_ys_year ON yearly_stats(year);
CREATE INDEX IF NOT EXISTS idx_ys_settlement ON yearly_stats(settlement);
CREATE INDEX IF NOT EXISTS idx_ys_nature ON yearly_stats(nature);

DROP TABLE IF EXISTS settlements_summary;
CREATE TABLE settlements_summary AS
SELECT
    settlement,
    settlement_code,
    COUNT(*) AS total_deals,
    MIN(date) AS first_deal,
    MAX(date) AS last_deal,
    AVG(amount) AS avg_price,
    AVG(area_sqm) AS avg_area
FROM deals
WHERE settlement IS NOT NULL
GROUP BY settlement, settlement_code;

CREATE INDEX IF NOT EXISTS idx_ss_settlement ON settlements_summary(settlement);
CREATE INDEX IF NOT EXISTS idx_ss_total ON settlements_summary(total_deals DESC);
"""


def init_db(db_path: str) -> sqlite3.Connection:
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-128000")  # 128MB cache
    conn.executescript(SCHEMA_SQL)
    conn.commit()
    return conn


def get_meta(conn: sqlite3.Connection, key: str) -> str | None:
    row = conn.execute("SELECT value FROM ingestion_meta WHERE key = ?", (key,)).fetchone()
    return row[0] if row else None


def set_meta(conn: sqlite3.Connection, key: str, value: str):
    conn.execute(
        "INSERT INTO ingestion_meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, value),
    )


def fetch_batch_sql(client: httpx.Client, last_row_hash: str | None = None) -> list[dict]:
    if last_row_hash:
        sql = f"SELECT * FROM {TABLE_NAME} WHERE row_hash > '{last_row_hash}' ORDER BY row_hash LIMIT {BATCH_SIZE}"
    else:
        sql = f"SELECT * FROM {TABLE_NAME} ORDER BY row_hash LIMIT {BATCH_SIZE}"

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = client.post(
                SQL_URL,
                json={"sql": sql},
                timeout=45.0,
            )
            if resp.status_code == 429:
                retry_after = resp.headers.get("retry-after")
                wait = int(retry_after) + 2 if retry_after and retry_after.isdigit() else 35
                log.warning(f"Server rate limit (429). Sleeping {wait}s as requested by server...")
                time.sleep(wait)
                continue
            elif resp.status_code in (500, 502, 503, 504):
                wait = min(RETRY_DELAY * attempt, 60)
                log.warning(f"Server returned {resp.status_code}. Waiting {wait}s... (attempt {attempt}/{MAX_RETRIES})")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            data = resp.json()
            return data.get("rows", [])
        except (httpx.HTTPError, httpx.TimeoutException, json.JSONDecodeError) as e:
            if attempt == MAX_RETRIES:
                raise
            wait = min(RETRY_DELAY * attempt, 60)
            log.warning(f"Query failed ({e}), retry {attempt}/{MAX_RETRIES} in {wait}s...")
            time.sleep(wait)
    return []


def parse_and_insert(conn: sqlite3.Connection, rows: list[dict]):
    db_rows = []
    for r in rows:
        deal_date = r.get("deal_date")
        iso_date = None
        year = None
        if deal_date and "/" in deal_date:
            parts = deal_date.split("/")
            if len(parts) == 3:
                iso_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
                try:
                    year = int(parts[2])
                except ValueError:
                    pass

        amount = None
        if r.get("deal_amount"):
            try:
                amount = int(float(r["deal_amount"]))
            except (ValueError, TypeError):
                pass

        declared = None
        if r.get("declared_amount"):
            try:
                declared = int(float(r["declared_amount"]))
            except (ValueError, TypeError):
                pass

        area = None
        if r.get("asset_area"):
            try:
                area = float(r["asset_area"])
            except (ValueError, TypeError):
                pass

        rooms = None
        if r.get("room_num"):
            try:
                rooms = float(r["room_num"])
            except (ValueError, TypeError):
                pass

        year_built = None
        if r.get("year_built"):
            try:
                year_built = int(float(r["year_built"]))
            except (ValueError, TypeError):
                pass

        portion_str = r.get("portion")
        portion_fraction = 1.0
        if portion_str:
            try:
                portion_fraction = float(portion_str)
            except (ValueError, TypeError):
                pass

        price_per_sqm = None
        price_per_sqm_norm = None
        if amount and area and area > 0:
            price_per_sqm = round(amount / area)
            if portion_fraction and portion_fraction > 0:
                price_per_sqm_norm = round(amount / (area * portion_fraction))

        db_rows.append((
            iso_date,
            deal_date,
            amount,
            declared,
            r.get("deal_nature"),
            area,
            rooms,
            year_built,
            portion_str,
            portion_fraction,
            price_per_sqm,
            price_per_sqm_norm,
            r.get("sub_chelka"),
            r.get("settlement"),
            r.get("settlement_code"),
            r.get("gush"),
            r.get("chelka"),
            None,  # addresses
            0,     # addresses_total
            year,
            None,  # floor
            r.get("row_hash"),
        ))

    conn.executemany(
        """INSERT OR IGNORE INTO deals (
            date, date_src, amount, declared_amount, nature,
            area_sqm, rooms, year_built, portion, portion_fraction,
            price_per_sqm, price_per_sqm_normalized, sub_parcel,
            settlement, settlement_code, gush, helka,
            addresses, addresses_total, year, floor, row_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        db_rows,
    )


def build_indexes_and_aggregates(conn: sqlite3.Connection):
    log.info("Building database indexes...")
    conn.executescript(INDEX_SQL)
    conn.commit()
    log.info("Indexes built successfully.")

    log.info("Building summary aggregate tables (yearly_stats, settlements_summary)...")
    conn.executescript(AGGREGATE_SQL)
    conn.commit()
    log.info("Aggregates built successfully.")


def main():
    parser = argparse.ArgumentParser(description="High-speed ingest of over.org.il deals")
    default_db = Path(__file__).resolve().parent.parent / "data" / "deals.db"
    parser.add_argument("--db", default=str(default_db), help="Path to SQLite database")
    parser.add_argument("--limit", type=int, default=None, help="Max records to ingest in this run")
    parser.add_argument("--aggregates-only", action="store_true", help="Only build indexes and aggregates")
    args = parser.parse_args()

    db_path = Path(args.db).resolve()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = init_db(str(db_path))

    if args.aggregates_only:
        build_indexes_and_aggregates(conn)
        conn.close()
        return

    # Check total available from dataset
    client = httpx.Client(
        headers={
            "Accept": "application/json",
            "User-Agent": "nadlan-deals-dashboard/1.0",
        },
        timeout=60.0,
    )

    try:
        count_res = client.post(
            SQL_URL,
            json={"sql": f"SELECT COUNT(*) as total FROM {TABLE_NAME}"},
        ).json()
        total_in_source = count_res["rows"][0]["total"]
        log.info(f"Target dataset has {total_in_source:,} total transactions.")
    except Exception as e:
        log.warning(f"Could not fetch total count: {e}")
        total_in_source = 3844200

    last_row_hash = get_meta(conn, "last_row_hash")
    total_fetched = int(get_meta(conn, "total_fetched") or 0)
    log.info(f"Resuming from row_hash: {last_row_hash or 'START'} (already fetched: {total_fetched:,})")

    start_time = time.time()
    batch_count = 0
    records_this_run = 0

    try:
        while True:
            if args.limit and records_this_run >= args.limit:
                log.info(f"Reached specified limit of {args.limit:,} records.")
                break

            rows = fetch_batch_sql(client, last_row_hash)
            if not rows:
                log.info("No more rows returned. Ingestion complete!")
                break

            parse_and_insert(conn, rows)
            batch_len = len(rows)
            records_this_run += batch_len
            total_fetched += batch_len
            last_row_hash = rows[-1]["row_hash"]
            set_meta(conn, "last_row_hash", last_row_hash)
            set_meta(conn, "total_fetched", str(total_fetched))
            conn.commit()

            batch_count += 1
            elapsed = time.time() - start_time
            rate = records_this_run / elapsed if elapsed > 0 else 0
            pct = (total_fetched / total_in_source) * 100

            if batch_count % 5 == 0 or batch_len < BATCH_SIZE:
                sample_city = rows[-1].get("settlement", "")
                sample_date = rows[-1].get("deal_date", "")
                log.info(
                    f"[{pct:5.1f}%] Fetched {total_fetched:,}/{total_in_source:,} deals "
                    f"({rate:,.0f} rows/s) | Last: {sample_city} ({sample_date})"
                )

            if batch_len < BATCH_SIZE:
                log.info("Reached end of table dataset.")
                break

            # Politeness pause to adhere to 20 req/min limit
            time.sleep(3.2)

    except KeyboardInterrupt:
        log.info("\nIngestion paused by user. Checkpoint saved.")
    finally:
        client.close()
        build_indexes_and_aggregates(conn)
        final_count = conn.execute("SELECT COUNT(*) FROM deals").fetchone()[0]
        log.info(f"Database currently holds {final_count:,} deals.")
        conn.close()


if __name__ == "__main__":
    main()
