"""
Health Screening Assistant — Single Unified Backend  v3.0
===========================================================
Merges backend.py (full CRUD + ML) and backend copy.py (Anthropic AI + TF/Keras support).

Supports two model flavours side-by-side:
  • Random Forest (.joblib)   — trained by train_models.py   [primary]
  • Keras CNN     (.keras)    — trained by train_image_model.py [fallback / future use]

AI explanation order: OpenAI → Anthropic → smart template.

Endpoints
---------
  GET    /                          Health check + model status
  GET    /symptoms                  All known symptom strings (from RF vocab)
  POST   /symptom-check             {symptoms:[...]} → top-3 diseases + AI summary
  GET    /doctors                   List doctors  (?specialty=...)
  POST   /doctors                   Add a doctor
  DELETE /doctors/{id}              Remove a doctor
  GET    /appointments              List appointments
  POST   /appointments              Book appointment
  DELETE /appointments/{id}         Cancel appointment
  GET    /reminders                 List medication reminders
  POST   /reminders                 Add reminder
  DELETE /reminders/{id}            Remove reminder
  GET    /emergency/contacts        List emergency contacts
  POST   /emergency/contacts        Add emergency contact
  DELETE /emergency/contacts/{id}   Remove emergency contact
  GET    /emergency/numbers         Built-in service numbers
  GET    /profile                   Get user profile
  PUT    /profile                   Update user profile
  POST   /analyze-report            form: report_type=xray|mri|covid + file
  POST   /chat                      {message, history:[]} → AI chat reply

Run
---
  uvicorn backend:app --reload --port 8000
"""

from __future__ import annotations
import io
import json
import os
import uuid
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
from dotenv import load_dotenv
load_dotenv()
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

class MatchDoctorRequest(BaseModel):
    query: str

# ─── App ─────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Health Screening Assistant API",
    description=(
        "AI-powered health screening: symptom prediction via Random Forest, "
        "medical image classification, doctor bookings, AI chat."
    ),
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Config ───────────────────────────────────────────────────────────────────

MODELS_DIR = os.environ.get("MODELS_DIR", "models")
DATA_FILE   = os.environ.get("DATA_FILE",  "data.json")

# Also support the legacy data_store/ layout from backend copy.py
DATA_STORE_DIR      = "data_store"
DOCTORS_FILE_LEGACY = os.path.join(DATA_STORE_DIR, "doctors.json")
APPT_FILE_LEGACY    = os.path.join(DATA_STORE_DIR, "appointments.json")

DEFAULT_DATA: Dict[str, Any] = {
    "doctors": [
        {"id": "doc1", "name": "Dr. Vikram Singh",    "specialty": "Cardiology",        "phone": "+91 99999 88881", "rating": 4.9, "reviews": 120, "bio": "Expert in heart wellness and hypertension management."},
        {"id": "doc2", "name": "Dr. Sunita Reddy",      "specialty": "Neurology",         "phone": "+91 99999 88882", "rating": 4.8, "reviews":  95, "bio": "Specialized in migraines, sleep disorders and neuro-care."},
        {"id": "doc3", "name": "Dr. Neha Gupta", "specialty": "General Physician", "phone": "+91 99999 88883", "rating": 5.0, "reviews": 200, "bio": "Holistic primary care and preventative health screening."},
        {"id": "doc4", "name": "Dr. Rajesh Kumar",    "specialty": "Pediatrics",        "phone": "+91 99999 88884", "rating": 4.9, "reviews": 150, "bio": "Focused on infant growth, nutrition, and child health."},
        {"id": "doc5", "name": "Dr. Priya Kapoor",   "specialty": "Pulmonology",       "phone": "+91 99999 88885", "rating": 4.7, "reviews":  80, "bio": "Expert in respiratory diseases, asthma and COVID-19 management."},
        {"id": "doc6", "name": "Dr. Arjun Mehta",    "specialty": "Radiology",         "phone": "+91 99999 88886", "rating": 4.8, "reviews": 110, "bio": "Specialized in interpreting X-rays, CT scans and MRI reports."},
        # Legacy doctors from backend copy.py
        {"id": "doc7", "name": "Dr. Anjali Sharma",  "specialty": "General Physician", "phone": "+919800000001",   "rating": 4.6, "reviews":  75, "bio": "Comprehensive primary care for all age groups."},
        {"id": "doc8", "name": "Dr. Rohan Mehta",    "specialty": "Pulmonology",       "phone": "+919800000002",   "rating": 4.5, "reviews":  60, "bio": "Lung health, asthma and COPD management."},
        {"id": "doc9", "name": "Dr. Kavita Rao",     "specialty": "Neurology",         "phone": "+919800000003",   "rating": 4.7, "reviews":  88, "bio": "Brain, spine and peripheral nervous system disorders."},
    ],
    "appointments":     [],
    "reminders":        [],
    "emergency_contacts": [],
    "profile": {
        "name":          "Aditi Sharma",
        "email":         "aditi.sharma@example.com",
        "phone":         "+91 98765 43210",
        "date_of_birth": "1990-01-01",
        "address":       "123 Health Ave, Medical District",
    },
}


