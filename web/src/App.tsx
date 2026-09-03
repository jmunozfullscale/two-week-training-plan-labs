import { useState } from 'react';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { AllocationEditor } from './components/AllocationEditor';
import { AllocationsGrid } from './components/AllocationsGrid/AllocationsGrid';
import { LiveAllocationEditor } from './components/LiveAllocationEditor';
import { AddEngineer } from './components/AddEngineer';
import { AddDevice } from './components/AddDevice';
import type { AllocationDraft } from './types/allocation';
import './App.css';

type Tab = 'grid' | 'editor' | 'live-editor' | 'add-engineer' | 'add-device';

function AppContent() {
  const [activeTab, setActiveTab] = useState<Tab>('grid');
  const [savedRecords, setSavedRecords] = useState<AllocationDraft[]>([]);

  const handleSave = async (draft: AllocationDraft) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSavedRecords((prev) => [...prev, draft]);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="left font-bold">Two-Week Training Plan Labs</div>
        <nav className="nav-tabs">
          <button
            type="button"
            className={`nav-tab ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            Day 6: Allocation Editor
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'grid' ? 'active' : ''}`}
            onClick={() => setActiveTab('grid')}
          >
            Day 7: Allocations Grid
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'live-editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('live-editor')}
          >
            Day 8: Live Allocation
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'add-engineer' ? 'active' : ''}`}
            onClick={() => setActiveTab('add-engineer')}
          >
            Engineers
          </button>
          <button
            type="button"
            className={`nav-tab ${activeTab === 'add-device' ? 'active' : ''}`}
            onClick={() => setActiveTab('add-device')}
          >
            Devices
          </button>
        </nav>
        <div className="right">Juan Carlos Munoz</div>
      </header>

      <main className="app-main">
        {activeTab === 'grid' && <AllocationsGrid />}
        
        {activeTab === 'editor' && (
          <div className="editor-tab-wrapper">
            <AllocationEditor
              title="Equipment Booking / Allocation Editor"
              initialData={{
                deviceId: 1,
                engineerId: 1,
                startDate: '2026-09-01T09:00',
                endDate: '2026-09-05T17:00',
                payload: 'Initial booking request for field testing.',
              }}
              onSave={handleSave}
            />

            {savedRecords.length > 0 && (
              <section className="saved-records">
                <h3>Saved Allocations ({savedRecords.length})</h3>
                <pre>{JSON.stringify(savedRecords, null, 2)}</pre>
              </section>
            )}
          </div>
        )}

        {activeTab === 'live-editor' && (
          <div className="editor-tab-wrapper">
            <LiveAllocationEditor />
          </div>
        )}

        {activeTab === 'add-engineer' && (
          <div className="editor-tab-wrapper">
            <AddEngineer />
          </div>
        )}

        {activeTab === 'add-device' && (
          <div className="editor-tab-wrapper">
            <AddDevice />
          </div>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
}
