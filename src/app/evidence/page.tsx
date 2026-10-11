import type { Metadata } from "next";
import { Suspense } from "react";
import { EvidenceClient } from "@/components/EvidenceClient";
import { PageHeader, SkeletonBlock } from "@/components/ui";
import { getSources } from "@/lib/data";
import { getEvidenceRows } from "@/lib/views";

export const metadata: Metadata = {
  title: "Evidence Inspector",
  description: "Inspect the source, dates and supporting text behind every factual record in GCC Atlas.",
};

function EvidenceSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-5" aria-busy="true" aria-label="Loading evidence">
      <div className="space-y-4 lg:col-span-2">
        <SkeletonBlock className="h-64 w-full" />
        <SkeletonBlock className="h-80 w-full" />
      </div>
      <SkeletonBlock className="h-96 w-full lg:col-span-3" />
    </div>
  );
}

export default function EvidencePage() {
  const rows = getEvidenceRows();
  return (
    <>
      <PageHeader title="Evidence Inspector">
        Every factual record in Atlas ({rows.length} records from {getSources().length} sources). Open one to read the
        source link, publication date, last-verified date, supporting text and whether it is verified, estimated,
        illustrative or unverified.
      </PageHeader>
      <Suspense fallback={<EvidenceSkeleton />}>
        <EvidenceClient rows={rows} />
      </Suspense>
    </>
  );
}