# ─── Persistence ──────────────────────────────────────────────────────────────

def _load_data() -> Dict[str, Any]:
    if not os.path.exists(DATA_FILE):
        # Try to migrate from legacy data_store/ layout
        migrated = _migrate_legacy_data()
        _save_data(migrated)
        return migrated
    try:
        with open(DATA_FILE) as f:
            return json.load(f)
    except Exception:
        return dict(DEFAULT_DATA)


def _save_data(data: Dict[str, Any]) -> None:
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)


def _migrate_legacy_data() -> Dict[str, Any]:
    """Pull doctors / appointments from legacy data_store/ if present."""
    data = dict(DEFAULT_DATA)
    try:
        if os.path.exists(DOCTORS_FILE_LEGACY):
            with open(DOCTORS_FILE_LEGACY) as f:
                data["doctors"] = json.load(f)
        if os.path.exists(APPT_FILE_LEGACY):
            with open(APPT_FILE_LEGACY) as f:
                data["appointments"] = json.load(f)
    except Exception:
        pass
    return data


def _mp(name: str) -> str:
    """Return full path to a model file, trying .joblib then .pkl."""
    for ext in (".joblib", ".pkl"):
        p = os.path.join(MODELS_DIR, name + ext)
        if os.path.exists(p):
            return p
    return os.path.join(MODELS_DIR, name + ".joblib")   # default (may not exist)


def _models_ready() -> bool:
    return os.path.exists(_mp("symptom_model"))


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────

class DoctorCreate(BaseModel):
    name: str
    specialty: str
    phone: str
    bio: Optional[str] = ""

class AppointmentCreate(BaseModel):
    doctor_id: str
    doctor_name: Optional[str] = ""
    date: str
    time: str
    consultation_type: Optional[str] = "In-person"

class ReminderCreate(BaseModel):
    medicine_name: str
    times_per_day: int
    notes: Optional[str] = ""

class ContactCreate(BaseModel):
    name: str
    relation: str
    phone: str

class ProfileUpdate(BaseModel):
    name: str
    email: str
    phone: str
    date_of_birth: Optional[str] = ""
    address: Optional[str] = ""

class SymptomRequest(BaseModel):
    symptoms: List[str]

class ChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, Any]]] = []


# ─── ML Loaders (lazy, cached) ────────────────────────────────────────────────

_symptom_model      = None
_label_encoder      = None
_vocab: List[str]   = []
_descriptions: dict = {}
_precautions:  dict = {}
_severity:     dict = {}
_image_pipelines: dict = {}


