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
    <nav style={{ background: '#080A09', borderBottom: '1px solid #222922', height: '50px' }}
      className="sticky top-0 z-50 flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        <div style={{ background: '#2EE8A0', borderRadius: '6px', width: '28px', height: '28px' }}
          className="flex items-center justify-center flex-shrink-0">
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '14px', color: '#080A09' }}>A</span>
        </div>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#E8EDE9', letterSpacing: '-0.02em' }}>
          Adapt
        </span>
        <div style={{ width: '1px', height: '16px', background: '#222922' }} />
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#4A5E4C' }}>
          GTM Agent System · Live HubSpot Demo
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full"
          style={{ background: status.checking ? '#1C221D' : status.connected ? 'rgba(46,232,160,0.08)' : 'rgba(240,80,80,0.08)', border: `1px solid ${status.checking ? '#2A322A' : status.connected ? 'rgba(46,232,160,0.25)' : 'rgba(240,80,80,0.25)'}` }}>
          <div className="w-1.5 h-1.5 rounded-full"
            style={{ background: status.checking ? '#4A5E4C' : status.connected ? '#2EE8A0' : '#F05050' }} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: status.checking ? '#4A5E4C' : status.connected ? '#2EE8A0' : '#F05050' }}>
            {status.checking ? 'Checking…' : status.connected
              ? `HubSpot connected${contactCount ? ` · ${contactCount} contacts` : ''}${dealCount ? ` · ${dealCount} deals` : ''}`
              : '⚠ Server offline'}
          </span>
        </div>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#4A5E4C' }} className="hidden md:block">
          {today}
        </span>
      </div>
    </nav>
  );
}