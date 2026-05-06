import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import NavBar from '@/components/NavBar';
import TabBar from '@/components/TabBar';
import Sidebar from '@/components/Sidebar';
import Agent01 from './Agent01';
import Agent02 from './Agent02';
import Agent03 from './Agent03';

export default function Home() {
  const [activeTab, setActiveTab] = useState(1);
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [selectedContact, setSelectedContact] = useState(null);

  useEffect(() => {
    base44.functions.invoke('agentContacts', {})
    .then(res => {
      const list = res.data?.contacts || [];
      setContacts(list);
      if (list.length > 0) setSelectedContact(list[0]);
    })
    .catch(() => setContacts([]))
    .finally(() => setLoadingContacts(false));
  }, []);

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
          {activeTab === 2 && <Agent02 />}
          {activeTab === 3 && <Agent03 />}
        </div>
      </div>
    </div>
  );
}