def _load_symptom_model() -> bool:
    global _symptom_model, _label_encoder, _vocab, _descriptions, _precautions, _severity
    if _symptom_model is not None:
        return True
    mp = _mp("symptom_model")
    if not os.path.exists(mp):
        return False
    try:
        _symptom_model = joblib.load(mp)
        _label_encoder = joblib.load(_mp("symptom_label_encoder"))
        vocab_path = os.path.join(MODELS_DIR, "symptom_vocab.json")
        _vocab = json.load(open(vocab_path)) if os.path.exists(vocab_path) else []
        for fname, target in [
            ("disease_descriptions.json", "_descriptions"),
            ("disease_precautions.json",  "_precautions"),
            ("symptom_severity.json",     "_severity"),
        ]:
            path = os.path.join(MODELS_DIR, fname)
            if os.path.exists(path):
                globals()[target] = json.load(open(path))
        return True
    except Exception as exc:
        print(f"[WARN] Could not load symptom model: {exc}")
        return False


def _get_image_pipeline(model_type: str):
    """
    Load image pipeline.  Priority:
      1. RF .joblib  (trained by train_models.py)
      2. Keras .keras (trained by train_image_model.py or TF script)
    """
    if model_type in _image_pipelines:
        return _image_pipelines[model_type], "rf"

    # Try Random Forest / PCA joblib
    rf_path = _mp(f"{model_type}_model")
    if os.path.exists(rf_path):
        pipeline = joblib.load(rf_path)
        _image_pipelines[model_type] = pipeline
        return pipeline, "rf"

    # Try Keras
    keras_path = os.path.join(MODELS_DIR, f"{model_type}_model.keras")
    if os.path.exists(keras_path):
        import tensorflow as tf
        model = tf.keras.models.load_model(keras_path)
        _image_pipelines[model_type] = model
        return model, "keras"

    return None, None


# ─── AI Helpers ───────────────────────────────────────────────────────────────

def _ai_symptom_summary(symptoms: List[str], conditions: List[dict]) -> str:
    """OpenAI → Anthropic → template."""
    top          = conditions[0]
    symptom_str  = ", ".join(s.replace("_", " ").title() for s in symptoms)
    cond_str     = "; ".join(f"{c['name']} ({c['confidence']}%)" for c in conditions[:3])
    prompt       = (
        f"A user reports these symptoms: {symptom_str}. "
        f"A health screening model estimates: {cond_str}. "
        "Write a concise (3-4 sentence), warm, plain-language health summary. "
        "Do NOT name any medications or dosages. "
        "End by strongly recommending a doctor visit for proper diagnosis."
    )

    openrouter_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("OPENAI_API_KEY", "")
    if openrouter_key:
        try:
            import openai
            client = openai.OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=openrouter_key,
            )
            resp = client.chat.completions.create(
                model="openai/gpt-oss-120b:free",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                extra_body={"reasoning": {"enabled": True}}
            )
            return resp.choices[0].message.content.strip()
        except Exception as e:
            print(f"[WARN] OpenRouter API error: {e}")
            pass

    # Smart template (from backend copy.py style)
    severity_hint = ""
    if top["confidence"] >= 70:
        severity_hint = "The pattern of your symptoms closely matches this condition. "
    elif top["confidence"] >= 45:
        severity_hint = "Your symptoms show a moderate pattern — worth monitoring carefully. "
    else:
        severity_hint = "Your symptoms show a mild pattern common in minor infections. "
    return (
        f"Based on the symptoms you reported ({symptom_str}), our AI screening model "
        f"identified **{top['name']}** as the closest match ({top['confidence']}% confidence). "
        f"{severity_hint}"
        "This is a preliminary screening result, not a medical diagnosis — "
        "please consult a qualified doctor to confirm and receive proper treatment."
    )


