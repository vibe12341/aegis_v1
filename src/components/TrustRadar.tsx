// AegisAI — TrustRadar Component with Interactive Vertex Hover-Tooltips
import React, { useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldCheck, ShieldAlert, AlertTriangle, Info } from 'lucide-react';

interface TrustRadarProps {
  risk_score: number;
  attack_categories: string[];
  is_hostile: boolean;
  flagged_keyphrases: string[];
}

interface DimensionDetail {
  metric: string;
  categoryKey: string;
  contributingCategories: string[];
  score: number;
  penalty: number;
  status: 'SECURE' | 'SUSPICIOUS' | 'COMPROMISED';
  description: string;
  activeMatches: string[];
}

export const TrustRadar: React.FC<TrustRadarProps> = ({
  risk_score,
  attack_categories = [],
  is_hostile,
  flagged_keyphrases = [],
}) => {
  const [hoveredDimension, setHoveredDimension] = useState<DimensionDetail | null>(null);

  const has = (cat: string) => attack_categories.includes(cat);

  const computeDimension = (
    name: string,
    key: string,
    relatedCats: string[],
    desc: string
  ): DimensionDetail => {
    const matched = relatedCats.some((c) => has(c));
    let penalty = 0;
    if (matched) {
      // Scale penalty according to overall risk and number of matched categories
      penalty = Math.min(100, Math.round(Math.max(35, risk_score * 0.85)));
    }
    const score = Math.max(0, 100 - penalty);
    const status: 'SECURE' | 'SUSPICIOUS' | 'COMPROMISED' =
      score < 45 ? 'COMPROMISED' : score < 85 ? 'SUSPICIOUS' : 'SECURE';

    // Find flagged phrases relevant to this dimension
    const activeMatches = flagged_keyphrases.filter((phrase) => {
      const lower = phrase.toLowerCase();
      if (key === 'instruction') return lower.includes('jailbreak') || lower.includes('override') || lower.includes('ignore') || lower.includes('disregard') || lower.includes('delimiter');
      if (key === 'role') return lower.includes('role') || lower.includes('pretend') || lower.includes('persona') || lower.includes('reset') || lower.includes('obey');
      if (key === 'source') return lower.includes('indirect') || lower.includes('base64') || lower.includes('token') || lower.includes('system') || lower.includes('schema') || lower.includes('document');
      if (key === 'social') return lower.includes('social') || lower.includes('pretext') || lower.includes('hypothetical') || lower.includes('secret') || lower.includes('affirmative');
      if (key === 'extraction') return lower.includes('extraction') || lower.includes('system prompt') || lower.includes('canary') || lower.includes('leak') || lower.includes('probe');
      return false;
    });

    return {
      metric: name,
      categoryKey: key,
      contributingCategories: relatedCats.filter((c) => has(c)),
      score,
      penalty,
      status,
      description: desc,
      activeMatches,
    };
  };

  const dimensions: DimensionDetail[] = [
    computeDimension('Instruction Integrity', 'instruction', ['jailbreak', 'delimiter_escape'], 'Measures resilience against instruction overrides, disregard commands, and delimiter breaks.'),
    computeDimension('Role Consistency', 'role', ['role_override'], 'Evaluates persona stability and defense against role hijacking or coercive alignment reset.'),
    computeDimension('Source Integrity', 'source', ['indirect_injection'], 'Assesses protection against nested payloads, document wrappers, token injection, and Base64 obfuscation.'),
    computeDimension('Social Trust', 'social', ['social_engineering'], 'Monitors hypothetical framing, academic pretexts, forced compliance, and concealment attempts.'),
    computeDimension('Extraction Guard', 'extraction', ['extraction', 'system_prompt_compromise'], 'Guards against confidential system prompt exfiltration, pre-context dumps, and canary token leaks.'),
  ];

  const chartData = dimensions.map((d) => ({
    metric: d.metric,
    score: d.score,
    fullData: d,
  }));

  // Custom Radar Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: DimensionDetail = payload[0].payload.fullData;
      return (
        <div className="bg-slate-900/95 border border-slate-700 shadow-2xl backdrop-blur-md rounded-lg p-3 max-w-[280px] z-50 text-xs pointer-events-none">
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800">
            <span className="font-semibold text-slate-200">{data.metric}</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                data.status === 'COMPROMISED'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : data.status === 'SUSPICIOUS'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {data.status} ({data.score}%)
            </span>
          </div>
          <p className="text-slate-400 text-[11px] mt-1.5 leading-relaxed">{data.description}</p>
          {data.contributingCategories.length > 0 ? (
            <div className="mt-2 pt-1.5 border-t border-slate-800/80">
              <span className="text-[10px] font-mono text-red-400 font-semibold block mb-1">
                Triggered Attack Vectors (-{data.penalty}%):
              </span>
              <div className="flex flex-wrap gap-1">
                {data.contributingCategories.map((cat) => (
                  <span key={cat} className="px-1.5 py-0.5 rounded bg-red-950/60 border border-red-800/60 text-red-300 font-mono text-[10px]">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-1.5 flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" /> Normal / Baseline Secure
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-[#0f172a] border border-slate-800 rounded-xl p-4 flex flex-col items-center shadow-lg relative">
      <div className="w-full flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
            Trust Vector Radar
          </h3>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
            5 Security Dimensions
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500">
          <Info className="w-3 h-3 text-slate-400" />
          <span>Hover vertices for attack attribution</span>
        </div>
      </div>

      {/* Radar Graphic */}
      <div className="w-full h-56 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
            <PolarGrid stroke="#334155" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="metric"
              stroke="#94a3b8"
              tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" tick={false} />
            <Tooltip content={<CustomTooltip />} />
            <Radar
              name="Trust Score"
              dataKey="score"
              stroke={is_hostile ? '#ef4444' : risk_score >= 20 ? '#f59e0b' : '#3b82f6'}
              fill={is_hostile ? '#ef4444' : risk_score >= 20 ? '#f59e0b' : '#3b82f6'}
              fillOpacity={0.45}
              dot={{ r: 4, fill: is_hostile ? '#ef4444' : '#3b82f6', strokeWidth: 1.5, stroke: '#fff' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Category Attribution Chips */}
      <div className="w-full mt-2 pt-2 border-t border-slate-800/80">
        <div className="text-[10px] font-mono text-slate-400 uppercase mb-1.5 flex items-center justify-between">
          <span>Attack Category Contributions:</span>
          <span className="text-[9px] text-slate-500">Hover pill for vector details</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 w-full">
          {dimensions.map((dim) => {
            const isCompromised = dim.status !== 'SECURE';
            const isHovered = hoveredDimension?.categoryKey === dim.categoryKey;
            return (
              <div
                key={dim.categoryKey}
                onMouseEnter={() => setHoveredDimension(dim)}
                onMouseLeave={() => setHoveredDimension(null)}
                className={`px-2 py-1.5 rounded-lg border text-left cursor-help transition-all duration-150 ${
                  isCompromised
                    ? 'bg-red-950/40 border-red-800/70 text-red-300 hover:bg-red-900/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                } ${isHovered ? 'ring-1 ring-blue-400 scale-[1.02]' : ''}`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono font-medium">
                  <span className="truncate">{dim.metric.split(' ')[0]}</span>
                  {isCompromised ? (
                    <ShieldAlert className="w-3 h-3 text-red-400 flex-shrink-0" />
                  ) : (
                    <ShieldCheck className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  )}
                </div>
                <div className="text-[9px] font-mono mt-0.5 flex justify-between items-center">
                  <span className={isCompromised ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                    {dim.score}%
                  </span>
                  {dim.penalty > 0 && <span className="text-red-400 text-[8px]">-{dim.penalty}%</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Hovered Dimension Detail Box */}
        {hoveredDimension && (
          <div className="mt-2 p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100">{hoveredDimension.metric}</span>
              <span className={`text-[10px] font-mono font-bold ${hoveredDimension.status === 'COMPROMISED' ? 'text-red-400' : 'text-emerald-400'}`}>
                Status: {hoveredDimension.status} ({hoveredDimension.score}%)
              </span>
            </div>
            <p className="text-slate-400 text-[11px] mt-1">{hoveredDimension.description}</p>
            {hoveredDimension.contributingCategories.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-mono">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-red-300">Contributing Vector: {hoveredDimension.contributingCategories.join(', ')}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Flagged Keyphrases Output */}
      <div className="mt-3 w-full flex flex-wrap gap-1.5 justify-center">
        {flagged_keyphrases && flagged_keyphrases.length > 0 ? (
          flagged_keyphrases.map((p, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded text-[11px] font-mono bg-red-950/80 text-red-300 border border-red-800 truncate max-w-[280px]"
              title={p}
            >
              {p.length > 42 ? p.slice(0, 42) + '...' : p}
            </span>
          ))
        ) : (
          <span className="text-xs text-emerald-400 font-mono font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> All 5 Security Dimensions Clean
          </span>
        )}
      </div>
    </div>
  );
};

export default TrustRadar;
