"""
predict.py – Reusable prediction module
========================================
Provides clean Python APIs for:

  SymptomPredictor   – predicts disease from a list of symptom strings
  ImagePredictor     – classifies a chest X-ray, brain MRI, or COVID scan
                       (from a file path, bytes, or PIL image)

Usage
-----
from predict import SymptomPredictor, ImagePredictor

sp  = SymptomPredictor()
print(sp.predict(["fever", "cough", "headache"]))

ip  = ImagePredictor("xray")
print(ip.predict_from_path("scan.jpg"))
"""

from __future__ import annotations
import json
import os
from typing import List, Dict, Any

import joblib
import numpy as np

# ─── paths ────────────────────────────────────────────────────────────────────
_MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")


def _load_json(filename: str) -> Any:
    path = os.path.join(_MODELS_DIR, filename)
    with open(path) as f:
        return json.load(f)


# ─── SymptomPredictor ─────────────────────────────────────────────────────────

class SymptomPredictor:
    """
    Loads the trained Random Forest symptom model once and caches it.

    Parameters
    ----------
    top_k : int
        Number of top disease predictions to return (default 3).
    """

    _instance: "SymptomPredictor | None" = None   # singleton cache

    def __new__(cls, top_k: int = 3):
        if cls._instance is None:
            obj = super().__new__(cls)
            obj._loaded = False
            cls._instance = obj
        return cls._instance

    def _ensure_loaded(self):
        if self._loaded:
            return
        self._model        = joblib.load(os.path.join(_MODELS_DIR, "symptom_model.pkl"))
        self._le           = joblib.load(os.path.join(_MODELS_DIR, "symptom_label_encoder.pkl"))
        self._vocab: List[str] = _load_json("symptom_vocab.json")
        self._vocab_set    = set(self._vocab)
        self._descriptions = _load_json("disease_descriptions.json")
        self._precautions  = _load_json("disease_precautions.json")
        self._severity     = _load_json("symptom_severity.json")
        self._loaded       = True

    # ── public API ───────────────────────────────────────────────────────────

    @property
    def symptoms_list(self) -> List[str]:
        """All known symptom strings (cleaned, underscore format)."""
        self._ensure_loaded()
        return list(self._vocab)

    def predict(self, symptoms: List[str], top_k: int = 3) -> Dict[str, Any]:
        """
        Parameters
        ----------
        symptoms : list of str
            Raw symptom strings from the user (spaces OK, case-insensitive).
        top_k : int
            How many top predictions to return.

        Returns
        -------
        dict with keys:
          matched_symptoms  – list of recognized symptoms
          unmatched         – list of symptoms not found in vocabulary
          severity_score    – int (sum of weights of matched symptoms)
          conditions        – list of {name, confidence, description, precautions}
        """
        self._ensure_loaded()

        # Normalise input
        norm = [s.lower().strip().replace(" ", "_") for s in symptoms]
        matched   = [s for s in norm if s in self._vocab_set]
        unmatched = [s for s in norm if s not in self._vocab_set]

        severity_score = sum(self._severity.get(s, 1) for s in matched)

        # Build feature vector
        vocab_idx = {s: i for i, s in enumerate(self._vocab)}
        vec = np.zeros((1, len(self._vocab)), dtype=np.uint8)
        for s in matched:
            vec[0, vocab_idx[s]] = 1

        probs   = self._model.predict_proba(vec)[0]
        top_idx = np.argsort(probs)[-top_k:][::-1]

        conditions = []
        for idx in top_idx:
            disease  = self._le.inverse_transform([idx])[0]
            conditions.append({
                "name":        disease,
                "confidence":  round(float(probs[idx]) * 100, 1),
                "description": self._descriptions.get(disease, ""),
                "precautions": self._precautions.get(disease, []),
            })

        return {
            "matched_symptoms": matched,
            "unmatched":        unmatched,
            "severity_score":   severity_score,
            "conditions":       conditions,
        }


# ─── ImagePredictor ───────────────────────────────────────────────────────────

class ImagePredictor:
    """
    Loads a trained PCA + Random Forest image-classification pipeline.

    Parameters
    ----------
    model_type : str
        One of  "xray" | "mri" | "covid"
    img_size : tuple
        Target (width, height) to resize images before prediction.
        Must match what was used during training (64×64 by default).
    """

    _cache: Dict[str, "ImagePredictor"] = {}

    def __new__(cls, model_type: str, img_size=(64, 64)):
        key = model_type
        if key not in cls._cache:
            obj = super().__new__(cls)
            obj._loaded    = False
            obj.model_type = model_type
            obj.img_size   = img_size
            cls._cache[key] = obj
        return cls._cache[key]

    def _ensure_loaded(self):
        if self._loaded:
            return
        mt = self.model_type
        model_path   = os.path.join(_MODELS_DIR, f"{mt}_model.pkl")
        classes_path = os.path.join(_MODELS_DIR, f"{mt}_classes.json")
        if not os.path.exists(model_path):
            raise FileNotFoundError(
                f"Model not found: {model_path}\n"
                f"Run  python train_models.py  first."
            )
        self._pipeline    = joblib.load(model_path)
        self._class_names = _load_json(f"{mt}_classes.json")
        self._loaded      = True

    # ── helpers ──────────────────────────────────────────────────────────────

    def _preprocess(self, img) -> np.ndarray:
        """Convert a PIL image to the flat feature vector expected by the model."""
        from PIL import Image
        from skimage.feature import hog
        if not isinstance(img, Image.Image):
            raise TypeError("Expected a PIL.Image.Image object.")
        img = img.convert("L").resize(self.img_size)
        img_arr = np.array(img).astype(np.float32) / 255.0
        hog_features = hog(img_arr, orientations=9, pixels_per_cell=(8, 8),
                           cells_per_block=(2, 2), feature_vector=True)
        return hog_features.reshape(1, -1)

    # ── public API ───────────────────────────────────────────────────────────

    def predict_from_bytes(self, image_bytes: bytes) -> List[Dict[str, Any]]:
        """Predict from raw image bytes (e.g. from an HTTP upload)."""
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(image_bytes))
        return self.predict_from_pil(img)

    def predict_from_path(self, path: str) -> List[Dict[str, Any]]:
        """Predict from a file path."""
        from PIL import Image
        img = Image.open(path)
        return self.predict_from_pil(img)

    def predict_from_pil(self, img) -> List[Dict[str, Any]]:
        """
        Predict from a PIL Image.

        Returns
        -------
        list of dicts sorted by confidence desc:
          [{"label": str, "confidence": float (0-100)}, ...]
        """
        self._ensure_loaded()
        vec   = self._preprocess(img)
        proba = self._pipeline.predict_proba(vec)[0]
        results = [
            {"label": self._class_names[i],
             "confidence": round(float(proba[i]) * 100, 1)}
            for i in range(len(self._class_names))
        ]
        results.sort(key=lambda x: x["confidence"], reverse=True)
        return results


# ─── quick CLI test ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=== SymptomPredictor ===")
    sp = SymptomPredictor()
    result = sp.predict(["fever", "cough", "headache", "fatigue"])
    print(f"Matched symptoms : {result['matched_symptoms']}")
    print(f"Severity score   : {result['severity_score']}")
    for c in result["conditions"]:
        print(f"  {c['name']}  ({c['confidence']}%)")

    print("\n=== ImagePredictor — type 'xray' ===")
    ip = ImagePredictor("xray")
    print(f"Model type: {ip.model_type}")
    print("(Pass an image path to ip.predict_from_path(path) to test)")