def _ai_chat_response(message: str, history: List[dict]) -> str:
    """OpenAI → Anthropic → rule-based fallback."""
    system = (
        "You are a compassionate AI health screening assistant. "
        "You help users understand their symptoms, navigate the app features, "
        "and guide them toward medical professionals. "
        "Never prescribe medications or make definitive diagnoses. "
        "Keep responses concise (2-4 sentences) and always recommend a doctor for serious concerns."
    )

    openrouter_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("OPENAI_API_KEY", "")
    if openrouter_key:
        try:
            import openai
            client = openai.OpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=openrouter_key,
            )
            msgs = [{"role": "system", "content": system}]
            for h in history[-10:]:
                msg_dict = {"role": h.get("role", "user"), "content": h.get("content", "")}
                if "reasoning_details" in h:
                    msg_dict["reasoning_details"] = h["reasoning_details"]
                msgs.append(msg_dict)
            msgs.append({"role": "user", "content": message})
            resp = client.chat.completions.create(
                model="openai/gpt-oss-120b:free", messages=msgs, max_tokens=300,
                extra_body={"reasoning": {"enabled": True}}
            )
            assistant_message = resp.choices[0].message
            return {
                "reply": assistant_message.content.strip(),
                "reasoning_details": getattr(assistant_message, "reasoning_details", None)
            }
        except Exception as e:
            print(f"[WARN] OpenRouter API error: {e}")
            pass

    # Rule-based (from backend.py v2)
    msg = message.lower()
    if any(k in msg for k in ["symptom", "pain", "hurt", "feel", "cough", "fever", "ache", "nausea"]):
        return ("I'm sorry to hear you're not feeling well. Please use our **AI Symptom Checker** "
                "to get a preliminary assessment. If symptoms are severe, seek emergency care immediately.")
    if any(k in msg for k in ["doctor", "specialist", "appointment", "book", "schedule"]):
        return ("You can view all specialists on the **Doctors** page and book an appointment directly. "
                "Choose a convenient date and time — confirmed in seconds!")
    if any(k in msg for k in ["emergency", "severe", "chest pain", "breathe", "unconscious", "accident"]):
        return ("🚨 **If this is a medical emergency, call 112 immediately.** "
                "Go to the **Emergency** page for quick-dial contacts and local numbers.")
    if any(k in msg for k in ["report", "xray", "x-ray", "mri", "scan", "upload", "covid"]):
        return ("Upload chest X-rays, brain MRIs, or COVID scans on the **Report Analysis** page. "
                "Our AI returns a classification across multiple conditions with confidence scores.")
    if any(k in msg for k in ["hello", "hi", "hey", "help", "start"]):
        return ("Hello! I'm your AI Health Screening Assistant 👋. I can help with symptom analysis, "
                "medical report classification, doctor bookings, and medication reminders. What can I help with?")
    if any(k in msg for k in ["reminder", "medicine", "medication", "pill", "drug"]):
        return ("Add medication reminders on the **Profile** page — set the name and daily frequency "
                "and the app will track them for you.")
    return ("I'm here to help you with symptoms, medical scans, doctors, or health guidance. "
            "Could you tell me more about what you need?")


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    rf_ready = _models_ready()
    return {
        "status":       "ok",
        "version":      "3.0.0",
        "message":      "Health Screening Assistant API is running",
        "models_ready": rf_ready,
        "models": {
            "symptom_rf":   os.path.exists(_mp("symptom_model")),
            "xray_rf":      os.path.exists(_mp("xray_model")),
            "mri_rf":       os.path.exists(_mp("mri_model")),
            "covid_rf":     os.path.exists(_mp("covid_model")),
            "xray_keras":   os.path.exists(os.path.join(MODELS_DIR, "xray_model.keras")),
            "mri_keras":    os.path.exists(os.path.join(MODELS_DIR, "mri_model.keras")),
        },
    }


# ── Symptoms ──────────────────────────────────────────────────────────────────

@app.get("/symptoms")
def get_symptoms():
    if _load_symptom_model() and _vocab:
        return {"symptoms": [s.replace("_", " ").title() for s in _vocab]}
    return {"symptoms": [
        "Fever", "Headache", "Chest Pain", "Cough", "Fatigue", "Vomiting",
        "Dizziness", "Joint Pain", "Nausea", "Shortness Of Breath",
        "Skin Rash", "Itching", "Abdominal Pain", "Back Pain", "Chills",
    ]}


