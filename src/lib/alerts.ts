import {
  getAlertSettings,
  getDb,
  getStore,
  type ChangeEvent,
  type Store,
} from "./db";
import { eventLabel, formatMoney, formatPct } from "./format";

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

function slackWebhook(settings: { slack_webhook_url: string | null }): string | null {
  return (
    settings.slack_webhook_url?.trim() ||
    process.env.SLACK_WEBHOOK_URL?.trim() ||
    null
  );
}

function alertEmail(settings: { email: string | null }): string | null {
  return settings.email?.trim() || process.env.ALERT_TO_EMAIL?.trim() || null;
}

function shouldInclude(event: ChangeEvent, minPriceDropPct: number): boolean {
  if (event.event_type !== "PRICE_DROP") return true;
  if (event.pct_change === null || event.pct_change === undefined) return true;
  // pct_change is negative for drops
  return Math.abs(event.pct_change) >= minPriceDropPct;
}

function eventLine(event: ChangeEvent): string {
  const title = [event.product_title, event.variant_title]
    .filter(Boolean)
    .join(" — ");
  const label = eventLabel(event.event_type).toUpperCase();
  if (event.event_type === "PRICE_DROP" || event.event_type === "PRICE_INCREASE") {
    const oldP = event.old_value ? formatMoney(parseFloat(event.old_value)) : "—";
    const newP = event.new_value ? formatMoney(parseFloat(event.new_value)) : "—";
    const pct = formatPct(event.pct_change);
    return `${label}  ${title}  ${oldP} → ${newP}${pct ? `  (${pct})` : ""}`;
  }
  if (event.event_type === "PROMO_BANNER_CHANGED") {
    return `${label}  ${event.new_value || "(banner removed)"}`;
  }
  if (event.event_type === "NEW_PRODUCT") {
    const price = event.new_value ? formatMoney(parseFloat(event.new_value)) : "";
    return `${label}  ${title}${price ? `  ·  ${price}` : ""}`;
  }
  return `${label}  ${title}${
    event.old_value && event.new_value
      ? `  ${event.old_value} → ${event.new_value}`
      : event.new_value
        ? `  ${event.new_value}`
        : ""
  }`;
}

