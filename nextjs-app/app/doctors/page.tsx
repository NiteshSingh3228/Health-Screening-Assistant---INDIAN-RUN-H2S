"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";

const SPECIALTIES = ["All", "Cardiology", "Dermatology", "Neurology", "Pediatrics", "Psychiatry", "General Physician"];

export default function FindADoctor() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [specialty, setSpecialty] = useState("All");
  const [search, setSearch] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: "", specialty: "", phone: "", bio: "" });
  const [loading, setLoading] = useState(true);
  const [aiQuery, setAiQuery] = useState("");
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [bestMatchId, setBestMatchId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    api
      .getDoctors(specialty)
      .then(setDoctors)
      .catch(() => setDoctors([]))
      .finally(() => setLoading(false));
  };

  useEffect(load, [specialty]);

  const filtered = doctors.filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) || d.specialty.toLowerCase().includes(search.toLowerCase())
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoc.name || !newDoc.specialty || !newDoc.phone) return;
    await api.addDoctor(newDoc);
    setNewDoc({ name: "", specialty: "", phone: "", bio: "" });
    setShowAddForm(false);
    load();
  };

  const handleRemove = async (id: string) => {
    await api.removeDoctor(id);
    load();
  };

  const handleAiSearch = async () => {
    if (!aiQuery.trim()) return;
    setIsAiSearching(true);
    setAiRecommendation(null);
    setBestMatchId(null);
    try {
      const result = await api.matchDoctor(aiQuery);
      setDoctors(result.top_candidates);
      setAiRecommendation(result.ai_recommendation);
      setBestMatchId(result.best_match.id);
    } catch (err) {
      console.error(err);
      setAiRecommendation("Failed to connect to the AI Matchmaker. Please try again.");
    } finally {
      setIsAiSearching(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-xl px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
        <header className="mb-lg flex flex-col md:flex-row md:items-end md:justify-between gap-md">
          <div>
            <h1 className="font-display-lg text-display-lg text-on-surface mb-sm">Find Your Specialist</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              Browse verified doctors and book a digital or physical consultation.
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-md py-sm bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:opacity-90 h-fit"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Add Doctor
          </button>
        </header>

        {showAddForm && (
          <form onSubmit={handleAdd} className="mb-lg bg-surface-container-lowest p-lg rounded-2xl medical-glow border border-outline-variant/30 grid grid-cols-1 md:grid-cols-4 gap-md items-end">
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant">Name</label>
              <input
                required
                value={newDoc.name}
                onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                className="w-full mt-1 rounded-lg bg-surface-container-low border-outline-variant px-3 py-2"
                placeholder="Dr. Jane Doe"
              />
            </div>
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant">Specialty</label>
              <input
                required
                value={newDoc.specialty}
                onChange={(e) => setNewDoc({ ...newDoc, specialty: e.target.value })}
                className="w-full mt-1 rounded-lg bg-surface-container-low border-outline-variant px-3 py-2"
                placeholder="Cardiology"
              />
            </div>
            <div>
              <label className="font-label-sm text-label-sm text-on-surface-variant">Phone</label>
              <input
                required
                value={newDoc.phone}
                onChange={(e) => setNewDoc({ ...newDoc, phone: e.target.value })}
                className="w-full mt-1 rounded-lg bg-surface-container-low border-outline-variant px-3 py-2"
                placeholder="+91..."
              />
            </div>
            <button type="submit" className="py-2 bg-primary text-on-primary rounded-lg font-label-md">
              Save Doctor
            </button>
          </form>
        )}

        <div className="mb-lg relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-lowest border-outline-variant rounded-xl pl-14 pr-md py-md focus:ring-2 focus:ring-primary transition-all text-body-md shadow-sm border"
            placeholder="Search by doctor name or specialty..."
          />
        </div>

        <div className="mb-lg bg-surface-container-low p-md rounded-2xl border border-primary/20 flex flex-col md:flex-row gap-sm items-center">
          <span className="material-symbols-outlined text-primary hidden md:block ml-sm">psychology</span>
          <input
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAiSearch()}
            className="flex-1 bg-surface-container-lowest border-outline-variant rounded-xl px-md py-md focus:ring-2 focus:ring-primary transition-all text-body-md shadow-sm border w-full"
            placeholder="AI Matchmaker: Describe your symptoms (e.g. 'I have a fever and cough')..."
          />
          <button
            onClick={handleAiSearch}
            disabled={isAiSearching || !aiQuery}
            className="w-full md:w-auto px-xl py-md bg-gradient-to-r from-primary to-secondary text-white font-label-md rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isAiSearching ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <span className="material-symbols-outlined">auto_awesome</span>}
            Find Match
          </button>
        </div>

        {aiRecommendation && (
          <div className="mb-lg p-lg rounded-2xl bg-primary-fixed/20 border border-primary/30 medical-glow">
            <h3 className="font-label-lg text-primary flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined">robot_2</span> AI Recommendation
            </h3>
            <p className="font-body-md text-on-surface">{aiRecommendation}</p>
          </div>
        )}

        <div className="flex flex-wrap gap-sm mb-lg">
          {SPECIALTIES.map((s) => (
            <button
              key={s}
              onClick={() => setSpecialty(s)}
              className={
                specialty === s
                  ? "px-md py-xs rounded-full bg-primary text-on-primary font-label-md text-label-sm"
                  : "px-md py-xs rounded-full bg-surface-container text-on-surface font-label-md text-label-sm hover:bg-surface-container-high"
              }
            >
              {s}
            </button>
          ))}
        </div>

        {loading && <p className="font-body-md text-on-surface-variant">Loading doctors...</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {filtered.map((doc) => (
            <div key={doc.id} className={`rounded-xl overflow-hidden p-6 relative transition-all duration-500 ${doc.id === bestMatchId ? 'bg-primary-fixed/20 border-2 border-primary shadow-[0_0_30px_rgba(0,191,165,0.3)] transform scale-[1.02]' : 'bg-surface-container-lowest medical-glow border border-outline-variant/10'}`}>
              {doc.id === bestMatchId && (
                <div className="absolute top-0 left-0 w-full bg-primary text-on-primary text-center py-1 font-label-sm tracking-widest uppercase">
                  ⭐ AI Top Pick
                </div>
              )}
              <button
                onClick={() => handleRemove(doc.id)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container hover:bg-error-container flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
                title="Remove doctor"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
              <div className="w-16 h-16 bg-primary-fixed rounded-full flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-primary text-3xl">person</span>
              </div>
              <p className="text-primary font-label-sm text-label-sm uppercase tracking-wider">{doc.specialty}</p>
              <h3 className="font-headline-md text-[20px] text-on-surface mt-1">{doc.name}</h3>
              {doc.rating && (
                <p className="text-label-sm text-on-surface-variant mt-1">
                  ★ {doc.rating} ({doc.reviews}+ reviews)
                </p>
              )}
              {doc.bio && <p className="text-body-md text-on-surface-variant mt-2">{doc.bio}</p>}
              <div className="flex gap-sm mt-6">
                <a
                  href={`tel:${doc.phone}`}
                  className="flex-1 py-3 bg-surface-container text-primary font-label-md rounded-xl hover:bg-primary hover:text-on-primary transition-all text-center flex items-center justify-center gap-1"
                >
                  <span className="material-symbols-outlined text-[18px]">call</span>
                  Call
                </a>
                <Link
                  href={`/appointments?doctorId=${doc.id}&doctorName=${encodeURIComponent(doc.name)}`}
                  className="flex-[1.5] py-3 bg-primary text-on-primary font-label-md rounded-xl hover:opacity-90 transition-all text-center"
                >
                  Book Appointment
                </Link>
              </div>
            </div>
          ))}
        </div>

        {!loading && filtered.length === 0 && (
          <p className="text-center font-body-md text-on-surface-variant py-xl">No doctors match your search.</p>
        )}
      </main>
      <Footer />
    </>
  );
}
