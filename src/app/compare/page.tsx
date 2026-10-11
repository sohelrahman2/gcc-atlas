import type { Metadata } from "next";
import { CompareClient } from "@/components/CompareClient";
import { PageHeader } from "@/components/ui";
import { DATA_AS_OF } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { getCompareData } from "@/lib/views";

export const metadata: Metadata = {
  title: "Location Compare",
  description: "Compare Bengaluru, Hyderabad, Pune and Chennai on talent, cost, infrastructure, industry depth and incentives.",
};

export default function ComparePage() {
  const data = getCompareData();
  return (
    <>
      <PageHeader title="Location Compare">
        Bengaluru, Hyderabad, Pune and Chennai across five criteria. Every datapoint shows its source and seal. Gaps are
        stated, not filled.
      </PageHeader>
      <CompareClient data={data} asOf={formatDate(DATA_AS_OF)} />
    </>
  );
}