# ── Symptom Checker ────────────────────────────────────────────────────────────

@app.post("/symptom-check")
def symptom_check(req: SymptomRequest):
    if not req.symptoms:
        raise HTTPException(400, "No symptoms provided.")

    if _load_symptom_model():
        try:
            vocab_set = set(_vocab)
            matched   = [s.lower().strip().replace(" ", "_") for s in req.symptoms
                         if s.lower().strip().replace(" ", "_") in vocab_set]
            unmatched = [s for s in req.symptoms
                         if s.lower().strip().replace(" ", "_") not in vocab_set]

            if not matched:
                raise HTTPException(
                    400,
                    f"None of the provided symptoms were recognized. "
                    f"Unmatched: {unmatched}. Please choose from /symptoms."
                )

            severity_score = sum(_severity.get(s, 1) for s in matched)
            vocab_idx = {s: i for i, s in enumerate(_vocab)}
            vec = np.zeros((1, len(_vocab)), dtype=np.uint8)
            for s in matched:
                if s in vocab_idx:
                    vec[0, vocab_idx[s]] = 1

            probs   = _symptom_model.predict_proba(vec)[0]
            top_idx = np.argsort(probs)[-3:][::-1]

            conditions = []
            for idx in top_idx:
                disease = _label_encoder.inverse_transform([idx])[0]
                conditions.append({
                    "name":        disease,
                    "confidence":  round(float(probs[idx]) * 100, 1),
                    "description": _descriptions.get(disease, ""),
                    "precautions": _precautions.get(disease, []),
                })

            summary = _ai_symptom_summary(matched, conditions)
            return {
                "conditions":       conditions,
                "matched_symptoms": matched,
                "unmatched":        unmatched,
                "severity_score":   severity_score,
                "ai_summary":       summary,
            }
        except HTTPException:
            raise
        except Exception as exc:
            print(f"[WARN] ML symptom error: {exc}")

    # Rule-based fallback
    symptoms = [s.lower() for s in req.symptoms]
    conditions = []
    if "chest pain" in symptoms:
        conditions.append({"name": "Angina / Ischemic Heart Disease", "confidence": 75,
                           "description": "Chest pain caused by insufficient blood flow to the heart.",
                           "precautions": ["Rest immediately", "Seek emergency care if pain persists"]})
    if "fever" in symptoms or "cough" in symptoms:
        conditions.append({"name": "Influenza (Flu)", "confidence": 80 if "fever" in symptoms else 55,
                           "description": "A highly contagious viral respiratory infection.",
                           "precautions": ["Get rest", "Stay hydrated", "Take paracetamol for fever"]})
    if "headache" in symptoms:
        conditions.append({"name": "Tension Headache", "confidence": 65,
                           "description": "Mild, dull ache triggered by stress or dehydration.",
                           "precautions": ["Warm compress", "Gentle neck stretches", "Stay hydrated"]})
    if not conditions:
        conditions.append({"name": "General Viral Syndrome", "confidence": 45,
                           "description": "A non-specific viral illness — common with stress or minor infection.",
                           "precautions": ["8 hours sleep", "Stay hydrated", "Monitor temperature"]})
    conditions.sort(key=lambda x: x["confidence"], reverse=True)
    return {
        "conditions":       conditions,
        "matched_symptoms": symptoms,
        "unmatched":        [],
        "severity_score":   0,
        "ai_summary":       _ai_symptom_summary(symptoms, conditions),
    }


# ── Doctors ───────────────────────────────────────────────────────────────────

@app.get("/doctors")
def get_doctors(specialty: Optional[str] = None):
    data = _load_data()
    docs = data.get("doctors", [])
    if specialty and specialty.lower() not in ("all", ""):
        docs = [d for d in docs if d["specialty"].lower() == specialty.lower()]
    return docs

