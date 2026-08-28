import { useState } from 'react';
import { AllocationEditor } from './components/AllocationEditor';
import type { AllocationDraft } from './types/allocation';
import './App.css';

function App() {
  const [savedRecords, setSavedRecords] = useState<AllocationDraft[]>([]);

  // Simulated API save function
  const handleSave = async (draft: AllocationDraft) => {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSavedRecords((prev) => [...prev, draft]);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="left">Two-Week Training Plan - Labs</div>
        <div className="right">Juan Carlos Munoz</div>
      </header>

      <main>
        <AllocationEditor
          title="Equipment Booking / Allocation Editor"
          initialData={{
            deviceId: 1,
            engineerId: 1,
            startDate: '2026-09-01T09:00',
            endDate: '2026-09-05T17:00',
            status: 'Pending',
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
      </main>
    </div>
  );
}

export default App;
