# RivalSKU

24/7 competitor price, promo, stockout, and new-SKU tracking for Shopify / DTC brands.

RivalSKU watches public Shopify storefronts and alerts your team when a rival cuts a price, starts a sale, stocks out, restocks, or publishes a new product. **No Shopify Admin install. No competitor login.** Public catalog data only.

- Marketing site + live Instant Scan: [http://localhost:3000](http://localhost:3000)
- Workspace dashboard: [http://localhost:3000/dashboard](http://localhost:3000/dashboard)
- Contact: [hello@rivalsku.com](mailto:hello@rivalsku.com)

## Quick start (local)

```bash
cd /workspace/rivalsku
cp .env.example .env.local   # optional — the app runs without Stripe/Resend keys
npm install
npm run dev                  # http://localhost:3000
```

SQLite is created automatically at `/workspace/rivalsku/data/rivalsku.db`. There is no external database to provision.

Seed the three demo competitors and run a live scan:

```bash
npm run seed                 # allbirds.com, tentree.com, colourpop.com
```

Scan every active store (this is the 24/7 worker entrypoint):

```bash
npm run scan
```

Import the 28 starter prospects' unique competitor storefronts, then regenerate personalized audit markdown:

```bash
npm run import-prospects
npm run scan
npm run generate-audits   # writes /workspace/rivalsku/audits/<prospect-slug>.md
```

`npm run scan` is polite by default (2 concurrent stores, 500ms pause between finishes). Override with `SCAN_CONCURRENCY` and `SCAN_DELAY_MS`. Put it on a cron, or set `SCAN_INTERVAL_MINUTES=30` in the production container so the scanner loops in the background.

### Production-style local run

```bash
npm run build
npm start                    # next start -p 3000
```

## What the MVP does

- Instant-scan any public Shopify storefront from the landing page (`/api/quick-scan`)
- Track competitor stores, scan on add, and rescan individually or all at once
- Diff engine writes structured change events: `PRICE_DROP`, `PRICE_INCREASE`, `SALE_STARTED`, `SALE_ENDED`, `NEW_PRODUCT`, `OUT_OF_STOCK`, `BACK_IN_STOCK`, `PROMO_BANNER_CHANGED`
- Filters out `$0.00` placeholder products
- Surfaces a clear **Unsupported / protected storefront** state when `/products.json` returns 403, 404, 429, or a bot-checkpoint HTML page (headless Hydrogen/Oxygen stores included)
- Slack Block Kit + HTML email digests (logged cleanly when keys are missing)
- Stripe Checkout + webhook scaffolding (`/api/checkout`, `/api/webhooks/stripe`)
- Free 7-day competitor audit lead form (`/api/leads`)
- Copyable / downloadable Markdown + HTML audit report

## Environment variables

See `.env.example`. None are required to run the app locally.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Public origin for Stripe redirects and alert links |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_PRICE_STARTER` / `_GROWTH` / `_SCALE` | Stripe Price IDs for $49 / $99 / $199 |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret for `/api/webhooks/stripe` |
| `SLACK_WEBHOOK_URL` | Optional default incoming webhook |
| `RESEND_API_KEY` | Optional email delivery |
| `ALERT_FROM_EMAIL` | From address (defaults to `RivalSKU <hello@rivalsku.com>`) |
| `DB_PATH` | SQLite file path (defaults to `./data/rivalsku.db`) |
| `SCAN_INTERVAL_MINUTES` | In-process scan loop interval in the Docker image (default 30; `0` disables) |
| `SCAN_CONCURRENCY` / `SCAN_DELAY_MS` | Polite scan throttling (defaults 2 and 500) |

Without Stripe or Resend keys, checkout and alerts return a clear setup message and never crash the UI.

## One-command deploy

A production `Dockerfile`, `render.yaml`, and `fly.toml` ship in this repo. The image runs `scripts/start-with-scanner.sh`, which serves the app and (when `SCAN_INTERVAL_MINUTES` is set, default 30) loops `npm run scan` in the background. Mount a persistent volume at `/app/data` — SQLite lives at `DB_PATH` (default `/app/data/rivalsku.db` in the container, or `./data/rivalsku.db` locally).

### Render

Create a Blueprint from this repo (`render.yaml`). It declares the web service, health check, and a 1 GB disk mounted at `/app/data`. Set the remaining env vars (`NEXT_PUBLIC_APP_URL`, Stripe, Resend) in the Render dashboard.

### Fly.io

```bash
fly launch --no-deploy --copy-config
fly volumes create rivalsku_data --size 1 --region iad
fly deploy
```

`fly.toml` already mounts `rivalsku_data` at `/app/data` and keeps the machine running so the in-process scanner does not sleep.

### Railway

```bash
# from /workspace/rivalsku, after installing the Railway CLI and logging in
railway up
```

Use the Dockerfile, attach a volume at `/app/data`, and set `DB_PATH=/app/data/rivalsku.db` plus `SCAN_INTERVAL_MINUTES=30`.

### Vercel

```bash
npx vercel
```

Vercel is a good fit for the Next.js UI. Because this MVP uses `better-sqlite3` and a local file, attach a networked SQLite/Turso database or run the scanner worker on Railway/Fly if you deploy the web app to Vercel. For the simplest all-in-one deploy, prefer Railway, Fly.io, or Render with a persistent disk.

Remember to set the env vars from `.env.example` in the host dashboard, then register the Stripe webhook endpoint: `https://<your-domain>/api/webhooks/stripe`.

## Go-live checklist (three external items)

1. Register **rivalsku.com** and point DNS at your host; set up `hello@rivalsku.com`.
2. Create a hosting account (Railway, Fly.io, Render, or Vercel as noted above) and deploy this repo with persistent storage for `data/rivalsku.db`.
3. Add **Stripe** price IDs + secret key (and webhook secret) and a **Resend** API key for email alerts. Slack webhook can be saved in the dashboard per workspace.

## Project layout

```
src/lib/db.ts            SQLite schema + helpers
src/lib/monitor.ts       Storefront fetch, $0 filter, diff engine
src/lib/alerts.ts        Slack Block Kit + Resend HTML digest
scripts/scan-all.ts                 Cron worker (`npm run scan`)
scripts/import-prospects.ts         Load unique competitor domains (`npm run import-prospects`)
scripts/generate-prospect-audits.ts Per-prospect markdown audits (`npm run generate-audits`)
scripts/seed.ts                     Demo stores (`npm run seed`)
Dockerfile / render.yaml / fly.toml One-click production deploy
src/app/page.tsx         Landing page
src/app/dashboard        Workspace UI
src/app/api/*            REST endpoints
```
