import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import {
  STAGE_LABELS,
  SOURCE_TYPE_LABELS,
  formatDate,
  getCompanies,
  getCompany,
  getCompanyStatus,
  getCorroboration,
  getEvidenceByIds,
  getSource,
} from "@/lib/data";
import { StatusBadge } from "@/components/StatusSeal";
import { Panel, SourceLink } from "@/components/ui";

// Data is local and static; a blocking render keeps real 404 status codes.
export const instant = false;

export function generateStaticParams() {
  return getCompanies().map((c) => ({ id: c.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/explorer/[id]">): Promise<Metadata> {
  const { id } = await params;
  const company = getCompany(id);
  return { title: company ? company.name : "Company not found" };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="mt-0.5 text-[15px] text-ink">{children}</dd>
    </div>
  );
}

export default async function CompanyPage({ params }: PageProps<"/explorer/[id]">) {
  const { id } = await params;
  const company = getCompany(id);
  if (!company) notFound();

  const evidence = getEvidenceByIds(company.evidenceIds);
  const status = getCompanyStatus(company);

  return (
    <article>
      <Link href="/explorer" className="link mb-5 inline-flex items-center gap-1.5 text-sm no-underline hover:underline">
        <ArrowLeft size={15} aria-hidden /> GCC Explorer
      </Link>

      <header className="mb-8 border-b border-line pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-navy-950 px-2.5 py-0.5 text-xs font-medium text-white">
            {STAGE_LABELS[company.stage]}
          </span>
          <StatusBadge status={status} />
          <span className="text-sm text-muted">{company.sector}</span>
        </div>
        <h1 className="mt-3 text-[1.9rem] font-semibold leading-tight">{company.name}</h1>
        <p className="mt-2 max-w-3xl text-[15px] text-ink-soft">{company.summary}</p>
        {company.stageNote ? <p className="mt-2 max-w-3xl text-sm text-muted">{company.stageNote}</p> : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="India locations">
            <ul className="-my-2 divide-y divide-line">
              {company.indiaLocations.map((l) => (
                <li key={`${l.city}-${l.stage}`} className="flex gap-3 py-3">
                  <MapPin size={18} aria-hidden className="mt-0.5 shrink-0 text-teal-700" />
                  <div className="min-w-0">
                    <p className="font-medium text-ink">
                      {l.city}{" "}
                      <span className="text-sm font-normal text-muted">({STAGE_LABELS[l.stage].toLowerCase()})</span>
                    </p>
                    <p className="text-sm text-ink-soft">{l.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel
            title="Evidence"
            description="What the sources say, paraphrased. Open the source to check the original wording."
          >
            <ul className="space-y-5">
              {evidence.map((e) => {
                const src = getSource(e.sourceId);
                const corr = getCorroboration(e.claimKey);
                return (
                  <li key={e.id} className="rounded-md border border-line p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="tnum text-xs font-medium text-muted">{e.id}</span>
                      <StatusBadge status={e.status} />
                    </div>
                    <p className="mt-2 font-medium text-ink">{e.claim}</p>
                    <p className="mt-2 text-sm text-ink-soft">{e.supportingEvidence}</p>
                    {e.statusNote ? (
                      <p className="mt-2 rounded bg-saffron-50 px-3 py-2 text-sm text-saffron-700">{e.statusNote}</p>
                    ) : null}
                    {src ? (
                      <dl className="mt-3 grid gap-x-6 gap-y-1 border-t border-line pt-3 text-sm sm:grid-cols-2">
                        <div className="sm:col-span-2">
                          <dt className="text-muted">Source</dt>
                          <dd>
                            <a
                              href={src.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="link break-words"
                            >
                              {src.title}
                            </a>
                            <span className="text-muted">
                              {" "}
                              · {src.publisher} · {SOURCE_TYPE_LABELS[src.sourceType]}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted">Source date</dt>
                          <dd className="text-ink-soft">{formatDate(src.publishedDate)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted">Last verified</dt>
                          <dd className="text-ink-soft">{formatDate(e.lastVerified)}</dd>
                        </div>
                      </dl>
                    ) : null}
                    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="text-muted">
                        {corr.singleSource
                          ? "Single source for this claim"
                          : `${corr.independentSources} sources for this claim`}
                      </span>
                      <Link href={`/evidence?id=${e.id}`} className="link">
                        Open in Evidence Inspector
                      </Link>
                    </p>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>

        <aside className="space-y-6">
          <Panel title="Record facts">
            <dl className="space-y-3">
              <Fact label="Parent company">{company.parent}</Fact>
              <Fact label="GCC entity">{company.gccEntity ?? "Not named in sources"}</Fact>
              <Fact label="Sector">{company.sector}</Fact>
              <Fact label="Stage">{STAGE_LABELS[company.stage]}</Fact>
              <Fact label="Headcount reported">{company.headcount ?? "Not stated in source"}</Fact>
              <Fact label="Investment reported">{company.investment ?? "Not stated in source"}</Fact>
              <Fact label="Business functions">
                {company.functions.length ? (
                  <ul className="list-disc space-y-0.5 pl-5">
                    {company.functions.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                ) : (
                  (company.functionsNote ?? "Not stated in source")
                )}
              </Fact>
              <Fact label="Source date of record">{formatDate(company.recordDate)}</Fact>
            </dl>
          </Panel>

          {company.caveats.length ? (
            <Panel title="Read before relying on this">
              <ul className="list-disc space-y-2 pl-5 text-sm text-ink-soft">
                {company.caveats.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </Panel>
          ) : null}

          <Panel title="Primary source">
            {(() => {
              const src = evidence[0] ? getSource(evidence[0].sourceId) : undefined;
              return src ? (
                <p className="text-sm">
                  <SourceLink source={src} label={src.title} />
                  <span className="mt-1 block text-muted">
                    {src.publisher}, {formatDate(src.publishedDate)}
                  </span>
                </p>
              ) : (
                <p className="text-sm text-muted">No source recorded.</p>
              );
            })()}
          </Panel>
        </aside>
      </div>
    </article>
  );
}
