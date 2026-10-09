"use client";

import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import SubscriberDashboard from "./subscriber-dashboard";
import { parseJsonResponse } from "./http-response";
import NewsletterOptionList from "./newsletter-option-list";
import { escapeHtml, firstImageUrl, sanitizeEditorHtml } from "./newsletter-editor-utils";

type Draft = {
  titleOptions: string[];
  subtitleOptions: string[];
  hookOptions: string[];
  selectedTitle: string;
  selectedSubtitle: string;
  selectedHook: string;
  excerpt: string;
  html: string;
};

type Status = { type: "idle" | "working" | "success" | "error"; message: string };

export default function NewsletterBuilder({ userEmail }: { userEmail: string }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [titleOptions, setTitleOptions] = useState<string[]>([]);
  const [subtitleOptions, setSubtitleOptions] = useState<string[]>([]);
  const [hookOptions, setHookOptions] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [hook, setHook] = useState("");
  const [hasDraft, setHasDraft] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle", message: "" });
  const [savedId, setSavedId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const working = status.type === "working";

  useEffect(() => {
    // Make Enter create <p> blocks (sanitizer keeps <p>, drops <div>).
    try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch { /* noop */ }
  }, []);

  useEffect(() => {
    void fetch("/api/newsletter-draft", { cache: "no-store" })
      .then((response) => parseJsonResponse<{ draft?: { id: string; title: string; excerpt: string | null; contentHtml: string } }>(response))
      .then((data) => {
        if (!data.draft || !editorRef.current) return;
        const draft = data.draft;
        setTitle(draft.title);
        setSubtitle(draft.excerpt ?? "");
        setTitleOptions([draft.title]);
        setSubtitleOptions(draft.excerpt ? [draft.excerpt] : []);
        editorRef.current.innerHTML = sanitizeEditorHtml(draft.contentHtml);
        setHasDraft(true);
        setDraftId(draft.id);
        setStatus({ type: "success", message: "Vraćen je zadnji spremljeni nacrt." });
      })
      .catch(() => undefined);
  }, []);

  function editorText() { return editorRef.current?.innerText ?? ""; }

  // The hook is the post's intro paragraph, marked with data-hook so picking
  // a different option (or clicking a suggestion) replaces it in place.
  function applyHook(text: string) {
    setHook(text);
    const el = editorRef.current;
    if (!el) return;
    let lead = el.querySelector<HTMLElement>("[data-hook]");
    if (!lead) {
      lead = document.createElement("p");
      lead.setAttribute("data-hook", "true");
      el.insertBefore(lead, el.firstChild);
    }
    lead.textContent = text;
    setDirty(true);
  }

  function insertHtmlAtCaret(html: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (sel && sel.rangeCount && el.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      const tmp = document.createElement("div");
      tmp.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node: ChildNode | null;
      while ((node = tmp.firstChild)) frag.appendChild(node);
      range.insertNode(frag);
    } else {
      el.insertAdjacentHTML("beforeend", html);
    }
  }

  async function uploadAndInsert(file: File) {
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      setStatus({ type: "error", message: "Podržani su JPG, PNG, GIF i WEBP." });
      return;
    }
    setStatus({ type: "working", message: "Prijenos slike..." });
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json() as { url?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Prijenos slike nije uspio.");
      insertHtmlAtCaret(`<img src="${escapeHtml(data.url!)}" alt="" loading="lazy" />`);
      setDirty(true);
      setStatus({ type: "success", message: "Slika dodana." });
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Prijenos slike nije uspio." });
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLDivElement>) {
    const imageItem = Array.from(e.clipboardData.items).find(
      (it) => it.kind === "file" && it.type.startsWith("image/")
    );
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) void uploadAndInsert(file);
      return;
    }
    // Strip rich formatting from pasted text (FB markup is messy).
    const text = e.clipboardData.getData("text/plain");
    if (text) {
      e.preventDefault();
      document.execCommand("insertText", false, text);
    }
  }

  async function uredi() {
    const rawText = editorText().trim();
    if (rawText.length < 20) {
      setStatus({ type: "error", message: "Zalijepite barem nekoliko rečenica bilješki." });
      return;
    }
    setStatus({ type: "working", message: "Slažem glasnik..." });
    try {
      const res = await fetch("/api/ai/restructure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText }),
      });
      const data = await res.json() as { draft?: Draft; error?: string; warning?: string };
      if (!res.ok) throw new Error(data.error ?? "Formatiranje nije uspjelo.");
      const g = data.draft!;
      setTitleOptions(g.titleOptions ?? []);
      setSubtitleOptions(g.subtitleOptions ?? []);
      setHookOptions(g.hookOptions ?? []);
      setTitle(g.selectedTitle ?? "");
      setSubtitle(g.selectedSubtitle ?? "");
      setHook(g.selectedHook ?? "");
      const lead = `<p data-hook="true">${escapeHtml(g.selectedHook ?? "")}</p>`;
      if (editorRef.current) editorRef.current.innerHTML = sanitizeEditorHtml(lead + (g.html ?? ""));
      setHasDraft(true);
      setSavedId(null);
      setDraftId(null);
      setDirty(true);
      setStatus({
        type: data.warning ? "error" : "success",
        message: data.warning ?? "Glasnik je složen. Uredite ga po želji pa spremite.",
      });
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Neočekivana greška." });
    }
  }

  async function saveDraft(automatic = false) {
    // The hook already lives in the box as the intro paragraph.
    const fullHtml = (editorRef.current?.innerHTML ?? "")
      .replaceAll("<div>", "<p>").replaceAll("</div>", "</p>");
    if (!fullHtml.trim()) {
      if (automatic) return;
      setStatus({ type: "error", message: "Nedostaje naslov ili sadržaj." });
      return;
    }
    if (!automatic) setStatus({ type: "working", message: "Spremam nacrt..." });
    try {
      const res = await fetch("/api/newsletter-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draftId, title: title.trim() || "Nacrt glasnika", subtitle, excerpt: subtitle, html: fullHtml,
          featureImage: firstImageUrl(fullHtml),
        }),
      });
      const data = await parseJsonResponse<{ id?: string; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Spremanje nije uspjelo.");
      setDraftId(data.id!);
      setDirty(false);
      if (!automatic) {
        setSavedId(data.id!);
        setStatus({ type: "success", message: "Nacrt je spremljen. Možete ga poslati." });
      }
    } catch (err) {
      if (!automatic) setStatus({ type: "error", message: err instanceof Error ? err.message : "Neočekivana greška." });
    }
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (dirty && !working) void saveDraft(true);
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [dirty, draftId, title, subtitle, working]);

  async function sendNewsletter() {
    if (!savedId) return;
    if (!confirm("Poslati glasnik svim pretplatnicima? Ova radnja se ne može poništiti.")) return;
    setStatus({ type: "working", message: "Šaljem glasnik..." });
    try {
      const res = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsletterId: savedId }),
      });
      const data = await parseJsonResponse<{ broadcastId?: string; error?: string }>(res);
      if (!res.ok) throw new Error(data.error ?? "Slanje nije uspjelo.");
      setStatus({ type: "success", message: `Glasnik je poslan! Broadcast ID: ${data.broadcastId}` });
    } catch (err) {
      setStatus({ type: "error", message: err instanceof Error ? err.message : "Neočekivana greška." });
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="admin-card mb-6 flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-teal-earring">Prijavljeni ste</p>
          <p className="text-sm font-bold text-plum-950">{userEmail}</p>
        </div>
        <button type="button" className="admin-secondary px-3 py-2 text-xs" onClick={() => signOut()}>Odjava</button>
      </div>

      <SubscriberDashboard />

      <section className="admin-card p-5 md:p-6">
        {hasDraft && (
          <div className="mb-5 space-y-4 border-b border-warm-200 pb-5">
            <NewsletterOptionList label="Naslov" options={titleOptions} value={title} onChange={(value) => { setTitle(value); setDirty(true); }} />
            <NewsletterOptionList label="Podnaslov" options={subtitleOptions} value={subtitle} onChange={(value) => { setSubtitle(value); setDirty(true); }} />
            <NewsletterOptionList label="Hook (uvod)" hint="Odabir postavlja uvodni odlomak na vrh glasnika — uredite ga izravno u polju ispod." options={hookOptions} value={hook} onChange={applyHook} field="none" />
          </div>
        )}

        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="admin-label mb-0">
            {hasDraft ? "Glasnik (uredite izravno)" : "Bilješke — zalijepite pa pritisnite Uredi"}
          </label>
          <button type="button" className="admin-primary px-4 py-2 text-sm" onClick={uredi} disabled={working}>
            <span className="theme-icon-small">✦</span><span>{hasDraft ? "Posloži ponovno" : "Uredi"}</span>
          </button>
        </div>

        <div
          ref={editorRef}
          contentEditable={!working}
          suppressContentEditableWarning
          onPaste={onPaste}
          onInput={() => setDirty(true)}
          data-placeholder="Zalijepite Facebook bilješke ovdje... (slike možete zalijepiti s Ctrl+V izravno u tekst)"
          className="admin-preview admin-editable min-h-[24rem] rounded-xl border border-warm-200 bg-white p-4 focus:border-teal-earring focus:outline-none"
        />

        {status.message && (
          <div className={`mt-4 rounded-xl p-3 text-sm font-bold ${status.type === "error" ? "bg-rose-300/20 text-plum-950" : "bg-teal-light text-teal-earring"}`}>
            {status.message}
          </div>
        )}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="admin-secondary" onClick={() => void saveDraft()} disabled={!hasDraft || working}>
            Spremi nacrt
          </button>
          <button type="button" className="admin-primary" onClick={sendNewsletter} disabled={!savedId || working}>
            Pošalji svim pretplatnicima
          </button>
        </div>
      </section>
    </div>
  );
}
