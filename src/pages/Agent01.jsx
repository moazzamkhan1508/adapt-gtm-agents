import { useState } from 'react';
import { Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import LoadingSteps from '@/components/LoadingSteps';
import BriefView from '@/components/BriefView';

const STEPS = [
  'Searching HubSpot contact records',
  'Pulling associated deal data',
  'Scanning for company news',
  'Synthesising intelligence brief',
];

export default function Agent01({ selectedContact }) {
  const [state, setState] = useState('empty'); // empty | loading | result | error
  const [currentStep, setCurrentStep] = useState(0);
  const [brief, setBrief] = useState(null);
  const [error, setError] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [lastContact, setLastContact] = useState(null);

  const runBrief = async (contact) => {
    setState('loading');
    setCurrentStep(0);
    setBrief(null);
    setError(null);
    setLastContact(contact);

    // Animate steps
    for (let i = 0; i < STEPS.length; i++) {
      setCurrentStep(i);
      await new Promise(r => setTimeout(r, 1200));
    }

    try {
      const query = `${contact.name}${contact.company ? ` at ${contact.company}` : ''}${contact.email ? ` (${contact.email})` : ''}`;
      const res = await base44.functions.invoke('agentBrief', { query });
      setGeneratedAt(new Date().toLocaleString());
      setBrief(res.data);
      setState('result');
    } catch (err) {
      setError(err.message || 'Unknown error');
      setState('error');
    }
  };

  // Auto-run when contact changes
  if (selectedContact && selectedContact !== lastContact && state !== 'loading') {
    runBrief(selectedContact);
  }

  if (!selectedContact && state === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 px-8 text-center">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
          style={{ background: '#E8F7F1', border: '1px solid #A8DCC8' }}>
          <Zap className="w-6 h-6" style={{ color: '#159A68' }} />
        </div>
        <p style={{ fontSize: '16px', fontWeight: 500, color: '#4A5C6A', marginBottom: '6px' }}>Select a contact</p>
        <p style={{ fontSize: '13px', color: '#8A9BAA', maxWidth: '280px', lineHeight: 1.6 }}>
          Choose a contact from the sidebar to generate a pre-meeting intelligence brief.
        </p>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <LoadingSteps
        steps={STEPS}
        currentStep={currentStep}
        accentColor="#2EE8A0"
        title={selectedContact?.name || lastContact?.name}
      />
    );
  }

  if (state === 'error') {
    return (
      <div className="p-6">
        <div className="rounded-xl p-5" style={{ background: '#FEF0F0', border: '1px solid #F5AAAA' }}>
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#D93030', marginBottom: '8px' }}>Failed to generate brief</p>
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '11px', color: '#4A5C6A', lineHeight: 1.6 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (state === 'result' && brief) {
    return <BriefView brief={brief} contact={lastContact} generatedAt={generatedAt} />;
  }

  return null;
}