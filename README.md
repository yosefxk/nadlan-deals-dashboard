# 🏠 Nadlan Deals Dashboard

An open-source web app for browsing, searching, and visualizing **3.8 million Israeli real estate transactions** from the Israeli Tax Authority (מיסוי מקרקעין), covering 1998 to present.

Data sourced from [over.org.il](https://over.org.il/projects/deals) ("גרסאות לעם").

## Features

- 🔍 **Search** — Find deals by settlement, street, address, gush/helka, price range, rooms, and transaction type
- 📊 **Trends** — Median price trends over time, by settlement and property type
- 🏘️ **Settlement Explorer** — Deep dive into any of 1,300+ Israeli settlements
- 🗺️ **Map View** — Interactive map with deal markers and parcel boundaries
- 📈 **Compare** — Side-by-side settlement comparison with year-over-year changes
- 🏗️ **Parcel Detail** — Full transaction history for any specific parcel (גוש/חלקה)
- 🔗 **Shareable Links** — Every search and view state encoded in the URL

## Tech Stack

| Layer | Technology |
|---|---|
| Database | SQLite with FTS5 |
| Backend | Python FastAPI |
| Frontend | React + TypeScript + Vite |
| Charts | Recharts |
| Maps | Leaflet + OpenStreetMap |
| Styling | Tailwind CSS |

## Quick Start

### 1. Ingest Data

Download all 3.8M transactions from over.org.il into a local SQLite database:

```bash
cd scripts
pip install -r requirements.txt
python ingest.py
```

This will take 1-2 hours depending on your connection. Progress is logged to the console.

### 2. Start Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080
```

### 3. Build & Serve Frontend

```bash
cd frontend
npm install
npm run build
```

The built frontend is served by FastAPI at `http://localhost:8080`.

For development:
```bash
cd frontend
npm run dev
```

## Data Source

The data comes from the Israeli Tax Authority's real estate transaction registry, published openly by the [גרסאות לעם](https://over.org.il) project. It includes:

- **3.8M+ transactions** from 1998 to present
- **1,300+ settlements** across Israel
- **47 transaction types** (apartments, houses, land, commercial, etc.)
- Fields: date, amount (₪), property type, area (sqm), rooms, floor, gush/helka, settlement

## License

MIT

## Acknowledgments

- [over.org.il](https://over.org.il) / גרסאות לעם — for making this data publicly accessible
- Israeli Tax Authority (רשות המסים) — original data source
