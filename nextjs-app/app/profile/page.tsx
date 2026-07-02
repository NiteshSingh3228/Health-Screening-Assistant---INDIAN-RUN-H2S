"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";

export default function Profile() {
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", date_of_birth: "", address: "" });
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [appointments, setAppointments] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    api.getProfile().then(setProfile).catch(() => {});
    api.getAppointments().then(setAppointments).catch(() => setAppointments([]));
    api.getReminders().then(setReminders).catch(() => setReminders([]));
    api.getContacts().then(setContacts).catch(() => setContacts([]));
    api.getDoctors().then(setDoctors).catch(() => setDoctors([]));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateProfile(profile);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-xl px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
          {/* Left: avatar card */}
          <section className="bg-surface-container-lowest p-lg rounded-2xl medical-glow border border-outline-variant/30 text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-primary-fixed flex items-center justify-center mb-md">
              <span className="material-symbols-outlined text-primary text-5xl">person</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface">{profile.name || "Your Name"}</h2>
            <p className="text-label-sm text-on-surface-variant mt-1">{profile.email}</p>
            <div className="grid grid-cols-3 gap-sm mt-lg">
              <div className="p-sm rounded-xl bg-surface-container-low">
                <span className="material-symbols-outlined text-primary">verified</span>
                <p className="text-label-sm mt-1">Verified</p>
              </div>
              <div className="p-sm rounded-xl bg-surface-container-low">
                <span className="material-symbols-outlined text-primary">lock</span>
                <p className="text-label-sm mt-1">2FA On</p>
              </div>
              <div className="p-sm rounded-xl bg-surface-container-low">
                <span className="material-symbols-outlined text-primary">notifications</span>
                <p className="text-label-sm mt-1">Updates</p>
              </div>
            </div>
          </section>

          {/* Right: details + overview */}
          <div className="lg:col-span-2 flex flex-col gap-gutter">
            <section className="bg-surface-container-lowest p-lg rounded-2xl medical-glow border border-outline-variant/30">
              <div className="flex justify-between items-center mb-md">
                <h1 className="font-headline-lg text-headline-lg text-on-surface">Personal Information</h1>
                <button
                  onClick={() => setEditing(!editing)}
                  className="flex items-center gap-1 text-primary font-label-md text-label-sm hover:underline"
                >
                  <span className="material-symbols-outlined text-sm">edit</span> {editing ? "Cancel" : "Edit Details"}
                </button>
              </div>

              {!editing ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  {[
                    ["Full Name", profile.name],
                    ["Email", profile.email],
                    ["Phone", profile.phone],
                    ["Date of Birth", profile.date_of_birth],
                    ["Address", profile.address],
                  ].map(([label, value]) => (
                    <div key={label as string}>
                      <p className="text-label-sm text-on-surface-variant">{label}</p>
                      <p className="font-body-md text-on-surface">{value || "—"}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <input
                    required
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    placeholder="Full Name"
                    className="h-11 rounded-lg px-3 border border-outline-variant"
                  />
                  <input
                    required
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    placeholder="Email"
                    className="h-11 rounded-lg px-3 border border-outline-variant"
                  />
                  <input
                    required
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="Phone"
                    className="h-11 rounded-lg px-3 border border-outline-variant"
                  />
                  <input
                    type="date"
                    value={profile.date_of_birth}
                    onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                    className="h-11 rounded-lg px-3 border border-outline-variant"
                  />
                  <input
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    placeholder="Address"
                    className="h-11 rounded-lg px-3 border border-outline-variant md:col-span-2"
                  />
                  <button
                    type="submit"
                    disabled={saving}
                    className="md:col-span-2 h-11 bg-primary text-on-primary rounded-lg font-label-md disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </form>
              )}
            </section>

            {/* Quick overview of saved data across the app */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-gutter">
              <section className="bg-surface-container-lowest p-md rounded-2xl medical-glow border border-outline-variant/30">
                <h3 className="font-label-md text-label-md text-primary mb-sm">Appointments</h3>
                <p className="font-headline-lg text-headline-lg text-on-surface">{appointments.length}</p>
                <p className="text-label-sm text-on-surface-variant">upcoming</p>
              </section>
              <section className="bg-surface-container-lowest p-md rounded-2xl medical-glow border border-outline-variant/30">
                <h3 className="font-label-md text-label-md text-primary mb-sm">Reminders</h3>
                <p className="font-headline-lg text-headline-lg text-on-surface">{reminders.length}</p>
                <p className="text-label-sm text-on-surface-variant">active</p>
              </section>
              <section className="bg-surface-container-lowest p-md rounded-2xl medical-glow border border-outline-variant/30">
                <h3 className="font-label-md text-label-md text-primary mb-sm">Emergency Contacts</h3>
                <p className="font-headline-lg text-headline-lg text-on-surface">{contacts.length}</p>
                <p className="text-label-sm text-on-surface-variant">saved</p>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
