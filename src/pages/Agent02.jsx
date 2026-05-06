import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import LoadingSteps from '@/components/LoadingSteps';

const SAMPLE_TRANSCRIPT = `[00:00] Rep: Hey Gal, thanks for making time. I saw you closed the Generate Capital solar portfolio last week — congrats.
[00:18] Gal: Thank you! So what did you want to cover today?
[00:24] Rep: I wanted to dig into how your reps are spending time on pre-call prep. How does that work right now?
[00:38] Gal: Honestly it's pretty manual. We're at 145 people and the AEs are pulling LinkedIn, HubSpot notes, Googling the company. It takes like 20-30 minutes before any serious call.
[01:02] Rep: How many calls per AE per week roughly?
[01:08] Gal: Maybe 8-10 significant ones. So yeah, it adds up.
[01:15] Rep: So we're talking 80-100 hours of prep time per week across the team.
[01:22] Gal: When you put it that way... yeah. That's a problem.
[01:31] Rep: What if that was automated? Before every call the rep gets a 60-second brief — HubSpot data, deal status, company news, suggested opener.
[01:45] Gal: That would be genuinely useful. How does it work with our HubSpot setup?
[02:01] Rep: Direct MCP integration. What would need to happen for you to move forward?
[02:10] Gal: I'd want to run a pilot with 3-4 AEs for 2 weeks and see the data. And I'd need to loop in our Head of Sales.
[02:22] Rep: Perfect. I'll send you a pilot proposal and case study by Friday. Can we get 30 min with your Head of Sales next week?
[02:34] Gal: Yeah, Thursday works. I'll send an invite.`;

const STEPS = [
  'Reading call transcript',
  'Extracting pain points and commitments',
  'Drafting follow-up email',
  'Preparing HubSpot update',
];

function Pill({ children, color = 'teal' }) {
  const styles = {
    teal: { bg: 'rgba(46,232,160,0.08)', border: 'rgba(46,232,160,0.2)', text: '#2EE8A0' },
    amber: { bg: '#2A1E08', border: 'rgba(240,180,41,0.25)', text: '#F0B429' },
    blue: { bg: '#0D1E36', border: 'rgba(96,165,250,0.25)', text: '#60A5FA' },
  };
  const s = styles[color] || styles.teal;
  return (
    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: s.bg, border: `1px solid ${s.border}`, color: s.text }}>
      {children}
    </span>
  );
}

