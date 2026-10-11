/**
 * Client-side city shortlist.
 *
 * A tiny external store backed by localStorage. If storage is unavailable
 * (private window, blocked site data) the shortlist still works in memory for
 * the current page session; it just will not persist.
 *
 * Import this module from Client Components only.
 */
import { useCallback, useSyncExternalStore } from "react";
import type { CityId } from "./types";

const KEY = "gcc-atlas:shortlist:v1";
const VALID: ReadonlySet<string> = new Set([
  "bengaluru",
  "hyderabad",
  "pune",
  "chennai",
]);
const EMPTY: CityId[] = [];

let current: CityId[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function parse(raw: string | null): CityId[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    const ids = parsed.filter(
      (x): x is CityId => typeof x === "string" && VALID.has(x),
    );
    return ids.length ? Array.from(new Set(ids)) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function load(): void {
  loaded = true;
  try {
    current = parse(window.localStorage.getItem(KEY));
  } catch {
    current = EMPTY;
  }
}

function emit(): void {
  listeners.forEach((l) => l());
}

function write(next: CityId[]): void {
  current = next.length ? next : EMPTY;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* storage unavailable: keep the in-memory value */
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) {
      load();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): CityId[] {
  if (!loaded) load();
  return current;
}

function getServerSnapshot(): CityId[] {
  return EMPTY;
}

export function useShortlist() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const has = useCallback((id: CityId) => ids.includes(id), [ids]);
  const toggle = useCallback((id: CityId) => {
    const now = getSnapshot();
    write(now.includes(id) ? now.filter((x) => x !== id) : [...now, id]);
  }, []);
  const remove = useCallback((id: CityId) => {
    write(getSnapshot().filter((x) => x !== id));
  }, []);
  const clear = useCallback(() => write(EMPTY), []);

  return { ids, has, toggle, remove, clear };
}
