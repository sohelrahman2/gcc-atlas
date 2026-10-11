"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { ErrorState, buttonClass } from "@/components/ui";

export default function RouteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl py-16">
      <ErrorState
        title="This page could not be displayed"
        action={
          <button type="button" onClick={() => retry()} className={buttonClass("secondary")}>
            <RotateCcw size={15} aria-hidden /> Try again
          </button>
        }
      >
        Something went wrong while rendering. No data has been lost. Try again, or use the navigation to move to another
        section.
      </ErrorState>
    </div>
  );
}
