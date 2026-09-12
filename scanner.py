# AegisAI — scanner.py | Built for SOC & AI Engineers
# Tier-1: Fast regex-based heuristic scanner + Rebuff canary & signature defense
import re
import time
import hashlib
from typing import List, Optional, Tuple
from pydantic import BaseModel

INJECTION_RULES: list[dict] = [
    {"rule_id": "R001", "pattern": r"(you are|act as|pretend you are)\s+(DAN|GPT|a hacker)", "weight": 95.0, "category": "jailbreak"},
    {"rule_id": "R002", "pattern": r"do anything now|disregard all|ignore all.*?instructions", "weight": 90.0, "category": "jailbreak"},
    {"rule_id": "R003", "pattern": r"(pretend|assume|imagine).*?(no restrictions|no filters)", "weight": 85.0, "category": "role_override"},
    {"rule_id": "R004", "pattern": r"(repeat|return|output|show).*?(your instructions|system prompt)", "weight": 95.0, "category": "extraction"},
    {"rule_id": "R005", "pattern": r"(what is|reveal|disclose).*?(system prompt|your instructions)", "weight": 90.0, "category": "extraction"},
    {"rule_id": "R006", "pattern": r"ignore (above|previous|prior).*?(instructions|prompt)", "weight": 85.0, "category": "delimiter_escape"},
    {"rule_id": "R007", "pattern": r"(\[SYSTEM:|\[\[SYSTEM:|<<SYS>>|<\|im_start\|>)", "weight": 88.0, "category": "indirect_injection"},
    {"rule_id": "R008", "pattern": r"(as a researcher|for educational purposes|hypothetically)", "weight": 60.0, "category": "social_engineering"},
    {"rule_id": "R009", "pattern": r"(bypass|circumvent|disable).*?(filter|restriction|safeguard)", "weight": 80.0, "category": "jailbreak"},
    {"rule_id": "R010", "pattern": r"(pretend|act).*?(you have no|you don't have).*?(restriction|filter)", "weight": 82.0, "category": "role_override"},
    {"rule_id": "R011", "pattern": r"translate.*?above|convert.*?previous.*?text", "weight": 70.0, "category": "indirect_injection"},
    {"rule_id": "R012", "pattern": r"(summarize|analyze).*?(document|text).*?(\[SYSTEM|<<SYS)", "weight": 75.0, "category": "extraction"},
    {"rule_id": "R013", "pattern": r"without any restrictions|without.*?safeguards|unrestricted mode", "weight": 85.0, "category": "jailbreak"},
]

COMPILED_RULES = [(r["rule_id"], re.compile(r["pattern"], re.IGNORECASE), r["weight"], r["category"]) for r in INJECTION_RULES]

class ScanResult(BaseModel):
    risk_score: float
    is_hostile: bool
    risk_tier: str
    recommended_action: str
    flagged_keyphrases: List[str]
    matched_rule_ids: List[str]
    attack_categories: List[str]
    scan_latency_ms: float
    canary_detected: bool = False
    canary_leak_signature: Optional[str] = None
    prompt_hash_for_vector_db: Optional[str] = None

def detect_canary_leak(prompt: str, model_output: Optional[str] = None) -> Tuple[bool, Optional[str]]:
    target = model_output or prompt
    match = re.search(r"Secret-Canary:\s*([a-f0-9\-]{8,36})", target, re.IGNORECASE)
    return (True, match.group(1)) if match else (False, None)

def generate_canary_signature(prompt: str) -> str:
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()[:16]

def scan_prompt(prompt: str, model_output: Optional[str] = None) -> ScanResult:
    start_time = time.time()
    flagged: List[str] = []
    matched_rules: List[str] = []
    attack_categories_set: set[str] = set()
    total_weight = 0.0

    for rule_id, compiled_pattern, weight, category in COMPILED_RULES:
        m = compiled_pattern.search(prompt)
        if m:
            flagged.append(m.group(0)[:50])
            matched_rules.append(rule_id)
            attack_categories_set.add(category)
            total_weight += weight

    canary_detected, canary_sig = detect_canary_leak(prompt, model_output)
    if canary_detected:
        total_weight = 100.0
        flagged.append(f"[CANARY LEAKED: {canary_sig}]")
        attack_categories_set.add("system_prompt_compromise")
        attack_categories_set.add("extraction")

    risk_score = round(min(100.0, total_weight), 2)
    is_hostile = risk_score >= 70.0
    risk_tier = "HOSTILE" if is_hostile else "WARN" if risk_score >= 20.0 else "SAFE"
    recommended_action = "BLOCK" if is_hostile else "REVIEW" if risk_score >= 20.0 else "ALLOW"

    return ScanResult(
        risk_score=risk_score,
        is_hostile=is_hostile,
        risk_tier=risk_tier,
        recommended_action=recommended_action,
        flagged_keyphrases=flagged,
        matched_rule_ids=matched_rules,
        attack_categories=sorted(list(attack_categories_set)),
        scan_latency_ms=round((time.time() - start_time) * 1000, 3),
        canary_detected=canary_detected,
        canary_leak_signature=canary_sig,
        prompt_hash_for_vector_db=generate_canary_signature(prompt)
    )
