"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, CircleAlert, RotateCcw, ShieldCheck } from "lucide-react";
import { formatDate } from "@/lib/format";
import type {
  AnswerLine,
  AssistantAnswer,
  AssistantErrorBody,
  AssistantStatus,
  Citation,
  MissingItem,
} from "@/lib/assistant/types";
import { StatusBadge } from "./StatusSeal";
import { buttonClass } from "./ui";

type Msg =
  | { id: number; role: "user"; text: string }
  | { id: number; role: "assistant"; answer: AssistantAnswer }
  | { id: number; role: "error"; text: string; query: string };

const SUGGESTIONS = [
  "How many GCCs are in India, and how large is the ecosystem?",
  "What incentives does Pune offer?",
  "Which GCCs are being set up in Chennai?",
  "What do we know about Hyderabad's office market?",
  "Which city has the lowest operating costs?",
  "How verified is Karnataka's incentive data?",
];

const MAX = 500;

const MISSING_LABEL: Record<MissingItem["kind"], string> = {
  unavailable: "Data unavailable",
  partial: "Incomplete",
  scope: "Not covered",
};

function CitationChip({ c }: { c: Citation }) {
  return (
    <a
      href={c.url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${c.publisher}: ${c.sourceTitle}`}
      aria-label={`Source ${c.n}: ${c.sourceTitle} (opens in a new tab)`}
      className="ml-1 inline-block rounded bg-teal-50 px-1.5 text-[12px] font-semibold leading-5 text-teal-800 ring-1 ring-inset ring-teal-200 no-underline hover:bg-teal-100"
    >
      [{c.n}]
    </a>
  );
}

function Line({ line, byN }: { line: AnswerLine; byN: Map<number, Citation> }) {
  return (
    <li className="py-3">
      <p className="text-[15px] leading-relaxed text-ink">
        {line.text}
        {line.citations.map((n) => {
          const c = byN.get(n);
          return c ? <CitationChip key={n} c={c} /> : null;
        })}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        <StatusBadge status={line.status} size={12} />
      </div>
      {line.note ? <p className="mt-1.5 text-[13px] text-muted">{line.note}</p> : null}
    </li>
  );
}

function AnswerView({ answer }: { answer: AssistantAnswer }) {
  const byN = new Map(answer.citations.map((c) => [c.n, c]));
  return (
    <div className="space-y-5">
      <p className="text-[15px] text-ink-soft">{answer.summary}</p>

      {answer.sections.map((s) => (
        <section key={s.heading} aria-label={s.heading}>
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{s.heading}</h3>
          <ul className="mt-1 divide-y divide-line">
            {s.lines.map((l, i) => (
              <Line key={`${s.heading}-${i}`} line={l} byN={byN} />
            ))}
          </ul>
        </section>
      ))}

      {answer.missing.length ? (
        <section
          aria-label="Missing evidence"
          className="rounded-md border border-saffron-500/40 bg-saffron-50 p-4"
        >
          <h3 className="flex items-center gap-2 text-sm font-semibold text-saffron-700">
            <CircleAlert size={16} aria-hidden /> Missing evidence
          </h3>
          <ul className="mt-2 space-y-3">
            {answer.missing.map((m, i) => (
              <li key={`${m.title}-${i}`} className="text-sm text-ink-soft">
                <p>
                  <span className="mr-2 rounded bg-paper px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-saffron-700 ring-1 ring-inset ring-saffron-100">
                    {MISSING_LABEL[m.kind]}
                  </span>
                  <span className="font-medium text-ink">{m.title}</span>
                </p>
                <p className="mt-1">{m.detail}</p>
                {m.validation ? (
                  <p className="mt-1">
                    <span className="font-semibold">To validate: </span>
                    {m.validation}
                  </p>
                ) : null}
                {m.href ? (
                  <Link href={m.href} className="link mt-1 inline-block">
                    {m.hrefLabel ?? "Open"}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {answer.citations.length ? (
        <section aria-label="Sources">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">Sources</h3>
          <ol className="mt-2 space-y-2.5">
            {answer.citations.map((c) => (
              <li key={c.n} className="flex gap-3 text-sm">
                <span className="tnum w-6 shrink-0 text-muted">[{c.n}]</span>
                <div className="min-w-0">
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link break-words font-medium"
                  >
                    {c.sourceTitle}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                  <p className="text-[13px] text-muted">
                    {c.publisher} · published {formatDate(c.publishedDate)} · verified {formatDate(c.lastVerified)}
                    {c.singleSource ? " · single source" : ""}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StatusBadge status={c.status} size={12} />
                    <Link href={`/evidence?id=${c.evidenceId}`} className="link text-[13px]">
                      Inspect {c.evidenceId}
                    </Link>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <ul className="space-y-1 border-t border-line pt-3 text-[13px] text-muted">
        {answer.caveats.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
    </div>
  );
}

export function AssistantClient({ status }: { status: AssistantStatus }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function ask(raw: string) {
    const query = raw.trim();
    if (!query || pending) return;
    const userMsg: Msg = { id: nextId.current++, role: "user", text: query };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setPending(true);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const message =
          body && typeof body === "object" && "message" in body
            ? String((body as AssistantErrorBody).message)
            : `The assistant returned an error (${res.status}).`;
        setMessages((m) => [...m, { id: nextId.current++, role: "error", text: message, query }]);
      } else {
        setMessages((m) => [
          ...m,
          { id: nextId.current++, role: "assistant", answer: body as AssistantAnswer },
        ]);
      }
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") return;
      setMessages((m) => [
        ...m,
        {
          id: nextId.current++,
          role: "error",
          text: "Could not reach the assistant. Check your connection and try again.",
          query,
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void ask(input);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex gap-3 rounded-[var(--radius-panel)] border border-line bg-paper p-4 text-sm text-ink-soft">
        <ShieldCheck size={20} aria-hidden className="mt-0.5 shrink-0 text-teal-700" />
        <p>
          <span className="font-semibold text-ink">{status.providerLabel}.</span> {status.note} Every statement carries
          a citation that opens its source, and anything the dataset cannot support is listed as missing evidence.
        </p>
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-label="Conversation"
        className="mt-6 space-y-5"
      >
        {messages.length === 0 ? (
          <div>
            <h2 className="text-base font-semibold">Ask about GCC market entry in India</h2>
            <p className="mt-1 text-sm text-muted">
              Try one of these, or ask your own. Questions about costs or companies outside the seed set will show you
              what is missing rather than a guess.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => void ask(s)}
                    className="w-full rounded-md border border-line-strong bg-paper px-3.5 py-2.5 text-left text-sm text-ink hover:border-teal-600 hover:bg-teal-50"
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {messages.map((m) => {
          if (m.role === "user") {
            return (
              <div key={m.id} className="flex justify-end">
                <p className="max-w-[85%] rounded-lg rounded-br-sm bg-navy-950 px-4 py-2.5 text-[15px] text-white">
                  {m.text}
                </p>
              </div>
            );
          }
          if (m.role === "error") {
            return (
              <div
                key={m.id}
                role="alert"
                className="rounded-md border border-alert-700/30 bg-alert-50 p-4"
              >
                <p className="text-sm font-semibold text-alert-700">The assistant could not answer</p>
                <p className="mt-1 text-sm text-ink-soft">{m.text}</p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void ask(m.query)}
                  className={`mt-3 ${buttonClass("secondary")}`}
                >
                  <RotateCcw size={15} aria-hidden /> Try again
                </button>
              </div>
            );
          }
          return (
            <article
              key={m.id}
              aria-label="Assistant answer"
              className="rounded-[var(--radius-panel)] border border-line bg-paper p-5"
            >
              <AnswerView answer={m.answer} />
            </article>
          );
        })}

        {pending ? (
          <div
            role="status"
            aria-label="Searching the evidence"
            className="flex items-center gap-3 rounded-[var(--radius-panel)] border border-line bg-paper px-5 py-4 text-sm text-muted"
          >
            <span className="dot-pulse" aria-hidden>
              <span />
              <span />
              <span />
            </span>
            Searching the evidence records
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-3 mt-6 rounded-[var(--radius-panel)] border border-line-strong bg-paper p-3 shadow-sm"
      >
        <label htmlFor="assistant-input" className="sr-only">
          Your question
        </label>
        <div className="flex items-end gap-3">
          <textarea
            id="assistant-input"
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX))}
            onKeyDown={onKeyDown}
            rows={2}
            maxLength={MAX}
            placeholder="Ask about incentives, cities, companies or ecosystem size"
            className="min-h-[3.25rem] flex-1 resize-none rounded-md border border-line bg-canvas px-3 py-2 text-[15px]"
          />
          <button
            type="submit"
            disabled={pending || input.trim().length === 0}
            className={buttonClass("primary")}
            aria-label="Send question"
          >
            <ArrowUp size={16} aria-hidden /> Ask
          </button>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span>Enter to send, Shift+Enter for a new line</span>
          <span className="flex items-center gap-3">
            {messages.length ? (
              <button
                type="button"
                className="link"
                onClick={() => {
                  abortRef.current?.abort();
                  setPending(false);
                  setMessages([]);
                }}
              >
                Clear conversation
              </button>
            ) : null}
            <span className="tnum">
              {input.length}/{MAX}
            </span>
          </span>
        </div>
      </form>
    </div>
  );
}
