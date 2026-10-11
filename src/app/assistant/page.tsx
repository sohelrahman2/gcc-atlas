import type { Metadata } from "next";
import { AssistantClient } from "@/components/AssistantClient";
import { PageHeader } from "@/components/ui";
import { getAssistantStatus } from "@/lib/assistant";

export const metadata: Metadata = {
  title: "AI Research Assistant",
  description: "Ask questions about GCC market entry in India and get answers cited to the evidence records.",
};

export default function AssistantPage() {
  const status = getAssistantStatus();
  return (
    <>
      <PageHeader title="AI Research Assistant">
        Retrieval over the seed dataset, with citations and explicit gaps. The Claude API is not connected, so
        this is not a language model: it quotes stored records.
      </PageHeader>
      <AssistantClient status={status} />
    </>
  );
}
