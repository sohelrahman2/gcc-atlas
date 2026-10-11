import Link from "next/link";
import {
  DATA_AS_OF,
  STAGE_LABELS,
  formatDate,
  getCompanyPrimarySource,
  getCoverageStats,
  getEvidenceByIds,
  getMetrics,
  getRecentCompanies,
  getSource,
} from "@/lib/data";
import type { Metric, Source, VerificationStatus } from "@/lib/types";
import { STATUS_ORDER } from "@/lib/types";
import { ShareBarChart } from "@/components/Charts";
import { StatusBadge, StatusLegend, StatusSeal, STATUS_META } from "@/components/StatusSeal";
import { PageHeader, Panel, SourceLink } from "@/components/ui";

function sourcesFor(evidenceIds: string[]): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const e of getEvidenceByIds(evidenceIds)) {
    if (seen.has(e.sourceId)) continue;
    seen.add(e.sourceId);
    const s = getSource(e.sourceId);
    if (s) out.push(s);
  }
  return out;
}

function LedgerRow({ metric }: { metric: Metric }) {
  const sources = sourcesFor(metric.evidenceIds);
  return (
    <tr className="border-t border-line align-top">
      <th scope="row" className="py-3.5 pr-4 text-left font-normal">
        <p className="font-medium text-ink">{metric.label}</p>
        {metric.note ? (
          <p className="mt-0.5 max-w-xs text-[13px] text-muted">{metric.note}</p>
        ) : null}
      </th>
      <td className="tnum whitespace-nowrap py-3.5 pr-4 font-display text-[1.6rem] font-semibold leading-none text-ink">
        {metric.value}
      </td>
      <td className="whitespace-nowrap py-3.5 pr-4 text-sm text-muted">
        {metric.period}
      </td>
      <td className="py-3.5 pr-4 text-sm">
        <ul className="space-y-0.5">
          {sources.map((s) => (
            <li key={s.id}>
              <SourceLink source={s} />
            </li>
          ))}
        </ul>
        <Link
          href={`/evidence?id=${metric.evidenceIds[0]}`}
          className="link mt-1 inline-block text-[13px]"
        >
          Inspect evidence
        </Link>
      </td>
      <td className="py-3.5 text-sm">
        <StatusBadge status={metric.status} />
      </td>
    </tr>
  );
}

