import pytest
import sqlite3
import aiosqlite
from unittest.mock import patch, MagicMock, AsyncMock

from backend.database import Database
from backend.routers.deals import BoundedDict, _street_parcels_cache
from scripts.ingest import fetch_batch_sql

@pytest.mark.asyncio
async def test_database_init_and_get_connection(tmp_path):
    db_file = tmp_path / "test.db"
    # Create empty database with parcel_addresses
    conn = sqlite3.connect(str(db_file))
    conn.execute("CREATE TABLE parcel_addresses (gush TEXT, helka TEXT, lat REAL, lon REAL, street TEXT, settlement TEXT)")
    conn.close()

    db = Database(str(db_file))
    await db.init_db()

    # Verify WAL mode was set by init_db
    conn = sqlite3.connect(str(db_file))
    mode = conn.execute("PRAGMA journal_mode").fetchone()[0]
    conn.close()
    assert mode.lower() == "wal"

    # get_connection should return connection without re-running DDL
    async_conn = await db.get_connection()
    assert async_conn is not None
    await async_conn.close()

def test_bounded_street_parcels_cache():
    bd = BoundedDict(maxsize=5)
    for i in range(10):
        bd[f"key_{i}"] = [(str(i), str(i))]
    assert len(bd) == 5
    assert "key_0" not in bd
    assert "key_9" in bd

def test_fetch_batch_sql_parameterization():
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"rows": []}
    mock_client.post.return_value = mock_resp

    # Valid row hash
    fetch_batch_sql(mock_client, "abc123_DEF-456.789")
    assert mock_client.post.called

    # Malicious injection in row hash must be rejected
    with pytest.raises(ValueError, match="Invalid last_row_hash format"):
        fetch_batch_sql(mock_client, "' OR 1=1 --")
    with pytest.raises(ValueError, match="Invalid last_row_hash format"):
        fetch_batch_sql(mock_client, "hash'; DROP TABLE deals;--")
