"""
Health Screening Assistant — Unified Model Trainer
=====================================================
Trains ALL machine-learning models required by the application:

  1. Symptom → Disease Random Forest   (tabular CSV dataset)
  2. Chest X-Ray Classifier            (NORMAL / PNEUMONIA) — HOG + RF
  3. Brain MRI Classifier              (glioma / meningioma / notumor / pituitary) — HOG + RF
  4. COVID-19 Chest X-Ray Classifier   (COVID / Lung_Opacity / Normal / Viral Pneumonia) — HOG + RF

Trained artefacts are saved under  models/
"""

import os, json, warnings
import numpy as np
import pandas as pd
from pathlib import Path

warnings.filterwarnings("ignore")

# ── helpers ──────────────────────────────────────────────────────────────────

def banner(title: str):
    sep = "═" * 60
    print(f"\n{sep}\n  {title}\n{sep}")


def save_json(obj, path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w") as f:
        json.dump(obj, f, indent=2)


# ─────────────────────────────────────────────────────────────────────────────
# 1.  SYMPTOM ↔ DISEASE  RANDOM FOREST
# ─────────────────────────────────────────────────────────────────────────────

def train_symptom_model():
    banner("1 · Symptom–Disease Random Forest")
    import joblib
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import LabelEncoder
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import (accuracy_score, precision_score,
                                 recall_score, f1_score,
                                 roc_auc_score, confusion_matrix,
                                 classification_report)

    # ── Load data ──────────────────────────────────────────────────────────
    df = pd.read_csv("extracted_2/dataset.csv")
    df.columns = df.columns.str.strip()

    # Normalize disease names
    df["Disease"] = df["Disease"].str.strip()

    # Collect all symptoms and clean them
    symptom_cols = [c for c in df.columns if c.startswith("Symptom")]
    all_symptoms = set()
    for col in symptom_cols:
        df[col] = df[col].str.strip().str.lower().str.replace(" ", "_")
        all_symptoms.update(df[col].dropna().unique())

    all_symptoms.discard("")
    all_symptoms = sorted(all_symptoms)
    print(f"Unique symptoms : {len(all_symptoms)}")

    # ── Feature matrix: one-hot presence of each symptom ─────────────────
    symptom_to_idx = {s: i for i, s in enumerate(all_symptoms)}
    X = np.zeros((len(df), len(all_symptoms)), dtype=np.uint8)
    for row_idx, row in df.iterrows():
        for col in symptom_cols:
            s = row[col]
            if s and s in symptom_to_idx:
                X[row_idx, symptom_to_idx[s]] = 1

    # ── Label encode diseases ─────────────────────────────────────────────
    le = LabelEncoder()
    y = le.fit_transform(df["Disease"])
    print(f"Unique diseases : {len(le.classes_)}")

    # ── Train / test split ────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"Train samples   : {len(X_train)}   Test samples: {len(X_test)}")

    # ── Model ─────────────────────────────────────────────────────────────
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=None,
        min_samples_split=2,
        random_state=42,
        n_jobs=-1
    )
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    y_proba = clf.predict_proba(X_test)

    # ── Evaluation ────────────────────────────────────────────────────────
    acc  = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    rec  = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1   = f1_score(y_test, y_pred, average="weighted", zero_division=0)
    try:
        roc  = roc_auc_score(y_test, y_proba, multi_class="ovr", average="weighted")
    except Exception:
        roc  = None
    cm   = confusion_matrix(y_test, y_pred)

    print(f"\n  Accuracy  : {acc:.4f}")
    print(f"  Precision : {prec:.4f}")
    print(f"  Recall    : {rec:.4f}")
    print(f"  F1-score  : {f1:.4f}")
    if roc:
        print(f"  ROC-AUC   : {roc:.4f}")
    print(f"\n  Confusion matrix shape: {cm.shape}")
    print("\n" + classification_report(y_test, y_pred,
                                       target_names=le.classes_, zero_division=0))

    # ── Load auxiliary data ───────────────────────────────────────────────
    desc_df = pd.read_csv("extracted_2/symptom_Description.csv")
    desc_df.columns = desc_df.columns.str.strip()
    descriptions = dict(zip(desc_df["Disease"].str.strip(),
                            desc_df["Description"].str.strip()))

    prec_df = pd.read_csv("extracted_2/symptom_precaution.csv")
    prec_df.columns = prec_df.columns.str.strip()
    precautions = {}
    for _, row in prec_df.iterrows():
        disease = row["Disease"].strip()
        precs = [row.get(f"Precaution_{i}", "") for i in range(1, 5)]
        precautions[disease] = [p for p in precs if isinstance(p, str) and p.strip()]

    sev_df = pd.read_csv("extracted_2/Symptom-severity.csv")
    sev_df.columns = sev_df.columns.str.strip()
    severity = dict(zip(
        sev_df["Symptom"].str.strip().str.lower().str.replace(" ", "_"),
        sev_df["weight"].astype(int)
    ))

    # ── Save artefacts ────────────────────────────────────────────────────
    os.makedirs("models", exist_ok=True)
    joblib.dump(clf, "models/symptom_model.pkl")
    joblib.dump(le,  "models/symptom_label_encoder.pkl")
    save_json(all_symptoms,   "models/symptom_vocab.json")
    save_json(descriptions,   "models/disease_descriptions.json")
    save_json(precautions,    "models/disease_precautions.json")
    save_json(severity,       "models/symptom_severity.json")

    # Save evaluation report
    report = {
        "model": "RandomForest (n_estimators=200)",
        "task": "Symptom → Disease classification",
        "num_classes": int(len(le.classes_)),
        "num_features": int(len(all_symptoms)),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "accuracy": round(acc, 4),
        "precision_weighted": round(prec, 4),
        "recall_weighted": round(rec, 4),
        "f1_weighted": round(f1, 4),
        "roc_auc_ovr_weighted": round(roc, 4) if roc else None,
    }
    save_json(report, "models/symptom_eval_report.json")

    print("\n  ✓ Symptom model saved  →  models/symptom_model.pkl")
    print("  ✓ Vocab, descriptions, precautions saved.")
    return report


