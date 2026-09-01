import React, { useRef } from 'react';
import { AllocationEditor } from './AllocationEditor';
import { ValidationError } from '../types/allocation';
import type { AllocationDraft, FieldErrors } from '../types/allocation';
import { useDevices } from '../hooks/useDevices';
import { useEngineers } from '../hooks/useEngineers';
import { useAllocations } from '../hooks/useAllocations';
import './AllocationEditor.css';

export const LiveAllocationEditor: React.FC = () => {
  // Use a ref so idempotency key persists across renders, but resets on successful save
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  const { devices } = useDevices();
  const { engineers } = useEngineers();
  const { allocations, loading: fetchingAllocations, refetch: refetchAllocations, issueAllocation } = useAllocations();

  const deviceOptions = devices.map((d) => ({
    value: d.deviceId,
    label: `${d.kind || 'Device'} - ${d.assetTag || d.deviceId}`,
  }));

  const engineerOptions = engineers.map((e) => ({
    value: e.engineerId,
    label: e.fullName || `Engineer #${e.engineerId}`,
  }));

  const handleSave = async (draft: AllocationDraft, signal?: AbortSignal) => {
    // We send payload to the real API through the custom hook.
    await issueAllocation(draft, idempotencyKeyRef.current, signal);

    // Success: rotate the idempotency key for the next submission
    idempotencyKeyRef.current = crypto.randomUUID();
  };

  const getDeviceLabel = (id: number) => {
    const dev = devices.find((d) => d.deviceId === id);
    return dev ? `${dev.kind} - ${dev.assetTag}` : `Device #${id}`;
  };

  const getEngineerLabel = (id: number) => {
    const eng = engineers.find((e) => e.engineerId === id);
    return eng ? eng.fullName : `Engineer #${id}`;
  };

  return (
    <div className="live-allocation-wrapper" style={{ width: '100%' }}>
      <AllocationEditor
        title="Create Allocation (Live API)"
        initialData={{
          deviceId: devices[0]?.deviceId || 1,
          engineerId: engineers[0]?.engineerId || 1,
          startDate: '2026-09-01T09:00',
          endDate: '2026-09-05T17:00',
          status: 'Pending',
          payload: 'Initial booking request for field testing.',
        }}
        deviceOptions={deviceOptions.length > 0 ? deviceOptions : undefined}
        engineerOptions={engineerOptions.length > 0 ? engineerOptions : undefined}
        onSave={handleSave}
        onSuccess={() => alert('Allocation created successfully!')}
      />

      {/* Allocations Entries Grid */}
      <section className="entries-grid-section">
        <div className="entries-grid-header">
          <h3>Allocations List</h3>
          <span className="entries-count-badge">
            {allocations.length} {allocations.length === 1 ? 'Allocation' : 'Allocations'}
          </span>
        </div>

        <div className="table-responsive">
          <table className="clean-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Device</th>
                <th>Engineer</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((alloc) => (
                <tr key={alloc.bookingId}>
                  <td><strong>#{alloc.bookingId}</strong></td>
                  <td><code>{getDeviceLabel(alloc.deviceId)}</code></td>
                  <td>{getEngineerLabel(alloc.engineerId)}</td>
                  <td>{alloc.startDate ? new Date(alloc.startDate).toLocaleString() : '—'}</td>
                  <td>{alloc.endDate ? new Date(alloc.endDate).toLocaleString() : '—'}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        alloc.status === 'Approved' || alloc.status === 'Active'
                          ? 'clean'
                          : 'dirty'
                      }`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {alloc.status}
                    </span>
                  </td>
                  <td>{alloc.payload || '—'}</td>
                </tr>
              ))}
              {allocations.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-grid-msg">
                    {fetchingAllocations ? 'Loading allocations...' : 'No allocations found in database.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