@app.post("/doctors")
def add_doctor(doc: DoctorCreate):
    data = _load_data()
    new_doc = {"id": str(uuid.uuid4()), "name": doc.name, "specialty": doc.specialty,
               "phone": doc.phone, "bio": doc.bio, "rating": 5.0, "reviews": 1}
    data["doctors"].append(new_doc)
    _save_data(data)
    return new_doc

@app.delete("/doctors/{doc_id}")
def remove_doctor(doc_id: str):
    data = _load_data()
    original = data.get("doctors", [])
    data["doctors"] = [d for d in original if d["id"] != doc_id]
    if len(data["doctors"]) == len(original):
        raise HTTPException(404, "Doctor not found.")
    _save_data(data)
    return {"status": "success", "deleted_id": doc_id}


# ── Appointments ──────────────────────────────────────────────────────────────

@app.get("/appointments")
def get_appointments():
    return _load_data().get("appointments", [])

@app.post("/appointments")
def book_appointment(appt: AppointmentCreate):
    data = _load_data()
    new_appt = {"id": str(uuid.uuid4()), "doctor_id": appt.doctor_id,
                "doctor_name": appt.doctor_name, "date": appt.date,
                "time": appt.time, "consultation_type": appt.consultation_type}
    data["appointments"].append(new_appt)
    _save_data(data)
    return new_appt

@app.delete("/appointments/{appt_id}")
def cancel_appointment(appt_id: str):
    data = _load_data()
    data["appointments"] = [a for a in data.get("appointments", []) if a["id"] != appt_id]
    _save_data(data)
    return {"status": "success", "deleted_id": appt_id}


# ── Reminders ─────────────────────────────────────────────────────────────────

@app.get("/reminders")
def get_reminders():
    return _load_data().get("reminders", [])

@app.post("/reminders")
def add_reminder(rem: ReminderCreate):
    data = _load_data()
    new_rem = {"id": str(uuid.uuid4()), "medicine_name": rem.medicine_name,
               "times_per_day": rem.times_per_day, "notes": rem.notes}
    data["reminders"].append(new_rem)
    _save_data(data)
    return new_rem

@app.delete("/reminders/{rem_id}")
def remove_reminder(rem_id: str):
    data = _load_data()
    data["reminders"] = [r for r in data.get("reminders", []) if r["id"] != rem_id]
    _save_data(data)
    return {"status": "success", "deleted_id": rem_id}


# ── Emergency ─────────────────────────────────────────────────────────────────

@app.get("/emergency/contacts")
def get_contacts():
    return _load_data().get("emergency_contacts", [])

@app.post("/emergency/contacts")
def add_contact(c: ContactCreate):
    data = _load_data()
    new_c = {"id": str(uuid.uuid4()), "name": c.name, "relation": c.relation, "phone": c.phone}
    data["emergency_contacts"].append(new_c)
    _save_data(data)
    return new_c

@app.delete("/emergency/contacts/{contact_id}")
def remove_contact(contact_id: str):
    data = _load_data()
    data["emergency_contacts"] = [c for c in data.get("emergency_contacts", [])
                                   if c["id"] != contact_id]
    _save_data(data)
    return {"status": "success", "deleted_id": contact_id}

@app.get("/emergency/numbers")
def get_emergency_numbers():
    return [
        {"name": "Ambulance",                  "number": "102"},
        {"name": "Police",                     "number": "100"},
        {"name": "Fire Brigade",               "number": "101"},
        {"name": "National Emergency Helpline","number": "112"},
        {"name": "Disaster Management",        "number": "108"},
        {"name": "Women Helpline",             "number": "1091"},
    ]


# ── Profile ───────────────────────────────────────────────────────────────────

@app.get("/profile")
def get_profile():
    return _load_data().get("profile", DEFAULT_DATA["profile"])

