"use client";

import { ChevronDown, RefreshCw, Search, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SubscriberGrowthPoint, SubscriberListItem } from "@/lib/subscriber-stats";
import type { SubscriberDashboardData } from "@/lib/resend";

const dateFormatter = new Intl.DateTimeFormat("hr-HR", { day: "numeric", month: "short", year: "numeric" });

export function formatDate(value: string) {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00.000Z` : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? "Datum nije dostupan" : dateFormatter.format(date);
}

function isSubscriberDashboardData(value: unknown): value is SubscriberDashboardData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<SubscriberDashboardData>;
  return Array.isArray(data.growth) && Array.isArray(data.contacts) && Boolean(data.pagination);
}

function GrowthChart({ growth }: { growth: SubscriberGrowthPoint[] }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const points = useMemo(() => {
    const max = Math.max(...growth.map((point) => point.count), 1);
    const lastIndex = Math.max(growth.length - 1, 1);
    return growth.map((point, index) => ({ ...point, x: 30 + (index / lastIndex) * 660, y: 196 - (point.count / max) * 154 }));
  }, [growth]);

  if (growth.length === 0) return <p className="py-8 text-center text-sm text-gray-500">Još nema evidentiranih pretplatnika.</p>;

  const lastPoint = points[points.length - 1];
  const lastGrowthPoint = growth[growth.length - 1];
  const hoverPoint = hoveredIndex === null ? lastPoint : points[hoveredIndex];
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const area = `${path} L ${lastPoint.x} 214 L ${points[0].x} 214 Z`;

  return (
    <div className="relative mt-5" onMouseLeave={() => setHoveredIndex(null)}>
      {hoverPoint && <div className="mb-3 flex items-baseline justify-between gap-3 text-sm"><span className="font-bold text-plum-950">{hoverPoint.count} pretplatnika</span><span className="text-gray-500">{formatDate(hoverPoint.date)}</span></div>}
      <svg viewBox="0 0 720 230" role="img" aria-label="Rast broja pretplatnika kroz vrijeme" className="h-auto w-full overflow-visible">
        <line x1="30" x2="690" y1="214" y2="214" className="stroke-warm-200" strokeWidth="1" />
        <path d={area} fill="#c9f2eb" opacity="0.6" />
        <path d={path} fill="none" stroke="#049a9a" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        {points.map((point, index) => <circle key={point.date} cx={point.x} cy={point.y} r={hoveredIndex === index ? 6 : 4} className="cursor-pointer fill-teal-earring stroke-white transition" strokeWidth="3" tabIndex={0} aria-label={`${formatDate(point.date)}: ${point.count} pretplatnika`} onFocus={() => setHoveredIndex(index)} onMouseEnter={() => setHoveredIndex(index)} />)}
        <text x="30" y="228" className="fill-gray-500 text-[12px]">{formatDate(growth[0].date)}</text>
        {growth.length > 1 && <text x="690" y="228" textAnchor="end" className="fill-gray-500 text-[12px]">{formatDate(lastGrowthPoint.date)}</text>}
      </svg>
    </div>
  );
}

function SubscriberList({ contacts }: { contacts: SubscriberListItem[] }) {
  if (contacts.length === 0) return <p className="py-5 text-center text-sm text-gray-500">Nema pretplatnika za ovaj pojam.</p>;

  return (
    <ul className="mt-3 divide-y divide-warm-200 border-y border-warm-200">
      {contacts.map((contact) => (
        <li key={contact.email} className="flex min-w-0 items-center justify-between gap-3 py-3">
          <span className="min-w-0"><span className="block truncate text-sm font-bold text-plum-950">{contact.name || contact.email}</span>{contact.name && <span className="block truncate text-xs text-gray-500">{contact.email}</span>}</span>
          <span className="shrink-0 text-xs text-gray-500">{formatDate(contact.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}

export default function SubscriberDashboard() {
  const [open, setOpen] = useState(false);
  const [dashboard, setDashboard] = useState<SubscriberDashboardData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");

  async function loadDashboard(page = 1, append = false, searchQuery = activeQuery) {
    append ? setLoadingMore(true) : setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (searchQuery) params.set("query", searchQuery);
      const response = await fetch(`/api/admin/subscribers?${params}`, { cache: "no-store" });
      const data = await response.json() as unknown;
      if (!response.ok) {
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "Statistika nije dostupna.";
        throw new Error(message);
      }
      if (!isSubscriberDashboardData(data)) throw new Error("Statistika pretplatnika nije u ispravnom formatu.");
      setDashboard((current) => append && current ? { ...data, contacts: [...current.contacts, ...data.contacts] } : data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Statistika nije dostupna.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => { void loadDashboard(1, false, ""); }, []);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextQuery = query.trim();
    setActiveQuery(nextQuery);
    void loadDashboard(1, false, nextQuery);
  }

  return (
    <section className="admin-card mb-6 overflow-hidden">
      <button type="button" aria-expanded={open} aria-controls="subscriber-stats" className="flex w-full items-center justify-between gap-4 p-4 text-left md:p-5" onClick={() => setOpen((value) => !value)}>
        <span className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-light text-teal-earring"><Users size={19} aria-hidden="true" /></span><span className="min-w-0"><span className="block text-xs font-extrabold uppercase tracking-wider text-teal-earring">Pretplatnici</span><span className="block truncate text-lg font-extrabold text-plum-950">{loading ? "Učitavanje..." : dashboard ? `${dashboard.total} ukupno` : "Statistika nije dostupna"}</span></span></span>
        <ChevronDown size={20} aria-hidden="true" className={`shrink-0 text-plum-950 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && <div id="subscriber-stats" className="border-t border-warm-200 px-4 pb-5 pt-4 md:px-5">
        <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-extrabold text-plum-950">Rast kroz vrijeme</p><p className="mt-1 text-xs text-gray-500">Svi aktivni pretplatnici od prvog upisa.</p></div><button type="button" onClick={() => void loadDashboard(1, false)} disabled={loading} className="admin-secondary flex h-9 w-9 shrink-0 items-center justify-center p-0" aria-label="Osvježi statistiku"><RefreshCw size={16} aria-hidden="true" className={loading ? "animate-spin" : ""} /></button></div>
        {error ? <p className="mt-5 rounded-lg bg-rose-300/20 p-3 text-sm font-bold text-plum-950">{error}</p> : loading ? <p className="py-8 text-center text-sm text-gray-500">Učitavam statistiku...</p> : dashboard && <><GrowthChart growth={dashboard.growth} /><div className="mt-7 border-t border-warm-200 pt-5"><div className="flex items-center justify-between gap-3"><p className="text-sm font-extrabold text-plum-950">Popis pretplatnika</p><span className="text-xs text-gray-500">{dashboard.pagination.total}</span></div><form onSubmit={submitSearch} className="mt-3 flex gap-2"><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pretraži e-mail ili ime" className="admin-input min-w-0 py-2 text-sm" /><button type="submit" className="admin-secondary flex h-10 w-10 shrink-0 items-center justify-center p-0" aria-label="Pretraži pretplatnike"><Search size={17} aria-hidden="true" /></button></form><SubscriberList contacts={dashboard.contacts} />{dashboard.pagination.page < dashboard.pagination.totalPages && <button type="button" onClick={() => void loadDashboard(dashboard.pagination.page + 1, true)} disabled={loadingMore} className="admin-secondary mt-4 w-full text-sm">{loadingMore ? "Učitavanje..." : "Učitaj još"}</button>}</div></>}
      </div>}
    </section>
  );
}
