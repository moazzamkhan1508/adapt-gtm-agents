export default function TabBar({ activeTab, onTabChange, contactCount }) {
  const tabs = [
    { id: 1, label: 'Pre-Meeting Brief', color: '#159A68', num: '01' },
    { id: 2, label: 'Post-Call Follow-up', color: '#2563EB', num: '02' },
    { id: 3, label: 'Pipeline Health', color: '#C47B10', num: '03' },
  ];

  return (
    <div style={{ background: '#FFFFFF', borderBottom: '1px solid #DDE2E8', height: '42px' }}
      className="sticky top-[50px] z-40 flex items-stretch justify-between px-4 md:px-6">
      <div className="flex items-stretch">
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => onTabChange(tab.id)}
              className="relative flex items-center gap-2 px-4 transition-all"
              style={{ borderBottom: active ? `2px solid ${tab.color}` : '2px solid transparent' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: active ? tab.color : '#8A9BAA', fontWeight: 600 }}>
                {tab.num}
              </span>
              <span style={{ fontSize: '12px', fontWeight: 500, color: active ? '#1A2330' : '#8A9BAA', whiteSpace: 'nowrap' }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="hidden md:flex items-center gap-3">
        {contactCount > 0 && (
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#8A9BAA' }}>
            {contactCount} contacts · HubSpot CRM
          </span>
        )}
      </div>
    </div>
  );
}