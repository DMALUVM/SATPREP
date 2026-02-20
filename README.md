# SATPREP Standalone

Standalone SAT Prep app for `DMALUVM/SATPREP`.

## Run locally

```bash
npm install
npm run satprep:validate-bank
npm run satprep:validate-verbal
npm run dev
```

Open: `http://localhost:5173/sat-prep`

## Required env vars

Frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Server/API:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Supabase setup

Run SQL schema:
- `supabase/satprep_schema.sql`

Seed bank:

```bash
npm run satprep:seed-bank
```

## Deploy

Deploy this repo root in Vercel. Routes available under `/sat-prep`.
