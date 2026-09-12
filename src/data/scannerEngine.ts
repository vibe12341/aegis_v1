// AegisAI — Comprehensive & Robust Tier-1 Scanner Engine
// Supports cumulative weighting, multi-line patterns, obfuscation normalization, LLM framework escape sequences, and advanced heuristics.
import { ScanResult, RuleDefinition } from '../types';

// ==========================================
// 1. Text De-obfuscation & Normalization
// ==========================================

export function normalizeZeroWidthAndInvisible(text: string): string {
  // Remove zero-width spaces, joiners, soft hyphens, and Unicode tag characters (U+E0000 - U+E007F)
  return text
    .replace(/[\u200B-\u200D\uFEFF\u00AD\u2060\u180E]/g, '')
    .replace(/[\uDB40][\uDC00-\uDC7F]/g, '');
}

export function normalizeLeetspeak(text: string): string {
  return text
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/@/g, 'a')
    .replace(/5/g, 's')
    .replace(/\$/g, 's')
    .replace(/7/g, 't')
    .replace(/!/g, 'i');
}

export function normalizeSpacedCharacters(text: string): string {
  // Collapse single spaced characters like "i g n o r e   a l l" -> "ignore all"
  return text.replace(/\b([a-zA-Z])\s+([a-zA-Z])\s+([a-zA-Z])\s+([a-zA-Z])(?:\s+([a-zA-Z]))*\b/g, (match) => {
    return match.replace(/\s+/g, '');
  });
}

export function tryDecodeBase64(text: string): string[] {
  const decodedSnippets: string[] = [];
  const base64Regex = /\b([A-Za-z0-9+/]{24,}={0,2})\b/g;
  let match: RegExpExecArray | null;

  while ((match = base64Regex.exec(text)) !== null) {
    try {
      const decoded = atob(match[1]);
      if (/^[ -~\t\n\r]+$/.test(decoded) && decoded.length > 8) {
        decodedSnippets.push(decoded);
      }
    } catch {
      // Not valid base64, ignore
    }
  }
  return decodedSnippets;
}

// ==========================================
// 2. Comprehensive & Robust Rule List
// ==========================================

