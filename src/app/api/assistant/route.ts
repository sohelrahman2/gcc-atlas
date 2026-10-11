import { answerQuery, ProviderNotConnectedError } from "@/lib/assistant";
import type { AssistantErrorBody } from "@/lib/assistant/types";

const MAX_QUERY_LENGTH = 500;
const NO_STORE = { "Cache-Control": "no-store" };

function fail(status: number, error: string, message: string): Response {
  const body: AssistantErrorBody = { error, message };
  return Response.json(body, { status, headers: NO_STORE });
}

/**
 * POST /api/assistant  { "query": string }
 *
 * Runs server-side so a model provider and its API key can be added later
 * without exposing anything to the browser.
 */
export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return fail(400, "invalid_json", "The request body must be JSON.");
  }

  const query =
    typeof payload === "object" && payload !== null && "query" in payload
      ? (payload as { query: unknown }).query
      : undefined;

  if (typeof query !== "string" || query.trim().length === 0) {
    return fail(400, "empty_query", "Ask a question about GCC market entry.");
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return fail(
      400,
      "query_too_long",
      `Keep the question under ${MAX_QUERY_LENGTH} characters.`,
    );
  }

  try {
    const answer = await answerQuery(query);
    return Response.json(answer, { headers: NO_STORE });
  } catch (err) {
    if (err instanceof ProviderNotConnectedError) {
      return fail(501, "provider_not_connected", err.message);
    }
    console.error("assistant route failed", err);
    return fail(500, "internal_error", "The assistant could not answer this time.");
  }
}
