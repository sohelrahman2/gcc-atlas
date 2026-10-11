/**
 * Serializable view models handed from Server Components to Client Components.
 * Keeps data shaping out of UI code and keeps client bundles to what they use.
 */
import {
  getCities,
  getCompanies,
  getCompanyPrimarySource,
  getCompanyStatus,
  getCorroboration,
  getCriteria,
  getEvidence,
  getEvidenceHref,
  getFilterOptions,
  getSource,
  STAGE_LABELS,
} from "./data";
import { KIND_LABELS } from "./format";
import type {
  City,
  CriterionDef,
  EvidenceKind,
  GccStage,
  Source,
  VerificationStatus,
} from "./types";

/* ---------- Explorer ---------- */

export interface ExplorerRow {
  id: string;
  name: string;
  parent: string;
  sector: string;
  stage: GccStage;
  stageLabel: string;
  recordDate: string;
  locations: { city: string; stage: string; stageLabel: string; detail: string }[];
  functions: string[];
  functionsNote?: string;
  headcount: string | null;
  summary: string;
  status: VerificationStatus;
  source: {
    title: string;
    url: string;
    publisher: string;
    publishedDate: string | null;
  } | null;
}

export interface ExplorerData {
  rows: ExplorerRow[];
  cities: string[];
  sectors: string[];
  functions: string[];
  stages: { value: GccStage; label: string }[];
}

export function getExplorerData(): ExplorerData {
  const options = getFilterOptions();
  const rows: ExplorerRow[] = getCompanies().map((c) => {
    const src = getCompanyPrimarySource(c);
    return {
      id: c.id,
      name: c.name,
      parent: c.parent,
      sector: c.sector,
      stage: c.stage,
      stageLabel: STAGE_LABELS[c.stage],
      recordDate: c.recordDate,
      locations: c.indiaLocations.map((l) => ({
        city: l.city,
        stage: l.stage,
        stageLabel: STAGE_LABELS[l.stage] ?? l.stage,
        detail: l.detail,
      })),
      functions: c.functions,
      functionsNote: c.functionsNote,
      headcount: c.headcount,
      summary: c.summary,
      status: getCompanyStatus(c),
      source: src
        ? {
            title: src.title,
            url: src.url,
            publisher: src.publisher,
            publishedDate: src.publishedDate,
          }
        : null,
    };
  });
  return {
    rows,
    cities: options.cities,
    sectors: options.sectors,
    functions: options.functions,
    stages: (["launched", "mou-signed", "announced"] as GccStage[]).map((s) => ({
      value: s,
      label: STAGE_LABELS[s],
    })),
  };
}

/* ---------- Evidence Inspector ---------- */

export { KIND_LABELS };

export interface EvidenceRow {
  id: string;
  kind: EvidenceKind;
  subjectLabel: string;
  claimKey: string;
  claim: string;
  supportingEvidence: string;
  status: VerificationStatus;
  statusNote?: string;
  lastVerified: string;
  tags: string[];
  cities: string[];
  source: Source;
  corroboratingIds: string[];
  independentSources: number;
  singleSource: boolean;
  usedIn: { href: string; label: string };
}

export function getEvidenceRows(): EvidenceRow[] {
  const all = getEvidence();
  const rows: EvidenceRow[] = [];
  for (const e of all) {
    const source = getSource(e.sourceId);
    if (!source) continue;
    const corr = getCorroboration(e.claimKey);
    rows.push({
      id: e.id,
      kind: e.kind,
      subjectLabel: e.subjectLabel,
      claimKey: e.claimKey,
      claim: e.claim,
      supportingEvidence: e.supportingEvidence,
      status: e.status,
      statusNote: e.statusNote,
      lastVerified: e.lastVerified,
      tags: e.tags,
      cities: e.cities,
      source,
      corroboratingIds: all
        .filter((x) => x.claimKey === e.claimKey && x.id !== e.id)
        .map((x) => x.id),
      independentSources: corr.independentSources,
      singleSource: corr.singleSource,
      usedIn: getEvidenceHref(e),
    });
  }
  return rows;
}

/* ---------- Location Compare ---------- */

export interface EvidenceRef {
  evidenceId: string;
  sourceTitle: string;
  publisher: string;
  url: string;
  publishedDate: string | null;
}

export interface CompareData {
  criteria: CriterionDef[];
  cities: City[];
  refs: Record<string, EvidenceRef>;
}

export function getCompareData(): CompareData {
  const cities = getCities();
  const evidence = new Map(getEvidence().map((e) => [e.id, e]));
  const refs: Record<string, EvidenceRef> = {};
  for (const city of cities) {
    for (const cell of Object.values(city.criteria)) {
      for (const dp of cell.datapoints) {
        if (refs[dp.evidenceId]) continue;
        const e = evidence.get(dp.evidenceId);
        const s = e ? getSource(e.sourceId) : undefined;
        if (!e || !s) continue;
        refs[dp.evidenceId] = {
          evidenceId: e.id,
          sourceTitle: s.title,
          publisher: s.publisher,
          url: s.url,
          publishedDate: s.publishedDate,
        };
      }
    }
  }
  return { criteria: getCriteria(), cities, refs };
}
