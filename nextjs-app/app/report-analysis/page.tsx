"use client";

import { useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";

type ReportType = "xray" | "mri" | "covid";

const REPORT_CONFIG: Record<ReportType, {
  label: string;
  icon: string;
  subtitle: string;
  classes: string[];
  color: string;
}> = {
  xray: {
    label: "Chest X-Ray",
    icon: "radiology",
    subtitle: "Pneumonia · Normal detection",
    classes: ["NORMAL", "PNEUMONIA"],
    color: "from-sky-500 to-blue-600",
  },
  mri: {
    label: "Brain MRI",
    icon: "neurology",
    subtitle: "Tumor type classification",
    classes: ["Glioma", "Meningioma", "No Tumor", "Pituitary"],
    color: "from-violet-500 to-purple-600",
  },
  covid: {
    label: "COVID-19 Scan",
    icon: "coronavirus",
    subtitle: "4-class COVID radiography",
    classes: ["COVID", "Lung Opacity", "Normal", "Viral Pneumonia"],
    color: "from-rose-500 to-red-600",
  },
};

const CONFIDENCE_COLOR = (conf: number) => {
  if (conf >= 60) return "from-primary to-primary/70";
  if (conf >= 35) return "from-amber-400 to-orange-500";
  return "from-slate-400 to-slate-500";
};

interface Result {
  results: Array<{ label: string; confidence: number }>;
  top_prediction: { label: string; confidence: number };
}

export default function ReportAnalysis() {
  const [reportType, setReportType] = useState<ReportType>("xray");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError("");
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError("");
    try {
      const data = await api.analyzeReport(reportType, file);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
  };

  const cfg = REPORT_CONFIG[reportType];

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-xl px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-xl max-w-3xl">
          <div className="inline-flex items-center gap-sm mb-md px-md py-xs bg-primary/10 text-primary rounded-full text-label-sm font-label-sm border border-primary/20">
            <span className="material-symbols-outlined text-[16px]">biotech</span>
            PCA + Random Forest Image Classification
          </div>
          <h1 className="font-display-lg text-display-lg text-on-surface mb-xs">
            AI Medical Report Analysis
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Upload medical scans for instant AI-powered preliminary screening across 3 imaging modalities.
          </p>
        </header>

        {/* Modality selector */}
        <div className="flex flex-wrap gap-sm mb-xl">
          {(Object.entries(REPORT_CONFIG) as [ReportType, typeof REPORT_CONFIG.xray][]).map(([key, val]) => (
            <button
              key={key}
              onClick={() => { setReportType(key); reset(); }}
              className={`flex items-center gap-sm px-lg py-sm rounded-2xl border font-label-md text-label-md transition-all ${
                reportType === key
                  ? "bg-primary text-on-primary border-primary shadow-lg"
                  : "bg-surface-container text-on-surface border-outline-variant hover:border-primary/30 hover:bg-primary/5"
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{val.icon}</span>
              <div className="text-left">
                <div>{val.label}</div>
                <div className={`text-[10px] opacity-70 font-normal ${reportType === key ? "" : "hidden sm:block"}`}>
                  {val.subtitle}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter items-start">
          {/* Upload panel */}
          <section className="flex flex-col gap-md">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden">
              {/* Modality info bar */}
              <div className={`bg-gradient-to-r ${cfg.color} p-md flex items-center gap-sm text-white`}>
                <span className="material-symbols-outlined text-[24px]">{cfg.icon}</span>
                <div>
                  <p className="font-headline-sm text-headline-sm">{cfg.label}</p>
                  <p className="font-body-sm text-[13px] opacity-80">{cfg.subtitle}</p>
                </div>
              </div>

              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                className={`relative cursor-pointer min-h-[360px] flex flex-col items-center justify-center p-xl text-center transition-all ${
                  dragOver ? "bg-primary/10 border-2 border-dashed border-primary" : "hover:bg-surface-container-low/50"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                {!preview ? (
                  <div className="space-y-md">
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${cfg.color} flex items-center justify-center mx-auto shadow-lg`}>
                      <span className="material-symbols-outlined text-white text-[36px]">cloud_upload</span>
                    </div>
                    <div>
                      <h3 className="font-headline-md text-headline-md text-on-surface mb-xs">
                        Drop your {cfg.label} here
                      </h3>
                      <p className="font-body-md text-on-surface-variant">Supports PNG, JPG, JPEG</p>
                    </div>
                    <button className={`px-xl py-sm rounded-xl bg-gradient-to-r ${cfg.color} text-white font-label-md shadow-md hover:opacity-90 transition-all`}>
                      Browse Files
                    </button>
                    <div className="mt-md pt-md border-t border-outline-variant/30">
                      <p className="font-label-sm text-label-sm text-on-surface-variant mb-xs">Classes this model detects:</p>
                      <div className="flex flex-wrap gap-xs justify-center">
                        {cfg.classes.map(cls => (
                          <span key={cls} className="px-sm py-xs rounded-lg bg-surface-container border border-outline-variant text-on-surface-variant text-[11px] font-semibold">
                            {cls}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center gap-md p-md">
                    <div className="relative w-full max-w-[280px]">
                      <img src={preview} alt="Uploaded scan" className="w-full max-h-[280px] rounded-xl object-contain border border-outline-variant/30 shadow-lg" />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
                    </div>
                    <div className="flex items-center gap-sm">
                      <span className="font-label-sm text-on-surface-variant">{file?.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); reset(); }}
                        className="p-xs rounded-lg bg-surface-container text-on-surface hover:bg-error/10 hover:text-error transition-all"
                        aria-label="Remove file"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-sm p-md rounded-xl bg-error-container text-on-error-container">
                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                <p className="font-label-sm text-label-sm">{error}</p>
              </div>
            )}

            <button
              onClick={analyze}
              disabled={!file || loading}
              className={`w-full py-md rounded-2xl font-headline-md bg-gradient-to-r ${cfg.color} text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-all flex items-center justify-center gap-sm text-headline-md`}
            >
              <span className={`material-symbols-outlined ${loading ? "animate-spin" : ""}`}>
                {loading ? "progress_activity" : "biotech"}
              </span>
              {loading ? "Analyzing with AI…" : `Analyze ${cfg.label}`}
            </button>
          </section>

          {/* Results panel */}
          <section className="bg-surface-container-lowest p-lg rounded-2xl medical-glow border border-outline-variant/30 min-h-[460px] flex flex-col">
            <div className="flex items-center justify-between mb-lg">
              <h2 className="font-headline-lg text-headline-lg text-on-surface">Analysis Results</h2>
              {result && (
                <span className={`px-sm py-xs rounded-lg text-white text-label-sm font-label-sm bg-gradient-to-r ${cfg.color}`}>
                  {cfg.label}
                </span>
              )}
            </div>

            {!result && !loading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-xl">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${cfg.color} opacity-20 flex items-center justify-center mx-auto mb-md`}>
                  <span className="material-symbols-outlined text-white text-[36px]">{cfg.icon}</span>
                </div>
                <h3 className="font-headline-md text-on-surface-variant">No Analysis Yet</h3>
                <p className="font-body-md text-on-surface-variant max-w-xs mt-xs">
                  Upload a {cfg.label} image and click "Analyze" to get AI predictions.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center py-xl">
                <div className={`w-16 h-16 rounded-full border-4 border-t-transparent animate-spin mb-md`}
                  style={{ borderColor: "var(--primary) transparent var(--primary) var(--primary)" }} />
                <p className="font-body-md text-on-surface-variant animate-pulse">Running PCA + Random Forest…</p>
                <p className="font-label-sm text-on-surface-variant/60 mt-xs">This usually takes 1–3 seconds</p>
              </div>
            )}

            {result && (
              <>
                {/* Top prediction hero */}
                <div className={`mb-lg p-lg rounded-2xl bg-gradient-to-br ${cfg.color} text-white relative overflow-hidden`}>
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white translate-x-8 -translate-y-8" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white -translate-x-6 translate-y-6" />
                  </div>
                  <div className="relative">
                    <p className="font-label-sm text-label-sm opacity-80 mb-xs">Top Prediction</p>
                    <p className="font-display-sm text-display-sm font-bold leading-tight">{result.top_prediction.label}</p>
                    <div className="mt-sm flex items-center gap-sm">
                      <div className="flex-1 h-2 bg-white/30 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-700"
                          style={{ width: `${result.top_prediction.confidence}%` }}
                        />
                      </div>
                      <span className="font-headline-md text-headline-md font-bold">{result.top_prediction.confidence}%</span>
                    </div>
                    <p className="font-label-sm text-label-sm opacity-70 mt-xs">Model confidence</p>
                  </div>
                </div>

                {/* All class probabilities */}
                <h3 className="font-label-md text-label-md text-on-surface-variant mb-md">All Class Probabilities</h3>
                <div className="space-y-md flex-1">
                  {result.results.map((r) => (
                    <div key={r.label}>
                      <div className="flex justify-between items-center font-label-md text-label-md mb-xs">
                        <span className="text-on-surface">{r.label}</span>
                        <span className="text-primary font-bold">{r.confidence}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                        <div
                          className={`bg-gradient-to-r ${CONFIDENCE_COLOR(r.confidence)} h-full rounded-full transition-all duration-700`}
                          style={{ width: `${r.confidence}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Disclaimer + action */}
                <div className="mt-lg p-md rounded-xl bg-error-container/20 border border-error/10">
                  <div className="flex items-start gap-sm">
                    <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">warning</span>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      This is an AI screening estimate only. Results must be confirmed by a certified radiologist or doctor.
                    </p>
                  </div>
                </div>
                <div className="mt-md flex gap-sm">
                  <a
                    href="/doctors"
                    className="flex-1 h-[44px] bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:opacity-90 transition-all flex items-center justify-center gap-sm"
                  >
                    <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                    Book Radiologist
                  </a>
                  <button
                    onClick={reset}
                    className="px-md h-[44px] bg-surface-container text-on-surface rounded-xl font-label-md text-label-md hover:bg-surface-container-high transition-all"
                  >
                    New Scan
                  </button>
                </div>
              </>
            )}
          </section>
        </div>

        {/* Model info strip */}
        <div className="mt-xl grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {(Object.entries(REPORT_CONFIG) as [ReportType, typeof REPORT_CONFIG.xray][]).map(([key, val]) => (
            <div key={key} className="p-md rounded-2xl bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-md">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${val.color} flex items-center justify-center shrink-0`}>
                <span className="material-symbols-outlined text-white text-[22px]">{val.icon}</span>
              </div>
              <div>
                <p className="font-label-md text-label-md text-on-surface">{val.label}</p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{val.subtitle}</p>
                <div className="flex flex-wrap gap-xs mt-xs">
                  {val.classes.map(c => (
                    <span key={c} className="text-[10px] px-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-semibold">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </>
  );
}
