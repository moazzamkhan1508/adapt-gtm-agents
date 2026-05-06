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
    <div style={{ background: '#FFFFFF', border: '1px solid #DDE2E8', borderRadius: '10px', padding: '16px' }}>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#8A9BAA', marginBottom: '8px', letterSpacing: '0.08em' }}>{label}</p>
      <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '22px', fontWeight: 700, color: valueColor || '#1A2330' }}>{value}</p>
    </div>
  );
}

function DealCard({ deal }) {
  const borderMap = { red: '#D93030', amber: '#C47B10', green: '#159A68' };
  const flagBg = { red: '#FEF0F0', amber: '#FEF6E4', green: '#E8F7F1' };
  const flagText = { red: '#D93030', amber: '#C47B10', green: '#159A68' };
  const flagBorder = { red: '#F5AAAA', amber: '#F0D090', green: '#A8DCC8' };
  const color = deal.flagColor || 'amber';

  return (
    <div style={{ background: '#FFFFFF', borderLeft: `3px solid ${borderMap[color]}`, border: `1px solid #DDE2E8`, borderLeftColor: borderMap[color], borderRadius: '10px', padding: '14px' }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#1A2330', marginBottom: '3px' }}>{deal.name}</p>
          <p style={{ fontSize: '11px', color: '#8A9BAA', fontFamily: 'IBM Plex Mono, monospace' }}>
            {[deal.amount, deal.stage, deal.closeDate && `Close ${deal.closeDate}`, deal.contact].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex-shrink-0 px-2.5 py-1 rounded-full text-xs"
          style={{ background: flagBg[color], border: `1px solid ${flagBorder[color]}`, color: flagText[color], fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', whiteSpace: 'nowrap' }}>
          {deal.flag}
        </div>
      </div>
      {deal.riskNote && (
        <div className="pt-2 mt-2 border-t" style={{ borderColor: '#DDE2E8' }}>
          <p style={{ fontSize: '12px', color: '#4A5C6A', lineHeight: 1.5 }}>
            <strong style={{ color: '#1A2330' }}>Context: </strong>{deal.riskNote}
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
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#8A9BAA', marginBottom: '4px' }}>MONDAY MORNING DIGEST · {today}</p>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 600, color: '#1A2330', marginBottom: '4px' }}>Pipeline Health Monitor</h2>
        <p style={{ fontSize: '13px', color: '#4A5C6A' }}>Analyses all open HubSpot deals, identifies risk patterns, and generates a weekly digest with recommended actions.</p>
      </div>

      {/* Idle */}
      {state === 'idle' && (
        <button onClick={runScan} className="w-full py-4 rounded-xl text-base font-medium transition-all hover:opacity-80"
          style={{ background: '#FEF6E4', border: '1px solid #F0D090', color: '#C47B10' }}>
          Run pipeline health scan ↗
        </button>
      )}

      {/* Loading */}
      {state === 'loading' && (
        <LoadingSteps steps={STEPS} currentStep={currentStep} accentColor="#C47B10" />
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="rounded-xl p-5" style={{ background: '#FEF0F0', border: '1px solid #F5AAAA' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#D93030', marginBottom: '8px' }}>Scan failed</p>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#4A5C6A' }}>{error}</p>
          <button onClick={() => setState('idle')} className="mt-3 text-xs" style={{ color: '#C47B10' }}>Try again</button>
        </div>
      )}

      {/* Results */}
      {state === 'result' && result && (
        <div className="fade-in-up space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="OPEN DEALS" value={result.summary?.totalDeals || 0} valueColor="#159A68" />
            <StatCard label="PIPELINE VALUE" value={result.summary?.totalValue || '$0'} valueColor="#C47B10" />
            <StatCard label="AT RISK" value={result.summary?.atRisk || 0} valueColor="#D93030" />
            <StatCard label="NEXT CLOSE" value={result.summary?.nextCloseDate || '—'} valueColor="#1A2330" />
          </div>

          {/* Deal cards */}
          {result.deals?.length > 0 && (
            <div className="space-y-3">
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#8A9BAA', letterSpacing: '0.08em' }}>DEAL ANALYSIS</p>
              {result.deals.map((deal, i) => <DealCard key={i} deal={deal} />)}
            </div>
          )}

          {/* Forecast */}
          {result.forecast && (
            <div style={{ background: '#FFFFFF', border: '1px solid #F0D090', borderLeft: '3px solid #C47B10', borderRadius: '10px', padding: '16px' }}>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#C47B10', marginBottom: '10px', letterSpacing: '0.08em' }}>FORECAST COMMENTARY</p>
              <p style={{ fontSize: '13px', color: '#1A2330', lineHeight: 1.7 }}>{result.forecast}</p>
            </div>
          )}

          {/* Recommended actions */}
          {result.actions?.length > 0 && (
            <div style={{ background: '#FFFFFF', border: '1px solid #DDE2E8', borderRadius: '10px', padding: '16px' }}>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#8A9BAA', marginBottom: '12px', letterSpacing: '0.08em' }}>RECOMMENDED ACTIONS THIS WEEK</p>
              <div className="space-y-3">
                {result.actions.map((action, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#C47B10', fontWeight: 600, flexShrink: 0, marginTop: '1px' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p style={{ fontSize: '13px', color: '#1A2330', lineHeight: 1.5 }}>{action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Risk patterns */}
          {result.patterns?.length > 0 && (
            <div style={{ background: '#FFFFFF', border: '1px solid #DDE2E8', borderRadius: '10px', padding: '16px' }}>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#8A9BAA', marginBottom: '12px', letterSpacing: '0.08em' }}>RISK PATTERNS</p>
              <div className="space-y-2">
                {result.patterns.map((p, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span style={{ color: '#C47B10', fontSize: '12px', flexShrink: 0, marginTop: '1px' }}>⚑</span>
                    <p style={{ fontSize: '13px', color: '#4A5C6A', lineHeight: 1.5 }}>{p}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#8A9BAA' }}>
              Source: HubSpot CRM · {new Date().toLocaleString()}
            </p>
            <button onClick={() => setState('idle')} style={{ fontSize: '11px', color: '#8A9BAA', fontFamily: 'IBM Plex Mono, monospace' }}>← Run again</button>
          </div>
        </div>
      )}
    </div>
  );
}