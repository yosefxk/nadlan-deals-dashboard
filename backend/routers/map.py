from fastapi import APIRouter, Depends
from database import get_db
import aiosqlite

router = APIRouter(prefix="/api/map")

@router.get("/clusters")
async def get_clusters(conn: aiosqlite.Connection = Depends(get_db)):
    query = """
        SELECT settlement, COUNT(*) as count
        FROM deals
        WHERE settlement IS NOT NULL
        GROUP BY settlement
    """
    async with conn.execute(query) as cur:
        rows = await cur.fetchall()
        return [{"settlement": row['settlement'], "count": row['count']} for row in rows]
