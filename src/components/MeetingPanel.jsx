import { useState } from 'react';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function MeetingCard({ meeting, onUseForFollowup, onSelectContact, isExpanded, onToggle }) {
  const date = new Date(meeting.startTime);
  const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate();
  const time = date.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const isPast = meeting.status === 'Completed';

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #DDE2E8', borderRadius: '10px', marginBottom: '10px', overflow: 'hidden' }}>
      {/* Header row */}
      <div style={{ padding: '12px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: '12px' }} onClick={onToggle}>
        {/* Date box */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', background: '#F5F7F9', border: '1px solid #DDE2E8', borderRadius: '8px' }}>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', fontWeight: 700, color: '#8A9BAA', lineHeight: 1, marginBottom: '3px' }}>{month}</span>
          <span style={{ fontFamily: 'Syne, sans-serif', fontSize: '17px', fontWeight: 700, color: '#1A2330', lineHeight: 1 }}>{day}</span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '6px', marginBottom: '3px' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#1A2330', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{meeting.title}</p>
            <span style={{
              flexShrink: 0, fontSize: '9px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, padding: '2px 7px', borderRadius: '20px',
              background: isPast ? '#E8F7F1' : '#EFF5FF',
              border: `1px solid ${isPast ? '#A8DCC8' : '#BFCFFF'}`,
              color: isPast ? '#159A68' : '#2563EB',
            }}>{meeting.status}</span>
            {isExpanded ? <ChevronUp size={12} color="#8A9BAA" /> : <ChevronDown size={12} color="#8A9BAA" />}
          </div>
          <p style={{ fontSize: '10px', color: '#8A9BAA', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={10} /> {time} · 1h
          </p>
          <p style={{ fontSize: '10px', color: '#4A5C6A', marginTop: '3px' }}>
            ·{' '}
            <button
              onClick={e => { e.stopPropagation(); onSelectContact(meeting.contact); }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '10px' }}
            >
              <span style={{ color: '#159A68', textDecoration: 'underline' }}>{meeting.contact.name}</span>
            </button>
            {meeting.contact.company && (
              <>
                <span style={{ color: '#8A9BAA' }}> · </span>
                <button
                  onClick={e => { e.stopPropagation(); onSelectContact(meeting.contact); }}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: '10px' }}
                >
                  <span style={{ color: '#2563EB', textDecoration: 'underline' }}>{meeting.contact.company}</span>
                </button>
              </>
            )}
          </p>
          {meeting.deal && (
            <p style={{ fontSize: '10px', color: '#8A9BAA', marginTop: '2px', fontFamily: 'IBM Plex Mono, monospace' }}>
              {meeting.deal.stage} · {meeting.deal.amount}
            </p>
          )}
          <p style={{ fontSize: '10px', color: '#8A9BAA', marginTop: '2px' }}>@ HubSpot</p>
        </div>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid #DDE2E8', padding: '12px', background: '#FAFBFC' }}>
          {/* Contact row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#EEF1F5', border: '1px solid #DDE2E8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', fontWeight: 600, color: '#4A5C6A' }}>{getInitials(meeting.contact.name)}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <button
                onClick={() => onSelectContact(meeting.contact)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'block', textAlign: 'left' }}
              >
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#159A68', textDecoration: 'underline', textDecorationColor: '#A8DCC8' }}>{meeting.contact.name}</span>
              </button>
              {meeting.contact.email && (
                <p style={{ fontSize: '10px', color: '#8A9BAA', fontFamily: 'IBM Plex Mono, monospace' }}>{meeting.contact.email} · HubSpot</p>
              )}
            </div>
          </div>

          {/* Deal info */}
          {meeting.deal && (
            <div style={{ background: '#FEF6E4', border: '1px solid #F0D090', borderRadius: '8px', padding: '8px 10px', marginBottom: '12px' }}>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', color: '#C47B10', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '4px' }}>DEAL</p>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#1A2330', marginBottom: '2px' }}>{meeting.deal.name}</p>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#8A9BAA' }}>
                {meeting.deal.stage} · {meeting.deal.amount} · Close {meeting.deal.closeDate}
              </p>
            </div>
          )}

          {/* Date chips */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <div style={{ background: '#F5F7F9', border: '1px solid #DDE2E8', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', color: '#4A5C6A' }}>
              📅 {date.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </div>
            <div style={{ background: '#F5F7F9', border: '1px solid #DDE2E8', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', color: '#8A9BAA', fontFamily: 'IBM Plex Mono, monospace' }}>
              via {meeting.source || 'CRM_UI'}
            </div>
          </div>

          {/* Nooks meeting notes */}
          {meeting.nooksNote && (
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', fontWeight: 700, color: '#8A9BAA', letterSpacing: '0.08em', marginBottom: '6px' }}>MEETING NOTES</p>
              <div style={{ background: '#F5F7F9', border: '1px solid #DDE2E8', borderRadius: '8px', padding: '10px' }}>
                <p style={{ fontSize: '11px', color: '#4A5C6A', lineHeight: 1.7, fontStyle: 'italic' }}>
                  "{meeting.nooksNote}"
                </p>
              </div>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={() => onUseForFollowup(meeting)}
            style={{
              width: '100%', padding: '9px', background: '#EFF5FF', border: '1px solid #BFCFFF',
              borderRadius: '8px', fontSize: '12px', fontWeight: 500, color: '#2563EB',
              cursor: 'pointer', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            }}
          >
            Use for Post-Call Follow-up →
          </button>
        </div>
      )}
    </div>
  );
}

export default function MeetingPanel({ meetings, loading, onUseForFollowup, onSelectContact }) {
  const [activeTab, setActiveTab] = useState('past');
  const [expandedId, setExpandedId] = useState(null);

  const now = new Date();
  const upcoming = [...meetings.filter(m => m.status === 'Upcoming')].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  const past = [...meetings.filter(m => m.status === 'Completed')].sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  const displayList = activeTab === 'upcoming' ? upcoming : past;

  const tabStyle = (tab) => ({
    background: 'none', border: 'none', padding: '0 0 8px 0', cursor: 'pointer',
    fontSize: '13px', fontWeight: 500,
    color: activeTab === tab ? '#1A2330' : '#8A9BAA',
    borderBottom: activeTab === tab ? '2px solid #2563EB' : '2px solid transparent',
    marginRight: '20px',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ width: '300px', minWidth: '300px', background: '#FFFFFF', borderLeft: '1px solid #DDE2E8', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', flexShrink: 0 }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #DDE2E8' }}>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '8px', fontWeight: 700, color: '#8A9BAA', letterSpacing: '0.08em', marginBottom: '10px' }}>MEETING CALENDAR · HUBSPOT</p>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button style={tabStyle('upcoming')} onClick={() => setActiveTab('upcoming')}>
            Upcoming ({upcoming.length})
          </button>
          <button style={tabStyle('past')} onClick={() => setActiveTab('past')}>
            Past ({past.length})
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: '#F8FAFC', minHeight: 0 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: '40px', gap: '10px' }}>
            <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#2563EB' }} />
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#8A9BAA' }}>Syncing calendar…</p>
          </div>
        ) : displayList.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '50px' }}>
            <p style={{ fontSize: '13px', color: '#8A9BAA' }}>No {activeTab} meetings</p>
          </div>
        ) : (
          displayList.map(meeting => (
            <MeetingCard
              key={meeting.id}
              meeting={meeting}
              isExpanded={expandedId === meeting.id}
              onToggle={() => setExpandedId(expandedId === meeting.id ? null : meeting.id)}
              onUseForFollowup={onUseForFollowup}
              onSelectContact={onSelectContact}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid #DDE2E8', background: '#FFFFFF' }}>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#8A9BAA' }}>
          {meetings.length} meetings · Last sync {new Date().toLocaleTimeString()}
        </p>
      </div>
    </div>
  );
}