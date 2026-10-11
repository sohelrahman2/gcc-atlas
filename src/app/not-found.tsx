import Link from "next/link";
import { EmptyState, buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-16">
      <EmptyState
        title="That page or record does not exist"
        action={
          <Link href="/explorer" className={buttonClass("primary")}>
            Browse the GCC Explorer
          </Link>
        }
      >
        The link may be mistyped, or the company record is not in the seed dataset.
      </EmptyState>
    </div>
  );
}
