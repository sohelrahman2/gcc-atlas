/**
 * Contract between the Research Assistant UI, the API route and answer
 * providers. The UI only ever sees AssistantAnswer, so a provider can be
 * swapped (deterministic retrieval today, a server-side Claude call later)
 * without touching the interface.
 */
import type { CityId, VerificationStatus } from "../types";

export type AssistantProviderId = "deterministic-retrieval" | "claude";

export type Topic =
  | "talent"
  | "costs"
  | "infrastructure"
  | "industry"
  | "incentives"
  | "metrics"
  | "companies";

export interface Citation {
  /** 1-based number shown as [n] in the answer. */
  n: number;
  evidenceId: string;
  sourceId: string;
  sourceTitle: string;
  publisher: string;
  /** Real source URL. Rendered as an external link. */
  url: string;
  publishedDate: string | null;
  lastVerified: string;
  status: VerificationStatus;
  /** True when only one source backs the underlying claim. */
  singleSource: boolean;
  /** Atlas's paraphrase of what the source says. */
  support: string;
}

export interface AnswerLine {
  text: string;
  citations: number[];
  status: VerificationStatus;
  /** Caveat attached to the record (status note), if any. */
  note?: string;
}

export interface AnswerSection {
  heading: string;
  lines: AnswerLine[];
}

export interface MissingItem {
  kind: "unavailable" | "partial" | "scope";
  title: string;
  detail: string;
  /** What someone would need to do to close the gap. */
  validation?: string;
  href?: string;
  hrefLabel?: string;
}

export interface AssistantAnswer {
  provider: AssistantProviderId;
  providerLabel: string;
  query: string;
  summary: string;
  sections: AnswerSection[];
  citations: Citation[];
  missing: MissingItem[];
  caveats: string[];
  matched: {
    cities: string[];
    companies: string[];
    topics: Topic[];
  };
  retrievedCount: number;
}

export interface AssistantErrorBody {
  error: string;
  message: string;
}

export interface AssistantStatus {
  provider: AssistantProviderId;
  providerLabel: string;
  claudeConnected: false;
  note: string;
}

export interface RetrievalHit {
  evidenceId: string;
  score: number;
}

export interface Retrieval {
  query: string;
  cities: CityId[];
  outsideCities: string[];
  unknownEntities: string[];
  companyIds: string[];
  topics: Topic[];
  wantsRanking: boolean;
  hits: RetrievalHit[];
}
