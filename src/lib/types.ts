/**
 * Shared domain types for GCC Atlas.
 *
 * Data (src/data/*.json) and UI (src/components, src/app) are deliberately
 * decoupled: UI only talks to the typed accessors in src/lib/data.ts.
 */

/**
 * Verification vocabulary (also documented in README and the Evidence Inspector):
 *
 * - verified     Checked directly against the cited page on the last-verified date,
 *                and the source is a primary publisher (company, government, report
 *                author) or an established news/trade outlet. A "single source"
 *                flag is shown when only one independent source backs the record.
 * - estimated    Analyst / market figure relayed secondhand, or a value derived by
 *                arithmetic. Not traced to the original publication.
 * - illustrative Placeholder or example that is NOT real data. (None ship in the seed
 *                set, but the UI and schema support it.)
 * - unverified   Found in a credible-looking source but not validated against
 *                official / primary text. Treat as a lead, not a fact.
 */
export type VerificationStatus =
  | "verified"
  | "estimated"
  | "illustrative"
  | "unverified";

export type SourceType =
  | "official-government"
  | "government-agency"
  | "company-primary"
  | "research-report"
  | "news"
  | "trade-press"
  | "law-firm"
  | "aggregator";

export interface Source {
  id: string;
  title: string;
  url: string;
  publisher: string;
  sourceType: SourceType;
  /** ISO date (YYYY-MM-DD) or null when the page does not state one. */
  publishedDate: string | null;
  publishedDateNote?: string;
  /** ISO date on which Atlas opened and read the page. */
  lastVerified: string;
  reliabilityNote?: string;
}

export type EvidenceKind = "metric" | "company" | "city-criterion" | "incentive";

export interface Evidence {
  id: string;
  kind: EvidenceKind;
  /** Human-readable name of what this evidence supports. */
  subjectLabel: string;
  /** Evidence rows sharing a claimKey support the same underlying fact. */
  claimKey: string;
  /** Atlas's neutral statement of the fact. */
  claim: string;
  /** Paraphrase of what the source page says (never a long quote). */
  supportingEvidence: string;
  sourceId: string;
  status: VerificationStatus;
  statusNote?: string;
  lastVerified: string;
  cities: CityId[];
  companyId?: string;
  metricId?: string;
  tags: string[];
}

export type CityId = "bengaluru" | "hyderabad" | "pune" | "chennai";

export type CriterionId =
  | "talent"
  | "operating-costs"
  | "infrastructure"
  | "industry-depth"
  | "incentives";

export interface Metric {
  id: string;
  label: string;
  value: string;
  period: string;
  evidenceIds: string[];
  status: VerificationStatus;
  note?: string;
}

export interface ChartItem {
  label: string;
  value: number;
  derived?: boolean;
}

export interface ChartSeries {
  id: string;
  title: string;
  subtitle: string;
  unit: string;
  items: ChartItem[];
  evidenceIds: string[];
  status: VerificationStatus;
  caveat: string;
}

export interface MetricsFile {
  asOf: string;
  headline: Metric[];
  cityShare: ChartSeries;
  maturity: ChartSeries;
  segmentation: Metric[];
}

export type GccStage = "announced" | "mou-signed" | "launched";

export interface IndiaLocation {
  city: string;
  cityId?: CityId;
  detail: string;
  stage: GccStage | "existing";
}

export interface Company {
  id: string;
  name: string;
  parent: string;
  gccEntity: string | null;
  sector: string;
  indiaLocations: IndiaLocation[];
  functions: string[];
  functionsNote?: string;
  stage: GccStage;
  stageNote?: string;
  /** Date of the record's main source event / report (ISO). */
  recordDate: string;
  headcount: string | null;
  investment: string | null;
  summary: string;
  caveats: string[];
  evidenceIds: string[];
}

export interface Datapoint {
  label: string;
  value: string;
  evidenceId: string;
  status: VerificationStatus;
  period?: string;
  note?: string;
}

export interface CriterionCell {
  availability: "partial" | "unavailable";
  datapoints: Datapoint[];
  /** Shown when availability === "unavailable" or alongside partial data. */
  gapNote: string;
  validationNeeded: string;
}

export interface CriterionDef {
  id: CriterionId;
  label: string;
  description: string;
}

export interface City {
  id: CityId;
  name: string;
  state: string;
  criteria: Record<CriterionId, CriterionCell>;
}

export interface CitiesFile {
  criteria: CriterionDef[];
  cities: City[];
}

export const STATUS_ORDER: VerificationStatus[] = [
  "verified",
  "estimated",
  "unverified",
  "illustrative",
];