export function buildSlackPayload(
  storeMap: Map<number, Store>,
  events: ChangeEvent[],
) {
  const byStore = new Map<number, ChangeEvent[]>();
  for (const ev of events) {
    const list = byStore.get(ev.store_id) || [];
    list.push(ev);
    byStore.set(ev.store_id, list);
  }

  const blocks: Array<Record<string, unknown>> = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `RivalSKU  ·  Competitor change alert`,
        emoji: true,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `${events.length} change${events.length === 1 ? "" : "s"} detected  ·  <${appUrl()}/dashboard|Open dashboard>`,
        },
      ],
    },
  ];

  for (const [storeId, storeEvents] of byStore) {
    const store = storeMap.get(storeId);
    const name = store?.name || store?.domain || `Store ${storeId}`;
    const domain = store?.domain || "";
    const lines = storeEvents.slice(0, 12).map((ev) => `• ${eventLine(ev)}`);
    if (storeEvents.length > 12) {
      lines.push(`• _+${storeEvents.length - 12} more_`);
    }
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${name}*  ·  ${domain}\n${lines.join("\n")}`,
      },
    });
  }

  return {
    text: `RivalSKU · ${events.length} competitor change${events.length === 1 ? "" : "s"} detected`,
    blocks,
  };
}

export function buildEmailDigest(
  storeMap: Map<number, Store>,
  events: ChangeEvent[],
): { subject: string; html: string; text: string } {
  const subject = `RivalSKU · ${events.length} competitor change${events.length === 1 ? "" : "s"} detected`;
  const byStore = new Map<number, ChangeEvent[]>();
  for (const ev of events) {
    const list = byStore.get(ev.store_id) || [];
    list.push(ev);
    byStore.set(ev.store_id, list);
  }

  const sectionsHtml: string[] = [];
  const sectionsText: string[] = [];

  for (const [storeId, storeEvents] of byStore) {
    const store = storeMap.get(storeId);
    const name = store?.name || store?.domain || `Store ${storeId}`;
    const domain = store?.domain || "";
    sectionsText.push(`${name}  ·  ${domain}`);
    const items: string[] = [];
    for (const ev of storeEvents) {
      const line = eventLine(ev);
      sectionsText.push(`  ${line}`);
      const href = ev.product_url
        ? `<a href="${escapeHtml(ev.product_url)}" style="color:#0F766E;text-decoration:none;">${escapeHtml(line)}</a>`
        : escapeHtml(line);
      items.push(
        `<tr><td style="padding:8px 0;border-bottom:1px solid #EDE9E0;font-family:ui-monospace,Menlo,monospace;font-size:13px;color:#0B1220;">${href}</td></tr>`,
      );
    }
    sectionsHtml.push(`
      <h2 style="font-family:Georgia,serif;font-size:18px;margin:24px 0 8px;color:#0B1220;">${escapeHtml(name)} <span style="font-weight:normal;color:#64748B;font-family:system-ui,sans-serif;font-size:13px;">${escapeHtml(domain)}</span></h2>
      <table width="100%" cellpadding="0" cellspacing="0">${items.join("")}</table>
    `);
    sectionsText.push("");
  }

  const html = `<!DOCTYPE html>
<html><body style="margin:0;background:#F6F4EF;padding:24px;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #EDE9E0;padding:32px;">
    <p style="margin:0 0 4px;font-family:system-ui,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#0F766E;">RivalSKU</p>
    <h1 style="font-family:Georgia,serif;font-size:24px;margin:0 0 8px;color:#0B1220;">Competitor change digest</h1>
    <p style="font-family:system-ui,sans-serif;font-size:14px;color:#334155;margin:0 0 16px;">${events.length} change${events.length === 1 ? "" : "s"} worth a look. Open the <a href="${appUrl()}/dashboard" style="color:#0F766E;">dashboard</a> for the full diff.</p>
    ${sectionsHtml.join("")}
    <p style="font-family:system-ui,sans-serif;font-size:12px;color:#94A3B8;margin:32px 0 0;">Alerts are sent only for the public storefronts you track. <a href="${appUrl()}/dashboard" style="color:#0F766E;">Adjust alert rules</a> · hello@rivalsku.com</p>
  </div>
</body></html>`;

  return { subject, html, text: `${subject}\n\n${sectionsText.join("\n")}` };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function dispatchAlerts(eventIds: number[]): Promise<{
  considered: number;
  sentSlack: boolean;
  sentEmail: boolean;
  skippedReason?: string;
}> {
  if (eventIds.length === 0) {
    return { considered: 0, sentSlack: false, sentEmail: false };
  }

  const db = getDb();
  const placeholders = eventIds.map(() => "?").join(",");
  const events = db
    .prepare(`SELECT * FROM change_events WHERE id IN (${placeholders})`)
    .all(...eventIds) as ChangeEvent[];

  const settings = getAlertSettings();
  const filtered = events.filter((ev) =>
    shouldInclude(ev, settings.min_price_drop_pct),
  );

  if (filtered.length === 0) {
    console.log(
      "[RivalSKU][alerts] No events met the alert threshold; payloads not sent.",
    );
    return {
      considered: 0,
      sentSlack: false,
      sentEmail: false,
      skippedReason: "Below min price-drop threshold",
    };
  }

  const storeMap = new Map<number, Store>();
  for (const ev of filtered) {
    if (!storeMap.has(ev.store_id)) {
      const store = getStore(ev.store_id);
      if (store) storeMap.set(ev.store_id, store);
    }
  }

  const slackPayload = buildSlackPayload(storeMap, filtered);
  const email = buildEmailDigest(storeMap, filtered);

  console.log(
    "[RivalSKU][alerts] Prepared digest",
    JSON.stringify(
      {
        eventCount: filtered.length,
        stores: [...storeMap.values()].map((s) => s.domain),
        slack: slackPayload,
        email: { subject: email.subject, text: email.text },
      },
      null,
      2,
    ),
  );

  let sentSlack = false;
  let sentEmail = false;
  const hook = slackWebhook(settings);
  const to = alertEmail(settings);
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (hook) {
    try {
      const res = await fetch(hook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackPayload),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.warn(
          `[RivalSKU][alerts] Slack webhook returned HTTP ${res.status}: ${body}`,
        );
      } else {
        sentSlack = true;
        console.log("[RivalSKU][alerts] Slack webhook delivered.");
      }
    } catch (err) {
      console.warn(
        "[RivalSKU][alerts] Slack send failed (payload logged above):",
        err instanceof Error ? err.message : err,
      );
    }
  } else {
    console.log(
      "[RivalSKU][alerts] No Slack webhook configured. Set SLACK_WEBHOOK_URL or save one in Alerts settings.",
    );
  }

  if (to && resendKey) {
    try {
      const from =
        process.env.ALERT_FROM_EMAIL?.trim() ||
        "RivalSKU <hello@rivalsku.com>";
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: email.subject,
          html: email.html,
          text: email.text,
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.warn(
          `[RivalSKU][alerts] Resend returned HTTP ${res.status}: ${body}`,
        );
      } else {
        sentEmail = true;
        console.log("[RivalSKU][alerts] Email digest delivered via Resend.");
      }
    } catch (err) {
      console.warn(
        "[RivalSKU][alerts] Email send failed (payload logged above):",
        err instanceof Error ? err.message : err,
      );
    }
  } else {
    console.log(
      "[RivalSKU][alerts] Email not sent. Save an alert email in settings and set RESEND_API_KEY to enable delivery.",
    );
  }

  if (filtered.length > 0) {
    const ids = filtered.map((e) => e.id);
    const marks = ids.map(() => "?").join(",");
    db.prepare(`UPDATE change_events SET alerted = 1 WHERE id IN (${marks})`).run(
      ...ids,
    );
  }

  return { considered: filtered.length, sentSlack, sentEmail };
}

export async function sendTestAlert(): Promise<{
  sentSlack: boolean;
  sentEmail: boolean;
  message: string;
}> {
  const settings = getAlertSettings();
  const demoStore: Store = {
    id: 0,
    domain: "trailforge.example",
    name: "Trailforge Outfitters",
    vertical: "apparel",
    status: "active",
    last_scanned_at: new Date().toISOString(),
    product_count: 1,
    active_sale_count: 1,
    out_of_stock_count: 0,
    promo_banner: "Weekend Trail Sale — ends Sunday 11:59 p.m. ET",
    created_at: new Date().toISOString(),
  };
  const demoEvents: ChangeEvent[] = [
    {
      id: 0,
      store_id: 0,
      event_type: "PRICE_DROP",
      product_title: "Trail Pant — Slim",
      variant_title: "32",
      old_value: "128.00",
      new_value: "98.00",
      pct_change: -23.4,
      product_url: "https://trailforge.example/products/trail-pant",
      detected_at: new Date().toISOString(),
      alerted: 0,
    },
    {
      id: 0,
      store_id: 0,
      event_type: "PROMO_BANNER_CHANGED",
      product_title: null,
      variant_title: null,
      old_value: null,
      new_value: "Weekend Trail Sale — ends Sunday 11:59 p.m. ET",
      pct_change: null,
      product_url: "https://trailforge.example/",
      detected_at: new Date().toISOString(),
      alerted: 0,
    },
  ];
  const storeMap = new Map<number, Store>([[0, demoStore]]);
  const slackPayload = buildSlackPayload(storeMap, demoEvents);
  const email = buildEmailDigest(storeMap, demoEvents);

  console.log(
    "[RivalSKU][alerts] Test alert payload",
    JSON.stringify({ slack: slackPayload, email }, null, 2),
  );

  let sentSlack = false;
  let sentEmail = false;
  const hook = slackWebhook(settings);
  const to = alertEmail(settings);
  const resendKey = process.env.RESEND_API_KEY?.trim();

  if (hook) {
    const res = await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackPayload),
      signal: AbortSignal.timeout(10000),
    });
    sentSlack = res.ok;
    if (!res.ok) {
      throw new Error(`Slack webhook returned HTTP ${res.status}`);
    }
  }
  if (to && resendKey) {
    const from =
      process.env.ALERT_FROM_EMAIL?.trim() ||
      "RivalSKU <hello@rivalsku.com>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `[Test] ${email.subject}`,
        html: email.html,
        text: email.text,
      }),
      signal: AbortSignal.timeout(10000),
    });
    sentEmail = res.ok;
    if (!res.ok) {
      throw new Error(`Resend returned HTTP ${res.status}`);
    }
  }

  if (!hook && !(to && resendKey)) {
    return {
      sentSlack: false,
      sentEmail: false,
      message:
        "Test payload logged. Add a Slack webhook and/or an alert email + RESEND_API_KEY to deliver a live test.",
    };
  }

  const parts = [];
  if (sentSlack) parts.push("Slack");
  if (sentEmail) parts.push("email");
  return {
    sentSlack,
    sentEmail,
    message: `Test alert sent via ${parts.join(" and ")}.`,
  };
}
