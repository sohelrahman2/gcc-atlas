"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Bookmark, BookmarkCheck, ClipboardCopy, Info, Trash2 } from "lucide-react";
import { useShortlist } from "@/lib/shortlist";
import { formatDate, hostname } from "@/lib/format";
import type { CompareData } from "@/lib/views";
import type { City, CityId, CriterionCell, CriterionId, VerificationStatus } from "@/lib/types";
import { StatusBadge, STATUS_META } from "./StatusSeal";
import { Panel, buttonClass } from "./ui";

function ToggleChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
        pressed
          ? "border-teal-700 bg-teal-700 text-white"
          : "border-line-strong bg-paper text-ink-soft hover:bg-wash"
      }`}
    >
      {children}
    </button>
  );
}

function Availability({ availability }: { availability: CriterionCell["availability"] }) {
  return availability === "unavailable" ? (
    <span className="inline-flex items-center rounded-full border border-dashed border-line-strong bg-wash px-2 py-0.5 text-xs font-semibold text-ink-soft">
      Data unavailable
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full bg-saffron-50 px-2 py-0.5 text-xs font-semibold text-saffron-700 ring-1 ring-inset ring-saffron-100">
      Partial data
    </span>
  );
}

function Cell({
  city,
  cell,
  refs,
}: {
  city: City;
  cell: CriterionCell;
  refs: CompareData["refs"];
}) {
  const [showAll, setShowAll] = useState(false);
  const limit = 3;
  const shown = showAll ? cell.datapoints : cell.datapoints.slice(0, limit);

  return (
    <div
      className={`flex h-full flex-col rounded-md border p-4 ${
        cell.availability === "unavailable"
          ? "border-dashed border-line-strong bg-wash/60"
          : "border-line bg-paper"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-display text-base font-semibold">{city.name}</h4>
        <Availability availability={cell.availability} />
      </div>

      {cell.availability === "unavailable" ? (
        <p className="mt-3 font-display text-lg font-semibold text-ink-soft">Data unavailable</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {shown.map((dp) => {
            const ref = refs[dp.evidenceId];
            return (
              <li key={`${dp.label}-${dp.evidenceId}`} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                <p className="text-[13px] text-muted">
                  {dp.label}
                  {dp.period ? ` · ${dp.period}` : ""}
                </p>
                <p className="mt-0.5 text-[15px] font-medium text-ink">{dp.value}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <StatusBadge status={dp.status} size={12} />
                  {ref ? (
                    <a
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link"
                      aria-label={`Source: ${ref.sourceTitle} (opens in a new tab)`}
                    >
                      {hostname(ref.url)}
                    </a>
                  ) : null}
                  <Link href={`/evidence?id=${dp.evidenceId}`} className="link">
                    Inspect {dp.evidenceId}
                  </Link>
                </div>
                {ref ? (
                  <p className="mt-1 text-xs text-muted">Source date {formatDate(ref.publishedDate)}</p>
                ) : null}
                {dp.note ? <p className="mt-1 text-xs text-muted">{dp.note}</p> : null}
              </li>
            );
          })}
        </ul>
      )}

      {cell.datapoints.length > limit ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="link mt-3 self-start text-sm"
        >
          {showAll ? "Show fewer" : `Show ${cell.datapoints.length - limit} more`}
        </button>
      ) : null}

      <div className="mt-auto pt-4">
        <p className="text-[13px] text-ink-soft">
          <span className="font-semibold">{cell.availability === "unavailable" ? "Why: " : "What is missing: "}</span>
          {cell.gapNote}
        </p>
        <details className="mt-2 text-[13px]">
          <summary className="cursor-pointer font-medium text-teal-700">What needs validation</summary>
          <p className="mt-1 text-ink-soft">{cell.validationNeeded}</p>
        </details>
      </div>
    </div>
  );
}

function cityStats(city: City) {
  const cells = Object.values(city.criteria);
  const statuses: Record<VerificationStatus, number> = {
    verified: 0,
    estimated: 0,
    unverified: 0,
    illustrative: 0,
  };
  for (const c of cells) for (const dp of c.datapoints) statuses[dp.status] += 1;
  return {
    partial: cells.filter((c) => c.availability === "partial").length,
    unavailable: cells.filter((c) => c.availability === "unavailable").length,
    statuses,
    datapoints: cells.reduce((n, c) => n + c.datapoints.length, 0),
  };
}