# ─────────────────────────────────────────────────────────────────────────────
# Shared image helpers
# ─────────────────────────────────────────────────────────────────────────────

def load_images(root: str, class_dirs: list, img_size=(64, 64),
                max_per_class=400, exts=(".jpg", ".jpeg", ".png")):
    """Load grayscale images, resize, extract HOG features. Returns X, y, class_names."""
    from PIL import Image
    from skimage.feature import hog

    X, y = [], []
    for label, cls_dir in enumerate(class_dirs):
        folder = os.path.join(root, cls_dir)
        files = [f for f in os.listdir(folder)
                 if os.path.splitext(f)[1].lower() in exts]
        files = files[:max_per_class]
        print(f"    Loading '{cls_dir}': {len(files)} images …")
        for fname in files:
            try:
                img = Image.open(os.path.join(folder, fname)).convert("L")
                img = img.resize(img_size, Image.LANCZOS)
                img_arr = np.array(img).astype(np.float32) / 255.0
                hog_features = hog(img_arr, orientations=9, pixels_per_cell=(8, 8),
                                   cells_per_block=(2, 2), feature_vector=True)
                X.append(hog_features)
                y.append(label)
            except Exception:
                continue
    return np.array(X), np.array(y), [os.path.basename(d) for d in class_dirs]


def train_image_rf(name: str, X: np.ndarray, y: np.ndarray,
                   class_names: list, model_key: str):
    """Generic Random Forest trainer for image feature vectors."""
    import joblib
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.decomposition import PCA
    from sklearn.pipeline import Pipeline
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import (accuracy_score, precision_score,
                                 recall_score, f1_score,
                                 roc_auc_score, confusion_matrix,
                                 classification_report)

    print(f"\n  Dataset: X={X.shape}  y={y.shape}  classes={class_names}")

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    pipe = Pipeline([
        ("pca", PCA(n_components=120, random_state=42)),
        ("rf",  RandomForestClassifier(n_estimators=250, min_samples_split=5, random_state=42, n_jobs=-1))
    ])
    print("  Training …")
    pipe.fit(X_train, y_train)
    y_pred = pipe.predict(X_test)

    acc  = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average="weighted", zero_division=0)
    rec  = recall_score(y_test, y_pred, average="weighted", zero_division=0)
    f1   = f1_score(y_test, y_pred, average="weighted", zero_division=0)

    try:
        y_proba = pipe.predict_proba(X_test)
        if len(class_names) == 2:
            roc = roc_auc_score(y_test, y_proba[:, 1])
        else:
            roc = roc_auc_score(y_test, y_proba, multi_class="ovr", average="weighted")
    except Exception:
        roc = None

    cm = confusion_matrix(y_test, y_pred)
    print(f"\n  Accuracy  : {acc:.4f}")
    print(f"  Precision : {prec:.4f}")
    print(f"  Recall    : {rec:.4f}")
    print(f"  F1-score  : {f1:.4f}")
    if roc:
        print(f"  ROC-AUC   : {roc:.4f}")
    print(f"  Confusion matrix shape: {cm.shape}")
    print("\n" + classification_report(y_test, y_pred,
                                       target_names=class_names, zero_division=0))

    # Save
    os.makedirs("models", exist_ok=True)
    joblib.dump(pipe, f"models/{model_key}_model.pkl")
    save_json(class_names, f"models/{model_key}_classes.json")

    report = {
        "model": "HOG + PCA(120) + RandomForest(250 trees)",
        "task": name,
        "classes": class_names,
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "accuracy": round(acc, 4),
        "precision_weighted": round(prec, 4),
        "recall_weighted": round(rec, 4),
        "f1_weighted": round(f1, 4),
        "roc_auc": round(roc, 4) if roc else None,
    }
    save_json(report, f"models/{model_key}_eval_report.json")

    print(f"\n  ✓ Model saved  →  models/{model_key}_model.pkl")
    return report


