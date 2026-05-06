import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

function formatDateTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function getDuration(start, end) {
  if (!start || !end) return null;
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}`;
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function OutcomePill({ outcome, status }) {
  const o = (outcome || status || '').toLowerCase();
  let bg, border, text, label;
  if (o.includes('complet')) { bg = '#E8F7F1'; border = '#A8DCC8'; text = '#159A68'; label = 'Completed'; }
  else if (o.includes('cancel')) { bg = '#FEF0F0'; border = '#F5AAAA'; text = '#D93030'; label = 'Cancelled'; }
  else if (o.includes('no_show') || o.includes('no show')) { bg = '#FEF0F0'; border = '#F5AAAA'; text = '#D93030'; label = 'No Show'; }
  else if (o.includes('scheduled') || o.includes('upcoming')) { bg = '#EFF5FF'; border = '#BFCFFF'; text = '#2563EB'; label = 'Scheduled'; }
  else if (o.includes('in_progress') || o.includes('progress')) { bg = '#E8F7F1'; border = '#A8DCC8'; text = '#159A68'; label = 'In Progress'; }
  else { bg = '#F5F7F9'; border = '#DDE2E8'; text = '#8A9BAA'; label = outcome || status || 'Unknown'; }

  return (
    <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', padding: '2px 7px', borderRadius: '20px', background: bg, border: `1px solid ${border}`, color: text, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

function MeetingCard({ meeting, onUseForFollowup }) {
  const [expanded, setExpanded] = useState(false);
  const isPast = !['upcoming', 'scheduled', 'in_progress'].includes(meeting.status?.toLowerCase());

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #DDE2E8', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
      {/* Header */}
      <button className="w-full text-left p-3" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 flex-1 min-w-0">
            {/* Date block */}
            <div className="flex-shrink-0 text-center" style={{ width: '36px' }}>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#8A9BAA', lineHeight: 1 }}>
                {meeting.startTime ? new Date(meeting.startTime).toLocaleString('en-US', { month: 'short' }).toUpperCase() : '—'}
              </p>
              <p style={{ fontFamily: 'Syne, sans-serif', fontSize: '18px', fontWeight: 700, color: '#1A2330', lineHeight: 1.1 }}>
                {meeting.startTime ? new Date(meeting.startTime).getDate() : '—'}
              </p>
            </div>
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: '13px', fontWeight: 500, color: '#1A2330', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {meeting.title}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {meeting.startTime && (
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#8A9BAA' }}>
                    {formatTime(meeting.startTime)}{meeting.endTime ? ` · ${getDuration(meeting.startTime, meeting.endTime)}` : ''}
                  </span>
                )}
                {meeting.contactName && (
                  <span style={{ fontSize: '11px', color: '#4A5C6A' }}>· {meeting.contactName}</span>
                )}
                {meeting.company && (
                  <span style={{ fontSize: '11px', color: '#8A9BAA' }}>@ {meeting.company}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <OutcomePill outcome={meeting.outcome} status={meeting.status} />
            <span style={{ fontSize: '10px', color: '#8A9BAA' }}>{expanded ? '▲' : '▼'}</span>
          </div>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div style={{ borderTop: '1px solid #DDE2E8', padding: '12px 12px 12px' }}>
          {/* Contact */}
          {meeting.contactName && (
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: '#EEF1F5', border: '1px solid #DDE2E8' }}>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', fontWeight: 600, color: '#4A5C6A' }}>{getInitials(meeting.contactName)}</span>
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 500, color: '#1A2330' }}>{meeting.contactName}</p>
                <p style={{ fontSize: '10px', color: '#8A9BAA' }}>{[meeting.contactEmail, meeting.company].filter(Boolean).join(' · ')}</p>
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="flex flex-wrap gap-2 mb-3">
            {meeting.startTime && (
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#4A5C6A', background: '#F5F7F9', border: '1px solid #DDE2E8', borderRadius: '4px', padding: '2px 7px' }}>
                📅 {formatDateTime(meeting.startTime)}
              </span>
            )}
            {meeting.location && (
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#4A5C6A', background: '#F5F7F9', border: '1px solid #DDE2E8', borderRadius: '4px', padding: '2px 7px' }}>
                📍 {meeting.location}
              </span>
            )}
            {meeting.source && (
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#4A5C6A', background: '#F5F7F9', border: '1px solid #DDE2E8', borderRadius: '4px', padding: '2px 7px' }}>
                via {meeting.source}
              </span>
            )}
          </div>

          {/* Notes */}
          {meeting.notes ? (
            <div style={{ background: '#F5F7F9', borderRadius: '6px', padding: '10px', marginBottom: '10px' }}>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#8A9BAA', marginBottom: '6px', letterSpacing: '0.06em' }}>MEETING NOTES</p>
              <p style={{ fontSize: '12px', color: '#4A5C6A', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{meeting.notes}</p>
            </div>
          ) : isPast ? (
            <div style={{ background: '#F5F7F9', borderRadius: '6px', padding: '10px', marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', color: '#8A9BAA', fontStyle: 'italic' }}>No meeting notes found in HubSpot.</p>
            </div>
          ) : null}

          {/* Use for follow-up CTA (past meetings only) */}
          {isPast && (
            <button
              onClick={() => onUseForFollowup(meeting)}
              style={{ width: '100%', padding: '8px', borderRadius: '6px', background: '#EFF5FF', border: '1px solid #BFCFFF', color: '#2563EB', fontSize: '12px', fontWeight: 500, cursor: 'pointer' }}>
              Use for Post-Call Follow-up →
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const today = new Date();
today.setHours(0, 0, 0, 0);

function makeTime(h, m = 0) {
  const d = new Date(today);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

const DEMO_MEETINGS = [
  {
    id: 'demo-1', title: 'Discovery Call — Sarah Chen', status: 'upcoming',
    startTime: makeTime(9, 0), endTime: makeTime(9, 30),
    contactName: 'Sarah Chen', contactEmail: 'sarah.chen@revenuehq.io', company: 'RevenueHQ',
    notes: 'Initial discovery to understand current GTM stack. Sarah leads RevOps at RevenueHQ — 200-person org running HubSpot + Outreach.',
    source: 'Apollo.io', outcome: null,
  },
  {
    id: 'demo-2', title: 'Product Demo — Marcus Webb', status: 'upcoming',
    startTime: makeTime(10, 30), endTime: makeTime(11, 15),
    contactName: 'Marcus Webb', contactEmail: 'mwebb@scalepath.com', company: 'ScalePath',
    notes: 'Live demo of pre-call brief feature. Marcus is VP of Sales — interested in reducing AE prep time across 12-person team.',
    source: 'Apollo.io', outcome: null,
  },
  {
    id: 'demo-3', title: 'Technical Deep-Dive — Priya Nair', status: 'upcoming',
    startTime: makeTime(13, 0), endTime: makeTime(14, 0),
    contactName: 'Priya Nair', contactEmail: 'p.nair@cloudmetrics.ai', company: 'CloudMetrics AI',
    notes: 'Technical review of HubSpot MCP integration, data residency requirements, and SSO compatibility.',
    source: 'Apollo.io', outcome: null,
  },
  {
    id: 'demo-4', title: 'Pilot Proposal — Jordan Kim', status: 'upcoming',
    startTime: makeTime(15, 0), endTime: makeTime(15, 30),
    contactName: 'Jordan Kim', contactEmail: 'jordan@launchpad-crm.com', company: 'Launchpad CRM',
    notes: 'Presenting 2-week pilot proposal with 5 AEs. Jordan has sign-off authority — needs ROI data and case studies.',
    source: 'Apollo.io', outcome: null,
  },
  {
    id: 'demo-5', title: 'Stakeholder Sync — Alex Rivera', status: 'upcoming',
    startTime: makeTime(16, 30), endTime: makeTime(17, 15),
    contactName: 'Alex Rivera', contactEmail: 'arivera@growthlabs.co', company: 'GrowthLabs',
    notes: 'Multi-stakeholder alignment with Alex (Head of Sales), their RevOps lead, and CTO. Discuss integration timeline and contract terms.',
    source: 'Apollo.io', outcome: null,
  },
];

export default function MeetingsPanel({ onUseForFollowup }) {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    base44.functions.invoke('agentMeetings', { _t: Date.now() })
      .then(res => {
        const hubUpcoming = res.data?.upcoming || [];
        const hubPast = res.data?.past || [];
        // Merge demo meetings (today) with real HubSpot meetings, deduped by id
        const allUpcoming = [...DEMO_MEETINGS, ...hubUpcoming];
        setUpcoming(allUpcoming);
        setPast(hubPast);
      })
      .catch(() => {
        // Fall back to demo meetings only
        setUpcoming(DEMO_MEETINGS);
        setPast([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const list = activeTab === 'upcoming' ? upcoming : past;

  return (
    <div style={{ width: '320px', minWidth: '320px', background: '#FFFFFF', borderLeft: '1px solid #DDE2E8', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>
      {/* Header */}
      <div style={{ padding: '12px 14px 0', borderBottom: '1px solid #DDE2E8' }}>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#8A9BAA', marginBottom: '8px', letterSpacing: '0.08em' }}>MEETING CALENDAR · HUBSPOT + APOLLO</p>
        <div className="flex gap-0">
          {['upcoming', 'past'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding: '6px 14px', fontSize: '12px', fontWeight: 500,
                color: activeTab === tab ? '#1A2330' : '#8A9BAA',
                borderBottom: activeTab === tab ? '2px solid #2563EB' : '2px solid transparent',
                background: 'transparent', cursor: 'pointer', textTransform: 'capitalize',
              }}>
              {tab === 'upcoming' ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '12px' }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#2563EB' }} />
            <p style={{ fontSize: '11px', color: '#8A9BAA', fontFamily: 'IBM Plex Mono, monospace' }}>Loading meetings…</p>
          </div>
        ) : error ? (
          <div style={{ background: '#FEF0F0', border: '1px solid #F5AAAA', borderRadius: '8px', padding: '12px' }}>
            <p style={{ fontSize: '12px', color: '#D93030' }}>{error}</p>
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p style={{ fontSize: '12px', color: '#8A9BAA' }}>No {activeTab} meetings</p>
          </div>
        ) : (
          list.map(m => (
            <MeetingCard key={m.id} meeting={m} onUseForFollowup={onUseForFollowup} />
          ))
        )}
      </div>
    </div>
  );
}