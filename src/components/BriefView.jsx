function Pill({ children, color = 'teal' }) {
  const styles = {
    teal: { bg: '#E8F7F1', border: '#A8DCC8', text: '#159A68' },
    amber: { bg: '#FEF6E4', border: '#F0D090', text: '#C47B10' },
    red: { bg: '#FEF0F0', border: '#F5AAAA', text: '#D93030' },
    gray: { bg: '#F5F7F9', border: '#DDE2E8', text: '#4A5C6A' },
    blue: { bg: '#EFF5FF', border: '#BFCFFF', text: '#2563EB' },
    purple: { bg: '#F3F0FF', border: '#C4B5FD', text: '#7C3AED' },
  };
  const s = styles[color] || styles.teal;
  return (
    <span style={{
      fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', padding: '2px 8px',
      borderRadius: '20px', background: s.bg, border: `1px solid ${s.border}`, color: s.text,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#8A9BAA', marginBottom: '12px', letterSpacing: '0.08em' }}>
      {children}
    </p>
  );
}

function Card({ children, borderColor, borderLeft, style = {} }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: `1px solid ${borderColor || '#DDE2E8'}`,
      borderLeft: borderLeft ? `3px solid ${borderLeft}` : `1px solid ${borderColor || '#DDE2E8'}`,
      borderRadius: '10px',
      padding: '16px',
      ...style
    }}>
      {children}
    </div>
  );
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function MeetingOutcomeColor(outcome) {
  if (!outcome) return 'gray';
  const o = outcome.toLowerCase();
  if (o.includes('complet') || o.includes('scheduled')) return 'teal';
  if (o.includes('cancel') || o.includes('no_show')) return 'red';
  return 'amber';
}

