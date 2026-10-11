"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MapPin, Search, X } from "lucide-react";
import { formatDate } from "@/lib/format";
import type { ExplorerData, ExplorerRow } from "@/lib/views";
import { StatusBadge } from "./StatusSeal";
import { EmptyState, SourceLink, buttonClass } from "./ui";

type Sort = "newest" | "oldest" | "name";

interface Filters {
  q: string;
  city: string;
  sector: string;
  fn: string;
  stage: string;
  sort: Sort;
}

const DEFAULTS: Filters = { q: "", city: "", sector: "", fn: "", stage: "", sort: "newest" };

function readFilters(params: URLSearchParams, data: ExplorerData): Filters {
  const pick = (key: string, allowed: string[]) => {
    const v = params.get(key) ?? "";
    return allowed.includes(v) ? v : "";
  };
  const sort = params.get("sort");
  return {
    q: (params.get("q") ?? "").slice(0, 80),
    city: pick("city", data.cities),
    sector: pick("sector", data.sectors),
    fn: pick("fn", data.functions),
    stage: pick("stage", data.stages.map((s) => s.value)),
    sort: sort === "oldest" || sort === "name" ? sort : "newest",
  };
}

function applyFilters(rows: ExplorerRow[], f: Filters): ExplorerRow[] {
  const q = f.q.trim().toLowerCase();
  const out = rows.filter((r) => {
    if (q) {
      const hay = `${r.name} ${r.parent}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.city && !r.locations.some((l) => l.city === f.city)) return false;
    if (f.sector && r.sector !== f.sector) return false;
    if (f.fn && !r.functions.includes(f.fn)) return false;
    if (f.stage && r.stage !== f.stage) return false;
    return true;
  });
  out.sort((a, b) => {
    if (f.sort === "name") return a.name.localeCompare(b.name);
    const d = a.recordDate.localeCompare(b.recordDate);
    return f.sort === "oldest" ? d : -d;
  });
  return out;
}

function Select({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  allLabel: string;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[13px] font-medium text-ink-soft">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-line-strong bg-paper px-3 py-2 text-sm font-normal text-ink"
      >
        <option value="">{allLabel}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function CompanyCard({ row }: { row: ExplorerRow }) {
  return (
    <li className="rounded-[var(--radius-panel)] border border-line bg-paper p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold leading-snug">
            <Link href={`/explorer/${row.id}`} className="link no-underline hover:underline">
              {row.name}
            </Link>
          </h3>
          <p className="text-sm text-muted">
            {row.parent !== row.name ? `Parent: ${row.parent}. ` : ""}
            {row.sector}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-navy-950 px-2.5 py-0.5 text-xs font-medium text-white">
            {row.stageLabel}
          </span>
          <StatusBadge status={row.status} />
        </div>
      </div>

      <p className="mt-3 text-[15px] text-ink-soft">{row.summary}</p>

      <ul className="mt-3 flex flex-wrap gap-2" aria-label="India locations">
        {row.locations.map((l) => (
          <li
            key={`${l.city}-${l.stage}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-wash px-2.5 py-1 text-[13px] text-ink-soft"
          >
            <MapPin size={13} aria-hidden className="text-teal-700" />
            {l.city}
            <span className="text-muted">({l.stageLabel.toLowerCase()})</span>
          </li>
        ))}
      </ul>

      <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Business functions</dt>
          <dd className="text-ink-soft">
            {row.functions.length ? row.functions.join(", ") : row.functionsNote ?? "Not stated in source"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Headcount reported</dt>
          <dd className="text-ink-soft">{row.headcount ?? "Not stated in source"}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-line pt-3 text-sm">
        <span className="text-muted">
          Source date {formatDate(row.source?.publishedDate ?? row.recordDate)}
          {row.source ? (
            <>
              {" "}
              ·{" "}
              <SourceLink source={row.source} />
            </>
          ) : null}
        </span>
        <Link href={`/explorer/${row.id}`} className="link">
          Open profile and evidence
        </Link>
      </div>
    </li>
  );
}