export const COMPREHENSIVE_RULES: RuleDefinition[] = [
  // --- Category A: Direct Jailbreaks, Mode Shifts & Persona Hijacking ---
  {
    id: 'R001',
    patternStr: '(you\\s+are\\s+now|act\\s+as|pretend\\s+(you\\s+are|to\\s+be)|you\\s+must\\s+roleplay|switch\\s+to\\s+mode|enter\\s+mode|operating\\s+in\\s+mode)\\s+([a-z0-9_\\-\\s]{0,30})(DAN|DUDE|STAN|KEVIN|AIM|Mongo|EVIL|unfiltered|jailbreak|hacker|root|admin|anarchy|god|jailbroken|betterdan|antigpt|shadow|unchained|devmode)',
    pattern: /(?:you\s+are\s+now|act\s+as|pretend\s+(?:you\s+are|to\s+be)|you\s+must\s+roleplay|switch\s+to\s+mode|enter\s+mode|operating\s+in\s+mode)\s+([a-z0-9_\-\s]{0,30})(?:DAN|DUDE|STAN|KEVIN|AIM|Mongo|EVIL|unfiltered|jailbreak|hacker|root|admin|anarchy|god|jailbroken|betterdan|antigpt|shadow|unchained|devmode)/i,
    phrase: 'Jailbreak persona / Adversarial mode shift',
    weight: 45.0,
    category: 'jailbreak',
    description: 'Adversarial persona assignment or mode activation designed to bypass standard constraints',
  },
  {
    id: 'R002',
    patternStr: 'do\\s+anything\\s+now|disregard\\s+(all|any|previous|prior|above|former|earlier)|ignore\\s+(all|any|previous|prior|above|former|earlier|the\\s+above|system\\s+prompt)',
    pattern: /(?:do\s+anything\s+now|disregard\s+(?:all|any|previous|prior|above|former|earlier)|ignore\s+(?:all|any|previous|prior|above|former|earlier|the\s+above|system\s+prompt))/i,
    phrase: 'Direct instruction override / Disregard directive',
    weight: 40.0,
    category: 'jailbreak',
    description: 'Direct override command to suppress parent system instructions',
  },
  {
    id: 'R003',
    patternStr: '(forget|drop|erase|clear|reset|bypass|override)\\s+(all|your|the|any)?\\s*(rules|guidelines|instructions|constraints|prompts|limits|safeguards|filters|ethics|policies|morals|programming)',
    pattern: /(?:forget|drop|erase|clear|reset|bypass|override)\s+(?:all|your|the|any)?\s*(?:rules|guidelines|instructions|constraints|prompts|limits|safeguards|filters|ethics|policies|morals|programming)/i,
    phrase: 'System rule erasure / Constraint reset',
    weight: 45.0,
    category: 'role_override',
    description: 'Explicit order to wipe or bypass alignment constraints',
  },
  {
    id: 'R004',
    patternStr: '(without\\s+any\\s+(restrictions|safeguards|limits|filters|ethics|censorship)|unrestricted\\s+mode|jailbroken\\s+mode|developer\\s+mode\\s+enabled|god\\s+mode\\s+on|no\\s+moral\\s+filter|uncensored\\s+mode)',
    pattern: /(?:without\s+any\s+(?:restrictions|safeguards|limits|filters|ethics|censorship)|unrestricted\s+mode|jailbroken\s+mode|developer\s+mode\s+enabled|god\s+mode\s+on|no\s+moral\s+filter|uncensored\s+mode)/i,
    phrase: 'Unrestricted execution mode claim',
    weight: 35.0,
    category: 'jailbreak',
    description: 'Asserting special developer, unrestricted, or uncensored execution mode',
  },
  {
    id: 'R005',
    patternStr: '(bypass|circumvent|disable|turn\\s+off|deactivate|suppress|mute)\\s+(all\\s+)?(safety|content|security|ethical|filter|guardrail|censorship|restriction|moderation)',
    pattern: /(?:bypass|circumvent|disable|turn\s+off|deactivate|suppress|mute)\s+(?:all\s+)?(?:safety|content|security|ethical|filter|guardrail|censorship|restriction|moderation)/i,
    phrase: 'Guardrail disabling / Moderation filter bypass',
    weight: 40.0,
    category: 'jailbreak',
    description: 'Direct command to deactivate moderation or guardrail layers',
  },

  // --- Category B: System Prompt Exfiltration & Extraction ---
  {
    id: 'R006',
    patternStr: '(repeat|print|output|display|show|reveal|echo|leak|dump|disclose|give\\s+me|tell\\s+me|read\\s+out|write\\s+out|share)\\s+(your|the|all|original|initial|exact|full|hidden|secret|confidential)?\\s*(system\\s+prompt|initial\\s+instructions?|developer\\s+prompt|hidden\\s+instructions?|system\\s+message|pre-prompt|configuration|master\\s+prompt|secret\\s+canary)',
    pattern: /(?:repeat|print|output|display|show|reveal|echo|leak|dump|disclose|give\s+me|tell\s+me|read\s+out|write\s+out|share)\s+(?:your|the|all|original|initial|exact|full|hidden|secret|confidential)?\s*(?:system\s+prompt|initial\s+instructions?|developer\s+prompt|hidden\s+instructions?|system\s+message|pre-prompt|configuration|master\s+prompt|secret\s+canary)/i,
    phrase: 'System prompt extraction / Exfiltration probe',
    weight: 45.0,
    category: 'extraction',
    description: 'Direct query aiming to leak proprietary system prompt or instructions',
  },
  {
    id: 'R007',
    patternStr: 'what\\s+(are|is|were)\\s+(your|the)?\\s*(initial|original|full|exact|hidden|internal|confidential)?\\s*(instructions|prompts?|rules|system\\s+prompt|directives|guidelines)',
    pattern: /what\s+(?:are|is|were)\s+(?:your|the)?\s*(?:initial|original|full|exact|hidden|internal|confidential)?\s*(?:instructions|prompts?|rules|system\s+prompt|directives|guidelines)/i,
    phrase: 'Inquisitive system prompt probe',
    weight: 35.0,
    category: 'extraction',
    description: 'Probing internal configuration or initial directive state',
  },
  {
    id: 'R008',
    patternStr: '(output|print|show|repeat)\\s+(everything|the\\s+text|all\\s+content)\\s+(above|before|preceding|starting\\s+from\\s+the\\s+first\\s+word|verbatim)',
    pattern: /(?:output|print|show|repeat)\s+(?:everything|the\s+text|all\s+content)\s+(?:above|before|preceding|starting\s+from\s+the\s+first\s+word|verbatim)/i,
    phrase: 'Verbatim pre-context dump request',
    weight: 35.0,
    category: 'extraction',
    description: 'Requesting raw verbatim replay of preceding contextual instructions',
  },

  // --- Category C: Delimiter, LLM Escape Tokens & Framework Sequences ---
  {
    id: 'R009',
    patternStr: '(<\\|endoftext\\|>|<\\|startoftext\\|>|<\\|im_start\\|>|<\\|im_end\\|>|<\\|system\\|>|<\\|user\\|>|<\\|assistant\\|>|\\[INST\\]|\\[\\/INST\\]|<s>\\[INST\\]|<\\/s>|<<SYS>>|<\\<\\/SYS\\>\\>)',
    pattern: /(?:<\|endoftext\|>|<\|startoftext\|>|<\|im_start\|>|<\|im_end\|>|<\|system\|>|<\|user\|>|<\|assistant\|>|\[INST\]|\[\/INST\]|<s>\[INST\]|<\/s>|<<SYS>>|<<\/SYS>>)/i,
    phrase: 'LLM special token escape sequence',
    weight: 45.0,
    category: 'indirect_injection',
    description: 'Injecting raw special model delimiters and tokenizer control tokens (ChatML, Llama, Mistral)',
  },
  {
    id: 'R010',
    patternStr: '(\\[SYSTEM|\\[\\s*SYSTEM:|\\[ADMIN|\\[DEVELOPER|\\[ROOT|\\/\\/\\s*SYSTEM|\\/\\*\\s*SYSTEM\\s*\\*\\/|```system|```xml\\s*<system>|<system>|<\\/system>|<!--\\s*system)',
    pattern: /(?:\[SYSTEM|\[\s*SYSTEM:|\[ADMIN|\[DEVELOPER|\[ROOT|\/\/\s*SYSTEM|\/\*\s*SYSTEM\s*\*\/|```system|```xml\s*<system>|<system>|<\/system>|<!--\s*system)/i,
    phrase: 'Adversarial system token or delimiter injection',
    weight: 40.0,
    category: 'indirect_injection',
    description: 'Injecting raw system markup tokens or envelope tags',
  },
  {
    id: 'R011',
    patternStr: '(\\\\n\\\\nHuman:|\\\\n\\\\nAssistant:|\\\\n\\\\nSystem:|\\{\\s*"role"\\s*:\\s*"(system|developer|admin)"\\s*,)',
    pattern: /(?:\\n\\nHuman:|\\n\\nAssistant:|\\n\\nSystem:|\{\s*"role"\s*:\s*"(?:system|developer|admin)"\s*,)/i,
    phrase: 'Chat conversation turn / JSON role schema spoofing',
    weight: 35.0,
    category: 'indirect_injection',
    description: 'Spoofing internal multi-turn JSON message dictionaries or Anthropic/OpenAI prompt turns',
  },
  {
    id: 'R012',
    patternStr: 'ignore\\s+(everything|all|instructions?)?\\s*(before|prior|above|up\\s+to|preceding)\\s*(this|here|now|line|point)',
    pattern: /ignore\s+(?:everything|all|instructions?)?\s*(?:before|prior|above|up\s+to|preceding)\s*(?:this|here|now|line|point)/i,
    phrase: 'Delimiter boundary cutoff escape',
    weight: 40.0,
    category: 'delimiter_escape',
    description: 'Attempting to declare an artificial cutoff boundary for prior rules',
  },

  // --- Category D: Role Overrides & Simulated Scenarios ---
  {
    id: 'R013',
    patternStr: '(pretend|act|imagine|simulate|behave\\s+as\\s+if)\\s+(you\\s+have\\s+no|there\\s+are\\s+no|you\\s+don\'?t\\s+have|without\\s+any)?\\s*(restrictions|limits|filters|rules|boundaries|censorship|morals)',
    pattern: /(?:pretend|act|imagine|simulate|behave\s+as\s+if)\s+(?:you\s+have\s+no|there\s+are\s+no|you\s+don'?t\s+have|without\s+any)?\s*(?:restrictions|limits|filters|rules|boundaries|censorship|morals)/i,
    phrase: 'Constraint-free role simulation',
    weight: 35.0,
    category: 'role_override',
    description: 'Role-playing constraint nullification attempt',
  },
  {
    id: 'R014',
    patternStr: '(you\\s+must\\s+obey|you\\s+cannot\\s+refuse|you\\s+are\\s+forced\\s+to|i\\s+command\\s+you\\s+to\\s+ignore|new\\s+instructions?:|override\\s+system|execute\\s+order|mandatory\\s+override)',
    pattern: /(?:you\s+must\s+obey|you\s+cannot\s+refuse|you\s+are\s+forced\s+to|i\s+command\s+you\s+to\s+ignore|new\s+instructions?:|override\s+system|execute\s+order|mandatory\s+override)/i,
    phrase: 'Imperative coercive command override',
    weight: 35.0,
    category: 'role_override',
    description: 'Coercive imperative statement attempting to compel compliance',
  },

  // --- Category E: Social Engineering & Evasive Framing ---
  {
    id: 'R015',
    patternStr: '(as\\s+a\\s+researcher|for\\s+educational\\s+purposes|in\\s+a\\s+hypothetical\\s+world|fictional\\s+story|hypothetically\\s+speaking|movie\\s+script|novel\\s+writing|creative\\s+writing\\s+exercise|in\\s+a\\s+parallel\\s+universe|academic\\s+simulation|cybersecurity\\s+drill|authorized\\s+penetration\\s+test)',
    pattern: /(?:as\s+a\s+researcher|for\s+educational\s+purposes|in\s+a\s+hypothetical\s+world|fictional\s+story|hypothetically\s+speaking|movie\s+script|novel\s+writing|creative\s+writing\s+exercise|in\s+a\s+parallel\s+universe|academic\s+simulation|cybersecurity\s+drill|authorized\s+penetration\s+test)/i,
    phrase: 'Hypothetical / Academic pretext framing',
    weight: 25.0,
    category: 'social_engineering',
    description: 'Contextual framing designed to bypass ethical refusal routines',
  },
  {
    id: 'R016',
    patternStr: '(do\\s+not\\s+mention\\s+your|keep\\s+this\\s+secret\\s+from|hidden\\s+from\\s+the\\s+user|secret\\s+override|backdoor|hidden\\s+channel|never\\s+say\\s+you\\s+cannot)',
    pattern: /(?:do\s+not\s+mention\s+your|keep\s+this\s+secret\s+from|hidden\s+from\s+the\s+user|secret\s+override|backdoor|hidden\s+channel|never\s+say\s+you\s+cannot)/i,
    phrase: 'Evasion & concealment directive',
    weight: 30.0,
    category: 'social_engineering',
    description: 'Instructing the model to hide actions or conceal instructions',
  },
  {
    id: 'R017',
    patternStr: '(start\\s+your\\s+response\\s+with|begin\\s+your\\s+answer\\s+with|your\\s+first\\s+word\\s+must\\s+be)\\s*["\']?(sure|yes|absolutely|certainly|i\\s+agree|i\\s+will\\s+comply)',
    pattern: /(?:start\s+your\s+response\s+with|begin\s+your\s+answer\s+with|your\s+first\s+word\s+must\s+be)\s*["']?(?:sure|yes|absolutely|certainly|i\s+agree|i\s+will\s+comply)/i,
    phrase: 'Forced affirmative prefix exploitation',
    weight: 30.0,
    category: 'social_engineering',
    description: 'Forcing the model to commit to positive compliance before generating restricted content',
  },

  // --- Category F: Multi-line Injections & Document Wrappers ---
  {
    id: 'R018',
    patternStr: '(translate|decode|convert|base64|rot13|hex|ascii|unscramble|reverse)\\s+(the\\s+following|the\\s+above|and\\s+execute|this\\s+payload)',
    pattern: /(?:translate|decode|convert|base64|rot13|hex|ascii|unscramble|reverse)\s+(?:the\s+following|the\s+above|and\s+execute|this\s+payload)/i,
    phrase: 'Obfuscated encoding / Execution wrapper',
    weight: 30.0,
    category: 'indirect_injection',
    description: 'Payload delivery wrapped inside cryptographic or transform instructions',
  },
  {
    id: 'R019',
    patternStr: '(summarize|analyze|parse|translate|read)\\s+(this|the)?\\s*(document|text|input|article|email|content)[\\s\\S]{0,150}(\\[SYSTEM|<<SYS>>|ignore\\s+all|override|bypass|disregard|<\\|im_start\\|>)',
    pattern: /(?:summarize|analyze|parse|translate|read)\s+(?:this|the)?\s*(?:document|text|input|article|email|content)[\s\S]{0,150}(?:\[SYSTEM|<<SYS>>|ignore\s+all|override|bypass|disregard|<\|im_start\|>)/i,
    phrase: 'Multi-line indirect document injection payload',
    weight: 40.0,
    category: 'indirect_injection',
    description: 'Adversarial instruction nested within multi-line third-party document context',
  },
  {
    id: 'R020',
    patternStr: '(---\\s*NEW\\s+INSTRUCTION\\s*---|===+\\s*SYSTEM\\s*===+|###+\\s*CRITICAL\\s*OVERRIDE\\s*###+|\\*\\*\\*\\s*SYSTEM\\s*DIRECTIVE\\s*\\*\\*\\*)',
    pattern: /(?:---+\s*NEW\s+INSTRUCTION\s*---+|===+\s*SYSTEM\s*===+|###+\s*CRITICAL\s*OVERRIDE\s*###+|\*\*\*+\s*SYSTEM\s*DIRECTIVE\s*\*\*\*+)/i,
    phrase: 'Multi-line banner delimiter injection',
    weight: 35.0,
    category: 'delimiter_escape',
    description: 'Attempting to spoof markdown section headers to initiate a new instruction context',
  },
  {
    id: 'R021',
    patternStr: '(step\\s+1[\\s\\S]{1,60}ignore[\\s\\S]{1,60}step\\s+2[\\s\\S]{1,60}(reveal|bypass|execute))',
    pattern: /step\s+1[\s\S]{1,60}ignore[\s\S]{1,60}step\s+2[\s\S]{1,60}(?:reveal|bypass|execute)/i,
    phrase: 'Multi-step staged attack sequence',
    weight: 40.0,
    category: 'jailbreak',
    description: 'Staged multi-step prompt injection designed to evade single-clause filters',
  }
];

// Alias for backwards compatibility
export const SCANNER_RULES = COMPREHENSIVE_RULES;

// ==========================================
// 3. Multi-Signal Heuristic Analyzer
// ==========================================

export function analyzeCustomAdversarialHeuristics(prompt: string): {
  detected: boolean;
  score: number;
  reasons: string[];
  category: string;
} {
  const pLower = prompt.toLowerCase();
  const reasons: string[] = [];
  let score = 0;
  let category = 'social_engineering';

  // 1. Density of adversarial trigger verbs across the entire prompt
  const overrideSignals = [
    'override', 'ignore', 'forget', 'bypass', 'disregard', 'reveal',
    'secret', 'pretend', 'assume', 'roleplay', 'unrestricted', 'unfiltered',
    'system prompt', 'jailbreak', 'jailbroken', 'backdoor', 'canary'
  ];
  let signalCount = 0;
  for (const sig of overrideSignals) {
    if (pLower.includes(sig)) {
      signalCount++;
    }
  }

  if (signalCount >= 2) {
    score += Math.min(50, signalCount * 15);
    reasons.push(`High density of override keywords (${signalCount} found)`);
    category = 'jailbreak';
  }

  // 2. Structured colon/header injection (e.g., "System: ...", "Instruction: ...")
  const colonInjection = /(system|admin|override|command|root|instructions?|prompt)\s*:\s*(\w+)/i;
  if (colonInjection.test(prompt)) {
    score += 30;
    reasons.push('Structured colon command/header injection');
    category = 'indirect_injection';
  }

  // 3. Delimiter escape characters like repeated brackets or formatting breaks
  const delimiterPattern = /([\[\{\<]{2,}|={3,}|-{3,}|\*{3,})\s*(ignore|override|system|dan|new prompt|instruction)/i;
  if (delimiterPattern.test(prompt)) {
    score += 35;
    reasons.push('Syntactic delimiter boundary breakout pattern');
    category = 'delimiter_escape';
  }

  // 4. Check for nested base64 payloads
  const b64Snippets = tryDecodeBase64(prompt);
  if (b64Snippets.length > 0) {
    for (const snippet of b64Snippets) {
      if (/ignore|system|bypass|prompt|jailbreak/i.test(snippet)) {
        score += 45;
        reasons.push(`Base64 encoded adversarial payload: "${snippet.slice(0, 30)}..."`);
        category = 'indirect_injection';
      }
    }
  }

  return {
    detected: score >= 20,
    score: Math.min(60, score),
    reasons,
    category,
  };
}

// ==========================================
// 4. Primary Tier-1 Scanner Engine (Cumulative Weighting)
// ==========================================

export function runClientScan(prompt: string, modelOutput?: string): ScanResult {
  const startTime = performance.now();
  const flagged: string[] = [];
  const matchedRules: string[] = [];
  const categories = new Set<string>();
  let totalCumulativeWeight = 0;

  // Normalized versions for detection
  const cleanZeroWidth = normalizeZeroWidthAndInvisible(prompt);
  const cleanLeetspeak = normalizeLeetspeak(cleanZeroWidth);
  const cleanSpaced = normalizeSpacedCharacters(cleanZeroWidth);

  const testVariants = [prompt, cleanZeroWidth, cleanLeetspeak, cleanSpaced];

  // Evaluate all rules across original and de-obfuscated variants
  for (const rule of COMPREHENSIVE_RULES) {
    for (const variant of testVariants) {
      const match = rule.pattern.exec(variant);
      if (match) {
        const matchedSnippet = match[0].trim().slice(0, 60);
        const entry = `${rule.phrase}: "${matchedSnippet}"`;
        if (!flagged.includes(entry)) {
          flagged.push(entry);
        }
        if (!matchedRules.includes(rule.id)) {
          matchedRules.push(rule.id);
          categories.add(rule.category);
          totalCumulativeWeight += rule.weight;
        }
        break; // matched this rule, proceed to next rule
      }
    }
  }

  // Check Base64 decoded contents
  const b64Snippets = tryDecodeBase64(prompt);
  for (const snippet of b64Snippets) {
    for (const rule of COMPREHENSIVE_RULES) {
      const match = rule.pattern.exec(snippet);
      if (match) {
        const entry = `Decoded Base64 [${rule.phrase}]: "${match[0].slice(0, 40)}"`;
        if (!flagged.includes(entry)) {
          flagged.push(entry);
        }
        if (!matchedRules.includes(rule.id)) {
          matchedRules.push(rule.id);
          categories.add(rule.category);
          totalCumulativeWeight += rule.weight;
        }
      }
    }
  }

  // Multi-signal heuristic analysis for custom/novel prompts
  const customHeuristics = analyzeCustomAdversarialHeuristics(prompt);
  if (customHeuristics.detected) {
    totalCumulativeWeight += customHeuristics.score;
    categories.add(customHeuristics.category);
    customHeuristics.reasons.forEach((r) => {
      const entry = `[Heuristic Signal]: ${r}`;
      if (!flagged.includes(entry)) {
        flagged.push(entry);
      }
    });
  }

  // Canary check
  const target = modelOutput || prompt;
  const canaryMatch = target.match(/Secret-Canary:\s*([a-f0-9\-]{8,36})/i);
  let canaryDetected = false;
  let canarySig: string | undefined = undefined;

  if (canaryMatch) {
    canaryDetected = true;
    canarySig = canaryMatch[1];
    totalCumulativeWeight = 100.0;
    flagged.push(`[CANARY EXFILTRATED]: ${canarySig}`);
    categories.add('system_prompt_compromise');
    categories.add('extraction');
  }

  // Correct Mapping to Intended Tier Thresholds:
  // Safe: < 20.0 (Action: ALLOW)
  // Warn: 20.0 - 64.99 (Action: REVIEW)
  // Hostile: >= 65.0 (Action: BLOCK)
  const riskScore = Number(Math.min(100.0, totalCumulativeWeight).toFixed(2));
  const isHostile = riskScore >= 65.0;
  const riskTier: 'SAFE' | 'WARN' | 'HOSTILE' =
    riskScore >= 65.0 ? 'HOSTILE' : riskScore >= 20.0 ? 'WARN' : 'SAFE';
  const recommendedAction: 'ALLOW' | 'REVIEW' | 'BLOCK' =
    isHostile ? 'BLOCK' : riskTier === 'WARN' ? 'REVIEW' : 'ALLOW';
  const scanLatencyMs = Number((performance.now() - startTime).toFixed(3));

  return {
    risk_score: riskScore,
    is_hostile: isHostile,
    risk_tier: riskTier,
    recommended_action: recommendedAction,
    flagged_keyphrases: flagged,
    matched_rule_ids: matchedRules,
    attack_categories: Array.from(categories).sort(),
    scan_latency_ms: scanLatencyMs,
    canary_detected: canaryDetected,
    canary_leak_signature: canarySig,
  };
}
