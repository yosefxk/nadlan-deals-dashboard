from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from routers import deals, stats, trends, map

app = FastAPI(title="Nadlan Deals Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(deals.router)
app.include_router(stats.router)
app.include_router(trends.router)
app.include_router(map.router)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

frontend_dist = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'dist')
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.api_route("/{full_path:path}", methods=["GET"])
    async def catch_all(request: Request, full_path: str):
        if full_path.startswith("api/"):
            return None # 404 for API
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        return {"error": "Frontend not found"}
