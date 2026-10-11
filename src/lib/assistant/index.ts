/**
 * Provider selection. Server-side only.
 *
 * ASSISTANT_PROVIDER (optional): "deterministic" (default) or "claude".
 * "claude" currently resolves to a clear not-connected error instead of
 * silently falling back, so a half-configured deployment is never mistaken for
 * a model-backed one.
 */
import { answerDeterministically, DETERMINISTIC_LABEL } from "./deterministic";
import { ClaudeProvider, ProviderNotConnectedError } from "./claude";
import { retrieve } from "./retrieval";
import type { AssistantAnswer, AssistantStatus } from "./types";

export { ProviderNotConnectedError };
export type { AssistantAnswer, AssistantStatus };

export function getAssistantStatus(): AssistantStatus {
  return {
    provider: "deterministic-retrieval",
    providerLabel: DETERMINISTIC_LABEL,
    claudeConnected: false,
    note: "Answers are assembled from stored records only. The Claude API is not connected.",
  };
}

export async function answerQuery(query: string): Promise<AssistantAnswer> {
  const requested = (process.env.ASSISTANT_PROVIDER ?? "deterministic").toLowerCase();
  if (requested === "claude") {
    // Placeholder provider: throws ProviderNotConnectedError until implemented.
    return new ClaudeProvider().answer(retrieve(query));
  }
  return answerDeterministically(query);
}
