import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import NavBar from '@/components/NavBar';
import TabBar from '@/components/TabBar';
import Sidebar from '@/components/Sidebar';
import Agent01 from './Agent01';
import Agent02 from './Agent02';
import Agent03 from './Agent03';
import MeetingPanel from '@/components/MeetingPanel';

export default function Home() {
  const [activeTab, setActiveTab] = useState(1);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loadingMeetings, setLoadingMeetings] = useState(true);
  const [syncingMeetings, setSyncingMeetings] = useState(false);
  const [followupData, setFollowupData] = useState(null);

  const fetchMeetings = async (isManual = false) => {
    if (isManual) setSyncingMeetings(true);
    else setLoadingMeetings(true);
    try {
      const res = await base44.functions.invoke('agentMeetings', {});
      const list = res.data?.meetings || [];
      setMeetings(list);
    } catch (_) {
      setMeetings([]);
    } finally {
      setSyncingMeetings(false);
      setLoadingMeetings(false);
    }
  };

  useEffect(() => {
    base44.functions.invoke('agentContacts', {})
      .then(res => {
        const list = res.data?.contacts || [];
        setContacts(list);
        if (list.length > 0) setSelectedContact(list[0]);
      })
      .catch(() => setContacts([]))
      .finally(() => setLoadingContacts(false));

    fetchMeetings();
  }, []);

  const handleUseForFollowup = (meeting) => {
    setFollowupData({ transcript: meeting.nooksNote || '', contact: meeting.contact.name + (meeting.contact.company ? ` at ${meeting.contact.company}` : '') });
    setActiveTab(2);
  };

  const handlePanelContactSelect = (contact) => {
    const existing = contacts.find(c => c.email === contact.email || c.name === contact.name);
    setSelectedContact(existing || contact);
    setActiveTab(1);
  };

  return (
    <div style={{ background: '#F5F7F9', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <NavBar contactCount={contacts.length} />
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} contactCount={contacts.length} />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 92px)' }}>
        {/* Sidebar — only for Agent 01 */}
        {activeTab === 1 && (
          <Sidebar
            contacts={contacts}
            loading={loadingContacts}
            onSelectContact={setSelectedContact}
            selectedContact={selectedContact}
          />
        )}

        {/* Main content */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#F5F7F9' }}>
          {activeTab === 1 && <Agent01 selectedContact={selectedContact} />}
          {activeTab === 2 && <Agent02 initialData={followupData} />}
          {activeTab === 3 && <Agent03 />}
        </div>

        {/* Right Meeting Panel — always visible */}
        <MeetingPanel
          meetings={meetings}
          loading={loadingMeetings}
          syncing={syncingMeetings}
          onUseForFollowup={handleUseForFollowup}
          onSelectContact={handlePanelContactSelect}
          onSync={() => fetchMeetings(true)}
        />
      </div>
    </div>
  );
}