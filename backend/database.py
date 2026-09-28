import aiosqlite
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'deals.db')

class MedianAggregate:
    def __init__(self):
        self.values = []

    def step(self, value):
        if value is not None:
            self.values.append(value)

    def finalize(self):
        if not self.values:
            return None
        self.values.sort()
        n = len(self.values)
        if n % 2 == 1:
            return self.values[n // 2]
        else:
            return (self.values[n // 2 - 1] + self.values[n // 2]) / 2.0

class Database:
    def __init__(self, db_path):
        self.db_path = db_path

    async def get_connection(self):
        conn = await aiosqlite.connect(self.db_path)
        await conn.execute("PRAGMA journal_mode=WAL")
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
