function Pill({ children, color = 'gray' }) {
  const styles = {
    teal: { bg: '#E8F7F1', border: '#A8DCC8', text: '#159A68' },
    amber: { bg: '#FEF6E4', border: '#F0D090', text: '#C47B10' },
    red: { bg: '#FEF0F0', border: '#F5AAAA', text: '#D93030' },
    gray: { bg: '#F5F7F9', border: '#DDE2E8', text: '#4A5C6A' },
    blue: { bg: '#EFF5FF', border: '#BFCFFF', text: '#2563EB' },
    purple: { bg: '#F3F0FF', border: '#C4B5FD', text: '#7C3AED' },
  };
  const s = styles[color] || styles.gray;
  return (
    <span style={{
      fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', padding: '2px 7px',
      borderRadius: '20px', background: s.bg, border: `1px solid ${s.border}`, color: s.text,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

function meetingOutcomeColor(outcome) {
  if (!outcome) return 'gray';
  const o = outcome.toLowerCase();
  if (o.includes('complet') || o.includes('scheduled')) return 'teal';
  if (o.includes('cancel') || o.includes('no_show')) return 'red';
  return 'amber';
}

function taskStatusColor(status) {
  if (!status) return 'gray';
  const s = status.toLowerCase();
  if (s === 'completed') return 'teal';
  if (s === 'not_started') return 'gray';
  if (s === 'in_progress') return 'blue';
  if (s === 'deferred') return 'amber';
  return 'gray';
}

function MeetingItem({ item }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      {/* Icon */}
      <div style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%', background: '#EFF5FF', border: '1px solid #BFCFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
        📅
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#1A2330', lineHeight: 1.4 }}>{item.title}</p>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0, flexWrap: 'wrap' }}>
            {item.outcome && <Pill color={meetingOutcomeColor(item.outcome)}>{item.outcome.replace(/_/g, ' ')}</Pill>}
            <Pill color="blue">Meeting</Pill>
          </div>
        </div>
        {item.startTime && (
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#8A9BAA', marginBottom: '4px' }}>{item.startTime}</p>
        )}
        {item.notes && (
          <p style={{ fontSize: '12px', color: '#4A5C6A', lineHeight: 1.5, borderLeft: '2px solid #BFCFFF', paddingLeft: '8px', marginTop: '4px' }}>
            {item.notes.slice(0, 350)}{item.notes.length > 350 ? '…' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

function NoteItem({ item }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      <div style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%', background: '#F5F7F9', border: '1px solid #DDE2E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
        📝
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#8A9BAA' }}>{item.date || 'No date'}</p>
          <Pill color="gray">Note</Pill>
        </div>
        <p style={{ fontSize: '12px', color: '#4A5C6A', lineHeight: 1.6, borderLeft: '2px solid #DDE2E8', paddingLeft: '8px' }}>
          {item.body?.slice(0, 400)}{item.body?.length > 400 ? '…' : ''}
        </p>
      </div>
    </div>
  );
}

function TaskItem({ item }) {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      <div style={{ flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%', background: '#FEF6E4', border: '1px solid #F0D090', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
        ✅
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: '#1A2330', lineHeight: 1.4 }}>{item.subject}</p>
          <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
            {item.status && <Pill color={taskStatusColor(item.status)}>{item.status.replace(/_/g, ' ')}</Pill>}
            <Pill color="amber">Task</Pill>
          </div>
        </div>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#8A9BAA', marginBottom: '4px' }}>
          {item.date || 'No date'}{item.taskType ? ` · ${item.taskType}` : ''}
          {item.completedDate ? ` · Completed ${item.completedDate}` : ''}
        </p>
        {item.body && (
          <p style={{ fontSize: '12px', color: '#4A5C6A', lineHeight: 1.5, borderLeft: '2px solid #F0D090', paddingLeft: '8px' }}>
            {item.body.slice(0, 300)}{item.body.length > 300 ? '…' : ''}
          </p>
        )}
      </div>
    </div>
  );
}

export default function ActivityTimeline({ meetings = [], notes = [], tasks = [] }) {
  // Merge all items into a single timeline, sorted by most recent
  const allItems = [
    ...meetings.map(m => ({ ...m, type: 'meeting', _sort: m.rawDate || m.startTime || '' })),
    ...notes.map(n => ({ ...n, type: 'note', _sort: n.rawDate || n.date || '' })),
    ...tasks.map(t => ({ ...t, type: 'task', _sort: t.rawDate || t.date || '' })),
  ].sort((a, b) => {
    if (!a._sort) return 1;
    if (!b._sort) return -1;
    return new Date(b._sort) - new Date(a._sort);
  });

  if (allItems.length === 0) return null;

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #DDE2E8', borderRadius: '10px', padding: '16px' }}>
      <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#8A9BAA', marginBottom: '16px', letterSpacing: '0.08em' }}>
        ACTIVITY TIMELINE · {allItems.length} ITEMS
      </p>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {meetings.length > 0 && <Pill color="blue">📅 {meetings.length} Meeting{meetings.length !== 1 ? 's' : ''}</Pill>}
        {notes.length > 0 && <Pill color="gray">📝 {notes.length} Note{notes.length !== 1 ? 's' : ''}</Pill>}
        {tasks.length > 0 && <Pill color="amber">✅ {tasks.length} Task{tasks.length !== 1 ? 's' : ''}</Pill>}
      </div>

      {/* Timeline */}
      <div style={{ position: 'relative' }}>
        {allItems.map((item, i) => (
          <div key={i}>
            {/* Connector line */}
            {i < allItems.length - 1 && (
              <div style={{ position: 'absolute', left: '13px', top: `${i * 0 + 28}px`, width: '1px', background: '#DDE2E8', zIndex: 0 }} />
            )}
            <div style={{ position: 'relative', zIndex: 1, paddingBottom: i < allItems.length - 1 ? '16px' : '0', borderBottom: i < allItems.length - 1 ? '1px solid #EEF1F5' : 'none', marginBottom: i < allItems.length - 1 ? '16px' : '0' }}>
              {item.type === 'meeting' && <MeetingItem item={item} />}
              {item.type === 'note' && <NoteItem item={item} />}
              {item.type === 'task' && <TaskItem item={item} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}