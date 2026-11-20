import { NextResponse } from "next/server";
import { getAlertSettings, getDb, nowIso } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const settings = getAlertSettings();
  return NextResponse.json({
    settings: {
      ...settings,
      slackConfigured: Boolean(
        settings.slack_webhook_url || process.env.SLACK_WEBHOOK_URL,
      ),
      emailDeliveryConfigured: Boolean(process.env.RESEND_API_KEY),
    },
  });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    email?: string | null;
    slack_webhook_url?: string | null;
    digest_frequency?: string;
    min_price_drop_pct?: number | string;
  };
  const current = getAlertSettings();
  const email =
    body.email === undefined ? current.email : body.email?.trim() || null;
  const slack =
    body.slack_webhook_url === undefined
      ? current.slack_webhook_url
      : body.slack_webhook_url?.trim() || null;
  const digest = (
    body.digest_frequency ||
    current.digest_frequency ||
    "immediate"
  ).toLowerCase();
  const allowed = new Set(["immediate", "daily", "weekly"]);
  if (!allowed.has(digest)) {
    return NextResponse.json(
      { error: "digest_frequency must be immediate, daily, or weekly." },
      { status: 400 },
    );
  }
  const min =
    body.min_price_drop_pct === undefined
      ? current.min_price_drop_pct
      : Number(body.min_price_drop_pct);
  if (!Number.isFinite(min) || min < 0 || min > 100) {
    return NextResponse.json(
      { error: "min_price_drop_pct must be between 0 and 100." },
      { status: 400 },
    );
  }

  getDb()
    .prepare(
      `UPDATE alert_settings
       SET email = ?, slack_webhook_url = ?, digest_frequency = ?, min_price_drop_pct = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(email, slack, digest, min, nowIso(), current.id);

  return NextResponse.json({ settings: getAlertSettings(), ok: true });
}
