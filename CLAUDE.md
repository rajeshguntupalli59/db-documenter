# DB Documenter — Project Context

Self-hosted database schema documentation tool. Connects to PostgreSQL or SQL Server and generates a clean browseable UI showing all tables, columns, types, indexes, foreign keys, and views. Export to PDF supported.

## Stack
- **Backend:** Python FastAPI, port 8001, venv at `backend/.venv`
- **Frontend:** React + Vite + Tailwind CDN, port 5173
- **No database:** credentials used only in-session, nothing stored

## Start commands
```powershell
# Backend
cd backend
.venv\Scripts\uvicorn.exe main:app --port 8001 --reload

# Frontend
cd frontend
npm run dev
```

## Key files
- `backend/main.py` — FastAPI app, CORS allows localhost:5173
- `backend/scanner.py` — all schema scanning logic for both databases
- `backend/routers/schema.py` — POST /api/schema/scan endpoint
- `frontend/src/App.jsx` — sidebar + detail panel layout
- `frontend/src/components/ConnectionForm.jsx` — landing/connection page
- `frontend/src/components/TableDetail.jsx` — table columns/indexes/FK display
- `USER_GUIDE.md` — full user documentation

## API
```
POST /api/schema/scan
{
  "db_type": "postgresql" | "sqlserver",
  "host": "localhost",
  "port": 5432,
  "database": "mydb",
  "username": "user",
  "password": "pass"
}
```
Returns: `{ database, tables[], views[], summary{} }`

## PostgreSQL scanner
- Uses `pg_attribute`, `pg_class`, `pg_namespace`, `pg_type` (NOT information_schema for columns)
- `format_type(atttypid, atttypmod)` for clean type strings
- PK detection: `EXISTS (SELECT 1 FROM pg_index WHERE indisprimary AND attnum = ANY(indkey))`
- Excludes: `pg_catalog`, `information_schema`, `pg_toast`

## SQL Server scanner
- Uses `sys.tables`, `sys.columns`, `sys.indexes`, `sys.foreign_key_columns`
- `STRING_AGG` for index columns — requires SQL Server 2017+
- ODBC Driver 17 or 18 for SQL Server required on host machine

## Test credentials (local)
- PostgreSQL: host=localhost, port=5432, database=shopdb, user=dba, password=dba123
- SQL Server: not installed on this machine (port 1433 not listening)

## Known issues fixed
- `format_type()` already includes length — do NOT also pass character_maximum_length to `_format_type()`
- PK via `= ANY(ix.indkey)` not unnest (unnest join had matching issues)

## Product status
- Built: 2026-05-13
- Status: complete, tested against PostgreSQL 16
- Next: test against SQL Server when available, add QueryOptimizer integration button
- Pricing plan: ~$99 self-hosted (same model as QueryOptimizer)
