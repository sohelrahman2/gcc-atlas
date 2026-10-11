import type { VerificationStatus } from "@/lib/types";

/**
 * The provenance seal: Atlas's signature element. Status is encoded in shape
 * as well as colour, so it stays legible without relying on colour alone.
 *
 *   verified      solid disc with a check
 *   estimated     ring, half filled
 *   unverified    hollow ring with a question mark
 *   illustrative  dashed ring
 */
export const STATUS_META: Record<
  VerificationStatus,
  { label: string; short: string; description: string; text: string; bg: string; ring: string }
> = {
  verified: {
    label: "Verified",
    short: "Checked against the cited source",
    description:
      "Checked directly against the cited page on the last-verified date. The source is a primary publisher (company, government, report author) or an established news or trade outlet. A single-source flag shows when only one source backs it.",
    text: "text-teal-800",
    bg: "bg-teal-50",
    ring: "ring-teal-200",
  },
  estimated: {
    label: "Estimated",
    short: "Secondhand or derived figure",
    description:
      "An analyst or market figure relayed secondhand, or a value derived by arithmetic. Not traced to the original publication.",
    text: "text-saffron-700",
    bg: "bg-saffron-50",
    ring: "ring-saffron-100",
  },
  unverified: {
    label: "Unverified",
    short: "Lead, not yet a fact",
    description:
      "Found in a credible-looking source but not validated against official or primary text. Treat it as a lead to confirm, not a fact.",
    text: "text-ink-soft",
    bg: "bg-wash",
    ring: "ring-line-strong",
  },
  illustrative: {
    label: "Illustrative",
    short: "Placeholder, not real data",
    description:
      "A placeholder or example that is not real data. No illustrative records ship in this seed set; the label exists so any future example is unmistakable.",
    text: "text-navy-700",
    bg: "bg-canvas",
    ring: "ring-navy-200",
  },
};

export function StatusSeal({
  status,
  size = 14,
  title,
}: {
  status: VerificationStatus;
  size?: number;
  title?: string;
}) {
  const label = title ?? STATUS_META[status].label;
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    role: "img" as const,
    "aria-label": label,
    className: "shrink-0",
  };

  if (status === "verified") {
    return (
      <svg {...common}>
        <title>{label}</title>
        <circle cx="8" cy="8" r="8" fill="var(--color-teal-700)" />
        <path
          d="M4.6 8.3l2.2 2.2 4.6-4.9"
          fill="none"
          stroke="#fff"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (status === "estimated") {
    return (
      <svg {...common}>
        <title>{label}</title>
        <circle
          cx="8"
          cy="8"
          r="6.9"
          fill="none"
          stroke="var(--color-saffron-500)"
          strokeWidth="1.6"
        />
        <path d="M8 1.1a6.9 6.9 0 0 0 0 13.8z" fill="var(--color-saffron-500)" />
      </svg>
    );
  }

  if (status === "unverified") {
    return (
      <svg {...common}>
        <title>{label}</title>
        <circle
          cx="8"
          cy="8"
          r="6.9"
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth="1.6"
        />
        <path
          d="M6.2 6.4a1.9 1.9 0 1 1 2.9 1.6c-.7.4-1.1.8-1.1 1.6"
          fill="none"
          stroke="var(--color-muted)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="8" cy="11.7" r="0.9" fill="var(--color-muted)" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <title>{label}</title>
      <circle
        cx="8"
        cy="8"
        r="6.9"
        fill="none"
        stroke="var(--color-navy-700)"
        strokeWidth="1.6"
        strokeDasharray="2.6 2.4"
      />
    </svg>
  );
}

export function StatusBadge({
  status,
  size = 13,
  className = "",
}: {
  status: VerificationStatus;
  size?: number;
  className?: string;
}) {
  const m = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${m.text} ${m.bg} ${m.ring} ${className}`}
    >
      <StatusSeal status={status} size={size} title={`${m.label}: ${m.short}`} />
      {m.label}
    </span>
  );
}

export function StatusLegend({ compact = false }: { compact?: boolean }) {
  const order: VerificationStatus[] = [
    "verified",
    "estimated",
    "unverified",
    "illustrative",
  ];
  return (
    <dl
      className={
        compact
          ? "grid gap-x-6 gap-y-2 sm:grid-cols-2"
          : "grid gap-4 sm:grid-cols-2"
      }
    >
      {order.map((s) => (
        <div key={s} className="flex gap-3">
          <dt className="pt-0.5">
            <StatusSeal status={s} size={16} />
          </dt>
          <dd className="min-w-0">
            <p className="text-sm font-semibold text-ink">
              {STATUS_META[s].label}
            </p>
            <p className="text-sm text-muted">
              {compact ? STATUS_META[s].short : STATUS_META[s].description}
            </p>
          </dd>
        </div>
      ))}
    </dl>
  );
}
