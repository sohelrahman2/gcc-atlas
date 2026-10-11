/**
 * Integration seam for a server-side Claude API call. NOT CONNECTED.
 *
 * Today the assistant answers with deterministic retrieval only
 * (see ./deterministic.ts). This file marks where a model-backed provider plugs
 * in, and holds the part that is already useful and testable: a prompt builder
 * that confines the model to the retrieved records.
 *
 * To connect Claude later (see README, "Adding the Claude API"):
 *   1. Add ANTHROPIC_API_KEY to the server environment (never NEXT_PUBLIC_*).
 *   2. Implement ClaudeProvider.answer() below with the official SDK, using
 *      buildGroundedPrompt() for the messages.
 *   3. Return the same AssistantAnswer shape, re-using the Citation objects from
 *      the retrieval step so every [n] still resolves to a real source URL.
 *   4. Reject any model citation that is not in the retrieved set.
 *   5. Set ASSISTANT_PROVIDER=claude.
 *
 * The browser never talks to Anthropic. It only calls /api/assistant.
 */
import type { AssistantAnswer, Retrieval } from "./types";
import { getEvidenceById, getSource } from "../data";

export class ProviderNotConnectedError extends Error {
  constructor(message = "The Claude API provider is not connected.") {
    super(message);
    this.name = "ProviderNotConnectedError";
  }
}

export interface GroundedPrompt {
  system: string;
  user: string;
}

/** Builds a prompt that limits a model to the retrieved records. Pure function. */
export function buildGroundedPrompt(r: Retrieval): GroundedPrompt {
  const records = r.hits
    .map((h, i) => {
      const e = getEvidenceById(h.evidenceId);
      if (!e) return null;
      const s = getSource(e.sourceId);
      return [
        `[${i + 1}] ${e.subjectLabel} (status: ${e.status})`,
        `Claim: ${e.claim}`,
        `Support: ${e.supportingEvidence}`,
        e.statusNote ? `Caveat: ${e.statusNote}` : null,
        `Source: ${s?.title ?? e.sourceId} | ${s?.url ?? ""} | published ${s?.publishedDate ?? "date not stated"}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .filter((x): x is string => x !== null)
    .join("\n\n");

  return {
    system: [
      "You are the GCC Atlas research assistant for companies planning a Global Capability Centre in India.",
      "Answer ONLY from the numbered records provided. Do not use outside knowledge.",
      "Cite every factual sentence with its record number, like [2].",
      "Preserve each record's status (verified, estimated, unverified, illustrative) and its caveat.",
      "If the records do not answer part of the question, say exactly what evidence is missing.",
      "Never rank cities or invent costs, incentive amounts or dates.",
    ].join("\n"),
    user: `Question: ${r.query}\n\nRecords:\n${records || "(no records matched)"}`,
  };
}

export class ClaudeProvider {
  readonly id = "claude" as const;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async answer(_retrieval: Retrieval): Promise<AssistantAnswer> {
    throw new ProviderNotConnectedError(
      "The Claude API provider is a placeholder and is not implemented. The assistant is using deterministic retrieval.",
    );
  }
}
