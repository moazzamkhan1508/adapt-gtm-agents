import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function LifecycleBadge({ lifecycle }) {
  if (!lifecycle) return null;
  const isOpp = lifecycle === 'opportunity';
  return (
    <span style={{
      fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', padding: '1px 6px',
      borderRadius: '20px',
      background: isOpp ? '#E8F7F1' : '#F5F7F9',
      border: `1px solid ${isOpp ? '#A8DCC8' : '#DDE2E8'}`,
      color: isOpp ? '#159A68' : '#8A9BAA',
    }}>
      {lifecycle}
    </span>
  );
}

function ContactItem({ contact, active, onClick }) {
  return (
    <button onClick={() => onClick(contact)}
      className="w-full text-left px-3 py-2.5 transition-all"
      style={{
        borderLeft: active ? '2px solid #159A68' : '2px solid transparent',
        background: active ? '#E8F7F1' : 'transparent',
        borderRadius: '0',
      }}>
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
          style={{ background: active ? '#C5EADA' : '#EEF1F5', border: `1px solid ${active ? '#A8DCC8' : '#DDE2E8'}` }}>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', fontWeight: 600, color: active ? '#159A68' : '#4A5C6A' }}>
            {getInitials(contact.name)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p style={{ fontSize: '12px', fontWeight: 500, color: active ? '#1A2330' : '#4A5C6A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {contact.name}
            </p>
            <LifecycleBadge lifecycle={contact.lifecycle} />
          </div>
          {contact.company && (
            <p style={{ fontSize: '10px', color: '#8A9BAA', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {contact.company}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

export default function Sidebar({ contacts, loading, onSelectContact, selectedContact }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(c =>
      c.name?.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const opportunities = filtered.filter(c => c.lifecycle === 'opportunity');
  const others = filtered.filter(c => c.lifecycle !== 'opportunity');

  return (
    <div style={{ width: '252px', minWidth: '252px', background: '#FFFFFF', borderRight: '1px solid #DDE2E8', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', flexShrink: 0 }}>
      {/* Search */}
      <div className="p-3 border-b" style={{ borderColor: '#DDE2E8' }}>
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 w-3 h-3" style={{ color: '#8A9BAA' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search contacts…"
            className="w-full pl-7 pr-3 py-1.5 text-xs rounded outline-none"
            style={{ background: '#F5F7F9', border: '1px solid #DDE2E8', color: '#1A2330', fontFamily: 'DM Sans, sans-serif', fontSize: '12px' }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: '#159A68' }} />
            <p style={{ fontSize: '11px', color: '#8A9BAA', fontFamily: 'IBM Plex Mono, monospace' }}>Loading contacts…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-4 text-center">
            <p style={{ fontSize: '11px', color: '#8A9BAA' }}>No contacts found</p>
          </div>
        ) : (
          <>
            {opportunities.length > 0 && (
              <>
                <div className="px-3 pt-3 pb-1">
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#8A9BAA', letterSpacing: '0.08em' }}>OPPORTUNITIES</p>
                </div>
                {opportunities.map(c => (
                  <ContactItem key={c.id} contact={c} active={selectedContact?.id === c.id} onClick={onSelectContact} />
                ))}
              </>
            )}
            {others.length > 0 && (
              <>
                <div className="px-3 pt-3 pb-1">
                  <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#8A9BAA', letterSpacing: '0.08em' }}>ALL CONTACTS</p>
                </div>
                {others.map(c => (
                  <ContactItem key={c.id} contact={c} active={selectedContact?.id === c.id} onClick={onSelectContact} />
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t" style={{ borderColor: '#DDE2E8' }}>
        <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#8A9BAA' }}>
          {contacts.length} contacts loaded
        </p>
      </div>
    </div>
  );
}