"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";

export default function Emergency() {
  const [contacts, setContacts] = useState<any[]>([]);
  const [numbers, setNumbers] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", relation: "", phone: "" });

  const load = () => {
    api.getContacts().then(setContacts).catch(() => setContacts([]));
    api.getEmergencyNumbers().then(setNumbers).catch(() => setNumbers([]));
  };

  useEffect(load, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContact.name || !newContact.phone) return;
    await api.addContact(newContact);
    setNewContact({ name: "", relation: "", phone: "" });
    setShowAddForm(false);
    load();
  };

  const handleRemove = async (id: string) => {
    await api.removeContact(id);
    load();
  };

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-xl px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
        {/* Emergency Center banner */}
        <section className="mb-lg bg-tertiary-container rounded-2xl p-lg text-center">
          <span className="material-symbols-outlined text-on-tertiary-container text-5xl mb-sm">emergency</span>
          <h1 className="font-display-lg text-display-lg text-on-tertiary-container">Emergency Center</h1>
          <p className="font-body-lg text-body-lg text-on-tertiary-container/80 mt-sm mb-md">
            Immediate assistance is available. Stay calm and follow the prompts below.
          </p>
          <a
            href="tel:112"
            className="inline-flex items-center gap-2 px-xl py-md bg-on-tertiary-container text-tertiary-container rounded-xl font-headline-md text-headline-md hover:opacity-90 transition-all"
          >
            <span className="material-symbols-outlined">call</span>
            Call Emergency (112)
          </a>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter mb-lg">
          {/* Personal Contacts */}
          <section className="bg-surface-container-lowest p-lg rounded-2xl medical-glow border border-outline-variant/30">
            <div className="flex justify-between items-center mb-md">
              <h2 className="font-headline-md text-headline-md">Personal Contacts</h2>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-1 text-primary font-label-md text-label-sm hover:underline"
              >
                <span className="material-symbols-outlined text-[20px]">add_circle</span> Add New
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAdd} className="mb-md p-md bg-surface-container-low rounded-xl grid grid-cols-1 gap-sm">
                <input
                  required
                  placeholder="Name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  className="h-11 rounded-lg px-3 border border-outline-variant"
                />
                <input
                  placeholder="Relation (e.g. Wife, Friend)"
                  value={newContact.relation}
                  onChange={(e) => setNewContact({ ...newContact, relation: e.target.value })}
                  className="h-11 rounded-lg px-3 border border-outline-variant"
                />
                <input
                  required
                  placeholder="Phone"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  className="h-11 rounded-lg px-3 border border-outline-variant"
                />
                <button type="submit" className="h-11 bg-primary text-on-primary rounded-lg font-label-md">
                  Save Contact
                </button>
              </form>
            )}

            <div className="space-y-sm">
              {contacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-md rounded-xl bg-surface-container-low">
                  <div>
                    <p className="font-label-md text-label-md text-on-surface">{c.name}</p>
                    <p className="text-label-sm text-on-surface-variant">{c.relation}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`tel:${c.phone}`} className="w-9 h-9 bg-primary-fixed rounded-full flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[18px]">call</span>
                    </a>
                    <button
                      onClick={() => handleRemove(c.id)}
                      className="w-9 h-9 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant hover:text-error"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
              {contacts.length === 0 && <p className="font-body-md text-on-surface-variant">No personal contacts saved yet.</p>}
            </div>
          </section>

          {/* Public Emergency Services */}
          <section className="bg-surface-container-lowest p-lg rounded-2xl medical-glow border border-outline-variant/30">
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-md">Public Emergency Services</h2>
            <div className="grid grid-cols-2 gap-sm">
              {numbers.map((n) => (
                <a
                  key={n.name}
                  href={`tel:${n.number}`}
                  className="flex flex-col items-center justify-center gap-1 p-md rounded-xl bg-surface-container-low hover:bg-primary-fixed/30 transition-colors"
                >
                  <span className="font-headline-md text-headline-md text-primary">{n.name}</span>
                  <span className="text-label-md text-on-surface-variant">{n.number}</span>
                </a>
              ))}
            </div>
          </section>
        </div>

        <section className="p-lg rounded-2xl bg-error-container/40 border border-error/10">
          <h3 className="font-headline-md text-headline-md text-tertiary mb-xs">What counts as an Emergency?</h3>
          <p className="font-body-md text-on-surface-variant">
            If you or someone else is experiencing chest pain, difficulty breathing, sudden weakness, severe
            bleeding, or loss of consciousness, please call emergency services immediately. Do not attempt to drive
            yourself to the hospital.
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
