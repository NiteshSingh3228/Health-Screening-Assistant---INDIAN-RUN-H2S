"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";

const faqs = [
  {
    q: "Is the AI analysis medically accurate?",
    a: "Our AI models are trained on curated clinical datasets. While accurate for common conditions, it is intended for guidance and does not replace a formal diagnosis by a licensed physician.",
  },
  {
    q: "How is my health data secured?",
    a: "Your privacy is our priority. All medical records and reports are encrypted and never shared with third parties without your explicit consent.",
  },
  {
    q: "Can I talk to a real doctor after the AI check?",
    a: "Yes, absolutely. Once the AI analysis is complete, you can book a consultation with a doctor from our directory.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-surface-container rounded-xl p-6 medical-glow">
      <button
        className="flex justify-between items-center w-full font-headline-md text-headline-md text-on-surface text-left"
        onClick={() => setOpen(!open)}
      >
        {q}
        <span className="material-symbols-outlined text-primary">{open ? "expand_less" : "expand_more"}</span>
      </button>
      {open && <div className="mt-4 font-body-md text-body-md text-on-surface-variant">{a}</div>}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    api
      .getDoctors()
      .then((data) => setDoctors(data.slice(0, 4)))
      .catch(() => setDoctors([]));
  }, []);

  const goToSymptomChecker = () => {
    const params = query.trim() ? `?q=${encodeURIComponent(query)}` : "";
    router.push(`/symptom-checker${params}`);
  };

  return (
    <>
      <Navbar />
      <main className="pt-20">
        {/* Hero */}
        <section className="relative overflow-hidden bg-surface-container-lowest pt-xl pb-24">
          <div className="max-w-7xl mx-auto px-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-xl items-center relative z-10">
            <div className="space-y-sm">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-fixed rounded-full text-on-primary-fixed font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                Powered by Advanced Healthcare AI
              </div>
              <h1 className="font-display-lg text-display-lg text-on-surface leading-tight">
                Your AI-Powered <span className="text-primary">Healthcare Assistant</span>
              </h1>
              <div className="font-headline-sm text-primary font-medium tracking-wide">
                Bharat ke logo ka Apna health page 🇮🇳
              </div>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
                Instantly check your symptoms, analyze medical reports with AI precision, and connect with trusted
                doctors — all from the comfort of your home.
              </p>
              <div className="mt-xl space-y-md">
                <div className="relative max-w-xl">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">search</span>
                  <input
                    className="w-full pl-12 pr-4 py-5 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary text-body-md placeholder:text-outline-variant medical-glow"
                    placeholder="Describe how you're feeling today..."
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && goToSymptomChecker()}
                  />
                </div>
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={goToSymptomChecker}
                    className="flex items-center gap-2 px-8 py-4 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:opacity-90 transition-all medical-glow"
                  >
                    <span className="material-symbols-outlined">health_metrics</span>
                    Check Symptoms
                  </button>
                  <Link
                    href="/report-analysis"
                    className="flex items-center gap-2 px-8 py-4 bg-surface-container-highest text-primary border border-primary/20 rounded-xl font-label-md text-label-md hover:bg-primary-fixed transition-all"
                  >
                    <span className="material-symbols-outlined">upload_file</span>
                    Upload Report
                  </Link>
                  <Link
                    href="/ai-assistant"
                    className="flex items-center gap-2 px-8 py-4 bg-secondary-container text-on-secondary-container rounded-xl font-label-md text-label-md hover:opacity-90 transition-all medical-glow"
                  >
                    <span className="material-symbols-outlined">smart_toy</span>
                    Talk to AI Assistant
                  </Link>
                </div>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="relative rounded-[32px] overflow-hidden medical-glow border border-outline-variant/20 aspect-square bg-surface-container flex items-center justify-center group">
                <img src="/india-map.png" alt="India AI Health Network" className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:scale-105 group-hover:opacity-100 transition-all duration-700 mix-blend-screen" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none"></div>
                <div className="absolute inset-0 bg-primary/10 mix-blend-overlay pointer-events-none"></div>
                <span className="relative z-10 material-symbols-outlined text-primary drop-shadow-2xl animate-pulse" style={{ fontSize: "120px", filter: "drop-shadow(0 0 20px rgba(0, 191, 165, 0.5))" }}>
                  health_and_safety
                </span>
              </div>
              <div className="absolute -bottom-10 -left-10 bg-surface-container-lowest p-6 rounded-xl medical-glow border border-outline-variant/10 max-w-xs">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-fixed rounded-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">verified_user</span>
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-on-surface">High Accuracy</p>
                    <p className="text-label-sm text-on-surface-variant">On Common Symptoms</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="py-xl max-w-7xl mx-auto px-margin-desktop">
          <div className="mb-lg">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">How can we help today?</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Choose an AI-driven service to get started.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            <Link href="/ai-assistant" className="group bg-surface-container-lowest p-8 rounded-xl medical-glow border border-outline-variant/10 medical-glow-hover cursor-pointer transition-all">
              <div className="w-14 h-14 bg-primary-fixed rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-3xl">psychology</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-3">Talk to AI Assistant</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6">Describe your symptoms and receive instant preliminary guidance.</p>
              <span className="text-primary font-label-md flex items-center gap-1 group-hover:gap-2 transition-all">
                Chat Now <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            </Link>
            <Link href="/report-analysis" className="group bg-surface-container-lowest p-8 rounded-xl medical-glow border border-outline-variant/10 medical-glow-hover cursor-pointer transition-all">
              <div className="w-14 h-14 bg-secondary-fixed rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-secondary text-3xl">radiology</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-3">Analyze Scans</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6">Upload X-rays or MRIs for a detailed AI visual analysis.</p>
              <span className="text-secondary font-label-md flex items-center gap-1 group-hover:gap-2 transition-all">
                Upload Scans <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            </Link>
            <Link href="/doctors" className="group bg-surface-container-lowest p-8 rounded-xl medical-glow border border-outline-variant/10 medical-glow-hover cursor-pointer transition-all">
              <div className="w-14 h-14 bg-primary-fixed rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-primary text-3xl">person_search</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-surface mb-3">Find a Doctor</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6">Connect with verified specialists for a consultation.</p>
              <span className="text-primary font-label-md flex items-center gap-1 group-hover:gap-2 transition-all">
                Browse <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </span>
            </Link>
            <Link href="/emergency" className="group bg-tertiary-fixed p-8 rounded-xl medical-glow border border-outline-variant/10 medical-glow-hover cursor-pointer transition-all">
              <div className="w-14 h-14 bg-tertiary-container rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-white text-3xl">emergency</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-on-tertiary-fixed mb-3">Emergency Help</h3>
              <p className="font-body-md text-body-md text-on-tertiary-fixed-variant mb-6">Immediate support and emergency contact numbers.</p>
              <span className="text-tertiary font-label-md flex items-center gap-1 group-hover:gap-2 transition-all font-bold">
                Call Emergency <span className="material-symbols-outlined text-sm">call</span>
              </span>
            </Link>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-xl bg-surface-container-low">
          <div className="max-w-7xl mx-auto px-margin-desktop">
            <div className="text-center mb-xl">
              <h2 className="font-headline-lg text-headline-lg text-on-surface">How Health Screening Works</h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant mt-4">Simple, fast steps to better health.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-xl relative">
              {[
                { n: 1, title: "Input Symptoms", desc: "Describe how you feel or upload a medical report for analysis." },
                { n: 2, title: "AI Diagnostics", desc: "Our trained models compare your data against known symptom patterns." },
                { n: 3, title: "Next Steps", desc: "Receive a summary and guidance on next steps, including doctor visits." },
              ].map((step) => (
                <div key={step.n} className="text-center">
                  <div className="relative z-10 w-20 h-20 bg-primary text-on-primary rounded-full flex items-center justify-center font-headline-lg text-headline-lg mx-auto mb-6">
                    {step.n}
                  </div>
                  <h4 className="font-headline-md text-headline-md text-on-surface mb-3">{step.title}</h4>
                  <p className="font-body-md text-body-md text-on-surface-variant">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trusted Doctors - live from API */}
        <section className="py-xl max-w-7xl mx-auto px-margin-desktop">
          <div className="flex justify-between items-end mb-lg">
            <div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">Consult with Trusted Doctors</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-2">Book appointments with top-rated medical specialists.</p>
            </div>
            <Link href="/doctors" className="text-primary font-label-md flex items-center gap-2 hover:underline">
              View All Specialists <span className="material-symbols-outlined">chevron_right</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {doctors.map((doc) => (
              <div key={doc.id} className="bg-surface-container-lowest rounded-xl overflow-hidden medical-glow border border-outline-variant/10 group p-6">
                <div className="w-16 h-16 bg-primary-fixed rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-primary text-3xl">person</span>
                </div>
                <p className="text-primary font-label-sm text-label-sm uppercase tracking-wider">{doc.specialty}</p>
                <h4 className="font-headline-md text-headline-md text-on-surface mt-1">{doc.name}</h4>
                <p className="text-body-md text-on-surface-variant mt-2">{doc.bio}</p>
                <Link
                  href={`/appointments?doctorId=${doc.id}`}
                  className="block text-center w-full mt-6 py-3 bg-surface-container text-primary font-label-md rounded-xl group-hover:bg-primary group-hover:text-on-primary transition-all"
                >
                  Book Session
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* FAQs */}
        <section className="py-xl max-w-3xl mx-auto px-margin-mobile md:px-0">
          <h2 className="font-headline-lg text-headline-lg text-on-surface text-center mb-xl">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <FaqItem key={f.q} q={f.q} a={f.a} />
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