# ─────────────────────────────────────────────────────────────────────────────
# 2.  CHEST X-RAY  (Pneumonia vs Normal)
# ─────────────────────────────────────────────────────────────────────────────

def train_xray_model():
    banner("2 · Chest X-Ray Classifier  (Pneumonia / Normal)")
    train_root = "extracted_3/chest_xray/chest_xray/train"
    test_root  = "extracted_3/chest_xray/chest_xray/test"

    print("  Loading training images …")
    X_tr, y_tr, class_names = load_images(
        train_root, ["NORMAL", "PNEUMONIA"], max_per_class=400
    )
    print("  Loading test images …")
    X_te, y_te, _ = load_images(
        test_root, ["NORMAL", "PNEUMONIA"], max_per_class=200
    )

    X = np.vstack([X_tr, X_te])
    y = np.concatenate([y_tr, y_te])

    return train_image_rf(
        "Chest X-Ray: Pneumonia vs Normal",
        X, y, class_names, "xray"
    )


# ─────────────────────────────────────────────────────────────────────────────
# 3.  BRAIN MRI  (glioma / meningioma / notumor / pituitary)
# ─────────────────────────────────────────────────────────────────────────────

def train_mri_model():
    banner("3 · Brain MRI Classifier  (glioma / meningioma / notumor / pituitary)")
    train_root = "extracted_7/Training"
    test_root  = "extracted_7/Testing"

    classes = ["glioma", "meningioma", "notumor", "pituitary"]

    print("  Loading training images …")
    X_tr, y_tr, class_names = load_images(train_root, classes, max_per_class=300)
    print("  Loading test images …")
    X_te, y_te, _ = load_images(test_root, classes, max_per_class=100)

    X = np.vstack([X_tr, X_te])
    y = np.concatenate([y_tr, y_te])

    return train_image_rf(
        "Brain MRI: Tumor Type Classification",
        X, y, class_names, "mri"
    )


# ─────────────────────────────────────────────────────────────────────────────
# 4.  COVID-19 RADIOGRAPHY  (4 classes)
# ─────────────────────────────────────────────────────────────────────────────

def train_covid_model():
    banner("4 · COVID-19 Chest X-Ray Classifier  (4 classes)")
    dataset_root = "extracted_8/COVID-19_Radiography_Dataset"

    class_info = {
        "COVID":          os.path.join(dataset_root, "COVID", "images"),
        "Lung_Opacity":   os.path.join(dataset_root, "Lung_Opacity", "images"),
        "Normal":         os.path.join(dataset_root, "Normal", "images"),
        "Viral Pneumonia": os.path.join(dataset_root, "Viral Pneumonia", "images"),
    }

    X_all, y_all = [], []
    class_names  = list(class_info.keys())

    for label, (cls, folder) in enumerate(class_info.items()):
        files = [f for f in os.listdir(folder) if f.lower().endswith(".png")]
        files = files[:350]
        print(f"  Loading '{cls}': {len(files)} images …")
        from PIL import Image
        from skimage.feature import hog
        for fname in files:
            try:
                img = Image.open(os.path.join(folder, fname)).convert("L")
                img = img.resize((64, 64), Image.LANCZOS)
                img_arr = np.array(img).astype(np.float32) / 255.0
                hog_features = hog(img_arr, orientations=9, pixels_per_cell=(8, 8),
                                   cells_per_block=(2, 2), feature_vector=True)
                X_all.append(hog_features)
                y_all.append(label)
            except Exception:
                continue

    return train_image_rf(
        "COVID-19 Radiography: 4-class Classification",
        np.array(X_all), np.array(y_all), class_names, "covid"
    )


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    all_reports = {}

    # 1. Symptom model (always run)
    all_reports["symptom"] = train_symptom_model()

    # 2. X-Ray model
    all_reports["xray"] = train_xray_model()

    # 3. Brain MRI model
    all_reports["mri"] = train_mri_model()

    # 4. COVID model
    all_reports["covid"] = train_covid_model()

    # ── Final summary ─────────────────────────────────────────────────────
    banner("TRAINING COMPLETE — Summary")
    for key, r in all_reports.items():
        acc = r.get("accuracy", "N/A")
        f1  = r.get("f1_weighted", "N/A")
        print(f"  [{key:10s}]  Accuracy={acc}  F1={f1}")

    save_json(all_reports, "models/all_eval_reports.json")
    print("\n  ✓ All evaluation reports saved  →  models/all_eval_reports.json")
    print("  ✓ Models ready — you can now start the backend with:\n")
    print("       uvicorn backend:app --reload --port 8000\n")