export default function BriefView({ brief, contact, generatedAt, onRunBrief }) {
  const {
    deal,
    deals = [],
    meetings = [],
    notes = [],
    companyNews = [],
    talkingPoints = [],
    riskFlags = [],
    suggestedOpener,
  } = brief;

  const contactInfo = brief.contact || {};
  const displayName = contactInfo.name || contact?.name || '';

  return (
    <div className="p-4 md:p-6 space-y-4 fade-in-up">

      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#8A9BAA' }}>
          {generatedAt || new Date().toLocaleString()}
        </span>
        <div className="flex items-center gap-2">
          {contactInfo.fromApollo && <Pill color="purple">● Apollo import</Pill>}
          {contactInfo.hubspotId && <Pill color="gray">HS-{contactInfo.hubspotId}</Pill>}
          <Pill color="teal">● Live</Pill>
        </div>
      </div>

      {/* Active deal banner */}
      {deal?.found && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg" style={{ background: '#E8F7F1', border: '1px solid #A8DCC8' }}>
          <span style={{ fontSize: '12px', color: '#159A68' }}>
            🟢 Open deal · <strong>{deal.name}</strong> · {deal.stage}{deal.closeDate ? ` · Close ${deal.closeDate}` : ''}
          </span>
        </div>
      )}

      {/* Contact + Primary deal grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Contact card */}
        <Card>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#C5EADA', border: '1px solid #A8DCC8' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', fontWeight: 600, color: '#159A68' }}>
                {getInitials(displayName)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              {onRunBrief ? (
                <button
                  onClick={() => onRunBrief({ name: displayName, company: contactInfo.company, email: contactInfo.email })}
                  style={{ fontSize: '15px', fontWeight: 500, color: '#2563EB', marginBottom: '2px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                  {displayName}
                </button>
              ) : (
                <p style={{ fontSize: '15px', fontWeight: 500, color: '#1A2330', marginBottom: '2px' }}>{displayName}</p>
              )}
              <p style={{ fontSize: '12px', color: '#4A5C6A', marginBottom: '6px' }}>
                {[contactInfo.title, contactInfo.company].filter(Boolean).join(' · ')}
              </p>
              {contactInfo.location && (
                <p style={{ fontSize: '11px', color: '#8A9BAA', marginBottom: '6px', fontFamily: 'IBM Plex Mono, monospace' }}>
                  📍 {contactInfo.location}
                </p>
              )}
              <div className="flex items-center flex-wrap gap-1.5">
                {contactInfo.email && (
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#4A5C6A', background: '#F5F7F9', border: '1px solid #DDE2E8', borderRadius: '4px', padding: '1px 6px' }}>
                    {contactInfo.email}
                  </span>
                )}
                {contactInfo.phone && (
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#4A5C6A', background: '#F5F7F9', border: '1px solid #DDE2E8', borderRadius: '4px', padding: '1px 6px' }}>
                    {contactInfo.phone}
                  </span>
                )}
                {contactInfo.linkedinUrl && (
                  <a href={contactInfo.linkedinUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#2563EB', background: '#EFF5FF', border: '1px solid #BFCFFF', borderRadius: '4px', padding: '1px 6px', textDecoration: 'none' }}>
                    LinkedIn ↗
                  </a>
                )}
                <Pill color="amber">● HubSpot</Pill>
                {contactInfo.lifecycle && <Pill color={contactInfo.lifecycle === 'opportunity' ? 'teal' : 'gray'}>{contactInfo.lifecycle}</Pill>}
              </div>
            </div>
          </div>
        </Card>

        {/* Primary deal */}
        <Card borderColor={deal?.found ? '#A8DCC8' : '#DDE2E8'}>
          <SectionLabel>DEAL SNAPSHOT</SectionLabel>
          {deal?.found ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Pill color="teal">● {deal.stage}</Pill>
                {deal.probability && <Pill color="gray">{deal.probability}</Pill>}
              </div>
              {onRunBrief ? (
                <button
                  onClick={() => onRunBrief({ name: displayName, company: contactInfo.company, email: contactInfo.email })}
                  style={{ fontSize: '14px', fontWeight: 500, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                  {deal.name}
                </button>
              ) : (
                <p style={{ fontSize: '14px', fontWeight: 500, color: '#1A2330' }}>{deal.name}</p>
              )}
              <div className="flex items-center gap-3 flex-wrap">
                {deal.amount && <span style={{ fontSize: '13px', color: '#159A68', fontWeight: 600 }}>{deal.amount}</span>}
                {deal.closeDate && <span style={{ fontSize: '11px', color: '#8A9BAA', fontFamily: 'IBM Plex Mono, monospace' }}>Close {deal.closeDate}</span>}
                {deal.lastModified && <span style={{ fontSize: '11px', color: '#8A9BAA', fontFamily: 'IBM Plex Mono, monospace' }}>Updated {deal.lastModified}</span>}
              </div>
              {deal.nextStep && <p style={{ fontSize: '12px', color: '#4A5C6A', marginTop: '4px' }}>Next: {deal.nextStep}</p>}
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '13px', color: '#8A9BAA', fontStyle: 'italic', marginBottom: '6px' }}>No open deal in HubSpot</p>
              <p style={{ fontSize: '12px', color: '#8A9BAA' }}>{deal?.note || 'Focus on discovery and qualification.'}</p>
            </div>
          )}
        </Card>
      </div>

      {/* All deals (if more than 1) */}
      {deals.length > 1 && (
        <Card>
          <SectionLabel>ALL DEALS ({deals.length})</SectionLabel>
          <div className="space-y-3">
            {deals.map((d, i) => (
              <div key={i} className={i > 0 ? 'pt-3 border-t' : ''} style={{ borderColor: '#DDE2E8' }}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {onRunBrief ? (
                    <button
                      onClick={() => onRunBrief({ name: displayName, company: contactInfo.company, email: contactInfo.email })}
                      style={{ fontSize: '13px', fontWeight: 500, color: '#2563EB', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
                      {d.name}
                    </button>
                  ) : (
                    <p style={{ fontSize: '13px', fontWeight: 500, color: '#1A2330' }}>{d.name}</p>
                  )}
                  <div className="flex items-center gap-1.5">
                    {d.amount && <span style={{ fontSize: '12px', color: '#159A68', fontWeight: 600 }}>{d.amount}</span>}
                    <Pill color="gray">{d.stage}</Pill>
                  </div>
                </div>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#8A9BAA', marginTop: '3px' }}>
                  {[d.closeDate && `Close ${d.closeDate}`, d.probability && `${d.probability} prob.`, d.lastModified && `Updated ${d.lastModified}`].filter(Boolean).join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Meetings */}
      {meetings.length > 0 && (
        <Card>
          <SectionLabel>MEETING HISTORY ({meetings.length})</SectionLabel>
          <div className="space-y-4">
            {meetings.slice(0, 4).map((m, i) => (
              <div key={i} className={i > 0 ? 'pt-4 border-t' : ''} style={{ borderColor: '#DDE2E8' }}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#1A2330' }}>{m.title}</p>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {m.outcome && <Pill color={MeetingOutcomeColor(m.outcome)}>{m.outcome}</Pill>}
                  </div>
                </div>
                {m.startTime && (
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#8A9BAA', marginBottom: '6px' }}>{m.startTime}</p>
                )}
                {m.notes && (
                  <p style={{ fontSize: '12px', color: '#4A5C6A', lineHeight: 1.5, borderLeft: '2px solid #DDE2E8', paddingLeft: '10px' }}>
                    {m.notes.slice(0, 300)}{m.notes.length > 300 ? '…' : ''}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recent notes */}
      {notes.length > 0 && (
        <Card>
          <SectionLabel>RECENT NOTES</SectionLabel>
          <div className="space-y-3">
            {notes.map((n, i) => (
              <div key={i} className={i > 0 ? 'pt-3 border-t' : ''} style={{ borderColor: '#DDE2E8' }}>
                {n.date && <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#8A9BAA', marginBottom: '4px' }}>{n.date}</p>}
                <p style={{ fontSize: '12px', color: '#4A5C6A', lineHeight: 1.6 }}>{n.body?.slice(0, 400)}{n.body?.length > 400 ? '…' : ''}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Company news */}
      {companyNews.length > 0 && (
        <Card>
          <SectionLabel>COMPANY INTELLIGENCE · {contactInfo.company}</SectionLabel>
          <div className="space-y-4">
            {companyNews.map((item, i) => (
              <div key={i} className={i > 0 ? 'pt-4 border-t' : ''} style={{ borderColor: '#DDE2E8' }}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#1A2330', lineHeight: 1.4 }}>{item.headline}</p>
                  <Pill color={item.hot ? 'amber' : 'gray'}>{item.age}</Pill>
                </div>
                <p style={{ fontSize: '12px', color: '#4A5C6A', lineHeight: 1.5, marginBottom: '4px' }}>{item.summary}</p>
                <p style={{ fontSize: '12px', color: '#159A68', fontStyle: 'italic' }}>→ {item.relevance}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Talking points + Risk flags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <SectionLabel>TALKING POINTS</SectionLabel>
          <div className="space-y-2.5">
            {talkingPoints.map((pt, i) => (
              <div key={i} className="flex items-start gap-2">
                <span style={{ color: '#159A68', fontSize: '12px', marginTop: '1px', flexShrink: 0 }}>▸</span>
                <p style={{ fontSize: '13px', color: '#1A2330', lineHeight: 1.5 }}>{pt}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionLabel>RISK FLAGS</SectionLabel>
          <div className="space-y-2.5">
            {riskFlags.map((flag, i) => (
              <div key={i} className="flex items-start gap-2">
                <span style={{ color: '#C47B10', fontSize: '12px', marginTop: '1px', flexShrink: 0 }}>⚑</span>
                <p style={{ fontSize: '13px', color: '#1A2330', lineHeight: 1.5 }}>{flag}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Suggested opener */}
      {suggestedOpener && (
        <div style={{ background: '#E8F7F1', border: '1px solid #A8DCC8', borderLeft: '3px solid #159A68', borderRadius: '10px', padding: '16px' }}>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#159A68', letterSpacing: '0.08em', marginBottom: '10px' }}>SUGGESTED OPENER</p>
          <p style={{ fontSize: '14px', color: '#1A2330', fontStyle: 'italic', lineHeight: 1.6 }}>"{suggestedOpener}"</p>
        </div>
      )}

      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#8A9BAA' }}>
        Source: HubSpot CRM + Claude AI · {new Date().toLocaleString()}
      </p>
    </div>
  );
}