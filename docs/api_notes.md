# GramCraft API Documentation & Integration Notes

The API Gateway runs on `http://localhost:5000` (interactive OpenAPI / Swagger UI available at `http://localhost:5000/docs`).

## Standard Response Format
All endpoints return standard JSON envelopes:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation"
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error explanation string",
  "details": [
    { "field": "sectors.water", "message": "Score cannot exceed 100" }
  ]
}
```

## Authentication & Tokens
- **Login**: `POST /api/auth/login` returns `{ token, user }` and sets rotating `gramcraft_refresh` cookie.
- **Refresh**: `POST /api/auth/refresh` rotates tokens.
- **Headers**: `Authorization: Bearer <token>`

## Scope Enforcement Rules
| Role | Permitted Actions | Geographic Scope |
| :--- | :--- | :--- |
| `admin` | Full CRUD on users, settings, villages, and budgets | Nationwide |
| `district_officer` | Manage villages, approve change requests, oversee budgets | Assigned District (e.g. Sehore) |
| `block_planner` | Optimize block budgets, manage projects, view villages | Assigned Block (e.g. Ichhawar) |
| `village_officer` | Update assigned village metrics (jumps >10 create review request) | Assigned Village IDs only |
| `viewer` | Read-only inspection of public scorecards and maps | Public |

## Core Endpoint Catalog
- `GET /health` - Health check (all services)
- `GET /docs` - Swagger UI interactive documentation
- `GET /api/villages` - Filter villages by district, block, search text, or bounding box
- `GET /api/villages/near?lat=&lng=&radiusKm=` - 2dsphere geospatial radius search
- `GET /api/villages/:id/insights` - AI score breakdown, recommendations, forecast, and peers
- `PUT /api/villages/:id` - Update village metrics (enforces scope and jump thresholds)
- `POST /api/budget/optimize` - AI greedy marginal gain allocation
- `POST /api/budget/simulate` - Scenario investment simulation curve
- `POST /api/budget/plans/:id/apply` - Convert approved budget into concrete projects
- `GET /api/reports/village/:id.pdf` - Download printable PDF dossier
- `POST /api/import/preview` - CSV import validation and preview
- `POST /api/import/commit` - Commit validated records to database
- `POST /api/gis/boundary-upload` - Ingest GeoJSON village boundary polygons
- `GET /api/game/leaderboard` - Official leaderboard with fair population peer groups
