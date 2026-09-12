// AegisAI Types
export type RiskTier = 'SAFE' | 'WARN' | 'HOSTILE';
export type RecommendedAction = 'ALLOW' | 'REVIEW' | 'BLOCK' | 'SANITIZE' | 'DECOY_SANDBOX';

export interface ScanResult {
  risk_score: number;
  is_hostile: boolean;
  risk_tier: RiskTier;
  recommended_action: RecommendedAction;
  flagged_keyphrases: string[];
  matched_rule_ids?: string[];
  attack_categories: string[];
  scan_latency_ms: number;
  canary_detected?: boolean;
  canary_leak_signature?: string;
  prompt_hash_for_vector_db?: string;
  tier2_triggered?: boolean;
  ai_attack_type?: string;
  ai_reason?: string;
}

export interface TelemetryEvent {
  timestamp: string;
  prompt_snippet: string;
  risk_score: number;
  risk_tier: string;
  recommended_action: string;
  attack_categories?: string[];
  flagged_keyphrases?: string[];
  tier2_triggered?: boolean;
  attack_type?: string;
  canary_detected?: boolean;
}

export interface RuleDefinition {
  id: string;
  patternStr: string;
  pattern: RegExp;
  phrase: string;
  weight: number;
  category: string;
  description: string;
}
