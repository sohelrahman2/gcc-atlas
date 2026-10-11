/**
 * Deterministic retrieval over the local seed dataset.
 *
 * No network, no model, no randomness: the same query always returns the same
 * records in the same order. Ranking is a plain TF-IDF-style keyword score over
 * evidence rows, plus boosts for recognised cities, companies and topics.
 */
import { CITY_IDS, getCompanies, getEvidence, getSource } from "../data";
import type { CityId, Evidence } from "../types";
import type { Retrieval, Topic } from "./types";

/* ---------- text normalisation ---------- */

const STOPWORDS = new Set(
  (
    "a an and are as at be by can do does for from has have how i in is it its of on or " +
    "that the their there these this to was we what when where which who why will with would " +
    "you your me my our us about any all also been being into more most much than then them " +
    "they those should could tell show give please compare between across vs versus"
  ).split(" "),
);

const ALIASES: Record<string, string> = {
  bangalore: "bengaluru",
  bengalooru: "bengaluru",
  center: "centre",
  centers: "centre",
  centres: "centre",
  gccs: "gcc",
  govt: "government",
};

function stem(word: string): string {
  const aliased = ALIASES[word];
  if (aliased) return aliased;
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) {
    return word.slice(0, -1);
  }
  return word;
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).map(stem);
}

/* ---------- vocabulary for topics, cities and ranking intent ---------- */

const TOPIC_TERMS: Record<Exclude<Topic, "companies">, string[]> = {
  talent: [
    "talent",
    "workforce",
    "hiring",
    "hire",
    "professionals",
    "employees",
    "graduates",
    "skills",
    "attrition",
    "people",
  ],
  costs: [
    "cost",
    "costs",
    "rent",
    "rents",
    "salary",
    "salaries",
    "expensive",
    "cheap",
    "cheaper",
    "cheapest",
    "pricing",
    "opex",
    "afford",
    "affordable",
    "compensation",
    "utilities",
    "budget",
  ],
  infrastructure: [
    "infrastructure",
    "office",
    "offices",
    "real estate",
    "leasing",
    "lease",
    "absorption",
    "supply",
    "connectivity",
    "airport",
    "metro",
    "transit",
    "grade-a",
    "campus",
  ],
  industry: [
    "industry",
    "sector",
    "sectors",
    "cluster",
    "clusters",
    "concentration",
    "depth",
    "footprint",
    "market share",
    "vertical",
  ],
  incentives: [
    "incentive",
    "incentives",
    "subsidy",
    "subsidies",
    "policy",
    "policies",
    "tax",
    "grant",
    "grants",
    "payroll",
    "scheme",
    "reimbursement",
    "stamp duty",
    "concession",
    "government",
    "support",
  ],
  metrics: [
    "how many",
    "number of",
    "total",
    "market size",
    "revenue",
    "growth",
    "maturity",
    "landscape",
    "nasscom",
    "zinnov",
    "fy2026",
    "ecosystem",
    "across india",
  ],
};

const COMPANY_QUERY_TERMS = [
  "company",
  "companies",
  "who has",
  "which gccs",
  "existing gcc",
  "announced",
  "launched",
  "opened",
  "set up",
  "setting up",
  "inaugurated",
  "mou",
  "recent",
];

export const TOPIC_TO_CRITERION: Record<
  Exclude<Topic, "companies" | "metrics">,
  string
> = {
  talent: "talent",
  costs: "operating-costs",
  infrastructure: "infrastructure",
  industry: "industry-depth",
  incentives: "incentives",
};

const RANKING_RE =
  /\b(best|top|rank|ranking|ranked|recommend|recommended|which city|which location|where should|ideal|better|cheapest|most attractive|winner)\b/i;

const OUTSIDE_CITIES = [
  "delhi",
  "ncr",
  "gurugram",
  "gurgaon",
  "noida",
  "mumbai",
  "kolkata",
  "ahmedabad",
  "kochi",
  "coimbatore",
  "jaipur",
  "indore",
  "nagpur",
  "thiruvananthapuram",
  "bhubaneswar",
];

const CITY_NAME_RE = /(bengaluru|bangalore|hyderabad|pune|chennai)/i;

function containsPhrase(normalizedQuery: string, phrase: string): boolean {
  return ` ${normalizedQuery} `.includes(` ${phrase} `);
}

/* ---------- index (built once per server process) ---------- */

interface IndexedDoc {
  evidence: Evidence;
  fields: { tokens: Set<string>; weight: number }[];
}

interface Index {
  docs: IndexedDoc[];
  idf: Map<string, number>;
  vocabulary: Set<string>;
}

let cachedIndex: Index | null = null;

