import type { ReactNode } from "react";
import { ExternalLink, SearchX, TriangleAlert } from "lucide-react";
import type { Source } from "@/lib/types";
import { formatDate, hostname, SOURCE_TYPE_LABELS } from "@/lib/format";

export function PageHeader({
  title,
  children,
  aside,
}: {
  title: string;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <h1 className="text-[1.75rem] font-semibold leading-tight sm:text-[2rem]">
          {title}
        </h1>
        {children ? (
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            {children}
          </p>
        ) : null}
      </div>
      {aside ? <div className="shrink-0 text-sm text-muted">{aside}</div> : null}
    </header>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
  className = "",
  id,
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`rounded-[var(--radius-panel)] border border-line bg-paper ${className}`}
    >
      {title ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{title}</h2>
            {description ? (
              <p className="mt-0.5 max-w-prose text-sm text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

/** External link to a source page. Always opens the real URL in a new tab. */
export function SourceLink({
  source,
  label,
  className = "",
}: {
  source: Pick<Source, "url" | "title" | "publisher">;
  label?: string;
  className?: string;
}) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`link inline-flex items-baseline gap-1 ${className}`}
      aria-label={`${label ?? source.publisher}: ${source.title} (opens in a new tab)`}
    >
      <span>{label ?? source.publisher}</span>
      <ExternalLink size={12} aria-hidden className="relative top-px shrink-0" />
    </a>
  );
}

export function SourceMeta({ source }: { source: Source }) {
  return (
    <span className="text-xs text-muted">
      {SOURCE_TYPE_LABELS[source.sourceType]}, {formatDate(source.publishedDate)}
    </span>
  );
}

export function SourceHost({ url }: { url: string }) {
  return <span className="break-all text-xs text-muted">{hostname(url)}</span>;
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center rounded-[var(--radius-panel)] border border-dashed border-line-strong bg-paper px-6 py-12 text-center"
    >
      <SearchX size={28} className="text-navy-300" aria-hidden />
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      {children ? (
        <p className="mt-1 max-w-md text-sm text-muted">{children}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-[var(--radius-panel)] border border-alert-700/30 bg-alert-50 p-4"
    >
      <TriangleAlert
        size={20}
        className="mt-0.5 shrink-0 text-alert-700"
        aria-hidden
      />
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-alert-700">{title}</h3>
        {children ? (
          <p className="mt-1 text-sm text-ink-soft">{children}</p>
        ) : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`skeleton ${className}`} />;
}

export function buttonClass(
  variant: "primary" | "secondary" | "ghost" = "secondary",
): string {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  if (variant === "primary") {
    return `${base} bg-teal-700 text-white hover:bg-teal-800`;
  }
  if (variant === "ghost") {
    return `${base} text-ink-soft hover:bg-wash`;
  }
  return `${base} border border-line-strong bg-paper text-ink hover:bg-wash`;
}
