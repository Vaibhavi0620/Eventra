"""
EVENTRA — FastAPI AI/ML Suspicious Ticket Activity Service
Exposes:
  - GET  /health   : Service health and loaded model status
  - GET  /metrics  : Actual evaluation metrics from held-out test set
  - POST /predict  : Predicts NORMAL vs SUSPICIOUS with probability score & explainability factors
"""

import json
import os
from typing import List, Optional
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from train_model import train_and_evaluate

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")
MODEL_PATH = os.path.join(ARTIFACTS_DIR, "fraud_rf_pipeline.joblib")
METRICS_PATH = os.path.join(ARTIFACTS_DIR, "evaluation_metrics.json")

app = FastAPI(
    title="EVENTRA AI Fraud Detection Service",
    description="AI-Assisted NFT Ticketing Anti-Scalping Behavioural Classifier",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model_pipeline = None
evaluation_metrics = None


def ensure_model_loaded():
    global model_pipeline, evaluation_metrics
    if not os.path.exists(MODEL_PATH) or not os.path.exists(METRICS_PATH):
        train_and_evaluate()
    model_pipeline = joblib.load(MODEL_PATH)
    with open(METRICS_PATH, "r", encoding="utf-8") as f:
        evaluation_metrics = json.load(f)


ensure_model_loaded()


class PredictionRequest(BaseModel):
    wallet_id: Optional[str] = Field(default="0xunknown", description="Associated wallet or user identifier")
    event_id: Optional[str] = Field(default="EVT-SONIC-01", description="Event identifier")
    event_category: str = Field(default="ELECTRONIC", description="Event category")
    tickets_bought: int = Field(..., ge=1, le=500, description="Number of tickets acquired by wallet")
    transfers: int = Field(..., ge=0, le=500, description="Number of ticket transfers initiated")
    resales: int = Field(..., ge=0, le=500, description="Number of secondary resale listings/flips")
    time_diff: float = Field(..., ge=0.0, description="Seconds elapsed since mint or previous transfer")
    resale_price: float = Field(..., gt=0.0, description="Proposed or executed transaction price")
    original_price: float = Field(..., gt=0.0, description="Original face-value price of ticket")
    transaction_frequency: float = Field(..., ge=0.0, description="Transactions per hour by this wallet")


class PredictionResponse(BaseModel):
    predicted_label: str
    risk_score: float
    confidence: float
    reasons: List[str]
    advisory_notice: str
    features_analyzed: dict


def generate_explanations(req: PredictionRequest, price_ratio: float, risk_score: float) -> List[str]:
    reasons = []
    if req.tickets_bought >= 4:
        reasons.append(f"Unusually high ticket accumulation ({req.tickets_bought} tickets acquired)")
    if req.resales >= 2:
        reasons.append(f"Repeated secondary resale activity ({req.resales} resales recorded)")
    if req.transfers >= 3:
        reasons.append(f"Elevated peer-to-peer transfer velocity ({req.transfers} transfers)")
    if req.time_diff < 300:
        reasons.append(f"Unusually short interval between acquisition and action ({req.time_diff:.0f}s elapsed)")
    if price_ratio > 1.10:
        reasons.append(
            f"Resale markup near or pushing price cap ({price_ratio:.2f}x original face value)"
        )
    if req.transaction_frequency >= 4.0:
        reasons.append(
            f"High transaction frequency ({req.transaction_frequency:.1f} tx/hour suggests automated script)"
        )

    if not reasons:
        if risk_score >= 0.5:
            reasons.append("Combined multi-feature behavioral pattern scored above risk threshold")
        else:
            reasons.append("Purchasing, timing, and pricing behavior within normal fan baseline")
    return reasons


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "eventra-ai-fraud-detector",
        "model_loaded": model_pipeline is not None,
        "model_name": evaluation_metrics.get("model_name") if evaluation_metrics else "unknown",
    }


@app.get("/metrics")
def get_metrics():
    if evaluation_metrics is None:
        ensure_model_loaded()
    return evaluation_metrics


@app.post("/retrain")
def trigger_retrain():
    global model_pipeline, evaluation_metrics
    evaluation_metrics = train_and_evaluate()
    model_pipeline = joblib.load(MODEL_PATH)
    return {"status": "retrained", "metrics": evaluation_metrics}


@app.post("/predict", response_model=PredictionResponse)
def predict_activity(req: PredictionRequest):
    if model_pipeline is None:
        ensure_model_loaded()

    price_ratio = round(req.resale_price / req.original_price, 4)
    input_df = pd.DataFrame(
        [
            {
                "tickets_bought": req.tickets_bought,
                "transfers": req.transfers,
                "resales": req.resales,
                "time_diff": req.time_diff,
                "resale_price": req.resale_price,
                "original_price": req.original_price,
                "price_ratio": price_ratio,
                "transaction_frequency": req.transaction_frequency,
                "event_category": req.event_category,
            }
        ]
    )

    try:
        probs = model_pipeline.predict_proba(input_df)[0]
        suspicious_prob = float(probs[1])
        predicted_label = "SUSPICIOUS" if suspicious_prob >= 0.50 else "NORMAL"
        confidence = suspicious_prob if predicted_label == "SUSPICIOUS" else float(probs[0])
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Model inference error: {str(exc)}") from exc

    reasons = generate_explanations(req, price_ratio, suspicious_prob)

    return PredictionResponse(
        predicted_label=predicted_label,
        risk_score=round(suspicious_prob, 4),
        confidence=round(confidence, 4),
        reasons=reasons,
        advisory_notice=(
            "ADVISORY ALERT ONLY: A SUSPICIOUS classification indicates elevated statistical risk "
            "requiring administrator review; it is not automatic proof of fraud or scalping."
        ),
        features_analyzed={
            "tickets_bought": req.tickets_bought,
            "transfers": req.transfers,
            "resales": req.resales,
            "time_diff": req.time_diff,
            "price_ratio": price_ratio,
            "transaction_frequency": req.transaction_frequency,
        },
    )
