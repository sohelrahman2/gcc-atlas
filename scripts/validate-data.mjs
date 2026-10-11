// Referential-integrity checks for the seed data. Runs before every build.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data");
const load = (f) => JSON.parse(readFileSync(join(root, f), "utf8"));

const sources = load("sources.json");
const evidence = load("evidence.json");
const companies = load("companies.json");
const metrics = load("metrics.json");
const cities = load("cities.json");

const STATUSES = new Set(["verified", "estimated", "illustrative", "unverified"]);
const errors = [];
const err = (m) => errors.push(m);

const sourceIds = new Set();
for (const s of sources) {
  if (sourceIds.has(s.id)) err(`duplicate source id ${s.id}`);
  sourceIds.add(s.id);
  if (!/^https?:\/\//.test(s.url)) err(`${s.id}: url must be http(s)`);
  if (!s.title) err(`${s.id}: missing title`);
  if (!s.lastVerified) err(`${s.id}: missing lastVerified`);
  if (s.publishedDate === undefined) err(`${s.id}: publishedDate must be a date or null`);
  if (s.publishedDate === null && !s.publishedDateNote) {
    err(`${s.id}: null publishedDate needs a publishedDateNote`);
  }
}

const evidenceIds = new Set();
for (const e of evidence) {
  if (evidenceIds.has(e.id)) err(`duplicate evidence id ${e.id}`);
  evidenceIds.add(e.id);
  if (!sourceIds.has(e.sourceId)) err(`${e.id}: unknown source ${e.sourceId}`);
  if (!STATUSES.has(e.status)) err(`${e.id}: bad status ${e.status}`);
  if (!e.claim || !e.supportingEvidence) err(`${e.id}: claim/supportingEvidence required`);
  if (!e.lastVerified) err(`${e.id}: missing lastVerified`);
}

const companyIds = new Set(companies.map((c) => c.id));
for (const e of evidence) {
  if (e.companyId && !companyIds.has(e.companyId)) err(`${e.id}: unknown company ${e.companyId}`);
}
for (const c of companies) {
  if (!c.evidenceIds?.length) err(`${c.id}: company needs evidence`);
  for (const id of c.evidenceIds ?? []) {
    if (!evidenceIds.has(id)) err(`${c.id}: unknown evidence ${id}`);
  }
  if (!c.indiaLocations?.length) err(`${c.id}: needs at least one India location`);
}

const checkIds = (label, ids) => {
  for (const id of ids ?? []) if (!evidenceIds.has(id)) err(`${label}: unknown evidence ${id}`);
};
for (const m of [...metrics.headline, ...metrics.segmentation]) {
  checkIds(`metric ${m.id}`, m.evidenceIds);
  if (!STATUSES.has(m.status)) err(`metric ${m.id}: bad status`);
}
checkIds("cityShare", metrics.cityShare.evidenceIds);
checkIds("maturity", metrics.maturity.evidenceIds);

const criteriaIds = cities.criteria.map((c) => c.id);
for (const city of cities.cities) {
  for (const cid of criteriaIds) {
    const cell = city.criteria[cid];
    if (!cell) {
      err(`${city.id}: missing criterion ${cid}`);
      continue;
    }
    if (cell.availability === "unavailable" && cell.datapoints.length) {
      err(`${city.id}/${cid}: unavailable cell must not carry datapoints`);
    }
    if (cell.availability === "partial" && !cell.datapoints.length) {
      err(`${city.id}/${cid}: partial cell needs datapoints`);
    }
    if (!cell.validationNeeded) err(`${city.id}/${cid}: validationNeeded required`);
    for (const dp of cell.datapoints) {
      if (!evidenceIds.has(dp.evidenceId)) err(`${city.id}/${cid}: unknown evidence ${dp.evidenceId}`);
      if (!STATUSES.has(dp.status)) err(`${city.id}/${cid}: bad status`);
    }
  }
}

if (errors.length) {
  console.error(`\nData validation failed (${errors.length}):`);
  for (const m of errors) console.error(`  - ${m}`);
  process.exit(1);
}
console.log(
  `Data OK: ${sources.length} sources, ${evidence.length} evidence rows, ${companies.length} companies, ${cities.cities.length} cities.`,
);
