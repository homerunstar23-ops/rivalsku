export function formatMoney(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}

export function eventLabel(type: string): string {
  switch (type) {
    case "PRICE_DROP":
      return "Price drop";
    case "PRICE_INCREASE":
      return "Price increase";
    case "SALE_STARTED":
      return "Sale started";
    case "SALE_ENDED":
      return "Sale ended";
    case "NEW_PRODUCT":
      return "New product";
    case "OUT_OF_STOCK":
      return "Out of stock";
    case "BACK_IN_STOCK":
      return "Back in stock";
    case "PROMO_BANNER_CHANGED":
      return "Promo banner";
    default:
      return type;
  }
}
