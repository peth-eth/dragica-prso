"use client";

import { useEffect, useState } from "react";
import type DOMPurifyType from "dompurify";

// DOMPurify only runs in the browser; content is also sanitized server-side (sanitize-html)
// at write time, so SSR pass-through is safe.
let _purify: typeof DOMPurifyType | null = null;
function clientSanitize(html: string): string {
  if (typeof window === "undefined") return html;
  if (!_purify) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _purify = require("dompurify") as typeof DOMPurifyType;
  }
  return _purify.sanitize(html, { USE_PROFILES: { html: true } });
}
import {
  Send, BookOpen, FileText, FileSpreadsheet,
  Calendar, Mail, Volume2, AlertCircle, ArrowLeft, ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { CouncilQuestion, Newsletter, Suggestion } from "@/lib/types";
import TurnstileWidget from "@/app/components/TurnstileWidget";

const NEWSLETTER_IMAGES: Record<string, string> = {
  ekolog: "https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=400&q=80",
  default: "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=400&q=80",
};

const FEEDBACK_FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSd8SXeYe1F8TzsoY1C0MsRbiqcn0w2y5UnuHxh0VQp2c-wBFA/viewform";

function getNewsletterImage(category: string | null) {
  const cat = (category ?? "").toLowerCase();
  if (cat.includes("ekolog") || cat.includes("okoliš")) return NEWSLETTER_IMAGES.ekolog;
  return NEWSLETTER_IMAGES.default;
}

interface Props {
  initialQuestions: CouncilQuestion[];
  initialNewsletters: Newsletter[];
  initialSuggestions: Suggestion[];
  initialSubscriberCount: number;
  turnstileSiteKey: string;
}

export default function PublicSite({
  initialQuestions,
  initialNewsletters,
  initialSuggestions,
  initialSubscriberCount,
  turnstileSiteKey,
}: Props) {
  const [questions] = useState(initialQuestions);
  const [newsletters] = useState(initialNewsletters);
  const [suggestions] = useState(initialSuggestions);
  const [runtimeTurnstileSiteKey, setRuntimeTurnstileSiteKey] = useState(turnstileSiteKey);

  useEffect(() => {
    let active = true;

    void fetch("/api/turnstile-config", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { siteKey?: unknown };
        if (active && response.ok && typeof data.siteKey === "string") {
          setRuntimeTurnstileSiteKey(data.siteKey);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  // Main newsletter signup
  const [sugEmail, setSugEmail] = useState("");
  const [sugMsg, setSugMsg] = useState("");
  const [sugOk, setSugOk] = useState(false);
  const [sugLoading, setSugLoading] = useState(false);
  const [sugTurnstileToken, setSugTurnstileToken] = useState("");
  const [sugTurnstileReset, setSugTurnstileReset] = useState(0);

  // Footer newsletter signup
  const [subEmail, setSubEmail] = useState("");
  const [subMsg, setSubMsg] = useState("");
  const [subOk, setSubOk] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [subTurnstileToken, setSubTurnstileToken] = useState("");
  const [subTurnstileReset, setSubTurnstileReset] = useState(0);

  // Question category filter
  const [selectedCat, setSelectedCat] = useState("Sve");

  // Newsletter reader modal
  const [selectedNl, setSelectedNl] = useState<Newsletter | null>(null);

  // TTS
  const [speaking, setSpeaking] = useState(false);
  const [showTtsAlert, setShowTtsAlert] = useState(false);

  const categories = ["Sve", ...Array.from(new Set(questions.map((q) => q.category)))];
  const filteredQuestions = selectedCat === "Sve" ? questions : questions.filter((q) => q.category === selectedCat);

  async function handleSuggestionSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sugEmail) return;
    if (runtimeTurnstileSiteKey && !sugTurnstileToken) {
      setSugOk(false);
      setSugMsg("Molimo pričekajte sigurnosnu provjeru i pokušajte ponovo.");
      return;
    }
    setSugMsg("");
    setSugLoading(true);
    try {
      const res = await fetch("/api/public-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: sugEmail,
          turnstileToken: sugTurnstileToken,
        }),
      });
      const data = await res.json() as { message?: string; error?: string };
      setSugOk(res.ok);
      setSugMsg(data.message ?? data.error ?? "");
      if (res.ok) {
        setSugEmail("");
      }
    } catch {
      setSugOk(false);
      setSugMsg("Došlo je do greške pri povezivanju sa serverom.");
    } finally {
      setSugTurnstileReset((prev) => prev + 1);
      setSugLoading(false);
    }
  }

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!subEmail) return;
    if (runtimeTurnstileSiteKey && !subTurnstileToken) {
      setSubOk(false);
      setSubMsg("Molimo pričekajte sigurnosnu provjeru i pokušajte ponovo.");
      return;
    }
    setSubMsg("");
    setSubLoading(true);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: subEmail, turnstileToken: subTurnstileToken }),
      });
      const data = await res.json() as { message?: string; error?: string };
      setSubOk(res.ok);
      setSubMsg(data.message ?? data.error ?? "");
      if (res.ok) setSubEmail("");
    } catch {
      setSubOk(false);
      setSubMsg("Došlo je do greške pri povezivanju sa serverom.");
    } finally {
      setSubTurnstileReset((prev) => prev + 1);
      setSubLoading(false);
    }
  }

  function speakText(text: string) {
    if (!("speechSynthesis" in window)) {
      setShowTtsAlert(true);
      setTimeout(() => setShowTtsAlert(false), 4000);
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "hr-HR";
    utter.onend = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utter);
  }

  function renderNewsletterContent(nl: Newsletter) {
    if (!nl.contentHtml) return null;
    return (
      <div
        className="prose prose-plum max-w-none text-sm md:text-base text-gray-800 font-serif leading-relaxed space-y-6"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: clientSanitize(nl.contentHtml) }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-warm-50 text-[#2c242c] selection:bg-plum-200 selection:text-plum-900 overflow-x-hidden relative">

      {/* TTS unavailable alert */}
      <AnimatePresence>
        {showTtsAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 right-4 z-50 max-w-sm bg-plum-950 text-white p-4 rounded-2xl shadow-2xl border border-plum-800 flex items-start gap-3"
          >
            <AlertCircle className="text-teal-earring shrink-0 mt-0.5 animate-bounce" size={18} />
            <div>
              <p className="font-bold text-xs uppercase tracking-wider text-teal-earring">Sistemska obavijest</p>
              <p className="text-xs text-plum-150 mt-1">Sinteza govora nije podržana u vašem pregledniku.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO — signup-only CTA */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="bg-white rounded-3xl overflow-hidden border border-warm-200 shadow-xl relative grid grid-cols-1 lg:grid-cols-12">
          <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-plum-100 to-transparent rounded-full -mr-20 -mt-20 opacity-40 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-eco-100 to-transparent rounded-full -ml-40 -mb-40 opacity-40 blur-3xl pointer-events-none" />

          {/* Left: manifesto */}
          <div className="lg:col-span-7 p-8 md:p-12 xl:p-16 flex flex-col justify-center relative z-10">
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-[#3a1a47] tracking-tight serif-title leading-tight mb-4">
              Dragica <br /><span className="text-[#3c1d4a]">Pršo</span>
            </h1>

            <div className="mb-8">
              <span className="flyer-badge text-xs sm:text-sm md:text-base tracking-wider uppercase font-extrabold px-3 py-1.5">
                NEZAVISNA VIJEĆNICA
              </span>
            </div>

            <div className="flex w-full sm:w-auto">
              <a
                href="#prijava"
                className="w-full sm:w-auto bg-teal-earring hover:bg-teal-earring/90 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 text-sm md:text-base"
              >
                <Mail size={18} />
                <span>Prijava na glasnik</span>
              </a>
            </div>
          </div>

          {/* Right: portrait */}
          <div className="lg:col-span-5 relative py-10 md:py-16 px-4 md:px-8 flex items-center justify-center overflow-hidden min-h-[380px] lg:min-h-full">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: "url(/images/pula_campaign_banner_1780945803622.png)" }}
            >
              <div className="absolute inset-0 bg-[#33153f]/25 backdrop-brightness-95" />
            </div>
            <div className="relative z-10 w-full max-w-[290px] sm:max-w-[340px] md:max-w-[360px] bg-[#FAF8F5]/90 rounded-2xl p-4 shadow-2xl border border-white/50 backdrop-blur-md transform hover:scale-[1.02] transition duration-500">
              <div className="w-full rounded-xl overflow-hidden h-[260px] sm:h-[320px] relative border border-warm-200 shadow-inner bg-warm-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/dragica_prso_portrait_1780945821916.png"
                  alt="Dragica Pršo"
                  className="absolute inset-0 w-full h-full object-cover filter saturate-[1.05]"
                />
              </div>
              <div className="mt-4 text-center">
                <p className="hand-text text-2xl sm:text-3xl font-extrabold text-plum-900 leading-tight">
                  "Zajedno možemo više i bolje!"
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Jung quote */}
      <section className="max-w-4xl mx-auto px-4 py-12 text-center relative">
        <span className="text-6xl text-plum-200 serif-title absolute -top-4 left-6">"</span>
        <div className="bg-plum-50 rounded-2xl p-8 md:p-12 border border-plum-100 shadow-inner relative z-10 max-w-3xl mx-auto">
          <p className="text-xl md:text-2xl font-serif text-plum-950 italic font-medium leading-relaxed mb-4 text-[#43234d]">
            "Svijet će vas pitati tko ste, a ako ne znate, sam će vam reći."
          </p>
          <div className="h-[2px] w-24 bg-gradient-to-r from-transparent via-teal-earring to-transparent mx-auto mb-3" />
          <p className="text-xs tracking-widest font-bold text-plum-700 uppercase">Carl Gustav Jung</p>
        </div>
        <span className="text-6xl text-plum-200 serif-title absolute -bottom-12 right-6">"</span>
      </section>

      {/* About */}
      <section id="aktivnosti" className="max-w-7xl mx-auto px-4 md:px-8 py-12 scroll-mt-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 bg-plum-100 text-plum-900 font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider mb-3">
              <span>Osobni Profil Zastupnice</span>
            </div>
            <h3 className="text-3xl md:text-4xl font-extrabold text-plum-900 serif-title leading-tight mb-6">
              Upoznajte svoju vijećnicu
            </h3>
            <div className="prose text-gray-700 space-y-5 leading-relaxed text-base md:text-lg">
              <p>Ja sam <strong>Dragica Pršo</strong>. Po zanimanju sam <strong>profesorica i knjižničarka savjetnica</strong> s višegodišnjim iskustvom u prosvjeti i radu s mladima.</p>
              <p>Kao <strong>nezavisna gradska vijećnica u Gradu Puli</strong>, inzistiram na točnosti, transparentnosti do zadnjeg centa i zelenoj perspektivi za naš divni grad.</p>
              <p>Moji su prioriteti: Pula koja uvažava glas svakog kvarta, u kojoj se sadi mediteransko bilje umjesto betoniranja i u kojoj se javne tajne ne skrivaju u ladicama.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-warm-200 shadow-sm space-y-4">
            <span className="text-xs uppercase font-extrabold text-gray-500 tracking-wider">Temeljna Načela Mog Rada:</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { icon: "👤", title: "Za sve građane", desc: "Radim bez podjela za interese svakog stanovnika Pule." },
                { icon: "✓",  title: "Konkretna transparentnost", desc: "Otvorenost, odgovornost i poštenje u svakoj odluci vijeća." },
                { icon: "🌿", title: "Kvaliteta života i ekologija", desc: "Brinem o zelenom prostoru i ekološkoj budućnosti naše djece.", teal: true },
                { icon: "💬", title: "Zajedno s vama", desc: "Slušam, povezujem i izravno zastupam vaše interese." },
              ].map(({ icon, title, desc, teal }) => (
                <div key={title} className="flex items-start gap-3">
                  <div className={`w-10 h-10 shrink-0 ${teal ? "bg-[#008f95]" : "bg-plum-900"} text-white rounded-full flex items-center justify-center font-bold text-lg shadow-sm`}>
                    {icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-plum-950">{title}</h4>
                    <p className="text-xs text-gray-600">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Council questions */}
      <section id="pitanja" className="max-w-7xl mx-auto px-4 md:px-8 py-16 scroll-mt-6 bg-white rounded-3xl border border-warm-200 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
          <div>
            <div className="inline-flex items-center gap-1 bg-teal-light text-teal-earring font-bold px-3 py-1 rounded-full text-xs uppercase tracking-wider mb-2">
              <FileSpreadsheet size={13} />
              <span>Moja Vijećnička Aktivnost</span>
            </div>
            <h3 className="text-3xl md:text-4xl font-extrabold text-plum-900 serif-title">Što pitam na gradskom vijeću?</h3>
            <p className="text-sm md:text-base text-gray-600 mt-2 max-w-2xl">
              Pratite transkripte mojih pitanja gradu Puli i njihove službene odgovore.
            </p>
          </div>

          <div className="flex overflow-x-auto scrollbar-none gap-1.5 bg-warm-100 p-1 rounded-xl border border-warm-200 max-w-full md:flex-wrap select-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer shrink-0 ${
                  selectedCat === cat ? "bg-plum-900 text-white shadow" : "text-plum-800/80 hover:bg-warm-200 hover:text-plum-950"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredQuestions.map((q) => (
              <motion.div
                key={q.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-warm-50/50 border border-warm-200 rounded-2xl p-6 hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center gap-2 mb-3">
                    <span className="text-xs bg-plum-100 text-plum-900 font-extrabold px-2.5 py-1 rounded-md border border-plum-200/50">{q.category}</span>
                    <span className="text-xs text-gray-500 font-semibold flex items-center gap-1"><Calendar size={12} />{q.date}</span>
                  </div>
                  <h4 className="text-xl font-bold text-plum-950 serif-title mb-3 text-[#39223e]">{q.title}</h4>
                  <div className="space-y-4 text-xs md:text-sm">
                    <div className="bg-white rounded-xl p-4 border border-warm-200">
                      <span className="text-xs uppercase tracking-wider font-extrabold text-plum-500 block mb-1">Pitanje gradske vijećnice Dragice Pršo:</span>
                      <p className="text-gray-700 italic font-serif leading-relaxed">"{q.questionText}"</p>
                    </div>
                    {q.answerText && (
                      <div className="bg-white rounded-xl p-4 border border-warm-200/80">
                        <span className="text-xs uppercase tracking-wider font-extrabold text-eco-700 block mb-1">Odgovor nadležnih tijela Grada:</span>
                        <p className="text-[#3c3a3c] font-medium leading-relaxed">{q.answerText}</p>
                      </div>
                    )}
                    {q.aiSummary && (
                      <div className="bg-teal-light/50 rounded-xl p-4 border border-teal-earring/20">
                        <span className="text-xs uppercase tracking-wider font-extrabold text-teal-earring block mb-1">Sažetak za građane:</span>
                        <p className="text-sm text-plum-900 leading-relaxed">{q.aiSummary}</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Citizen suggestion + newsletter subscription */}
      <section id="prijava" className="max-w-7xl mx-auto px-4 md:px-8 py-12 scroll-mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Form: LEFT */}
          <div className="lg:col-span-7 bg-[#33153f] text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-plum-800/45 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <span className="text-xs bg-teal-earring text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider block w-fit mb-3">Tjedni glasnik</span>
              <h3 className="text-2xl md:text-3xl font-extrabold serif-title mb-2">Pratite Dragičin rad</h3>
              <p className="text-xs md:text-sm text-plum-100/90 mb-6 max-w-xl leading-relaxed">
                Pretplatite se na tjedni vijećnički glasnik Dragice Pršo.
              </p>
              <form onSubmit={handleSuggestionSubmit} className="space-y-4 mb-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider font-extrabold text-plum-200 mb-1">Vaša e-mail adresa:</label>
                  <input type="email" placeholder="Unesite vašu e-mail adresu..." value={sugEmail} onChange={(e) => setSugEmail(e.target.value)} required
                    className="w-full bg-plum-950/60 border border-plum-800 rounded-xl px-3.5 py-2.5 text-white outline-none focus:border-teal-earring transition text-sm" />
                </div>
                <TurnstileWidget
                  key={`suggestion-${sugTurnstileReset}`}
                  siteKey={runtimeTurnstileSiteKey}
                  theme="dark"
                  onVerify={setSugTurnstileToken}
                  onError={() => {
                    setSugOk(false);
                    setSugMsg("Sigurnosna provjera nije učitana. Osvježite stranicu i pokušajte ponovo.");
                  }}
                />
                <button type="submit" disabled={sugLoading}
                  className="w-full bg-teal-earring hover:bg-teal-earring/90 text-white font-extrabold py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
                  <Send size={15} />
                  <span>{sugLoading ? "Slanje..." : "Pretplati se"}</span>
                </button>
                {sugMsg && (
                  <div
                    role="status"
                    className={`p-3 rounded-xl text-xs font-bold text-center border ${
                      sugOk ? "bg-eco-100 text-eco-800 border-eco-200" : "bg-rose-300/20 text-rose-100 border-rose-300/30"
                    }`}
                  >
                    {sugOk ? <><p>Hvala, prijavljeni ste na moj tjedni glasnik.</p><p className="mt-2 font-medium">Voljela bih također čuti <a href={FEEDBACK_FORM_URL} target="_blank" rel="noreferrer" className="font-extrabold underline underline-offset-4">vaše mišljenje o mom radu <ExternalLink className="inline" size={13} aria-hidden="true" /></a>.</p></> : <p>{sugMsg}</p>}
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* Suggestions feed: RIGHT */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div className="bg-warm-100 rounded-3xl p-6 border border-warm-200 h-full flex flex-col">
              <span className="text-xs uppercase tracking-widest font-extrabold text-plum-800 block mb-3">Aktualni Glasovi Građana Pule</span>
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[460px] custom-scrollbar">
                {suggestions.length === 0 ? (
                  <p className="text-xs text-gray-500 italic text-center py-12">Još nema poslanih prijedloga. Budite prvi!</p>
                ) : (
                  suggestions.map((sug) => (
                    <div key={sug.id} className="bg-white border border-warm-200 p-4 rounded-2xl shadow-sm space-y-2">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-xs font-bold text-plum-950">{sug.name}</span>
                        <span className="text-xs bg-plum-50 text-plum-900 font-extrabold px-2 py-0.5 rounded uppercase">{sug.category}</span>
                      </div>
                      <p className="text-xs text-gray-700 italic leading-relaxed">"{sug.text}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter list */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="bg-warm-100 rounded-3xl p-6 md:p-10 border border-warm-200">
          <div className="mb-8">
            <h3 className="text-2xl md:text-3xl font-extrabold text-plum-900 serif-title">Zadnja Izdanja Glasnika</h3>
            <p className="text-xs md:text-sm text-gray-600 mt-1">Periodička pisma s transparentnim vijestima i detaljima s najnovijih rasprava.</p>
          </div>
          <div className="flex flex-col gap-6">
            {newsletters.length === 0 && (
              <p className="text-sm text-gray-500 italic text-center py-8">Glasnici uskoro.</p>
            )}
            {newsletters.map((nl) => {
              const imageUrl = getNewsletterImage(nl.category);
              return (
                <button key={nl.id} onClick={() => setSelectedNl(nl)}
                  className="w-full text-left bg-white rounded-2xl p-4 md:p-6 border border-warm-200 hover:border-teal-earring/60 shadow-sm hover:shadow-md transition duration-200 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-semibold">
                      <span className="text-xs bg-plum-50 text-plum-900 font-extrabold px-2 py-0.5 rounded uppercase">{nl.category}</span>
                      {nl.publishDate && <><span className="text-gray-300">•</span><span>{new Date(nl.publishDate).toLocaleDateString("hr-HR")}</span></>}
                    </div>
                    <h4 className="text-xl font-bold text-plum-950 serif-title group-hover:text-teal-earring transition-colors duration-200">{nl.title}</h4>
                    {nl.excerpt && <p className="text-xs md:text-sm text-gray-600 line-clamp-2 leading-relaxed">{nl.excerpt}</p>}
                  </div>
                  <div className="w-full md:w-32 h-40 md:h-32 shrink-0 rounded-xl overflow-hidden border border-warm-100 bg-warm-50 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt={nl.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#33153f] text-white pt-16 pb-12 px-4 md:px-8 border-t border-plum-950">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="bg-plum-950/60 p-8 md:p-12 rounded-3xl border border-plum-800 flex flex-col lg:flex-row justify-between items-center gap-8 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-80 h-80 bg-plum-800 opacity-20 rounded-full blur-3xl pointer-events-none" />
            <div className="space-y-4 max-w-lg relative z-10 text-center lg:text-left">
              <span className="text-xs bg-teal-earring text-white font-extrabold px-3 py-1 rounded-full uppercase tracking-wider block w-fit mx-auto lg:mx-0">UKLJUČITE SE</span>
              <h2 className="text-2xl md:text-4xl font-extrabold serif-title leading-tight">Vaše mišljenje je važno!</h2>
              <p className="text-xs md:text-sm text-plum-100/90 leading-relaxed font-serif">Zajedno gradimo bolju Pulu.</p>
            </div>
            <div className="w-full max-w-md relative z-10">
              <form onSubmit={handleSubscribe} className="space-y-3">
                <div className="flex bg-plum-900 border border-plum-700 rounded-xl p-1 items-center focus-within:border-teal-earring transition-all duration-300 shadow-inner">
                  <input type="email" placeholder="Unesite vašu e-mail adresu..." value={subEmail} onChange={(e) => setSubEmail(e.target.value)} required
                    className="flex-1 bg-transparent px-3 py-2.5 outline-none text-white text-xs md:text-sm" />
                  <button type="submit" disabled={subLoading}
                    className="bg-teal-earring hover:bg-teal-earring/90 text-white font-extrabold px-4 py-2 rounded-lg text-xs tracking-wide transition flex items-center gap-1 cursor-pointer disabled:opacity-50">
                    <Mail size={12} />
                    <span>{subLoading ? "Prijava..." : "Prijavi se"}</span>
                  </button>
                </div>
                <TurnstileWidget
                  key={`footer-${subTurnstileReset}`}
                  siteKey={runtimeTurnstileSiteKey}
                  theme="dark"
                  onVerify={setSubTurnstileToken}
                  onError={() => {
                    setSubOk(false);
                    setSubMsg("Sigurnosna provjera nije učitana. Osvježite stranicu i pokušajte ponovo.");
                  }}
                />
                {subMsg && <div role="status" className={`text-xs text-center font-semibold ${subOk ? "text-teal-300" : "text-rose-300"}`}>{subOk ? <><p>Hvala, prijavljeni ste na moj tjedni glasnik.</p><p className="mt-1 font-medium">Voljela bih također čuti <a href={FEEDBACK_FORM_URL} target="_blank" rel="noreferrer" className="font-bold underline underline-offset-4">vaše mišljenje o mom radu <ExternalLink className="inline" size={12} aria-hidden="true" /></a>.</p></> : <p>{subMsg}</p>}</div>}
              </form>
            </div>
          </div>

          <div className="pt-8 border-t border-plum-800/60 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-plum-200">
            <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start">
              <span>E-mail: <strong>dragica.prso@gmail.com</strong></span>
              <span className="text-plum-400">|</span>
              <span>Facebook: <a href="https://www.facebook.com/profile.php?id=61584674982414" target="_blank" rel="noreferrer" className="font-bold text-white underline decoration-teal-earring/80 underline-offset-4 transition hover:text-teal-earring">Dragica Pršo</a></span>
            </div>
            <p className="font-semibold text-white">Dragica Pršo — Profesorica i nezavisna vijećnica</p>
          </div>
        </div>
      </footer>

      {/* Newsletter reader modal */}
      <AnimatePresence>
        {selectedNl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#FAF8F5] z-50 overflow-y-auto px-4 py-8 md:py-16 flex justify-center"
          >
            <div className="max-w-3xl w-full relative">
              <div className="flex justify-between items-center mb-8 border-b border-warm-200 pb-4">
                <button onClick={() => setSelectedNl(null)} className="flex items-center gap-2 text-sm font-bold text-plum-900 hover:text-teal-earring transition cursor-pointer">
                  <ArrowLeft size={16} /><span>Natrag na naslovnicu</span>
                </button>
                <span className="text-xs text-gray-500 font-semibold uppercase tracking-widest">Ekološki Glasnik</span>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {selectedNl.category && <span className="text-xs bg-plum-100 text-plum-900 font-extrabold px-2.5 py-1 rounded uppercase tracking-wider">{selectedNl.category}</span>}
                  {selectedNl.publishDate && <><span className="text-gray-300">•</span><span className="text-gray-500 font-semibold">Objavljeno: {new Date(selectedNl.publishDate).toLocaleDateString("hr-HR")}</span></>}
                </div>
                <h1 className="text-3xl md:text-5xl font-extrabold text-plum-950 serif-title leading-tight">{selectedNl.title}</h1>
                <div className="flex items-center gap-3 py-4 border-y border-warm-200/60 my-6">
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-warm-200 bg-warm-100 relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/images/dragica_prso_portrait_1780945821916.png" alt="Dragica Pršo" className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                  <div className="text-left leading-tight">
                    <p className="text-sm font-bold text-plum-950">Dragica Pršo</p>
                    <p className="text-xs text-gray-500">Nezavisna vijećnica i profesorica • Pula</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 md:p-10 border border-warm-200 shadow-sm relative mb-8">
                <div className="w-full h-64 md:h-80 rounded-2xl overflow-hidden mb-8 relative border border-warm-100 bg-warm-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getNewsletterImage(selectedNl.category)} alt={selectedNl.title} className="absolute inset-0 w-full h-full object-cover" />
                </div>

                {renderNewsletterContent(selectedNl)}

                <div className="mt-12 pt-6 border-t border-warm-100 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
                  <div />
                  <button onClick={() => speakText(selectedNl.contentHtml)}
                    className="bg-plum-900 hover:bg-plum-800 text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 cursor-pointer transition shadow-sm">
                    <Volume2 size={13} />
                    {speaking ? "Zaustavi čitanje" : "Poslušaj glasno čitanje"}
                  </button>
                </div>
              </div>

              <div className="text-center pb-16">
                <button onClick={() => setSelectedNl(null)}
                  className="bg-warm-200 hover:bg-warm-300 text-plum-950 font-extrabold text-xs px-6 py-3 rounded-xl transition cursor-pointer">
                  Zatvori članak i vrati se na naslovnicu
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
