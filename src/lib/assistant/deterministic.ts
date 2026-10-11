/**
 * Deterministic answer composer.
 *
 * Builds an answer ONLY from retrieved evidence rows and the dataset's own
 * gap notes. Every statement is a stored claim, every claim carries a
 * citation, and anything the dataset cannot support is listed under "missing".
 * There is no model call and no text invented outside these templates.
 */
import {
  CITY_NAMES,
  DATA_AS_OF,
  formatDate,
  getCities,
  getCompanies,
  getCompany,
  getCorroboration,
  getCriteria,
  getEvidenceById,
  getSource,
} from "../data";
import { STATUS_ORDER } from "../types";
import type { CityId, Evidence, VerificationStatus } from "../types";
import { TOPIC_TO_CRITERION, retrieve } from "./retrieval";
import type {
  AnswerLine,
  AnswerSection,
  AssistantAnswer,
  Citation,
  MissingItem,
  Retrieval,
  Topic,
} from "./types";

export const DETERMINISTIC_LABEL = "Deterministic retrieval over the local seed dataset";

const KIND_HEADINGS: Record<Evidence["kind"], string> = {
  metric: "Ecosystem metrics",
  company: "Company records",
  "city-criterion": "City evidence",
  incentive: "Government incentives",
};

const SOURCE_PRIORITY: Record<string, number> = {
  "official-government": 0,
  "company-primary": 1,
  "research-report": 2,
  "government-agency": 3,
  "trade-press": 4,
  news: 5,
  "law-firm": 6,
  aggregator: 7,
};

function sourceRank(e: Evidence): number {
  const type = getSource(e.sourceId)?.sourceType ?? "aggregator";
  return SOURCE_PRIORITY[type] ?? 9;
}

function worstStatus(statuses: VerificationStatus[]): VerificationStatus {
  for (const s of [...STATUS_ORDER].reverse()) if (statuses.includes(s)) return s;
  return "unverified";
}