function buildSummary(data: CompareData, ids: CityId[], asOf: string): string {
  const lines: string[] = [`GCC Atlas shortlist (data snapshot ${asOf})`, ""];
  for (const id of ids) {
    const city = data.cities.find((c) => c.id === id);
    if (!city) continue;
    lines.push(`${city.name}, ${city.state}`);
    for (const crit of data.criteria) {
      const cell = city.criteria[crit.id];
      lines.push(`  ${crit.label}: ${cell.availability === "unavailable" ? "Data unavailable" : "partial data"}`);
      for (const dp of cell.datapoints) {
        const ref = data.refs[dp.evidenceId];
        lines.push(
          `    - ${dp.label}: ${dp.value} [${dp.status}]${ref ? ` (${ref.url})` : ""}`,
        );
      }
      lines.push(`    Needs validation: ${cell.validationNeeded}`);
    }
    lines.push("");
  }
  lines.push("Statuses: verified, estimated, unverified. Atlas does not rank cities.");
  return lines.join("\n");
}

export function CompareClient({ data, asOf }: { data: CompareData; asOf: string }) {
  const [cityIds, setCityIds] = useState<CityId[]>(data.cities.map((c) => c.id));
  const [criteriaIds, setCriteriaIds] = useState<CriterionId[]>(data.criteria.map((c) => c.id));
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const shortlist = useShortlist();

  const selectedCities = useMemo(
    () => data.cities.filter((c) => cityIds.includes(c.id)),
    [data.cities, cityIds],
  );
  const selectedCriteria = useMemo(
    () => data.criteria.filter((c) => criteriaIds.includes(c.id)),
    [data.criteria, criteriaIds],
  );
  const saved = useMemo(
    () => data.cities.filter((c) => shortlist.ids.includes(c.id)),
    [data.cities, shortlist.ids],
  );

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const gridCols =
    selectedCities.length >= 4
      ? "sm:grid-cols-2 xl:grid-cols-4"
      : selectedCities.length === 3
        ? "md:grid-cols-3"
        : selectedCities.length === 2
          ? "sm:grid-cols-2"
          : "";

  async function copySummary() {
    const text = buildSummary(data, shortlist.ids, asOf);
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 2500);
  }

  return (
    <div className="space-y-6">
      <div
        role="note"
        className="flex gap-3 rounded-[var(--radius-panel)] border border-saffron-100 bg-saffron-50 p-4 text-sm text-ink-soft"
      >
        <Info size={18} aria-hidden className="mt-0.5 shrink-0 text-saffron-700" />
        <p>
          <span className="font-semibold text-ink">Atlas does not rank these cities.</span> Where a comparable, citable
          figure does not exist the cell says <em>Data unavailable</em> and names what to validate. Most figures here are
          estimated or unverified; check the seal on each datapoint.
        </p>
      </div>

      <Panel title="Choose what to compare">
        <fieldset>
          <legend className="text-[13px] font-medium text-ink-soft">Cities</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.cities.map((c) => (
              <ToggleChip key={c.id} pressed={cityIds.includes(c.id)} onClick={() => setCityIds((l) => toggle(l, c.id))}>
                {c.name}
              </ToggleChip>
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-5">
          <legend className="text-[13px] font-medium text-ink-soft">Criteria</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {data.criteria.map((c) => (
              <ToggleChip
                key={c.id}
                pressed={criteriaIds.includes(c.id)}
                onClick={() => setCriteriaIds((l) => toggle(l, c.id))}
              >
                {c.label}
              </ToggleChip>
            ))}
          </div>
        </fieldset>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <p className="text-sm text-ink-soft" role="status" aria-live="polite">
            Comparing <span className="tnum font-semibold text-ink">{selectedCities.length}</span>{" "}
            {selectedCities.length === 1 ? "city" : "cities"} on{" "}
            <span className="tnum font-semibold text-ink">{selectedCriteria.length}</span>{" "}
            {selectedCriteria.length === 1 ? "criterion" : "criteria"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={buttonClass("ghost")}
              onClick={() => setCriteriaIds(data.criteria.map((c) => c.id))}
            >
              All criteria
            </button>
            <button
              type="button"
              className={buttonClass("ghost")}
              onClick={() => {
                setCityIds(data.cities.map((c) => c.id));
                setCriteriaIds(data.criteria.map((c) => c.id));
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </Panel>

      <Panel
        title={`Your shortlist (${saved.length})`}
        description="Saved in this browser only. Nothing is sent to a server."
        action={
          saved.length ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={buttonClass("secondary")} onClick={copySummary}>
                <ClipboardCopy size={15} aria-hidden />
                {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy summary"}
              </button>
              <button type="button" className={buttonClass("ghost")} onClick={shortlist.clear}>
                <Trash2 size={15} aria-hidden /> Clear
              </button>
            </div>
          ) : null
        }
      >
        {saved.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {saved.map((c) => {
              const s = cityStats(c);
              return (
                <li key={c.id} className="rounded-md border border-line bg-canvas p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display font-semibold">{c.name}</p>
                      <p className="text-[13px] text-muted">{c.state}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => shortlist.remove(c.id)}
                      className="rounded p-1 text-muted hover:bg-wash hover:text-ink"
                      aria-label={`Remove ${c.name} from shortlist`}
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </div>
                  <p className="mt-2 text-[13px] text-ink-soft">
                    {s.datapoints} datapoints: {s.statuses.verified} verified, {s.statuses.estimated} estimated,{" "}
                    {s.statuses.unverified} unverified. {s.unavailable} of {data.criteria.length} criteria have no usable
                    data.
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted">
            No cities saved yet. Use <span className="font-medium text-ink-soft">Save to shortlist</span> on a city
            below to keep it here.
          </p>
        )}
      </Panel>

      {selectedCities.length === 0 || selectedCriteria.length === 0 ? (
        <div role="status" className="rounded-[var(--radius-panel)] border border-dashed border-line-strong bg-paper px-6 py-10 text-center">
          <h3 className="font-semibold">Nothing selected</h3>
          <p className="mt-1 text-sm text-muted">Choose at least one city and one criterion to see the comparison.</p>
        </div>
      ) : (
        <>
          <div className={`grid gap-4 ${gridCols}`} aria-label="Selected cities">
            {selectedCities.map((c) => {
              const s = cityStats(c);
              const isSaved = shortlist.has(c.id);
              return (
                <div key={c.id} className="rounded-[var(--radius-panel)] border border-line bg-paper p-4">
                  <p className="font-display text-lg font-semibold">{c.name}</p>
                  <p className="text-[13px] text-muted">{c.state}</p>
                  <p className="mt-2 text-[13px] text-ink-soft">
                    {s.partial} criteria with partial data, {s.unavailable} unavailable.
                  </p>
                  <button
                    type="button"
                    aria-pressed={isSaved}
                    onClick={() => shortlist.toggle(c.id)}
                    className={`mt-3 w-full ${buttonClass(isSaved ? "primary" : "secondary")}`}
                  >
                    {isSaved ? <BookmarkCheck size={16} aria-hidden /> : <Bookmark size={16} aria-hidden />}
                    {isSaved ? "Saved to shortlist" : "Save to shortlist"}
                  </button>
                </div>
              );
            })}
          </div>

          {selectedCriteria.map((crit) => (
            <Panel key={crit.id} title={crit.label} description={crit.description} id={`criterion-${crit.id}`}>
              <div className={`grid gap-4 ${gridCols}`}>
                {selectedCities.map((c) => (
                  <Cell key={c.id} city={c} cell={c.criteria[crit.id]} refs={data.refs} />
                ))}
              </div>
            </Panel>
          ))}
        </>
      )}

      <p className="text-[13px] text-muted">
        Seals: {Object.values(STATUS_META).map((m) => m.label).join(", ")}. See the{" "}
        <Link href="/evidence" className="link">
          Evidence Inspector
        </Link>{" "}
        for each record&apos;s source, dates and supporting text.
      </p>
    </div>
  );
}
