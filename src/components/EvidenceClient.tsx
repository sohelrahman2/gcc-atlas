"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Search, X } from "lucide-react";
import { KIND_LABELS, SOURCE_TYPE_LABELS, formatDate } from "@/lib/format";
import type { EvidenceRow } from "@/lib/views";
import type { VerificationStatus } from "@/lib/types";
import { StatusBadge, StatusLegend, StatusSeal, STATUS_META } from "./StatusSeal";
import { EmptyState, buttonClass } from "./ui";

const STATUS_FILTERS: VerificationStatus[] = ["verified", "estimated", "unverified", "illustrative"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="mt-0.5 text-[15px] text-ink">{children}</dd>
    </div>
  );
}

function Detail({
  row,
  rows,
  onSelect,
  onClose,
}: {
  row: EvidenceRow;
  rows: EvidenceRow[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const s = row.source;
  const meta = STATUS_META[row.status];
  const corroborating = row.corroboratingIds
    .map((id) => rows.find((r) => r.id === id))
    .filter((r): r is EvidenceRow => Boolean(r));

  return (
    <section
      aria-label={`Evidence ${row.id}`}
      className="rounded-[var(--radius-panel)] border border-line bg-paper"
    >
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <p className="tnum text-xs font-medium text-muted">
            {row.id} · {KIND_LABELS[row.kind]}
          </p>
          <h2 className="mt-0.5 text-lg font-semibold leading-snug">{row.subjectLabel}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close detail"
          className="rounded-md p-1.5 text-muted hover:bg-wash hover:text-ink lg:hidden"
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      <div className="space-y-5 p-5">
        <div>
          <StatusBadge status={row.status} size={14} />
          <p className="mt-2 text-sm text-muted">{meta.description}</p>
          {row.statusNote ? (
            <p className="mt-2 rounded bg-saffron-50 px-3 py-2 text-sm text-saffron-700">
              <span className="font-semibold">Note on this record: </span>
              {row.statusNote}
            </p>
          ) : null}
        </div>

        <div>
          <h3 className="text-sm font-semibold">Claim</h3>
          <p className="mt-1 text-[15px] text-ink">{row.claim}</p>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Supporting evidence</h3>
          <p className="mt-1 text-[15px] text-ink-soft">{row.supportingEvidence}</p>
          <p className="mt-1 text-xs text-muted">A paraphrase of what the source says. Open the source to read it in full.</p>
        </div>

        <div className="rounded-md border border-line bg-canvas p-4">
          <h3 className="text-sm font-semibold">Source</h3>
          <dl className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="text-[13px] text-muted">Title</dt>
              <dd className="mt-0.5">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link break-words text-[15px] font-medium"
                >
                  {s.title}
                  <ExternalLink size={13} aria-hidden className="ml-1 inline align-baseline" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[13px] text-muted">URL</dt>
              <dd className="mt-0.5 break-all text-sm">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="link">
                  {s.url}
                </a>
              </dd>
            </div>
            <Field label="Publisher">{s.publisher}</Field>
            <Field label="Source type">{SOURCE_TYPE_LABELS[s.sourceType]}</Field>
            <Field label="Publication date">
              {formatDate(s.publishedDate)}
              {s.publishedDateNote ? (
                <span className="mt-0.5 block text-[13px] text-muted">{s.publishedDateNote}</span>
              ) : null}
            </Field>
            <Field label="Last verified by Atlas">{formatDate(row.lastVerified)}</Field>
          </dl>
          {s.reliabilityNote ? (
            <p className="mt-3 border-t border-line pt-3 text-sm text-ink-soft">
              <span className="font-semibold">Reliability: </span>
              {s.reliabilityNote}
            </p>
          ) : null}
        </div>

        <div>
          <h3 className="text-sm font-semibold">Corroboration</h3>
          {row.singleSource ? (
            <p className="mt-1 text-sm text-saffron-700">
              Single source. No second source for this claim is recorded.
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink-soft">
              {row.independentSources} sources record this claim.
            </p>
          )}
          {corroborating.length ? (
            <ul className="mt-2 space-y-1.5 text-sm">
              {corroborating.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className="link text-left"
                  >
                    {c.id}: {c.source.publisher}
                  </button>{" "}
                  <span className="text-muted">({STATUS_META[c.status].label.toLowerCase()})</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <p className="border-t border-line pt-4 text-sm">
          <Link href={row.usedIn.href} className="link">
            {row.usedIn.label}
          </Link>
        </p>
      </div>
    </section>
  );
}

export function EvidenceClient({ rows }: { rows: EvidenceRow[] }) {
  const searchParams = useSearchParams();
  const initial = searchParams.get("id");
  const [selectedId, setSelectedId] = useState<string | null>(
    initial && rows.some((r) => r.id === initial) ? initial : null,
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<VerificationStatus | "">("");
  const [kind, setKind] = useState("");
  const [sourceType, setSourceType] = useState("");
  const detailRef = useRef<HTMLDivElement>(null);

  // Captured once at mount: the URL sync below rewrites the query string.
  const [invalidId] = useState<string | null>(
    initial && !rows.some((r) => r.id === initial) ? initial : null,
  );

  useEffect(() => {
    const url = `${window.location.pathname}${selectedId ? `?id=${encodeURIComponent(selectedId)}` : ""}`;
    window.history.replaceState(window.history.state, "", url);
  }, [selectedId]);

  const select = (id: string) => {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      window.setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
    }
  };

  const kinds = useMemo(() => Array.from(new Set(rows.map((r) => r.kind))), [rows]);
  const sourceTypes = useMemo(() => Array.from(new Set(rows.map((r) => r.source.sourceType))), [rows]);
  const counts = useMemo(() => {
    const c: Record<VerificationStatus, number> = { verified: 0, estimated: 0, unverified: 0, illustrative: 0 };
    for (const r of rows) c[r.status] += 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status && r.status !== status) return false;
      if (kind && r.kind !== kind) return false;
      if (sourceType && r.source.sourceType !== sourceType) return false;
      if (q) {
        const hay = `${r.id} ${r.subjectLabel} ${r.claim} ${r.source.publisher} ${r.source.title} ${r.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, query, status, kind, sourceType]);

  const selected = selectedId ? rows.find((r) => r.id === selectedId) : undefined;
  const filtersActive = Boolean(query || status || kind || sourceType);
  const reset = () => {
    setQuery("");
    setStatus("");
    setKind("");
    setSourceType("");
  };

  return (
    <div>
      {invalidId ? (
        <p role="alert" className="mb-5 rounded-md border border-alert-700/30 bg-alert-50 px-4 py-3 text-sm text-alert-700">
          No evidence record has the id &ldquo;{invalidId}&rdquo;. Pick one from the list.
        </p>
      ) : null}

      <details className="mb-6 rounded-[var(--radius-panel)] border border-line bg-paper px-5 py-3">
        <summary className="cursor-pointer text-sm font-medium text-ink">What the four seals mean</summary>
        <div className="pt-4 pb-1">
          <StatusLegend />
        </div>
      </details>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <form
            role="search"
            aria-label="Filter evidence"
            onSubmit={(e) => e.preventDefault()}
            className="rounded-[var(--radius-panel)] border border-line bg-paper p-4"
          >
            <label htmlFor="evidence-search" className="block text-[13px] font-medium text-ink-soft">
              Search records
            </label>
            <div className="relative mt-1">
              <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                id="evidence-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Claim, publisher, tag or EV id"
                className="w-full rounded-md border border-line-strong bg-paper py-2 pl-9 pr-3 text-sm"
              />
            </div>

            <fieldset className="mt-4">
              <legend className="text-[13px] font-medium text-ink-soft">Status</legend>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <button
                  type="button"
                  aria-pressed={status === ""}
                  onClick={() => setStatus("")}
                  className={`rounded-full border px-3 py-1 text-[13px] ${status === "" ? "border-navy-950 bg-navy-950 text-white" : "border-line-strong bg-paper text-ink-soft hover:bg-wash"}`}
                >
                  All ({rows.length})
                </button>
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={status === s}
                    disabled={counts[s] === 0}
                    onClick={() => setStatus(status === s ? "" : s)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] disabled:opacity-45 ${status === s ? "border-navy-950 bg-navy-950 text-white" : "border-line-strong bg-paper text-ink-soft hover:bg-wash"}`}
                  >
                    <StatusSeal status={s} size={12} title={STATUS_META[s].label} />
                    {STATUS_META[s].label} ({counts[s]})
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <label className="flex flex-col gap-1 text-[13px] font-medium text-ink-soft">
                Record type
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value)}
                  className="rounded-md border border-line-strong bg-paper px-3 py-2 text-sm font-normal text-ink"
                >
                  <option value="">All types</option>
                  {kinds.map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-[13px] font-medium text-ink-soft">
                Source type
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="rounded-md border border-line-strong bg-paper px-3 py-2 text-sm font-normal text-ink"
                >
                  <option value="">All sources</option>
                  {sourceTypes.map((t) => (
                    <option key={t} value={t}>
                      {SOURCE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-sm text-ink-soft" role="status" aria-live="polite">
                <span className="tnum font-semibold text-ink">{filtered.length}</span> of {rows.length} records
              </p>
              {filtersActive ? (
                <button type="button" onClick={reset} className={buttonClass("ghost")}>
                  <X size={15} aria-hidden /> Clear
                </button>
              ) : null}
            </div>
          </form>

          <div className="mt-4">
            {filtered.length ? (
              <ul className="max-h-[70vh] divide-y divide-line overflow-y-auto rounded-[var(--radius-panel)] border border-line bg-paper scroll-thin">
                {filtered.map((r) => {
                  const active = r.id === selectedId;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => select(r.id)}
                        aria-current={active ? "true" : undefined}
                        className={`flex w-full gap-3 px-4 py-3 text-left transition-colors ${active ? "bg-teal-50" : "hover:bg-wash"}`}
                      >
                        <span className="mt-1">
                          <StatusSeal status={r.status} size={15} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium leading-snug text-ink">{r.subjectLabel}</span>
                          <span className="mt-0.5 block text-xs text-muted">
                            <span className="tnum">{r.id}</span> · {r.source.publisher.split(" (")[0]} ·{" "}
                            {formatDate(r.source.publishedDate)}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                title="No records match"
                action={
                  <button type="button" onClick={reset} className={buttonClass("primary")}>
                    Clear filters
                  </button>
                }
              >
                Try a different status or search term.
              </EmptyState>
            )}
          </div>
        </div>

        <div ref={detailRef} className="scroll-mt-20 lg:col-span-3">
          <div className="lg:sticky lg:top-6">
            {selected ? (
              <Detail row={selected} rows={rows} onSelect={select} onClose={() => setSelectedId(null)} />
            ) : (
              <div className="rounded-[var(--radius-panel)] border border-dashed border-line-strong bg-paper px-6 py-14 text-center">
                <h2 className="text-base font-semibold">Select a record to inspect it</h2>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                  You will see the claim, the supporting text, the source link, its publication and verification dates,
                  and whether a second source backs it.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
