import type { Metadata } from "next";
import { Suspense } from "react";
import { ExplorerClient } from "@/components/ExplorerClient";
import { PageHeader, SkeletonBlock } from "@/components/ui";
import { getExplorerData } from "@/lib/views";

export const metadata: Metadata = {
  title: "GCC Explorer",
  description: "Search sourced GCC records in India by company, city, industry and business function.",
};

function ExplorerSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading records">
      <SkeletonBlock className="h-56 w-full" />
      <div className="mt-6 space-y-4">
        <SkeletonBlock className="h-44 w-full" />
        <SkeletonBlock className="h-44 w-full" />
      </div>
    </div>
  );
}

export default function ExplorerPage() {
  const data = getExplorerData();
  return (
    <>
      <PageHeader title="GCC Explorer">
        Existing and announced GCCs, each tied to a source URL, a source date and a verification seal. This is a
        curated seed set of {data.rows.length} records, not a census of India&apos;s 2,117 GCCs.
      </PageHeader>
      <Suspense fallback={<ExplorerSkeleton />}>
        <ExplorerClient data={data} />
      </Suspense>
    </>
  );
}
