/**
 * Pure formatting helpers. No data imports, so Client Components can use them
 * without pulling the JSON seed data into the browser bundle.
 */

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Deterministic, locale-independent date: "11 Oct 2026". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Not stated";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  "official-government": "Official government",
  "government-agency": "Government agency",
  "company-primary": "Company (primary)",
  "research-report": "Research report",
  news: "News",
  "trade-press": "Trade press",
  "law-firm": "Law firm",
  aggregator: "Aggregator",
};

export const STAGE_LABELS: Record<string, string> = {
  announced: "Announced",
  "mou-signed": "MoU signed",
  launched: "Launched",
  existing: "Existing",
};

export const KIND_LABELS: Record<
  "metric" | "company" | "city-criterion" | "incentive",
  string
> = {
  metric: "Ecosystem metric",
  company: "Company record",
  "city-criterion": "City criterion",
  incentive: "Government incentive",
};
