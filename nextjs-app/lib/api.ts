const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

export const api = {
  // Health
  healthCheck: () => request("/"),

  // Doctors
  getDoctors: (specialty?: string) =>
    request(`/doctors${specialty && specialty !== "All" ? `?specialty=${encodeURIComponent(specialty)}` : ""}`),
  addDoctor: (doc: { name: string; specialty: string; phone: string; bio?: string }) =>
    request("/doctors", { method: "POST", body: JSON.stringify(doc) }),
  removeDoctor: (id: string) => request(`/doctors/${id}`, { method: "DELETE" }),
  matchDoctor: (query: string): Promise<{
    best_match: any;
    top_candidates: any[];
    ai_recommendation: string;
  }> => request("/match-doctor", { method: "POST", body: JSON.stringify({ query }) }),

  // Appointments
  getAppointments: () => request("/appointments"),
  bookAppointment: (appt: {
    doctor_id: string;
    doctor_name?: string;
    date: string;
    time: string;
    consultation_type?: string;
  }) => request("/appointments", { method: "POST", body: JSON.stringify(appt) }),
  cancelAppointment: (id: string) => request(`/appointments/${id}`, { method: "DELETE" }),

  // Reminders
  getReminders: () => request("/reminders"),
  addReminder: (rem: { medicine_name: string; times_per_day: number; notes?: string }) =>
    request("/reminders", { method: "POST", body: JSON.stringify(rem) }),
  removeReminder: (id: string) => request(`/reminders/${id}`, { method: "DELETE" }),

  // Emergency
  getContacts: () => request("/emergency/contacts"),
  addContact: (c: { name: string; relation: string; phone: string }) =>
    request("/emergency/contacts", { method: "POST", body: JSON.stringify(c) }),
  removeContact: (id: string) => request(`/emergency/contacts/${id}`, { method: "DELETE" }),
  getEmergencyNumbers: () => request("/emergency/numbers"),

  // Profile
  getProfile: () => request("/profile"),
  updateProfile: (p: {
    name: string;
    email: string;
    phone: string;
    date_of_birth?: string;
    address?: string;
  }) => request("/profile", { method: "PUT", body: JSON.stringify(p) }),

  // Symptom Checker — uses the trained Random Forest model vocabulary
  getSymptoms: (): Promise<{ symptoms: string[] }> => request("/symptoms"),
  checkSymptoms: (symptoms: string[]): Promise<{
    conditions: Array<{
      name: string;
      confidence: number;
      description: string;
      precautions: string[];
    }>;
    matched_symptoms: string[];
    unmatched: string[];
    severity_score: number;
    ai_summary: string;
  }> => request("/symptom-check", { method: "POST", body: JSON.stringify({ symptoms }) }),

  // Report Analysis — supports xray | mri | covid
  analyzeReport: async (
    reportType: "xray" | "mri" | "covid",
    file: File
  ): Promise<{
    results: Array<{ label: string; confidence: number }>;
    top_prediction: { label: string; confidence: number };
  }> => {
    const formData = new FormData();
    formData.append("report_type", reportType);
    formData.append("file", file);
    const res = await fetch(`${API_URL}/analyze-report`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        throw new Error(json.detail || "Analysis failed");
      } catch {
        throw new Error("Analysis failed");
      }
    }
    return res.json();
  },

  // AI Assistant Chat
  chatWithAI: (
    message: string,
    history: Array<{ role: string; content: string }> = []
  ): Promise<{ reply: string }> =>
    request("/chat", { method: "POST", body: JSON.stringify({ message, history }) }),
};