export default function DashboardPage() {
  const metrics = getMetrics();
  const recent = getRecentCompanies(6);
  const coverage = getCoverageStats();
  const cityShareSources = sourcesFor(metrics.cityShare.evidenceIds);
  const maturitySources = sourcesFor(metrics.maturity.evidenceIds);

  const total = coverage.evidenceTotal;

  return (
    <>
      <PageHeader
        title="India GCC ecosystem"
        aside={<span>Snapshot of {formatDate(DATA_AS_OF)}</span>}
      >
        India had 2,117 GCCs employing 2.36 million people in FY2026, according
        to the NASSCOM–Zinnov landscape report. Every figure below carries its
        source and a verification seal.
      </PageHeader>

      <div className="space-y-6">
        <Panel
          title="Ecosystem ledger"
          description="Headline metrics from the NASSCOM–Zinnov FY2026 report, checked against a second source where one exists."
        >
          <div className="-mx-5 overflow-x-auto px-5 scroll-thin">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="text-left text-[13px] text-muted">
                  <th scope="col" className="pb-2 pr-4 font-medium">Metric</th>
                  <th scope="col" className="pb-2 pr-4 font-medium">Value</th>
                  <th scope="col" className="pb-2 pr-4 font-medium">Period</th>
                  <th scope="col" className="pb-2 pr-4 font-medium">Source</th>
                  <th scope="col" className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {metrics.headline.map((m) => (
                  <LedgerRow key={m.id} metric={m} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 border-t border-line pt-4 text-sm text-muted">
            By parent type, Zinnov counts{" "}
            {metrics.segmentation.map((s, i) => (
              <span key={s.id}>
                <span className="tnum font-medium text-ink">{s.value}</span>{" "}
                {s.label.replace(" GCCs", "").toLowerCase().replace("forbes global 2000", "Forbes Global 2000")}
                {i < metrics.segmentation.length - 2 ? ", " : i === metrics.segmentation.length - 2 ? " and " : ""}
              </span>
            ))}{" "}
            GCCs. These groups do not sum to the total.
          </p>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-5">
          <Panel
            className="lg:col-span-3"
            title={metrics.cityShare.title}
            description={metrics.cityShare.subtitle}
            action={<StatusBadge status={metrics.cityShare.status} />}
          >
            <ShareBarChart series={metrics.cityShare} height={270} labelWidth={150} />
            <p className="mt-3 text-sm text-muted">{metrics.cityShare.caveat}</p>
            <p className="mt-2 text-sm">
              Source:{" "}
              {cityShareSources.map((s) => (
                <SourceLink key={s.id} source={s} />
              ))}
              . {" "}
              <Link href={`/evidence?id=${metrics.cityShare.evidenceIds[0]}`} className="link">
                Inspect evidence
              </Link>
            </p>
          </Panel>

          <Panel
            className="lg:col-span-2"
            title={metrics.maturity.title}
            description={metrics.maturity.subtitle}
            action={<StatusBadge status={metrics.maturity.status} />}
          >
            <ShareBarChart series={metrics.maturity} height={220} labelWidth={130} />
            <p className="mt-3 text-sm text-muted">{metrics.maturity.caveat}</p>
            <p className="mt-2 text-sm">
              Source:{" "}
              {maturitySources.map((s) => (
                <SourceLink key={s.id} source={s} />
              ))}
              . {" "}
              <Link href={`/evidence?id=${metrics.maturity.evidenceIds[0]}`} className="link">
                Inspect evidence
              </Link>
            </p>
          </Panel>
        </div>

        <Panel
          title="Recent company activity"
          description="Newest source dates first. These are announcements and reports from the seed set, not a live feed."
          action={
            <Link href="/explorer" className={"link text-sm"}>
              Open GCC Explorer
            </Link>
          }
        >
          <ul className="-my-2 divide-y divide-line">
            {recent.map((c) => {
              const src = getCompanyPrimarySource(c);
              const city = c.indiaLocations.find((l) => l.stage !== "existing") ?? c.indiaLocations[0];
              return (
                <li
                  key={c.id}
                  className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:gap-6"
                >
                  <span className="tnum w-24 shrink-0 text-sm text-muted">
                    {formatDate(c.recordDate)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/explorer/${c.id}`} className="link font-medium">
                      {c.name}
                    </Link>
                    <span className="text-ink-soft">
                      {" "}
                      in {city.city}: {STAGE_LABELS[c.stage].toLowerCase()}
                    </span>
                    {c.headcount ? (
                      <span className="text-muted">. {c.headcount}.</span>
                    ) : null}
                  </div>
                  {src ? (
                    <span className="shrink-0 text-sm">
                      <SourceLink source={src} />
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel
          title="Data coverage and verification"
          description="What the seed set contains, how sure we are, and what is still missing."
        >
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-sm text-ink-soft">
                <span className="tnum font-semibold text-ink">{total}</span>{" "}
                evidence records from{" "}
                <span className="tnum font-semibold text-ink">{coverage.sourcesTotal}</span>{" "}
                sources, last verified {formatDate(coverage.lastVerified)}.{" "}
                <span className="tnum font-semibold text-ink">{coverage.singleSourceClaims}</span>{" "}
                of {coverage.totalClaims} claims rest on a single source.
              </p>

              <div
                className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-wash"
                role="img"
                aria-label={STATUS_ORDER.map((s) => `${coverage.byStatus[s as VerificationStatus]} ${s}`).join(", ")}
              >
                {STATUS_ORDER.map((s) => {
                  const n = coverage.byStatus[s];
                  if (!n) return null;
                  const color: Record<VerificationStatus, string> = {
                    verified: "bg-teal-700",
                    estimated: "bg-saffron-500",
                    unverified: "bg-navy-300",
                    illustrative: "bg-navy-700",
                  };
                  return (
                    <div
                      key={s}
                      className={`${color[s]} border-r border-paper last:border-r-0`}
                      style={{ width: `${(n / total) * 100}%` }}
                    />
                  );
                })}
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                {STATUS_ORDER.map((s) => (
                  <li key={s} className="flex items-center gap-2">
                    <StatusSeal status={s} size={14} />
                    <span className="text-ink-soft">{STATUS_META[s].label}</span>
                    <span className="tnum ml-auto font-medium text-ink">
                      {coverage.byStatus[s]}
                    </span>
                  </li>
                ))}
              </ul>

              <h3 className="mt-6 text-sm font-semibold">Company records by city</h3>
              <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
                {Object.entries(coverage.companiesByCity)
                  .sort((a, b) => b[1] - a[1])
                  .map(([city, n]) => (
                    <li key={city}>
                      <Link href={`/explorer?city=${encodeURIComponent(city)}`} className="link no-underline hover:underline">
                        {city}
                      </Link>{" "}
                      <span className="tnum font-medium text-ink">{n}</span>
                    </li>
                  ))}
              </ul>

              <h3 className="mt-6 text-sm font-semibold">What the seals mean</h3>
              <div className="mt-2">
                <StatusLegend compact />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold">Known gaps</h3>
              <ul className="mt-2 divide-y divide-line">
                {coverage.gaps.map((g) => (
                  <li key={g.id} className="py-3 first:pt-1">
                    <p className="text-sm font-medium text-ink">{g.title}</p>
                    <p className="mt-0.5 text-sm text-muted">{g.detail}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