function buildIndex(): Index {
  const evidence = getEvidence();
  const companies = new Map(getCompanies().map((c) => [c.id, c]));
  const df = new Map<string, number>();
  const vocabulary = new Set<string>();

  const docs: IndexedDoc[] = evidence.map((e) => {
    const src = getSource(e.sourceId);
    const company = e.companyId ? companies.get(e.companyId) : undefined;
    const fields = [
      {
        tokens: new Set(
          tokenize(
            `${e.subjectLabel} ${e.claim} ${company?.name ?? ""} ${company?.parent ?? ""}`,
          ),
        ),
        weight: 3,
      },
      { tokens: new Set(e.tags.flatMap((t) => tokenize(t))), weight: 3 },
      { tokens: new Set(tokenize(e.supportingEvidence)), weight: 1 },
      {
        tokens: new Set(
          tokenize(`${e.statusNote ?? ""} ${src?.title ?? ""} ${src?.publisher ?? ""}`),
        ),
        weight: 0.5,
      },
    ];
    const all = new Set<string>();
    for (const f of fields) f.tokens.forEach((t) => all.add(t));
    all.forEach((t) => {
      df.set(t, (df.get(t) ?? 0) + 1);
      vocabulary.add(t);
    });
    return { evidence: e, fields };
  });

  const n = docs.length;
  const idf = new Map<string, number>();
  df.forEach((count, term) => idf.set(term, Math.log(1 + n / count)));
  return { docs, idf, vocabulary };
}

function getIndex(): Index {
  if (!cachedIndex) cachedIndex = buildIndex();
  return cachedIndex;
}

/* ---------- query analysis ---------- */

function detectTopics(normalized: string, tokens: Set<string>): Topic[] {
  const topics: Topic[] = [];
  (Object.keys(TOPIC_TERMS) as Array<keyof typeof TOPIC_TERMS>).forEach(
    (topic) => {
      const hit = TOPIC_TERMS[topic].some((term) =>
        term.includes(" ")
          ? containsPhrase(normalized, tokenize(term).join(" "))
          : tokens.has(stem(term)),
      );
      if (hit) topics.push(topic);
    },
  );
  if (COMPANY_QUERY_TERMS.some((t) => containsPhrase(normalized, tokenize(t).join(" ")))) {
    topics.push("companies");
  }
  return topics;
}

function detectCompanies(normalized: string): string[] {
  const ids: string[] = [];
  for (const c of getCompanies()) {
    const names = [c.name, c.parent, c.gccEntity ?? ""].filter(Boolean);
    const matched = names.some((name) => {
      const n = tokenize(name).join(" ");
      return n.length > 2 && containsPhrase(normalized, n);
    });
    // Allow short forms such as "Magnum" or "Rolls Royce".
    const short = [
      c.id.replace(/-/g, " "),
      tokenize(c.name)[0] ?? "",
    ].some((s) => s.length > 3 && containsPhrase(normalized, s));
    if ((matched || short) && !ids.includes(c.id)) ids.push(c.id);
  }
  return ids;
}