@app.put("/profile")
def update_profile(p: ProfileUpdate):
    data = _load_data()
    data["profile"] = {"name": p.name, "email": p.email, "phone": p.phone,
                       "date_of_birth": p.date_of_birth, "address": p.address}
    _save_data(data)
    return data["profile"]


# ── Medical Report Analysis ────────────────────────────────────────────────────

@app.post("/analyze-report")
async def analyze_report(report_type: str = Form(...), file: UploadFile = File(...)):
    """
    Supports:
      report_type = xray  → Chest X-Ray (NORMAL / PNEUMONIA)
                  = mri   → Brain MRI   (glioma / meningioma / notumor / pituitary)
                  = covid → COVID-19 Scan (4 classes)

    Model priority:
      1. PCA + Random Forest  (.joblib)   — fastest, no GPU needed
      2. Keras CNN            (.keras)    — higher accuracy if TF is installed
      3. Context-aware mock   (fallback)
    """
    if report_type not in ("xray", "mri", "covid"):
        raise HTTPException(400, "report_type must be one of: xray, mri, covid")

    contents = await file.read()
    pipeline, kind = _get_image_pipeline(report_type)

    if pipeline is not None and kind == "rf":
        try:
            from PIL import Image
            from skimage.feature import hog
            img = Image.open(io.BytesIO(contents)).convert("L").resize((64, 64))
            img_arr = np.array(img).astype(np.float32) / 255.0
            hog_features = hog(img_arr, orientations=9, pixels_per_cell=(8, 8),
                               cells_per_block=(2, 2), feature_vector=True)
            vec = hog_features.reshape(1, -1)
            proba = pipeline.predict_proba(vec)[0]
            classes_path = os.path.join(MODELS_DIR, f"{report_type}_classes.json")
            class_names = json.load(open(classes_path))
            results = [
                {"label": class_names[i], "confidence": round(float(proba[i]) * 100, 1)}
                for i in range(len(class_names))
            ]
            results.sort(key=lambda x: x["confidence"], reverse=True)
            if results[0]["confidence"] < 45.0:
                raise HTTPException(400, "Image mismatch detected: The AI confidence is too low. Please ensure you are uploading the correct type of medical scan for this specific analyzer.")
            return {"results": results, "top_prediction": results[0], "model": "RandomForest"}
        except HTTPException:
            raise
        except Exception as exc:
            print(f"[WARN] RF image model error: {exc}")

    if pipeline is not None and kind == "keras":
        try:
            from PIL import Image
            img = Image.open(io.BytesIO(contents)).convert("RGB").resize((160, 160))
            arr = np.expand_dims(np.array(img), axis=0)
            preds = pipeline.predict(arr)[0]
            classes_path = os.path.join(MODELS_DIR, f"{report_type}_classes.json")
            class_names = json.load(open(classes_path))
            results = [
                {"label": class_names[i], "confidence": round(float(preds[i]) * 100, 1)}
                for i in range(len(class_names))
            ]
            results.sort(key=lambda x: x["confidence"], reverse=True)
            if results[0]["confidence"] < 45.0:
                raise HTTPException(400, "Image mismatch detected: The AI confidence is too low. Please ensure you are uploading the correct type of medical scan for this specific analyzer.")
            return {"results": results, "top_prediction": results[0], "model": "Keras-CNN"}
        except HTTPException:
            raise
        except Exception as exc:
            print(f"[WARN] Keras model error: {exc}")

    # Context-aware mock fallback
    fname = (file.filename or "").lower()
    if report_type == "xray":
        results = [
            {"label": "Normal",    "confidence": 72.0 if "normal" in fname else 28.0},
            {"label": "Pneumonia", "confidence": 28.0 if "normal" in fname else 72.0},
        ]
    elif report_type == "mri":
        results = [
            {"label": "No Tumor",   "confidence": 60.0},
            {"label": "Glioma",     "confidence": 20.0},
            {"label": "Meningioma", "confidence": 12.0},
            {"label": "Pituitary",  "confidence": 8.0},
        ]
    else:
        results = [
            {"label": "Normal",          "confidence": 55.0},
            {"label": "COVID",           "confidence": 20.0},
            {"label": "Lung_Opacity",    "confidence": 15.0},
            {"label": "Viral Pneumonia", "confidence": 10.0},
        ]
    results.sort(key=lambda x: x["confidence"], reverse=True)
    return {"results": results, "top_prediction": results[0], "model": "mock"}


