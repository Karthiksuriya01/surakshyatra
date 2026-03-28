# ===============================
# FASTAPI SAFETY SCORE SERVER
# SurakshYatra — main.py
# ===============================
# Run with: uvicorn main:app --reload --port 8000
# pip install fastapi uvicorn scikit-learn pandas joblib

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

# ── Model cache path (saves training time on restart) ─────────────────────────
MODEL_CACHE_DIR = os.path.join(os.path.dirname(__file__), ".model_cache")
MODEL_CACHE_PATH = os.path.join(MODEL_CACHE_DIR, "safety_model.pkl")

app = FastAPI(title="SurakshYatra Safety Score API")

# ── Allow requests from Vite dev server + Next.js ─────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "null",                    # file:// origin (test_api.html opened directly)
        "http://localhost:5173",   # Vite default
        "http://localhost:5174",   # Vite alt
        "http://localhost:3000",   # Next.js / CRA
        "http://localhost:4173",   # Vite preview
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "https://your-domain.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global model state ────────────────────────────────────────────────────────
model = None
encoders = {}
safety_label_encoder = None
json_input_cols = None

# ── All features ──────────────────────────────────────────────────────────────
ALL_FEATURES = [
    "traveler_type", "preferred_time", "mobility", "place_category", "location_type",
    "population_density", "crime_rate", "lighting_conditions", "security_personnel",
    "emergency_services_proximity", "local_transport_accessibility", "infrastructure_quality",
    "natural_disaster_risk", "political_stability", "health_facilities_access",
    "social_unrest_indicators", "tourist_attraction", "historical_incidents", "crowd_level",
    "local_awareness_score", "community_engagement", "cultural_sensitivity",
    "communication_infrastructure", "environmental_hazards", "public_perception_score",
    "economic_stability", "regulatory_compliance", "weather_conditions",
    "local_support_network", "protest", "environmental_alert", "negative_review_ratio",
    "extreme_weather_alert", "temperature_c", "rainfall_mm", "wind_speed_kmh",
    "air_quality_index", "vip_security_flag", "event_crowd_signal",
    "flood_alert", "wildfire_alert", "news_risk_keywords",
    "cultural_disruption", "place_rating", "hospital_distance_km"
]

CATEGORICAL_COLS = [
    "traveler_type", "preferred_time", "mobility",
    "place_category", "location_type", "weather_conditions"
]