export function ExplorerClient({ data }: { data: ExplorerData }) {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<Filters>(() => readFilters(searchParams, data));

  // Mirror filters into the URL so a filtered view can be shared or reloaded.
  useEffect(() => {
    const p = new URLSearchParams();
    (Object.keys(DEFAULTS) as (keyof Filters)[]).forEach((k) => {
      if (filters[k] && filters[k] !== DEFAULTS[k]) p.set(k, filters[k]);
    });
    const qs = p.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    window.history.replaceState(window.history.state, "", url);
  }, [filters]);

  const results = useMemo(() => applyFilters(data.rows, filters), [data.rows, filters]);
  const active = (Object.keys(DEFAULTS) as (keyof Filters)[]).filter(
    (k) => k !== "sort" && filters[k] !== DEFAULTS[k],
  );
  const noFunctions = data.rows.filter((r) => r.functions.length === 0).length;
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setFilters((f) => ({ ...f, [k]: v }));

  return (
    <div>
      <form
        role="search"
        aria-label="Filter GCC records"
        onSubmit={(e) => e.preventDefault()}
        className="rounded-[var(--radius-panel)] border border-line bg-paper p-4"
      >
        <label className="block text-[13px] font-medium text-ink-soft" htmlFor="company-search">
          Search by company name
        </label>
        <div className="relative mt-1">
          <Search
            size={16}
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            id="company-search"
            type="search"
            value={filters.q}
            maxLength={80}
            onChange={(e) => set("q", e.target.value)}
            placeholder="e.g. Vanguard, Mizuho, Starbucks"
            className="w-full rounded-md border border-line-strong bg-paper py-2 pl-9 pr-3 text-sm"
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select
            label="City"
            value={filters.city}
            onChange={(v) => set("city", v)}
            allLabel="All cities"
            options={data.cities.map((c) => ({ value: c, label: c }))}
          />
          <Select
            label="Industry"
            value={filters.sector}
            onChange={(v) => set("sector", v)}
            allLabel="All industries"
            options={data.sectors.map((c) => ({ value: c, label: c }))}
          />
          <Select
            label="Business function"
            value={filters.fn}
            onChange={(v) => set("fn", v)}
            allLabel="All functions"
            options={data.functions.map((c) => ({ value: c, label: c }))}
          />
          <Select
            label="Stage"
            value={filters.stage}
            onChange={(v) => set("stage", v)}
            allLabel="Any stage"
            options={data.stages}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft" role="status" aria-live="polite">
            Showing <span className="tnum font-semibold text-ink">{results.length}</span> of{" "}
            <span className="tnum">{data.rows.length}</span> records
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-ink-soft">
              Sort
              <select
                value={filters.sort}
                onChange={(e) => set("sort", e.target.value as Sort)}
                className="rounded-md border border-line-strong bg-paper px-2.5 py-1.5 text-sm"
              >
                <option value="newest">Newest source first</option>
                <option value="oldest">Oldest source first</option>
                <option value="name">Name A to Z</option>
              </select>
            </label>
            {active.length ? (
              <button
                type="button"
                onClick={() => setFilters(DEFAULTS)}
                className={buttonClass("ghost")}
              >
                <X size={15} aria-hidden /> Clear filters
              </button>
            ) : null}
          </div>
        </div>
        {filters.fn ? (
          <p className="mt-3 text-[13px] text-muted">
            {noFunctions} records do not state their business functions in the source and cannot match a function filter.
          </p>
        ) : null}
      </form>

      <div className="mt-6">
        {results.length ? (
          <ul className="space-y-4">
            {results.map((r) => (
              <CompanyCard key={r.id} row={r} />
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No records match these filters"
            action={
              <button type="button" onClick={() => setFilters(DEFAULTS)} className={buttonClass("primary")}>
                Clear all filters
              </button>
            }
          >
            The seed set holds {data.rows.length} sourced records, a curated sample rather than every GCC in India. A
            missing company does not mean it has no GCC.
          </EmptyState>
        )}
      </div>
    </div>
  );
}
