/**
 * Typed accessors over the local JSON seed data.
 *
 * This is the ONLY module UI code should use to read data. Swapping the JSON
 * files for a database or API later means changing this file, not the UI.
 */
import sourcesJson from "@/data/sources.json";
import evidenceJson from "@/data/evidence.json";
import companiesJson from "@/data/companies.json";
import metricsJson from "@/data/metrics.json";
import citiesJson from "@/data/cities.json";
import gapsJson from "@/data/gaps.json";
import type {
  CitiesFile,
  City,
  CityId,
  Company,
  CriterionDef,
  Evidence,
  MetricsFile,
  Source,
  VerificationStatus,
} from "./types";
import { STATUS_ORDER } from "./types";

const SOURCES = sourcesJson as unknown as Source[];
const EVIDENCE = evidenceJson as unknown as Evidence[];
const COMPANIES = companiesJson as unknown as Company[];
const METRICS = metricsJson as unknown as MetricsFile;
const CITIES = citiesJson as unknown as CitiesFile;

export interface Gap {
  id: string;
  title: string;
  detail: string;
}
const GAPS = gapsJson as Gap[];

/** Fixed snapshot date. Never use `new Date()` for this: pages are prerendered. */
export const DATA_AS_OF: string = METRICS.asOf;

export const CITY_NAMES: Record<CityId, string> = {
  bengaluru: "Bengaluru",
  hyderabad: "Hyderabad",
  pune: "Pune",
  chennai: "Chennai",
};

export const CITY_IDS = Object.keys(CITY_NAMES) as CityId[];

/* ---------- sources & evidence ---------- */

export function getSources(): Source[] {
  return SOURCES;
}

export function getSource(id: string): Source | undefined {
  return SOURCES.find((s) => s.id === id);
}

export function getEvidence(): Evidence[] {
  return EVIDENCE;
}

export function getEvidenceById(id: string): Evidence | undefined {
  return EVIDENCE.find((e) => e.id === id);
}

export function getEvidenceByIds(ids: string[]): Evidence[] {
  return ids
    .map((id) => getEvidenceById(id))
    .filter((e): e is Evidence => Boolean(e));
}

/** Evidence rows that support the same underlying claim (any source). */
export function getSupportingEvidence(claimKey: string): Evidence[] {
  return EVIDENCE.filter((e) => e.claimKey === claimKey);
}

export interface Corroboration {
  independentSources: number;
  sourceIds: string[];
  singleSource: boolean;
}

export function getCorroboration(claimKey: string): Corroboration {
  const sourceIds = Array.from(
    new Set(getSupportingEvidence(claimKey).map((e) => e.sourceId)),
  );
  return {
    independentSources: sourceIds.length,
    sourceIds,
    singleSource: sourceIds.length <= 1,
  };
}

/** Where a piece of evidence is used in the product (for deep links). */
export function getEvidenceHref(e: Evidence): { href: string; label: string } {
  if (e.kind === "company" && e.companyId) {
    return { href: `/explorer/${e.companyId}`, label: "Open company profile" };
  }
  if (e.kind === "metric") {
    return { href: "/", label: "See on Dashboard" };
  }
  return { href: "/compare", label: "See in Location Compare" };
}

/* ---------- companies ---------- */

export function getCompanies(): Company[] {
  return COMPANIES;
}

export function getCompany(id: string): Company | undefined {
  return COMPANIES.find((c) => c.id === id);
}

export function getRecentCompanies(limit = 6): Company[] {
  return [...COMPANIES]
    .sort((a, b) => b.recordDate.localeCompare(a.recordDate))
    .slice(0, limit);
}

export interface FilterOptions {
  cities: string[];
  sectors: string[];
  functions: string[];
}

export function getFilterOptions(): FilterOptions {
  const cities = new Set<string>();
  const sectors = new Set<string>();
  const functions = new Set<string>();
  for (const c of COMPANIES) {
    sectors.add(c.sector);
    c.functions.forEach((f) => functions.add(f));
    c.indiaLocations.forEach((l) => cities.add(l.city));
  }
  return {
    cities: Array.from(cities).sort(),
    sectors: Array.from(sectors).sort(),
    functions: Array.from(functions).sort(),
  };
}

/** The worst (least certain) status among a company's evidence. */
export function getCompanyStatus(c: Company): VerificationStatus {
  const statuses = getEvidenceByIds(c.evidenceIds).map((e) => e.status);
  for (const s of [...STATUS_ORDER].reverse()) {
    if (statuses.includes(s)) return s;
  }
  return "unverified";
}

/** Primary source (first evidence row) for a company, for quick linking. */
export function getCompanyPrimarySource(c: Company): Source | undefined {
  const ev = getEvidenceById(c.evidenceIds[0]);
  return ev ? getSource(ev.sourceId) : undefined;
}

/* ---------- metrics ---------- */

export function getMetrics(): MetricsFile {
  return METRICS;
}

/* ---------- cities & criteria ---------- */

export function getCriteria(): CriterionDef[] {
  return CITIES.criteria;
}

export function getCities(): City[] {
  return CITIES.cities;
}

export function getCity(id: string): City | undefined {
  return CITIES.cities.find((c) => c.id === id);
}

/* ---------- coverage ---------- */

export interface CoverageStats {
  evidenceTotal: number;
  byStatus: Record<VerificationStatus, number>;
  sourcesTotal: number;
  sourcesByType: Record<string, number>;
  companyTotal: number;
  companiesByCity: Record<string, number>;
  singleSourceClaims: number;
  totalClaims: number;
  lastVerified: string;
  gaps: Gap[];
}

export function getCoverageStats(): CoverageStats {
  const byStatus: Record<VerificationStatus, number> = {
    verified: 0,
    estimated: 0,
    illustrative: 0,
    unverified: 0,
  };
  for (const e of EVIDENCE) byStatus[e.status] += 1;

  const sourcesByType: Record<string, number> = {};
  for (const s of SOURCES) {
    sourcesByType[s.sourceType] = (sourcesByType[s.sourceType] ?? 0) + 1;
  }

  const companiesByCity: Record<string, number> = {};
  for (const c of COMPANIES) {
    for (const l of c.indiaLocations) {
      if (l.stage === "existing") continue;
      companiesByCity[l.city] = (companiesByCity[l.city] ?? 0) + 1;
    }
  }

  const claimKeys = Array.from(new Set(EVIDENCE.map((e) => e.claimKey)));
  const singleSourceClaims = claimKeys.filter(
    (k) => getCorroboration(k).singleSource,
  ).length;

  const lastVerified = SOURCES.map((s) => s.lastVerified).sort().slice(-1)[0];

  return {
    evidenceTotal: EVIDENCE.length,
    byStatus,
    sourcesTotal: SOURCES.length,
    sourcesByType,
    companyTotal: COMPANIES.length,
    companiesByCity,
    singleSourceClaims,
    totalClaims: claimKeys.length,
    lastVerified,
    gaps: GAPS,
  };
}

export function getGaps(): Gap[] {
  return GAPS;
}

/* ---------- formatting helpers (pure, safe to import from Client Components) ---------- */

export {
  formatDate,
  hostname,
  SOURCE_TYPE_LABELS,
  STAGE_LABELS,
} from "./format";
