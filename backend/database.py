import aiosqlite
from array import array
import os
import random

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'deals.db')

class MedianAggregate:
    """Exact median up to MAX_SAMPLES rows using compact C-doubles, falling back
    to uniform reservoir sampling above MAX_SAMPLES so large aggregations stay
    under ~200 KB instead of allocating hundreds of MB in Python lists."""
    MAX_SAMPLES = 25000

    def __init__(self):
        self.values = array('d')
        self.count = 0

    def step(self, value):
        if value is None:
            return
        self.count += 1
        if len(self.values) < self.MAX_SAMPLES:
            self.values.append(float(value))
        else:
            idx = random.randrange(self.count)
            if idx < self.MAX_SAMPLES:
                self.values[idx] = float(value)

    def finalize(self):
        if not self.values:
            return None
        sorted_vals = sorted(self.values)
        self.values = array('d')  # Release buffer promptly
        n = len(sorted_vals)
        mid = n // 2
        if n % 2 == 1:
            return sorted_vals[mid]
        return (sorted_vals[mid - 1] + sorted_vals[mid]) / 2.0

class Database:
    def __init__(self, db_path):
        self.db_path = db_path
        self._initialized = False

    async def init_db(self):
        """Initializes WAL mode and ensures indexes exist once during startup."""
        if os.path.exists(self.db_path):
            conn = await aiosqlite.connect(self.db_path)
            try:
                await conn.execute("PRAGMA journal_mode=WAL")
                await conn.execute("PRAGMA synchronous=NORMAL")
                await conn.execute("CREATE INDEX IF NOT EXISTS idx_parcel_coords ON parcel_addresses(lat, lon)")
                await conn.commit()
            except Exception:
                pass
            finally:
                await conn.close()
        self._initialized = True

    async def get_connection(self):
        conn = await aiosqlite.connect(self.db_path)
        await conn._execute(conn._conn.create_aggregate, "median", 1, MedianAggregate)
        conn.row_factory = aiosqlite.Row
        return conn

db_instance = Database(DB_PATH)

async def get_db():
    conn = await db_instance.get_connection()
    try:
        yield conn
    finally:
        await conn.close()

async def run_query(conn, query, params=()):
    async with conn.execute(query, params) as cursor:
        return await cursor.fetchall()

async def run_query_single(conn, query, params=()):
    async with conn.execute(query, params) as cursor:
        return await cursor.fetchone()
