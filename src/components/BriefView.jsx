function Pill({ children, color = 'teal' }) {
  const styles = {
    teal: { bg: 'rgba(46,232,160,0.08)', border: 'rgba(46,232,160,0.2)', text: '#2EE8A0' },
    amber: { bg: '#2A1E08', border: 'rgba(240,180,41,0.25)', text: '#F0B429' },
    red: { bg: '#2A0F0F', border: 'rgba(240,80,80,0.25)', text: '#F05050' },
    gray: { bg: '#1C221D', border: '#2A322A', text: '#4A5E4C' },
  };
  const s = styles[color] || styles.teal;
  return (
    <span style={{
      fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', padding: '2px 8px',
      borderRadius: '20px', background: s.bg, border: `1px solid ${s.border}`, color: s.text
    }}>
      {children}
    </span>
  );
}

function Card({ children, borderColor, style = {} }) {
  return (
    <div style={{
      background: '#0F1210', border: `1px solid ${borderColor || '#222922'}`,
      borderRadius: '10px', padding: '16px', ...style
    }}>
      {children}
    </div>
  );
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

export default function BriefView({ brief, contact, generatedAt }) {
  const { deal, companyNews = [], talkingPoints = [], riskFlags = [], suggestedOpener } = brief;

  return (
    <div className="p-4 md:p-6 space-y-4 fade-in-up">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#4A5E4C' }}>
            {generatedAt || new Date().toLocaleString()}
          </span>
          {brief.contact?.hubspotId && <Pill color="gray">HS-{brief.contact.hubspotId}</Pill>}
        </div>
        <Pill color="teal">● Live</Pill>
      </div>

      {/* Alert banners */}
      {deal?.found && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: 'rgba(46,232,160,0.06)', border: '1px solid rgba(46,232,160,0.2)' }}>
          <span style={{ fontSize: '12px', color: '#2EE8A0' }}>
            🟢 Open deal · <strong>{deal.name}</strong> · {deal.stage} · Close {deal.closeDate}
          </span>
        </div>
      )}

      {/* Contact + Deal grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(46,232,160,0.12)', border: '1px solid rgba(46,232,160,0.25)' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', fontWeight: 600, color: '#2EE8A0' }}>
                {getInitials(brief.contact?.name || contact?.name)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: '15px', fontWeight: 500, color: '#E8EDE9', marginBottom: '2px' }}>
                {brief.contact?.name || contact?.name}
              </p>
              <p style={{ fontSize: '12px', color: '#8A9E8C', marginBottom: '8px' }}>
                {brief.contact?.title} {brief.contact?.title && brief.contact?.company ? '·' : ''} {brief.contact?.company}
              </p>
              <div className="flex items-center flex-wrap gap-1.5">
                {brief.contact?.email && (
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#4A5E4C', background: '#1C221D', border: '1px solid #2A322A', borderRadius: '4px', padding: '1px 6px' }}>
                    {brief.contact.email}
                  </span>
                )}
                <Pill color="amber">● HubSpot</Pill>
                {brief.contact?.lifecycle && <Pill color={brief.contact.lifecycle === 'opportunity' ? 'teal' : 'gray'}>{brief.contact.lifecycle}</Pill>}
              </div>
            </div>
          </div>
        </Card>

        <Card borderColor={deal?.found ? 'rgba(46,232,160,0.3)' : '#222922'}>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#4A5E4C', marginBottom: '10px', letterSpacing: '0.08em' }}>DEAL SNAPSHOT</p>
          {deal?.found ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Pill color="teal">● {deal.stage}</Pill>
              </div>
              <p style={{ fontSize: '14px', fontWeight: 500, color: '#E8EDE9' }}>{deal.name}</p>
              <div className="flex items-center gap-3 flex-wrap">
                {deal.amount && <span style={{ fontSize: '13px', color: '#2EE8A0', fontWeight: 600 }}>{deal.amount}</span>}
                {deal.closeDate && <span style={{ fontSize: '11px', color: '#4A5E4C', fontFamily: 'IBM Plex Mono, monospace' }}>Close {deal.closeDate}</span>}
              </div>
              {deal.nextStep && <p style={{ fontSize: '12px', color: '#8A9E8C', marginTop: '4px' }}>{deal.nextStep}</p>}
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '13px', color: '#4A5E4C', fontStyle: 'italic', marginBottom: '6px' }}>No open deal in HubSpot</p>
              <p style={{ fontSize: '12px', color: '#4A5E4C' }}>{deal?.note || 'Focus on discovery and qualification.'}</p>
            </div>
          )}
        </Card>
      </div>

      {/* Company news */}
      {companyNews.length > 0 && (
        <Card>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#4A5E4C', marginBottom: '12px', letterSpacing: '0.08em' }}>COMPANY NEWS</p>
          <div className="space-y-4">
            {companyNews.map((item, i) => (
              <div key={i} className={i > 0 ? 'pt-4 border-t' : ''} style={{ borderColor: '#222922' }}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#E8EDE9', lineHeight: 1.4 }}>{item.headline}</p>
                  <Pill color={item.hot ? 'amber' : 'gray'}>{item.age}</Pill>
                </div>
                <p style={{ fontSize: '12px', color: '#8A9E8C', lineHeight: 1.5, marginBottom: '4px' }}>{item.summary}</p>
                <p style={{ fontSize: '12px', color: '#2EE8A0', fontStyle: 'italic' }}>→ {item.relevance}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Talking points + Risk flags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#4A5E4C', marginBottom: '12px', letterSpacing: '0.08em' }}>TALKING POINTS</p>
          <div className="space-y-2.5">
            {talkingPoints.map((pt, i) => (
              <div key={i} className="flex items-start gap-2">
                <span style={{ color: '#2EE8A0', fontSize: '12px', marginTop: '1px', flexShrink: 0 }}>▸</span>
                <p style={{ fontSize: '13px', color: '#E8EDE9', lineHeight: 1.5 }}>{pt}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#4A5E4C', marginBottom: '12px', letterSpacing: '0.08em' }}>RISK FLAGS</p>
          <div className="space-y-2.5">
            {riskFlags.map((flag, i) => (
              <div key={i} className="flex items-start gap-2">
                <span style={{ color: '#F0B429', fontSize: '12px', marginTop: '1px', flexShrink: 0 }}>⚑</span>
                <p style={{ fontSize: '13px', color: '#E8EDE9', lineHeight: 1.5 }}>{flag}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Suggested opener */}
      {suggestedOpener && (
        <div style={{ background: '#071F14', border: '1px solid rgba(46,232,160,0.2)', borderLeft: '3px solid #2EE8A0', borderRadius: '10px', padding: '16px' }}>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#2EE8A0', letterSpacing: '0.08em', marginBottom: '10px' }}>SUGGESTED OPENER</p>
          <p style={{ fontSize: '14px', color: '#E8EDE9', fontStyle: 'italic', lineHeight: 1.6 }}>"{suggestedOpener}"</p>
        </div>
      )}

      {/* Footer */}
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#4A5E4C' }}>
        Source: HubSpot CRM + Web Search · Model: claude-sonnet-4-20250514 · {new Date().toLocaleString()}
      </p>
    </div>
  );
}