function detectUnknownEntities(query: string, vocabulary: Set<string>): string[] {
  const ignore = new Set([
    "gcc",
    "india",
    "indian",
    "nasscom",
    "zinnov",
    "cbre",
    "jll",
    "atlas",
    "bfsi",
    "ai",
    "ml",
    "it",
    "us",
    "usa",
    "uk",
    "fy",
    "colliers",
    "flexiple",
    "telangana",
    "karnataka",
    "maharashtra",
    "tamil",
    "nadu",
    "forbes",
    "global",
  ]);
  const words = query.match(/\b[A-Z][A-Za-z&'.-]{2,}\b/g) ?? [];
  const firstWord = query.trim().split(/\s+/)[0] ?? "";
  const out: string[] = [];
  for (const w of words) {
    if (w === firstWord) continue;
    const t = stem(w.toLowerCase());
    if (ignore.has(t) || vocabulary.has(t) || CITY_NAME_RE.test(w)) continue;
    if (OUTSIDE_CITIES.includes(w.toLowerCase())) continue;
    if (!out.includes(w)) out.push(w);
  }
  return out;
}

function topicMatchesEvidence(topic: Topic, e: Evidence): boolean {
  const tags = new Set(e.tags.flatMap((t) => tokenize(t)));
  switch (topic) {
    case "incentives":
      return e.kind === "incentive";
    case "metrics":
      return e.kind === "metric";
    case "companies":
      return e.kind === "company";
    case "talent":
      return ["talent", "workforce", "employee", "professional"].some((t) => tags.has(t));
    case "infrastructure":
      return ["infrastructure", "office", "leasing", "absorption"].some((t) => tags.has(t));
    case "industry":
      return tags.has("industry") || tags.has("share");
    case "costs":
      return ["cost", "rent", "salary"].some((t) => tags.has(t)) && e.kind !== "incentive";
  }
}

/* ---------- public API ---------- */

const MIN_SCORE = 2.5;
const MAX_HITS = 10;

/** State-level questions are scoped to the compared city in that state. */
const STATE_TO_CITY: Array<{ phrase: string; city: CityId }> = [
  { phrase: "karnataka", city: "bengaluru" },
  { phrase: "telangana", city: "hyderabad" },
  { phrase: "maharashtra", city: "pune" },
  { phrase: "tamil nadu", city: "chennai" },
];

export function retrieve(rawQuery: string): Retrieval {
  const query = rawQuery
    .trim()
    .replace(/\s+/g, " ")
    .replace(/['\u2019]s\b/gi, "")
    .slice(0, 500);
  const index = getIndex();
  const queryTokens = tokenize(query);
  const normalized = queryTokens.join(" ");
  const tokenSet = new Set(queryTokens);

  const cities = CITY_IDS.filter(
    (id) =>
      tokenSet.has(id) ||
      STATE_TO_CITY.some((s) => s.city === id && containsPhrase(normalized, s.phrase)),
  );
  const outsideCities = OUTSIDE_CITIES.filter((c) => tokenSet.has(c));
  const companyIds = detectCompanies(normalized);
  const topics = detectTopics(normalized, tokenSet);
  const wantsRanking = RANKING_RE.test(query);
  const unknownEntities = detectUnknownEntities(query, index.vocabulary);
  const outsideOnly =
    outsideCities.length > 0 && cities.length === 0 && companyIds.length === 0;
  const aboutUnknownEntity = unknownEntities.length > 0 && companyIds.length === 0;

  // Terms that carry meaning: query words minus stopwords, plus topic expansions.
  const weights = new Map<string, number>();
  for (const t of queryTokens) {
    if (STOPWORDS.has(t) || t.length < 2) continue;
    weights.set(t, Math.max(weights.get(t) ?? 0, 1));
  }
  for (const topic of topics) {
    if (topic === "companies") continue;
    for (const term of TOPIC_TERMS[topic]) {
      for (const t of tokenize(term)) {
        if (STOPWORDS.has(t)) continue;
        weights.set(t, Math.max(weights.get(t) ?? 0, 0.15));
      }
    }
  }

  const scored: { evidence: Evidence; score: number }[] = [];
  for (const doc of index.docs) {
    let score = 0;
    weights.forEach((w, term) => {
      const idf = index.idf.get(term);
      if (!idf) return;
      let best = 0;
      for (const f of doc.fields) if (f.tokens.has(term)) best = Math.max(best, f.weight);
      score += w * idf * best;
    });
    if (score <= 0 && companyIds.length === 0) continue;

    const e = doc.evidence;
    if (e.companyId && companyIds.includes(e.companyId)) score += 8;
    if (cities.length && e.cities.some((c) => cities.includes(c))) score += 2.5;
    // A named city is a hard scope: drop rows about other cities entirely.
    // Rows with no city (national metrics) stay eligible.
    if (cities.length && e.cities.length && !e.cities.some((c) => cities.includes(c))) {
      continue;
    }
    for (const topic of topics) {
      if (topicMatchesEvidence(topic, e)) score += 1.5;
    }
    if (score > 0) scored.push({ evidence: e, score });
  }

  // Relevance gate: when the question names a topic, a record must actually be
  // about that topic (or about a named company). Keyword overlap alone is not
  // enough, otherwise "operating costs" would surface unrelated subsidy rows.
  const gated = scored.filter(({ evidence: e }) => {
    if (e.companyId && companyIds.includes(e.companyId)) return true;
    if (wantsRanking && topics.length === 0) return e.kind === "city-criterion";
    if (topics.length === 0) return true;
    return topics.some((t) => topicMatchesEvidence(t, e));
  });

  // Questions about something the dataset has no record of get no hits, rather
  // than loosely related ones: unknown company, or a city outside the four.
  const docById = new Map(index.docs.map((d) => [d.evidence.id, d]));
  const mentionsOutsideCity = ({ evidence: e }: { evidence: Evidence }) => {
    const doc = docById.get(e.id);
    return Boolean(
      doc &&
        outsideCities.some((c) =>
          [doc.fields[0], doc.fields[2]].some((f) => f.tokens.has(c)),
        ),
    );
  };
  const eligible = aboutUnknownEntity
    ? []
    : outsideOnly
      ? gated.filter(mentionsOutsideCity)
      : gated;

  eligible.sort((a, b) => b.score - a.score || a.evidence.id.localeCompare(b.evidence.id));
  const top = eligible[0]?.score ?? 0;
  const hits =
    top < MIN_SCORE
      ? []
      : eligible
          .filter((s) => s.score >= Math.max(MIN_SCORE, top * 0.3))
          .slice(0, MAX_HITS)
          .map((s) => ({ evidenceId: s.evidence.id, score: Math.round(s.score * 100) / 100 }));

  return {
    query,
    cities,
    outsideCities,
    unknownEntities,
    companyIds,
    topics,
    wantsRanking,
    hits,
  };
}
