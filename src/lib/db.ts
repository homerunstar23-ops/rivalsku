import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

export const DB_PATH =
  process.env.DB_PATH || path.resolve(process.cwd(), "data", "rivalsku.db");

export type EventType =
  | "PRICE_DROP"
  | "PRICE_INCREASE"
  | "SALE_STARTED"
  | "SALE_ENDED"
  | "NEW_PRODUCT"
  | "OUT_OF_STOCK"
  | "BACK_IN_STOCK"
  | "PROMO_BANNER_CHANGED";

export type Store = {
  id: number;
  domain: string;
  name: string;
  vertical: string | null;
  status: string;
  last_scanned_at: string | null;
  product_count: number;
  active_sale_count: number;
  out_of_stock_count: number;
  promo_banner: string | null;
  created_at: string;
};

export type ProductSnapshot = {
  id: number;
  store_id: number;
  product_id: string;
  variant_id: string;
  title: string;
  variant_title: string | null;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  available: number;
  product_url: string;
  updated_at: string | null;
  scanned_at: string;
};

export type ChangeEvent = {
  id: number;
  store_id: number;
  event_type: EventType;
  product_title: string | null;
  variant_title: string | null;
  old_value: string | null;
  new_value: string | null;
  pct_change: number | null;
  product_url: string | null;
  detected_at: string;
  alerted: number;
};

export type AlertSettings = {
  id: number;
  email: string | null;
  slack_webhook_url: string | null;
  digest_frequency: string;
  min_price_drop_pct: number;
  updated_at: string;
};

export type AuditLead = {
  id: number;
  work_email: string;
  brand_url: string;
  competitor_urls: string;
  created_at: string;
};

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (instance) return instance;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      vertical TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      last_scanned_at TEXT,
      product_count INTEGER NOT NULL DEFAULT 0,
      active_sale_count INTEGER NOT NULL DEFAULT 0,
      out_of_stock_count INTEGER NOT NULL DEFAULT 0,
      promo_banner TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS product_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL,
      product_id TEXT NOT NULL,
      variant_id TEXT NOT NULL,
      title TEXT NOT NULL,
      variant_title TEXT,
      sku TEXT,
      price REAL NOT NULL,
      compare_at_price REAL,
      available INTEGER NOT NULL DEFAULT 1,
      product_url TEXT NOT NULL,
      updated_at TEXT,
      scanned_at TEXT NOT NULL,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_store_variant
      ON product_snapshots(store_id, variant_id);
    CREATE INDEX IF NOT EXISTS idx_snapshots_store_scanned
      ON product_snapshots(store_id, scanned_at);

    CREATE TABLE IF NOT EXISTS change_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      product_title TEXT,
      variant_title TEXT,
      old_value TEXT,
      new_value TEXT,
      pct_change REAL,
      product_url TEXT,
      detected_at TEXT NOT NULL,
      alerted INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_events_store_detected
      ON change_events(store_id, detected_at DESC);
    CREATE INDEX IF NOT EXISTS idx_events_type
      ON change_events(event_type, detected_at DESC);

    CREATE TABLE IF NOT EXISTS alert_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      slack_webhook_url TEXT,
      digest_frequency TEXT NOT NULL DEFAULT 'immediate',
      min_price_drop_pct REAL NOT NULL DEFAULT 5,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_email TEXT NOT NULL,
      brand_url TEXT NOT NULL,
      competitor_urls TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const settingsCount = db
    .prepare("SELECT COUNT(*) AS c FROM alert_settings")
    .get() as { c: number };
  if (settingsCount.c === 0) {
    db.prepare(
      `INSERT INTO alert_settings (email, slack_webhook_url, digest_frequency, min_price_drop_pct, updated_at)
       VALUES (NULL, NULL, 'immediate', 5, ?)`,
    ).run(new Date().toISOString());
  }

  instance = db;
  return db;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function getAlertSettings(): AlertSettings {
  return getDb()
    .prepare("SELECT * FROM alert_settings ORDER BY id ASC LIMIT 1")
    .get() as AlertSettings;
}

export function listStores(): Store[] {
  return getDb()
    .prepare("SELECT * FROM stores ORDER BY created_at ASC")
    .all() as Store[];
}

export function getStore(id: number): Store | undefined {
  return getDb().prepare("SELECT * FROM stores WHERE id = ?").get(id) as
    | Store
    | undefined;
}

export function getStoreByDomain(domain: string): Store | undefined {
  return getDb()
    .prepare("SELECT * FROM stores WHERE domain = ?")
    .get(domain) as Store | undefined;
}

export function getKpis() {
  const db = getDb();
  const stores = db
    .prepare(
      `SELECT
         COUNT(*) AS tracked,
         COALESCE(SUM(active_sale_count), 0) AS sales,
         COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active
       FROM stores`,
    )
    .get() as { tracked: number; sales: number; active: number };
  const skus = db
    .prepare("SELECT COUNT(*) AS c FROM product_snapshots")
    .get() as { c: number };
  const events = db
    .prepare("SELECT COUNT(*) AS c FROM change_events")
    .get() as { c: number };
  return {
    trackedCompetitors: stores.tracked,
    totalSkusMonitored: skus.c,
    activeSalesDetected: stores.sales,
    recentChangeEvents: events.c,
    activeStores: stores.active,
  };
}