# ── AI Chat ───────────────────────────────────────────────────────────────────

@app.post("/chat")
def chat_assistant(req: ChatRequest):
    res = _ai_chat_response(req.message, req.history or [])
    if isinstance(res, dict):
        return res
    return {"reply": res}


# ── AI Doctor Matchmaker ────────────────────────────────────────────────────────

_embedding_model = None
_doctor_embeddings = None

@app.post("/match-doctor")
def match_doctor(req: MatchDoctorRequest):
    global _embedding_model, _doctor_embeddings
    try:
        from sentence_transformers import SentenceTransformer
        from sklearn.metrics.pairwise import cosine_similarity
    except ImportError:
        raise HTTPException(500, "sentence-transformers is not installed.")

    docs = _load_data().get("doctors", [])
    if not docs:
        raise HTTPException(400, "No doctors available to match.")

    if _embedding_model is None:
        print("[INFO] Loading SentenceTransformer model...")
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    
    if _doctor_embeddings is None or len(_doctor_embeddings) != len(docs):
        print("[INFO] Generating doctor embeddings...")
        texts = [f"{d['specialty']} {d.get('bio', '')}" for d in docs]
        _doctor_embeddings = _embedding_model.encode(texts)

    # 1. Semantic Search
    query_emb = _embedding_model.encode([req.query])
    sims = cosine_similarity(query_emb, _doctor_embeddings)[0]

    # 2. Hybrid Scoring
    query_lower = req.query.lower()
    scores = []
    for i, doc in enumerate(docs):
        semantic_score = float(sims[i])
        keyword_score = 0.0
        spec = doc["specialty"].lower()
        if spec in query_lower:
            keyword_score += 1.0
        if "child" in query_lower and "pediatric" in spec:
            keyword_score += 1.0
        if "heart" in query_lower and "cardio" in spec:
            keyword_score += 1.0
        if "brain" in query_lower and "neuro" in spec:
            keyword_score += 1.0
        if "lung" in query_lower and "pulmo" in spec:
            keyword_score += 1.0
            
        hybrid_score = (0.7 * semantic_score) + (0.3 * keyword_score)
        scores.append((hybrid_score, doc))
        
    scores.sort(key=lambda x: x[0], reverse=True)
    top_3 = [x[1] for x in scores[:3]]

    # 3. LLM Ranking
    prompt = f"A patient has the following symptoms/query: '{req.query}'.\n"
    prompt += "Here are the top 3 doctors found via semantic search:\n"
    for i, d in enumerate(top_3):
        prompt += f"{i+1}. {d['name']} ({d['specialty']}) - {d.get('bio', '')}\n"
    prompt += "\nAct as a triage coordinator. Pick the single best doctor for this patient and explain why in 1-2 short sentences. Start your response with 'I recommend [Doctor Name] because...'"

    try:
        from openai import OpenAI
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=os.getenv("OPENROUTER_API_KEY", "dummy"),
        )
        response = client.chat.completions.create(
            model="openai/gpt-oss-120b:free",
            messages=[{"role": "user", "content": prompt}],
        )
        llm_reasoning = response.choices[0].message.content.strip()
    except Exception as e:
        print("[WARN] LLM ranking failed.", e)
        llm_reasoning = f"I recommend {top_3[0]['name']} based on their specialty closely matching your symptoms."

    return {
        "best_match": top_3[0],
        "top_candidates": top_3,
        "ai_recommendation": llm_reasoning
    }

# ─── Entrypoint ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend:app", host="0.0.0.0", port=8000, reload=True)
