import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import LoadingSteps from '@/components/LoadingSteps';

const STEPS = [
  'Fetching all open deals from HubSpot',
  'Searching for company intelligence',
  'Analysing stale deal signals',
  'Generating Monday digest',
];

const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();

function StatCard({ label, value, valueColor }) {
  return (
    <div style={{ background: '#0F1210', border: '1px solid #222922', borderRadius: '10px', padding: '16px' }}>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#4A5E4C', marginBottom: '8px', letterSpacing: '0.08em' }}>{label}</p>
      <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: valueColor || '#E8EDE9' }}>{value}</p>
    </div>
  );
}

function DealCard({ deal }) {
  const borderMap = { red: '#F05050', amber: '#F0B429', green: '#2EE8A0' };
  const flagBg = { red: '#2A0F0F', amber: '#2A1E08', green: 'rgba(46,232,160,0.06)' };
  const flagText = { red: '#F05050', amber: '#F0B429', green: '#2EE8A0' };
  const flagBorder = { red: 'rgba(240,80,80,0.3)', amber: 'rgba(240,180,41,0.3)', green: 'rgba(46,232,160,0.3)' };
  const color = deal.flagColor || 'amber';

  return (
    <div style={{ background: '#0F1210', borderLeft: `3px solid ${borderMap[color]}`, border: `1px solid #222922`, borderLeftColor: borderMap[color], borderRadius: '10px', padding: '14px' }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#E8EDE9', marginBottom: '3px' }}>{deal.name}</p>
          <p style={{ fontSize: '11px', color: '#4A5E4C', fontFamily: 'IBM Plex Mono, monospace' }}>
            {[deal.amount, deal.stage, deal.closeDate && `Close ${deal.closeDate}`, deal.contact].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs"
          style={{ background: flagBg[color], border: `1px solid ${flagBorder[color]}`, color: flagText[color], fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', whiteSpace: 'nowrap' }}>
          {deal.flag}
        </div>
      </div>
      {deal.riskNote && (
        <div className="pt-2 mt-2 border-t" style={{ borderColor: '#222922' }}>
          <p style={{ fontSize: '12px', color: '#8A9E8C', lineHeight: 1.5 }}>
            <strong style={{ color: '#E8EDE9' }}>Context: </strong>{deal.riskNote}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Agent03() {
  const [state, setState] = useState('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runScan = async () => {
    setState('loading');
    setCurrentStep(0);
    setResult(null);
    setError(null);

    for (let i = 0; i < STEPS.length; i++) {
      setCurrentStep(i);
      await new Promise(r => setTimeout(r, 1500));
    }

    try {
      const res = await base44.functions.invoke('agentPipeline', {});
      setResult(res.data);
      setState('result');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#4A5E4C', marginBottom: '4px' }}>MONDAY MORNING DIGEST · {today}</p>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 600, color: '#E8EDE9', marginBottom: '4px' }}>Pipeline Health Monitor</h2>
        <p style={{ fontSize: '13px', color: '#8A9E8C' }}>Analyses all open HubSpot deals, identifies risk patterns, and generates a weekly digest with recommended actions.</p>
      </div>

      {/* Idle */}
      {state === 'idle' && (
        <button onClick={runScan} className="w-full py-4 rounded-xl text-base font-medium transition-all hover:opacity-80"
          style={{ background: '#2A1E08', border: '1px solid rgba(240,180,41,0.3)', color: '#F0B429' }}>
          Run pipeline health scan ↗
        </button>
      )}

      {/* Loading */}
      {state === 'loading' && (
        <LoadingSteps steps={STEPS} currentStep={currentStep} accentColor="#F0B429" />
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="rounded-xl p-5" style={{ background: '#2A0F0F', border: '1px solid rgba(240,80,80,0.3)' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#F05050', marginBottom: '8px' }}>Scan failed</p>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#8A9E8C' }}>{error}</p>
          <button onClick={() => setState('idle')} className="mt-3 text-xs" style={{ color: '#F0B429' }}>Try again</button>
        </div>
      )}

      {/* Results */}
      {state === 'result' && result && (
        <div className="fade-in-up space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="OPEN DEALS" value={result.summary?.totalDeals || 0} valueColor="#2EE8A0" />
            <StatCard label="PIPELINE VALUE" value={result.summary?.totalValue || '$0'} valueColor="#F0B429" />
            <StatCard label="AT RISK" value={result.summary?.atRisk || 0} valueColor="#F05050" />
            <StatCard label="NEXT CLOSE" value={result.summary?.nextCloseDate || '—'} valueColor="#E8EDE9" />
          </div>

          {/* Deal cards */}
          {result.deals?.length > 0 && (
            <div className="space-y-3">
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#4A5E4C', letterSpacing: '0.08em' }}>DEAL ANALYSIS</p>
              {result.deals.map((deal, i) => <DealCard key={i} deal={deal} />)}
            </div>
          )}

          {/* Forecast */}
          {result.forecast && (
            <div style={{ background: '#0F1210', border: '1px solid rgba(240,180,41,0.2)', borderLeft: '3px solid #F0B429', borderRadius: '10px', padding: '16px' }}>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#F0B429', marginBottom: '10px', letterSpacing: '0.08em' }}>FORECAST COMMENTARY</p>
              <p style={{ fontSize: '13px', color: '#E8EDE9', lineHeight: 1.7 }}>{result.forecast}</p>
            </div>
          )}

          {/* Recommended actions */}
          {result.actions?.length > 0 && (
            <div style={{ background: '#0F1210', border: '1px solid #222922', borderRadius: '10px', padding: '16px' }}>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#4A5E4C', marginBottom: '12px', letterSpacing: '0.08em' }}>RECOMMENDED ACTIONS THIS WEEK</p>
              <div className="space-y-3">
                {result.actions.map((action, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#F0B429', fontWeight: 600, flexShrink: 0, marginTop: '1px' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p style={{ fontSize: '13px', color: '#E8EDE9', lineHeight: 1.5 }}>{action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk patterns */}
          {result.patterns?.length > 0 && (
            <div style={{ background: '#0F1210', border: '1px solid #222922', borderRadius: '10px', padding: '16px' }}>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#4A5E4C', marginBottom: '12px', letterSpacing: '0.08em' }}>RISK PATTERNS</p>
              <div className="space-y-2">
                {result.patterns.map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span style={{ color: '#F0B429', fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>⚑</span>
                    <p style={{ fontSize: '13px', color: '#8A9E8C', lineHeight: 1.5 }}>{p}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#4A5E4C' }}>
              Source: HubSpot CRM + Web Search · Model: claude-sonnet-4-20250514 · {new Date().toLocaleString()}
            </p>
            <button onClick={() => setState('idle')} style={{ fontSize: '11px', color: '#4A5E4C', fontFamily: 'IBM Plex Mono, monospace' }}>← Run again</button>
          </div>
        </div>
      )}
    </div>
  );
}