# ── Train model on startup (with joblib cache) ───────────────────────────────
@app.on_event("startup")
def train_model():
    global model, encoders, safety_label_encoder, json_input_cols

    dataset_path = os.getenv(
        "DATASET_PATH",
        os.path.join(os.path.dirname(__file__), "dataset", "travel_safety_dataset_large.csv")
    )

    # ── Load from cache if available (skip retraining) ────────────────────────
    if os.path.exists(MODEL_CACHE_PATH):
        try:
            cache = joblib.load(MODEL_CACHE_PATH)
            model = cache["model"]
            encoders = cache["encoders"]
            safety_label_encoder = cache["safety_label_encoder"]
            json_input_cols = cache["json_input_cols"]
            print(f"✅ Model loaded from cache: {MODEL_CACHE_PATH}")
            print(f"✅ Using {len(json_input_cols)} features (cached)")
            return
        except Exception as e:
            print(f"⚠️ Cache load failed ({e}), retraining...")

    # ── Train from scratch ────────────────────────────────────────────────────
    df = pd.read_csv(dataset_path)
    print(f"✅ Dataset loaded: {df.shape}")

    # Fix columns that contain string representations of lists (like "[]" or "['VIP visit']")
    # We turn them into binary flags: 0 if empty/[], 1 if it contains something
    list_cols = ["news_risk_keywords", "cultural_disruption"]
    for col in list_cols:
        if col in df.columns:
            df[col] = df[col].apply(lambda x: 0 if pd.isna(x) or x == "[]" or str(x).strip() == "" else 1)

    # Encode categoricals
    for col in CATEGORICAL_COLS:
        if col in df.columns:
            le = LabelEncoder()
            df[col] = le.fit_transform(df[col].astype(str))
            encoders[col] = le

    # Safety label bins
    # Dataset safety_score can be 0.0-1.0 OR 0-100 depending on dataset version.
    # Auto-detect the scale and normalize to 0-100 for consistent binning.
    score_max = df['safety_score'].max()
    if score_max <= 1.0:
        df['safety_score_norm'] = df['safety_score'] * 100
        print(f"📊 safety_score scale: 0–1 (max={score_max:.3f}), normalizing to 0–100")
    else:
        df['safety_score_norm'] = df['safety_score']
        print(f"📊 safety_score scale: 0–100 (max={score_max:.1f})")

    bins = [0, 50, 75, 101]
    labels_text = ['Risky', 'Moderate', 'Safe']
    df['safety_label_text'] = pd.cut(df['safety_score_norm'], bins=bins, labels=labels_text, right=False)
    safety_label_encoder = LabelEncoder()
    safety_label_encoder.fit(labels_text)
    df['safety_label'] = safety_label_encoder.transform(df['safety_label_text'])

    dist = df['safety_label_text'].value_counts()
    print(f"📊 Label distribution — Safe: {dist.get('Safe',0)}, Moderate: {dist.get('Moderate',0)}, Risky: {dist.get('Risky',0)}")

    # Only use features present in the CSV
    json_input_cols = [col for col in ALL_FEATURES if col in df.columns]
    print(f"✅ Using {len(json_input_cols)} features: {json_input_cols}")

    X = df[json_input_cols]
    y = df["safety_label"]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42)
    model = RandomForestClassifier(n_estimators=200, max_depth=10, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)

    acc = model.score(X_test, y_test)
    print(f"✅ Model trained! Accuracy: {acc:.2%}")

    # ── Save to cache ─────────────────────────────────────────────────────────
    os.makedirs(MODEL_CACHE_DIR, exist_ok=True)
    joblib.dump({
        "model": model,
        "encoders": encoders,
        "safety_label_encoder": safety_label_encoder,
        "json_input_cols": json_input_cols,
    }, MODEL_CACHE_PATH)
    print(f"✅ Model saved to cache: {MODEL_CACHE_PATH}")


# ── Request schema ────────────────────────────────────────────────────────────
class SafetyRequest(BaseModel):
    # Core identifiers
    place_name: str
    place_category: str
    location_type: str
    traveler_type: str
    preferred_time: str
    mobility: str = "walking"

    # Numeric features
    population_density: float = 0.5
    crime_rate: float = 0.3
    lighting_conditions: float = 0.7
    security_personnel: float = 0.5
    emergency_services_proximity: float = 0.5
    local_transport_accessibility: float = 0.6
    infrastructure_quality: float = 0.6
    natural_disaster_risk: float = 0.2
    political_stability: float = 0.7
    health_facilities_access: float = 0.6
    social_unrest_indicators: float = 0.2
    tourist_attraction: float = 0.5
    historical_incidents: float = 0.3
    crowd_level: float = 0.5
    local_awareness_score: float = 0.6
    community_engagement: float = 0.6
    cultural_sensitivity: float = 0.7
    communication_infrastructure: float = 0.7
    environmental_hazards: float = 0.2
    public_perception_score: float = 0.6
    economic_stability: float = 0.6
    regulatory_compliance: float = 0.6
    local_support_network: float = 0.6
    protest: float = 0.0
    environmental_alert: float = 0.0
    negative_review_ratio: float = 0.2

    # Extended features
    extreme_weather_alert: float = 0.0
    temperature_c: float = 25.0
    rainfall_mm: float = 0.0
    wind_speed_kmh: float = 10.0
    air_quality_index: float = 50.0
    vip_security_flag: float = 0.0
    event_crowd_signal: float = 0.0
    flood_alert: float = 0.0
    wildfire_alert: float = 0.0
    news_risk_keywords: float = 0.0
    cultural_disruption: float = 0.0
    place_rating: float = 3.5
    hospital_distance_km: float = 5.0
    weather_conditions: str = "clear"


