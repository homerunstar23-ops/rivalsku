import { getDb } from "../lib/db";

/** DealScout tables live in the RivalSKU SQLite file but use their own `ds_` prefix. */
export function getDealScoutDb() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS ds_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      mode TEXT NOT NULL DEFAULT 'paper',
      sources_json TEXT,
      summary_json TEXT,
      report_path TEXT
    );
    CREATE TABLE IF NOT EXISTS ds_amazon_candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      source TEXT NOT NULL,
      retailer TEXT NOT NULL,
      retailer_url TEXT,
      upc TEXT,
      asin TEXT,
      title TEXT NOT NULL,
      brand TEXT,
      buy_price REAL NOT NULL,
      amazon_price REAL,
      profit REAL,
      roi REAL,
      max_buy_price REAL,
      est_monthly_sales REAL,
      passes INTEGER NOT NULL DEFAULT 0,
      reasons_json TEXT,
      unknowns_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES ds_runs(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_ds_cand_run ON ds_amazon_candidates(run_id, passes, roi DESC);
    CREATE TABLE IF NOT EXISTS ds_ebay_flags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id INTEGER NOT NULL,
      store_domain TEXT NOT NULL,
      brand TEXT,
      product_title TEXT NOT NULL,
      variant_title TEXT,
      product_url TEXT,
      sale_price REAL NOT NULL,
      full_price REAL NOT NULL,
      discount_pct REAL NOT NULL,
      breakeven_ebay_price REAL NOT NULL,
      breakeven_ratio REAL NOT NULL,
      verdict TEXT NOT NULL,
      comp_status TEXT NOT NULL,
      comp_price REAL,
      comp_link TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (run_id) REFERENCES ds_runs(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_ds_ebay_run ON ds_ebay_flags(run_id, breakeven_ratio);
    -- Learning loop (filled once real buys happen): every approved buy through to sale.
    CREATE TABLE IF NOT EXISTS ds_purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER,
      channel TEXT NOT NULL,
      asin TEXT,
      title TEXT NOT NULL,
      qty INTEGER NOT NULL,
      unit_cost REAL NOT NULL,
      bought_at TEXT NOT NULL,
      est_profit_unit REAL,
      actual_sale_price REAL,
      actual_fees REAL,
      sold_at TEXT,
      notes TEXT
    );
  `);
  return db;
}