function listCities(ids: CityId[]): string {
  const names = ids.map((id) => CITY_NAMES[id]);
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/* ---------- missing-evidence analysis ---------- */

function buildMissing(r: Retrieval): MissingItem[] {
  const missing: MissingItem[] = [];
  const criteria = getCriteria();
  const cities = getCities();
  const topicsWithCriteria = r.topics.filter(
    (t): t is Exclude<Topic, "companies" | "metrics"> => t in TOPIC_TO_CRITERION,
  );
  const outsideOnly =
    r.outsideCities.length > 0 && r.cities.length === 0 && r.companyIds.length === 0;
  const targetCities = (r.cities.length ? r.cities : cities.map((c) => c.id)) as CityId[];
  // Ranking questions without a named topic touch every criterion.
  const topicsToCheck: Array<Exclude<Topic, "companies" | "metrics">> =
    r.wantsRanking && topicsWithCriteria.length === 0
      ? ["talent", "costs", "infrastructure", "industry", "incentives"]
      : topicsWithCriteria;

  for (const topic of outsideOnly ? [] : topicsToCheck) {
    const criterionId = TOPIC_TO_CRITERION[topic];
    const label = criteria.find((c) => c.id === criterionId)?.label ?? criterionId;

    // Group cities that share the same gap so it is stated once.
    const groups = new Map<string, { cityIds: CityId[]; availability: "partial" | "unavailable"; gap: string; validation: string }>();
    for (const id of targetCities) {
      const cell = cities.find((c) => c.id === id)?.criteria[criterionId as keyof (typeof cities)[number]["criteria"]];
      if (!cell) continue;
      const key = `${cell.availability}|${cell.gapNote}|${cell.validationNeeded}`;
      const g = groups.get(key);
      if (g) g.cityIds.push(id);
      else
        groups.set(key, {
          cityIds: [id],
          availability: cell.availability,
          gap: cell.gapNote,
          validation: cell.validationNeeded,
        });
    }
    const namedCities = r.cities.length > 0;
    // With no city named, collapse "partial" gaps into one line per criterion;
    // the per-city detail lives in Location Compare.
    const partials = [...groups.values()].filter((g) => g.availability === "partial");
    groups.forEach((g) => {
      if (g.availability === "partial" && !namedCities) return;
      missing.push({
        kind: g.availability === "unavailable" ? "unavailable" : "partial",
        title:
          g.availability === "unavailable"
            ? `${label}: data unavailable for ${listCities(g.cityIds)}`
            : `${label}: incomplete for ${listCities(g.cityIds)}`,
        detail: g.gap,
        validation: g.validation,
        href: "/compare",
        hrefLabel: "See in Location Compare",
      });
    });
    if (!namedCities && partials.length) {
      missing.push({
        kind: "partial",
        title: `${label}: only partial data for ${listCities(partials.flatMap((g) => g.cityIds))}`,
        detail:
          "Each city has some sourced datapoints but none is complete or strictly comparable. Per-city gaps and what to validate are listed in Location Compare.",
        href: "/compare",
        hrefLabel: "See per-city gaps",
      });
    }
  }

  // Incentive evidence quality, derived from the data rather than asserted.
  if (!outsideOnly && topicsToCheck.includes("incentives")) {
    const weak: CityId[] = [];
    for (const id of targetCities) {
      const cell = cities.find((c) => c.id === id)?.criteria.incentives;
      if (cell && !cell.datapoints.some((d) => d.status === "verified")) weak.push(id);
    }
    if (weak.length) {
      const only = weak.length === 1 ? cities.find((c) => c.id === weak[0])?.criteria.incentives : undefined;
      missing.push({
        kind: "partial",
        title: `Incentives for ${listCities(weak)}: no verified official text`,
        detail:
          "Every incentive record for " +
          (weak.length === 1 ? "this city is" : "these cities is") +
          " unverified, so treat amounts as leads to confirm rather than facts.",
        validation: only?.validationNeeded,
        href: "/compare",
        hrefLabel: "See in Location Compare",
      });
    }
  }

  if (r.wantsRanking) {
    missing.push({
      kind: "scope",
      title: "No sourced ranking of cities",
      detail:
        "Atlas does not rank cities. Comparable cost and incentive data are missing for most criteria, and sources disagree where they overlap (for example, CBRE and Colliers order Hyderabad and Bengaluru differently for Q3 2026). Any records shown are evidence per city, not a verdict.",
      href: "/compare",
      hrefLabel: "Compare cities side by side",
    });
  }

  if (r.outsideCities.length) {
    missing.push({
      kind: "scope",
      title: `No city-level records for ${r.outsideCities
        .map((c) => c[0].toUpperCase() + c.slice(1))
        .join(", ")}`,
      detail:
        "Location Compare and the company records cover Bengaluru, Hyderabad, Pune and Chennai only.",
    });
  }

  if (r.unknownEntities.length) {
    missing.push({
      kind: "scope",
      title: `No records matched: ${r.unknownEntities.join(", ")}`,
      detail: `The seed set has ${getCompanies().length} company records, a curated sample that is not a census of India's GCCs. An absence here does not mean the company has no GCC.`,
      href: "/explorer",
      hrefLabel: "Browse the company records",
    });
  }

  if (r.hits.length === 0) {
    missing.push({
      kind: "scope",
      title: "Nothing in the seed dataset answers this question",
      detail: `The dataset covers FY2026 ecosystem metrics, ${getCompanies().length} company records, four cities (Bengaluru, Hyderabad, Pune, Chennai) and state incentive records. Try naming a city, a company, or a topic such as incentives, office market, talent or ecosystem size.`,
    });
  }

  return missing;
}

/* ---------- composition ---------- */

export function composeDeterministic(r: Retrieval): AssistantAnswer {
  const citations: Citation[] = [];
  const citationByEvidence = new Map<string, number>();

  function cite(e: Evidence): number {
    const existing = citationByEvidence.get(e.id);
    if (existing) return existing;
    const src = getSource(e.sourceId);
    const n = citations.length + 1;
    citationByEvidence.set(e.id, n);
    citations.push({
      n,
      evidenceId: e.id,
      sourceId: e.sourceId,
      sourceTitle: src?.title ?? e.sourceId,
      publisher: src?.publisher ?? "Unknown publisher",
      url: src?.url ?? "",
      publishedDate: src?.publishedDate ?? null,
      lastVerified: e.lastVerified,
      status: e.status,
      singleSource: getCorroboration(e.claimKey).singleSource,
      support: e.supportingEvidence,
    });
    return n;
  }

  // Group retrieved rows that support the same claim into one line.
  const byClaim = new Map<string, { rows: Evidence[]; score: number }>();
  for (const h of r.hits) {
    const e = getEvidenceById(h.evidenceId);
    if (!e) continue;
    const g = byClaim.get(e.claimKey);
    if (g) g.rows.push(e);
    else byClaim.set(e.claimKey, { rows: [e], score: h.score });
  }

  const sectionOrder: Evidence["kind"][] = [];
  const sectionLines = new Map<Evidence["kind"], AnswerLine[]>();
  let lineCount = 0;
  for (const group of byClaim.values()) {
    if (lineCount >= 8) break;
    // Lead with the most authoritative source for this claim.
    group.rows.sort((a, b) => sourceRank(a) - sourceRank(b));
    const primary = group.rows[0];
    const line: AnswerLine = {
      text: primary.claim,
      citations: group.rows.map(cite),
      status: worstStatus(group.rows.map((x) => x.status)),
      note: primary.statusNote,
    };
    if (!sectionLines.has(primary.kind)) {
      sectionLines.set(primary.kind, []);
      sectionOrder.push(primary.kind);
    }
    sectionLines.get(primary.kind)?.push(line);
    lineCount += 1;
  }

  const sections: AnswerSection[] = sectionOrder.map((kind) => ({
    heading: KIND_HEADINGS[kind],
    lines: sectionLines.get(kind) ?? [],
  }));

  const allLines = sections.flatMap((s) => s.lines);
  const sourceCount = new Set(citations.map((c) => c.sourceId)).size;
  const scope: string[] = [];
  if (r.cities.length) scope.push(listCities(r.cities));
  const companyNames = r.companyIds
    .map((id) => getCompany(id)?.name)
    .filter((n): n is string => Boolean(n));
  if (companyNames.length) scope.push(companyNames.join(", "));

  const summary = allLines.length
    ? `Found ${allLines.length} supported ${allLines.length === 1 ? "statement" : "statements"} from ${sourceCount} ${sourceCount === 1 ? "source" : "sources"}${scope.length ? ` for ${scope.join(" and ")}` : ""}. Everything below is taken from those records; nothing is added from outside the dataset.`
    : "No record in the seed dataset supports an answer to this question, so nothing is stated as fact.";

  const caveats: string[] = [];
  const unverified = allLines.filter((l) => l.status === "unverified").length;
  const estimated = allLines.filter((l) => l.status === "estimated").length;
  if (unverified) {
    caveats.push(
      `${unverified} of the statements above ${unverified === 1 ? "is" : "are"} unverified: leads to confirm, not facts.`,
    );
  }
  if (estimated) {
    caveats.push(
      `${estimated} ${estimated === 1 ? "is" : "are"} estimated: figures relayed secondhand that Atlas did not trace to the original publication.`,
    );
  }
  caveats.push(
    `Answers come from a static snapshot dated ${formatDate(DATA_AS_OF)}. Nothing is fetched live.`,
  );

  return {
    provider: "deterministic-retrieval",
    providerLabel: DETERMINISTIC_LABEL,
    query: r.query,
    summary,
    sections,
    citations,
    missing: buildMissing(r),
    caveats,
    matched: {
      cities: r.cities.map((c) => CITY_NAMES[c]),
      companies: companyNames,
      topics: r.topics,
    },
    retrievedCount: allLines.length,
  };
}

export function answerDeterministically(query: string): AssistantAnswer {
  return composeDeterministic(retrieve(query));
}
