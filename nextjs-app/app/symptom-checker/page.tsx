"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";

// ── Severity badge helpers ────────────────────────────────────────────────────
const SEVERITY_BADGE = (confidence: number) => {
  if (confidence >= 70) return { label: "High Match", cls: "bg-red-500/20 text-red-400 border border-red-400/30" };
  if (confidence >= 40) return { label: "Moderate Match", cls: "bg-amber-500/20 text-amber-400 border border-amber-400/30" };
  return { label: "Low Match", cls: "bg-sky-500/20 text-sky-400 border border-sky-400/30" };
};

const BAR_COLOR = (confidence: number) => {
  if (confidence >= 70) return "from-red-400 to-rose-500";
  if (confidence >= 40) return "from-amber-400 to-orange-500";
  return "from-sky-400 to-blue-500";
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface Condition {
  name: string;
  confidence: number;
  description: string;
  precautions: string[];
}

interface AnalysisResult {
  conditions: Condition[];
  matched_symptoms: string[];
  unmatched: string[];
  severity_score: number;
  ai_summary: string;
}

// ── Page shell ────────────────────────────────────────────────────────────────
export default function SymptomCheckerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" /></div>}>
      <SymptomChecker />
    </Suspense>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function SymptomChecker() {
  const searchParams = useSearchParams();
  const [allSymptoms, setAllSymptoms] = useState<string[]>([]);
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSymptoms, setLoadingSymptoms] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // ── Load symptom vocabulary from RF model ──────────────────────────────────
  useEffect(() => {
    api.getSymptoms()
      .then(({ symptoms }) => setAllSymptoms(symptoms))
      .catch(() => setAllSymptoms([
        "Fever", "Headache", "Cough", "Chest Pain", "Fatigue", "Nausea",
        "Vomiting", "Dizziness", "Joint Pain", "Skin Rash", "Itching",
        "Shortness Of Breath", "Back Pain", "Abdominal Pain", "Chills",
      ]))
      .finally(() => setLoadingSymptoms(false));
  }, []);

  // ── Symptom search ─────────────────────────────────────────────────────────
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) { setSuggestions([]); return; }
    const matches = allSymptoms
      .filter(s => s.toLowerCase().includes(q) && !selected.includes(s))
      .slice(0, 8);
    setSuggestions(matches);
  }, [query, allSymptoms, selected]);

  const addSymptom = useCallback((s: string) => {
    setSelected(prev => prev.includes(s) ? prev : [...prev, s]);
    setQuery("");
    setSuggestions([]);
    inputRef.current?.focus();
  }, []);

  const removeSymptom = (s: string) => setSelected(prev => prev.filter(x => x !== s));

  const analyze = async () => {
    if (selected.length === 0) {
      setError("Please select at least one symptom before analyzing.");
      return;
    }
    setError("");
    setLoading(true);
    setResult(null);
    try {
      const data = await api.checkSymptoms(selected);
      setResult(data);
      // Scroll to results on mobile
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e: any) {
      setError("Could not reach the analysis service. Is the backend running on port 8000?");
    } finally {
      setLoading(false);
    }
  };

  // Quick-select popular symptoms (first 16 from the vocabulary)
  const quickSymptoms = allSymptoms.slice(0, 16);

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-xl px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-xl text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-sm mb-md px-md py-xs bg-primary/10 text-primary rounded-full text-label-sm font-label-sm border border-primary/20">
            <span className="material-symbols-outlined text-[16px]">psychology</span>
            Powered by Random Forest ML · 41 Diseases · 131 Symptoms
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface mb-sm">
            AI Symptom Checker
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant mb-md">
            Select your symptoms below. Our trained machine-learning model will analyze them
            and identify the most likely conditions with confidence scores.
          </p>
          <div className="inline-flex items-center gap-sm px-md py-sm bg-error-container text-on-error-container rounded-2xl border border-error/10">
            <span className="material-symbols-outlined text-[18px]">warning</span>
            <p className="font-label-sm text-label-sm">
              AI screening only — not a medical diagnosis. Always consult a qualified doctor.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          {/* ── Left: Input panel ── */}
          <section className="lg:col-span-7 flex flex-col gap-md">
            {/* Search bar */}
            <div className="bg-surface-container-lowest p-lg rounded-2xl medical-glow border border-outline-variant/30">
              <div className="flex items-center gap-sm mb-md">
                <span className="material-symbols-outlined text-primary">search</span>
                <h2 className="font-headline-md text-headline-md">Search &amp; Select Symptoms</h2>
              </div>

              {/* Tag input */}
              <div
                className="min-h-[56px] flex flex-wrap gap-sm p-sm bg-surface-container border border-outline-variant rounded-xl cursor-text"
                onClick={() => inputRef.current?.focus()}
              >
                {selected.map(s => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 px-sm py-xs bg-primary text-on-primary rounded-lg text-label-sm font-label-sm"
                  >
                    {s}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeSymptom(s); }}
                      className="ml-1 opacity-70 hover:opacity-100 rounded-full"
                      aria-label={`Remove ${s}`}
                    >
                      <span className="material-symbols-outlined text-[14px]">close</span>
                    </button>
                  </span>
                ))}
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && suggestions[0]) addSymptom(suggestions[0]);
                    if (e.key === "Backspace" && !query && selected.length) removeSymptom(selected[selected.length - 1]);
                    if (e.key === "Escape") setSuggestions([]);
                  }}
                  placeholder={selected.length ? "Add another symptom…" : loadingSymptoms ? "Loading symptoms…" : "Type a symptom (e.g. fever, headache)…"}
                  className="flex-1 min-w-[180px] bg-transparent outline-none font-body-md text-body-md placeholder:text-on-surface-variant/50"
                />
              </div>

              {/* Autocomplete dropdown */}
              {suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="relative z-50 mt-1 bg-surface-container-high border border-outline-variant rounded-xl shadow-2xl overflow-hidden"
                >
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => addSymptom(s)}
                      className="w-full text-left px-md py-sm font-body-md text-body-md hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-sm"
                    >
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">add_circle</span>
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Quick select chips */}
              <div className="mt-md">
                <p className="font-label-sm text-label-sm text-on-surface-variant mb-sm">
                  Common symptoms (tap to add):
                </p>
                <div className="flex flex-wrap gap-sm">
                  {quickSymptoms.map(s => {
                    const active = selected.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => active ? removeSymptom(s) : addSymptom(s)}
                        className={
                          active
                            ? "px-md py-xs rounded-full bg-primary text-on-primary border border-primary text-label-sm font-label-sm transition-all"
                            : "px-md py-xs rounded-full bg-surface-container text-on-surface border border-outline-variant hover:bg-primary/10 hover:border-primary/30 hover:text-primary text-label-sm font-label-sm transition-all"
                        }
                      >
                        {active && <span className="mr-1">✓</span>}{s}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected count */}
              {selected.length > 0 && (
                <div className="mt-md flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">
                    {selected.length} symptom{selected.length !== 1 ? "s" : ""} selected
                  </span>
                  <button
                    onClick={() => { setSelected([]); setResult(null); setError(""); }}
                    className="text-error font-label-sm text-label-sm hover:underline"
                  >
                    Clear all
                  </button>
                </div>
              )}

              {error && (
                <div className="mt-md flex items-center gap-sm p-sm rounded-xl bg-error-container text-on-error-container">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <p className="font-label-sm text-label-sm">{error}</p>
                </div>
              )}

              <button
                onClick={analyze}
                disabled={loading || selected.length === 0}
                className="mt-lg w-full h-[56px] bg-primary text-on-primary font-headline-md text-headline-md rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-sm shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className={`material-symbols-outlined ${loading ? "animate-spin" : ""}`}>
                  {loading ? "progress_activity" : "analytics"}
                </span>
                {loading ? "Analyzing with AI…" : "Analyze Symptoms"}
              </button>
            </div>

            {/* How it works card */}
            <div className="bg-surface-container-lowest p-lg rounded-2xl border border-outline-variant/30">
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-md flex items-center gap-sm">
                <span className="material-symbols-outlined text-primary">info</span>
                How It Works
              </h3>
              <div className="space-y-sm">
                {[
                  { icon: "checklist", text: "Select symptoms from the 131-symptom vocabulary learned by the Random Forest model" },
                  { icon: "model_training", text: "The model matches your symptom pattern against 41 disease classes using 200 decision trees" },
                  { icon: "smart_toy", text: "An AI assistant synthesizes a personalized explanation and severity assessment" },
                  { icon: "calendar_month", text: "Book a confirmed appointment with a specialist in one click" },
                ].map(({ icon, text }) => (
                  <div key={icon} className="flex items-start gap-sm">
                    <span className="material-symbols-outlined text-primary text-[20px] mt-0.5 shrink-0">{icon}</span>
                    <p className="font-body-md text-body-md text-on-surface-variant">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Right: Results panel ── */}
          <section className="lg:col-span-5 flex flex-col gap-md" id="results">
            <div className="bg-surface-container-lowest p-lg rounded-2xl medical-glow border border-outline-variant/30 min-h-[320px]">
              <div className="flex items-center justify-between mb-lg">
                <h2 className="font-headline-md text-headline-md text-on-surface">Analysis Results</h2>
                {result && (
                  <span className="px-sm py-xs bg-primary/10 text-primary rounded-lg text-label-sm font-label-sm border border-primary/20">
                    RF Model · Complete
                  </span>
                )}
              </div>

              {!result && !loading && (
                <div className="flex flex-col items-center justify-center py-xl text-center">
                  <span className="material-symbols-outlined text-outline text-5xl mb-md">monitor_heart</span>
                  <h3 className="font-headline-sm text-on-surface-variant">No Analysis Yet</h3>
                  <p className="font-body-md text-on-surface-variant max-w-xs mt-xs">
                    Select symptoms and click "Analyze Symptoms" to get AI-powered disease predictions.
                  </p>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center py-xl">
                  <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-md" />
                  <p className="font-body-md text-on-surface-variant animate-pulse">Processing with Random Forest…</p>
                </div>
              )}

              {result && (
                <>
                  {/* Severity score */}
                  {result.severity_score > 0 && (
                    <div className="mb-md p-sm rounded-xl bg-surface-container-low border border-outline-variant/20 flex items-center gap-sm">
                      <span className="material-symbols-outlined text-primary">crisis_alert</span>
                      <div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">Severity Score</span>
                        <p className="font-headline-sm text-headline-sm text-on-surface">{result.severity_score} pts</p>
                      </div>
                    </div>
                  )}

                  {/* Matched symptoms */}
                  {result.matched_symptoms.length > 0 && (
                    <div className="mb-md">
                      <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Recognized symptoms:</p>
                      <div className="flex flex-wrap gap-xs">
                        {result.matched_symptoms.map(s => (
                          <span key={s} className="px-sm py-xs rounded-lg bg-primary/10 text-primary text-[11px] font-semibold border border-primary/20">
                            {s.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conditions */}
                  <div className="space-y-md">
                    {result.conditions.map((c, i) => {
                      const badge = SEVERITY_BADGE(c.confidence);
                      const barColor = BAR_COLOR(c.confidence);
                      return (
                        <div
                          key={c.name}
                          className="p-md rounded-xl bg-surface-container-low border border-outline-variant/20 hover:border-primary/30 transition-all"
                        >
                          <div className="flex justify-between items-start mb-xs">
                            <div className="flex-1 mr-sm">
                              <div className="flex items-center gap-xs mb-xs">
                                {i === 0 && (
                                  <span className="px-xs py-0.5 rounded bg-primary text-on-primary text-[10px] font-bold uppercase">TOP</span>
                                )}
                                <span className={`px-xs py-0.5 rounded text-[10px] font-bold uppercase ${badge.cls}`}>
                                  {badge.label}
                                </span>
                              </div>
                              <h3 className="font-body-lg text-on-surface">{c.name}</h3>
                            </div>
                            <span className="font-headline-md text-primary shrink-0">{c.confidence}%</span>
                          </div>
                          <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden mb-sm">
                            <div
                              className={`bg-gradient-to-r ${barColor} h-full rounded-full transition-all duration-700`}
                              style={{ width: `${c.confidence}%` }}
                            />
                          </div>
                          {c.description && (
                            <p className="font-body-sm text-on-surface-variant text-[13px] leading-5">{c.description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* AI Summary */}
                  <div className="mt-md p-md rounded-xl bg-primary/5 border border-primary/15">
                    <div className="flex items-center gap-sm mb-sm">
                      <span className="material-symbols-outlined text-primary text-[18px]">smart_toy</span>
                      <h4 className="font-label-md text-label-md text-on-surface">AI Summary</h4>
                    </div>
                    <p className="font-body-md text-on-surface-variant leading-6">{result.ai_summary}</p>
                  </div>

                  {/* Precautions */}
                  {result.conditions[0]?.precautions?.length > 0 && (
                    <details className="mt-md group bg-surface-container-lowest border border-outline-variant/30 rounded-xl">
                      <summary className="flex justify-between items-center p-md cursor-pointer list-none font-label-md text-label-md text-on-surface select-none">
                        <div className="flex items-center gap-sm">
                          <span className="material-symbols-outlined text-primary text-[18px]">shield_moon</span>
                          Recommended Precautions
                        </div>
                        <span className="material-symbols-outlined group-open:rotate-180 transition-transform">expand_more</span>
                      </summary>
                      <div className="p-md pt-0 border-t border-outline-variant/10">
                        <ul className="space-y-xs">
                          {result.conditions[0].precautions.map(p => (
                            <li key={p} className="flex items-start gap-sm font-body-md text-on-surface-variant">
                              <span className="material-symbols-outlined text-primary text-[16px] mt-0.5 shrink-0">check_circle</span>
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  )}

                  {/* CTA */}
                  <div className="mt-md flex flex-col gap-sm">
                    <Link
                      href="/doctors"
                      className="w-full h-[48px] bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:opacity-90 transition-all flex items-center justify-center gap-sm shadow-md"
                    >
                      <span className="material-symbols-outlined text-[18px]">calendar_month</span>
                      Book a Doctor Appointment
                    </Link>
                    <button
                      onClick={() => { setResult(null); setSelected([]); setQuery(""); }}
                      className="w-full h-[40px] bg-surface-container text-on-surface rounded-xl font-label-md text-label-md hover:bg-surface-container-high transition-all"
                    >
                      Start Over
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
