# Yield Explorer — LI.FI Earn Dashboard

A clean yield aggregator dashboard built with the LI.FI Earn API.
Part of the DeFi Mullet Hackathon #1.

## Quick Start

```bash
npm install
# Add your integrator ID to .env (see below)
npm start
```

## Setup

1. Get your integrator ID at https://li.fi/plans/
2. Open `.env` and replace `your-integrator-id-here` with your real ID
3. Run `npm start` — the app falls back to mock data if the API is unreachable

## Project Structure

```
src/
  api/
    earn.js               ← All LI.FI Earn API calls (discover, quote, positions)
  components/
    FilterBar.jsx         ← Chain + token filter pills
    StatsRow.jsx          ← Summary cards (count, highest APY, TVL, chains)
    OpportunityTable.jsx  ← Main data table with sort + deposit button
  hooks/
    useOpportunities.js   ← Data fetching hook with 60s auto-refresh + mock fallback
  styles/
    app.css               ← All styles
  App.jsx                 ← Root component + modal
  index.js                ← React entry point
```

## Roadmap

- **v1** (now) — Live APY dashboard with filters and sort
- **v2** — Wallet connect (RainbowKit) + deposit flow via Earn API
- **v3** — User positions panel (track your deposits)
- **v4** — APY sparkline history charts
- **v5** — "Best vault for my token" smart recommender

## API Flow

```
Discover → Quote → Execute → Verify
```

See `src/api/earn.js` for all three endpoints.