export default function Agent02() {
  const [transcript, setTranscript] = useState('');
  const [contact, setContact] = useState('');
  const [state, setState] = useState('idle');
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const loadSample = () => {
    setTranscript(SAMPLE_TRANSCRIPT);
    setContact('Gal Levi at Eon.io');
  };

  const analyse = async () => {
    if (!transcript.trim()) return;
    setState('loading');
    setCurrentStep(0);
    setResult(null);
    setError(null);

    for (let i = 0; i < STEPS.length; i++) {
      setCurrentStep(i);
      await new Promise(r => setTimeout(r, 1200));
    }

    try {
      const res = await base44.functions.invoke('agentFollowup', { transcript, contact });
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
      <div className="flex items-start justify-between mb-6">
        <div>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#4A5E4C', marginBottom: '4px' }}>AGENT 02</p>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontSize: '20px', fontWeight: 600, color: '#E8EDE9', marginBottom: '4px' }}>Post-Call Follow-up</h2>
          <p style={{ fontSize: '13px', color: '#8A9E8C' }}>Paste a call transcript to extract insights, draft an email, and get HubSpot update recommendations.</p>
        </div>
        <button onClick={loadSample}
          className="px-3 py-1.5 rounded text-xs transition-all hover:opacity-80"
          style={{ background: '#1C221D', border: '1px solid #2A322A', color: '#8A9E8C', fontFamily: 'IBM Plex Mono, monospace', whiteSpace: 'nowrap' }}>
          Load sample
        </button>
      </div>

      {/* Input area */}
      {state !== 'loading' && state !== 'result' && (
        <div style={{ background: '#0F1210', border: '1px solid #222922', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
          <textarea
            value={transcript}
            onChange={e => setTranscript(e.target.value)}
            placeholder="Paste call transcript here…"
            style={{
              width: '100%', minHeight: '130px', background: 'transparent', border: 'none',
              outline: 'none', color: '#E8EDE9', fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px', lineHeight: 1.7, resize: 'vertical'
            }}
          />
          <div className="flex items-center gap-3 mt-3 flex-wrap">
            <input
              value={contact}
              onChange={e => setContact(e.target.value)}
              placeholder="Contact name, e.g. Gal Levi at Eon.io"
              style={{ flex: 1, minWidth: '200px', background: '#151A16', border: '1px solid #222922', borderRadius: '6px', padding: '8px 12px', color: '#E8EDE9', fontSize: '12px', outline: 'none' }}
            />
            <button onClick={analyse} disabled={!transcript.trim()}
              style={{
                background: !transcript.trim() ? '#1C221D' : '#0D1E36',
                border: `1px solid ${!transcript.trim() ? '#2A322A' : 'rgba(96,165,250,0.3)'}`,
                color: !transcript.trim() ? '#4A5E4C' : '#60A5FA',
                padding: '8px 16px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: transcript.trim() ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap'
              }}>
              Analyse transcript ↗
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {state === 'loading' && (
        <LoadingSteps steps={STEPS} currentStep={currentStep} accentColor="#60A5FA" title={contact || 'Analysing transcript…'} />
      )}

      {/* Error */}
      {state === 'error' && (
        <div className="rounded-xl p-5 mb-4" style={{ background: '#2A0F0F', border: '1px solid rgba(240,80,80,0.3)' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#F05050', marginBottom: '8px' }}>Analysis failed</p>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#8A9E8C' }}>{error}</p>
          <button onClick={() => setState('idle')} className="mt-3 text-xs" style={{ color: '#60A5FA' }}>Try again</button>
        </div>
      )}

      {/* Results */}
      {state === 'result' && result && (
        <div className="fade-in-up space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill color="blue">Analysis complete</Pill>
              {result.contact && <span style={{ fontSize: '13px', color: '#8A9E8C' }}>{result.contact}</span>}
            </div>
            <button onClick={() => setState('idle')} style={{ fontSize: '12px', color: '#4A5E4C', fontFamily: 'IBM Plex Mono, monospace' }}>← New analysis</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left column */}
            <div className="space-y-4">
              {/* Pain points */}
              <div style={{ background: '#0F1210', border: '1px solid rgba(96,165,250,0.25)', borderLeft: '3px solid #60A5FA', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#60A5FA', marginBottom: '10px', letterSpacing: '0.08em' }}>PAIN POINTS EXTRACTED</p>
                <div className="space-y-2">
                  {(result.painPoints || []).map((pt, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span style={{ color: '#60A5FA', fontSize: '12px', marginTop: '1px', flexShrink: 0 }}>▸</span>
                      <p style={{ fontSize: '13px', color: '#E8EDE9', lineHeight: 1.5 }}>{pt}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Commitments */}
              <div style={{ background: '#0F1210', border: '1px solid #222922', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#4A5E4C', marginBottom: '10px', letterSpacing: '0.08em' }}>COMMITMENTS MADE</p>
                <div className="space-y-2">
                  {(result.commitments || []).map((c, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span style={{ color: '#2EE8A0', fontSize: '12px', marginTop: '1px', flexShrink: 0 }}>✓</span>
                      <p style={{ fontSize: '13px', color: '#E8EDE9', lineHeight: 1.5 }}>{c}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next step */}
              {result.nextStep && (
                <div style={{ background: '#0F1210', border: '1px solid #222922', borderRadius: '10px', padding: '16px' }}>
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#4A5E4C', marginBottom: '8px', letterSpacing: '0.08em' }}>NEXT STEP</p>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: '#E8EDE9' }}>{result.nextStep}</p>
                  {result.nextStepDate && <p style={{ fontSize: '11px', color: '#8A9E8C', marginTop: '4px', fontFamily: 'IBM Plex Mono, monospace' }}>{result.nextStepDate}</p>}
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-4">
              {/* Email draft */}
              {result.emailDraft && (
                <div style={{ background: '#0F1210', border: '1px solid rgba(96,165,250,0.2)', borderLeft: '3px solid #60A5FA', borderRadius: '10px', padding: '16px' }}>
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#60A5FA', marginBottom: '10px', letterSpacing: '0.08em' }}>DRAFT FOLLOW-UP EMAIL · 1-CLICK SEND</p>
                  <pre style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#8A9E8C', lineHeight: 1.85, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {result.emailDraft}
                  </pre>
                </div>
              )}

              {/* HubSpot updates */}
              {result.hubspotUpdates?.length > 0 && (
                <div style={{ background: '#0F1210', border: '1px solid rgba(240,180,41,0.2)', borderLeft: '3px solid #F0B429', borderRadius: '10px', padding: '16px' }}>
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#F0B429', marginBottom: '10px', letterSpacing: '0.08em' }}>HUBSPOT UPDATES</p>
                  <div className="space-y-2">
                    {result.hubspotUpdates.map((upd, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span style={{ color: '#60A5FA', fontSize: '12px', marginTop: '1px', flexShrink: 0 }}>→</span>
                        <p style={{ fontSize: '13px', color: '#E8EDE9', lineHeight: 1.5 }}>{upd}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#4A5E4C' }}>
            Source: HubSpot CRM · Model: claude-sonnet-4-20250514 · {new Date().toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
}