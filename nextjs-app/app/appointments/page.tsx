"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { api } from "@/lib/api";

export default function AppointmentsPage() {
  return (
    <Suspense fallback={null}>
      <Appointments />
    </Suspense>
  );
}

function Appointments() {
  const searchParams = useSearchParams();
  const [doctors, setDoctors] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);

  const [doctorId, setDoctorId] = useState(searchParams.get("doctorId") || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [consultationType, setConsultationType] = useState("In-person");
  const [booking, setBooking] = useState(false);

  const [medName, setMedName] = useState("");
  const [timesPerDay, setTimesPerDay] = useState(1);

  const loadAll = () => {
    api.getDoctors().then(setDoctors).catch(() => setDoctors([]));
    api.getAppointments().then(setAppointments).catch(() => setAppointments([]));
    api.getReminders().then(setReminders).catch(() => setReminders([]));
  };

  useEffect(loadAll, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId || !date || !time) return;
    setBooking(true);
    const doctor = doctors.find((d) => d.id === doctorId);
    try {
      await api.bookAppointment({
        doctor_id: doctorId,
        doctor_name: doctor?.name || searchParams.get("doctorName") || "",
        date,
        time,
        consultation_type: consultationType,
      });
      setDate("");
      setTime("");
      loadAll();
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async (id: string) => {
    await api.cancelAppointment(id);
    loadAll();
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName) return;
    await api.addReminder({ medicine_name: medName, times_per_day: timesPerDay });
    setMedName("");
    setTimesPerDay(1);
    loadAll();
  };

  const handleRemoveReminder = async (id: string) => {
    await api.removeReminder(id);
    loadAll();
  };

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-xl px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
        <header className="mb-lg">
          <h1 className="font-display-lg text-display-lg text-on-background mb-sm">Dashboard</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Manage your health schedule, upcoming consultations, and medication reminders.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
          {/* Left/Main column */}
          <div className="lg:col-span-2 flex flex-col gap-gutter">
            {/* Booking form */}
            <section className="bg-surface-container-lowest p-lg rounded-2xl medical-glow border border-outline-variant/30">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-md">Book a New Appointment</h2>
              <form onSubmit={handleBook} className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <select
                  required
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full h-12 bg-surface-container-low border-none rounded-xl px-md font-body-md focus:ring-2 focus:ring-primary transition-all md:col-span-2"
                >
                  <option value="">Select a doctor...</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.specialty}
                    </option>
                  ))}
                </select>
                <input
                  required
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full h-12 bg-surface-container-low border-none rounded-xl px-md font-body-md focus:ring-2 focus:ring-primary transition-all"
                />
                <input
                  required
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full h-12 bg-surface-container-low border-none rounded-xl px-md font-body-md focus:ring-2 focus:ring-primary transition-all"
                />
                <select
                  value={consultationType}
                  onChange={(e) => setConsultationType(e.target.value)}
                  className="w-full h-12 bg-surface-container-low border-none rounded-xl px-md font-body-md focus:ring-2 focus:ring-primary transition-all md:col-span-2"
                >
                  <option>In-person</option>
                  <option>Video Call</option>
                </select>
                <button
                  type="submit"
                  disabled={booking}
                  className="md:col-span-2 h-12 bg-primary text-on-primary rounded-xl font-label-md flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined">calendar_add_on</span>
                  {booking ? "Booking..." : "Confirm Appointment Booking"}
                </button>
              </form>
            </section>

            {/* Upcoming appointments */}
            <section className="bg-surface-container-lowest p-lg rounded-2xl medical-glow border border-outline-variant/30">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-md">Upcoming Appointments</h2>
              {appointments.length === 0 && <p className="font-body-md text-on-surface-variant">No appointments booked yet.</p>}
              <div className="space-y-sm">
                {appointments.map((appt) => (
                  <div key={appt.id} className="flex items-center justify-between p-md rounded-xl bg-surface-container-low">
                    <div>
                      <h3 className="font-label-md text-label-md text-on-surface">{appt.doctor_name || "Doctor"}</h3>
                      <p className="text-label-sm text-on-surface-variant">
                        {appt.date} at {appt.time} • {appt.consultation_type}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCancel(appt.id)}
                      className="px-md py-xs rounded-lg bg-error-container text-on-error-container text-label-sm font-label-sm hover:opacity-90"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar: reminders */}
          <section className="bg-surface-container-lowest p-lg rounded-2xl medical-glow border border-outline-variant/30">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-md">Daily Meds</h2>
            <form onSubmit={handleAddReminder} className="flex flex-col gap-sm mb-md">
              <input
                value={medName}
                onChange={(e) => setMedName(e.target.value)}
                placeholder="Medicine name"
                className="w-full h-11 bg-surface-container-low border-none rounded-xl px-md font-body-md focus:ring-2 focus:ring-primary"
              />
              <div className="flex gap-sm">
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={timesPerDay}
                  onChange={(e) => setTimesPerDay(Number(e.target.value))}
                  className="w-20 h-11 bg-surface-container-low border-none rounded-xl px-md font-body-md focus:ring-2 focus:ring-primary"
                />
                <button type="submit" className="flex-1 h-11 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:opacity-90">
                  Add Reminder
                </button>
              </div>
            </form>
            <div className="space-y-sm">
              {reminders.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-sm rounded-xl bg-surface-container-low">
                  <span className="font-body-md text-on-surface">
                    {r.medicine_name} — {r.times_per_day}x/day
                  </span>
                  <button onClick={() => handleRemoveReminder(r.id)} className="text-on-surface-variant hover:text-error">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
