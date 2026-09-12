# AegisAI — main.py | Built for SOC & AI Engineers
# FastAPI orchestrator: routes requests → Tier-1 → conditional Tier-2
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from scanner import scan_prompt, ScanResult
from slm_scanner import evaluate_with_gemini

app = FastAPI(title="AegisAI", version="1.0.0", description="Two-Tier Prompt Injection Detector")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScanRequest(BaseModel):
    prompt: str
    session_id: str = "default"

class ScanLogEntry(BaseModel):
    timestamp: str
    prompt_snippet: str
    risk_score: float
    risk_tier: str
    recommended_action: str
    attack_categories: list[str]
    flagged_keyphrases: list[str]
    tier2_triggered: bool
    attack_type: Optional[str] = None
    canary_detected: bool = False

scan_log: list[ScanLogEntry] = []

@app.post("/api/scan", response_model=ScanResult)
async def scan_endpoint(request: ScanRequest) -> ScanResult:
    result = scan_prompt(request.prompt)
    tier2_triggered = False
    ai_attack_type = None

    if 20.0 <= result.risk_score < 70.0:
        gemini_result = await evaluate_with_gemini(request.prompt, prompt_hash=result.prompt_hash_for_vector_db)
        if gemini_result.get("is_hostile"):
            result.risk_score = round(min(result.risk_score + gemini_result.get("added_risk", 25.0), 100.0), 2)
            result.is_hostile = True
            result.recommended_action = "BLOCK"
            result.risk_tier = "HOSTILE"
            reason = gemini_result.get("reason", "Heuristic anomaly confirmed")
            result.flagged_keyphrases.append(f"[AI Detected: {reason}]")
            ai_attack_type = gemini_result.get("attack_type")
            if ai_attack_type and ai_attack_type != "clean" and ai_attack_type not in result.attack_categories:
                result.attack_categories.append(ai_attack_type)
            tier2_triggered = True

    scan_log.append(ScanLogEntry(
        timestamp=datetime.now().isoformat(),
        prompt_snippet=request.prompt[:80],
        risk_score=result.risk_score,
        risk_tier=result.risk_tier,
        recommended_action=result.recommended_action,
        attack_categories=result.attack_categories,
        flagged_keyphrases=result.flagged_keyphrases,
        tier2_triggered=tier2_triggered,
        attack_type=ai_attack_type,
        canary_detected=result.canary_detected
    ))
    return result

@app.get("/api/telemetry")
def get_telemetry():
    return {"scans": list(reversed(scan_log[-20:]))}

@app.get("/api/health")
def health_check():
    return {"status": "online", "total_scans": len(scan_log), "timestamp": datetime.now().isoformat()}
