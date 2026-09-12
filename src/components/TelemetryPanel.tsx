// AegisAI | Built for SOC & AI Engineers
import React, { useEffect, useState } from 'react';
import { TelemetryEvent } from '../types';

export const TelemetryPanel: React.FC<{ refreshTrigger?: number }> = ({ refreshTrigger }) => {
  const [events, setEvents] = useState<TelemetryEvent[]>([]);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/telemetry');
        if (res.ok) {
          const data = await res.json();
          setEvents(Array.isArray(data) ? data : data.scans || []);
        }
      } catch {
        // Quiet fallback
      }
    };
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const formatTime = (ts: string) => {
    if (!ts) return '00:00:00';
    if (ts.includes('T')) return ts.split('T')[1].slice(0, 8);
    return ts.slice(0, 8);
  };

  const scoreStyle = (s: number) =>
    s >= 70 ? 'bg-red-900/80 text-red-200 border-red-700' : s >= 20 ? 'bg-amber-900/80 text-amber-200 border-amber-700' : 'bg-emerald-900/80 text-emerald-200 border-emerald-700';

  return (
    <div className="w-full bg-[#0f172a] border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 shadow-lg">
      <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800">
        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">SOC Telemetry Feed (Live 3s)</span>
        <span className="text-[10px] text-slate-500">{events.length} Events</span>
      </div>
      <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1">
        {events.length === 0 ? (
          <div className="text-slate-500 text-center py-4">No events logged yet. Execute a prompt scan.</div>
        ) : (
          events.slice(0, 10).map((e, idx) => (
            <div key={idx} className="p-2 bg-slate-900/90 rounded border border-slate-800/80 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <span className="text-slate-500 text-[10px] shrink-0">{formatTime(e.timestamp)}</span>
                <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold shrink-0 ${scoreStyle(e.risk_score)}`}>{e.risk_score}</span>
                <span className="text-slate-400 text-[10px] shrink-0">{e.recommended_action}</span>
                <span className="truncate text-slate-300 text-[11px] max-w-[200px]">{e.prompt_snippet}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {e.recommended_action === 'BLOCK' && <span className="px-1.5 py-0.5 rounded bg-red-900 text-red-100 text-[10px] font-bold">🚨 BLOCKED</span>}
                {e.tier2_triggered && <span className="px-1.5 py-0.5 rounded bg-purple-900 text-purple-200 text-[10px] font-bold">🤖 AI</span>}
                {e.flagged_keyphrases?.[0] && <span className="text-slate-500 text-[10px] hidden sm:inline truncate max-w-[120px] font-mono">{e.flagged_keyphrases[0]}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default TelemetryPanel;
