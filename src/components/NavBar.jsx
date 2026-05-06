import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function NavBar({ contactCount, dealCount }) {
  const [status, setStatus] = useState({ connected: false, checking: true });
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  useEffect(() => {
    base44.functions.invoke('agentHealth', {}).then(res => {
      setStatus({ connected: res.data?.connected, checking: false });
    }).catch(() => setStatus({ connected: false, checking: false }));
  }, []);

  return (
    <nav style={{ background: '#FFFFFF', borderBottom: '1px solid #DDE2E8', height: '50px' }}
      className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <img src="https://media.base44.com/images/public/69fadf323e84ff19a5036c4f/7fb1b946b_67a3701d4d1a70bae8943224_navbar-logo-icon.png" alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#1A2330', letterSpacing: '-0.02em' }}>
          Adapt
        </span>
        <div style={{ width: '1px', height: '16px', background: '#DDE2E8' }} />
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#8A9BAA' }}>
          GTM Agent System · Live HubSpot Demo
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full"
          style={{ background: status.checking ? '#F5F7F9' : status.connected ? '#E8F7F1' : '#FEF0F0', border: `1px solid ${status.checking ? '#DDE2E8' : status.connected ? '#A8DCC8' : '#F5AAAA'}` }}>
          <div className="w-1.5 h-1.5 rounded-full"
            style={{ background: status.checking ? '#8A9BAA' : status.connected ? '#159A68' : '#D93030' }} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: status.checking ? '#8A9BAA' : status.connected ? '#159A68' : '#D93030' }}>
            {status.checking ? 'Checking…' : status.connected
              ? `HubSpot connected${contactCount ? ` · ${contactCount} contacts` : ''}${dealCount ? ` · ${dealCount} deals` : ''}`
              : '⚠ Server offline'}
          </span>
        </div>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#8A9BAA' }} className="hidden md:block">
          {today}
        </span>
      </div>
    </nav>
  );
}