# ── Predict endpoint ──────────────────────────────────────────────────────────
@app.post("/predict")
def predict_safety(req: SafetyRequest):
    if model is None:
        raise HTTPException(status_code=503, detail="Model not ready — still training")

    input_dict = req.dict()
    place_name = input_dict.pop("place_name")

    df_input = pd.DataFrame([input_dict])

    # Only keep columns the model was trained on
    df_input = df_input[[col for col in json_input_cols if col in df_input.columns]]

    # ── Clamp numeric values to valid ranges ──────────────────────────────────
    # Gemini may occasionally return out-of-range values (e.g. 1.5, -0.1)
    # Binary flags (0/1) and continuous scores (0.0–1.0) are clamped separately.
    binary_cols = [
        "protest", "environmental_alert", "extreme_weather_alert",
        "vip_security_flag", "event_crowd_signal", "flood_alert",
        "wildfire_alert", "news_risk_keywords", "cultural_disruption",
    ]
    for col in df_input.columns:
        if col in CATEGORICAL_COLS:
            continue  # skip — will be label-encoded below
        if col in binary_cols:
            df_input[col] = df_input[col].clip(0, 1).round().astype(int)
        elif col == "air_quality_index":
            df_input[col] = df_input[col].clip(0, 500)
        elif col == "temperature_c":
            df_input[col] = df_input[col].clip(-60, 60)
        elif col == "rainfall_mm":
            df_input[col] = df_input[col].clip(0, None)
        elif col == "wind_speed_kmh":
            df_input[col] = df_input[col].clip(0, None)
        elif col == "hospital_distance_km":
            df_input[col] = df_input[col].clip(0, None)
        elif col == "place_rating":
            df_input[col] = df_input[col].clip(1.0, 5.0)
        else:
            # All other numeric features are expected in 0.0–1.0
            df_input[col] = df_input[col].clip(0.0, 1.0)

    # Encode categoricals
    for col, encoder in encoders.items():
        if col in df_input.columns:
            try:
                df_input[col] = encoder.transform(df_input[col].astype(str))
            except ValueError:
                df_input[col] = 0  # unknown category → most common class

    prediction = model.predict(df_input)[0]
    probabilities = model.predict_proba(df_input)[0]

    labels = {
        safety_label_encoder.transform(['Moderate'])[0]: "Moderate",
        safety_label_encoder.transform(['Risky'])[0]: "Risky",
        safety_label_encoder.transform(['Safe'])[0]: "Safe",
    }

    prob_map = {cls: float(prob) for cls, prob in zip(model.classes_, probabilities)}
    risky_label = safety_label_encoder.transform(['Risky'])[0]
    safe_label = safety_label_encoder.transform(['Safe'])[0]
    moderate_label = safety_label_encoder.transform(['Moderate'])[0]

    safe_prob = prob_map.get(safe_label, 0.0)
    moderate_prob = prob_map.get(moderate_label, 0.0)
    risky_prob = prob_map.get(risky_label, 0.0)

    # ── Weighted safety score ─────────────────────────────────────────────────
    # Safe=100%, Moderate=65%, Risky=0%  — gives a richer signal than (1-risky)*100
    safety_score = round((safe_prob * 1.0 + moderate_prob * 0.65 + risky_prob * 0.0) * 100, 2)

    return {
        "place_name": place_name,
        "safety_level": labels[prediction],
        "safety_score": safety_score,
        "confidence": {
            "safe": round(safe_prob, 2),
            "moderate": round(moderate_prob, 2),
            "risky": round(risky_prob, 2),
        },
        "disclaimer": "Safety scores are AI-estimated and not sourced from real-time databases.",
    }


@app.get("/health")
def health():
    return {"status": "ok", "model_ready": model is not None}
