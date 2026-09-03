import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useAllocations } from '../hooks/useAllocations.ts';
import type { AllocationItem } from '../hooks/useAllocations.ts';
import { useDevices } from '../hooks/useDevices';
import { useEngineers } from '../hooks/useEngineers.ts';
import { useVirtualScroll } from '../hooks/useVirtualScroll.ts';
import { Modal } from './Modal';
import './AllocationEditor.css';

export const LiveAllocationEditor: React.FC = () => {
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());
  const { devices } = useDevices();
  const { engineers } = useEngineers();
  const { allocations, loading: fetchingAllocations, issueAllocation, updateAllocation, deleteAllocation } = useAllocations();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [deviceId, setDeviceId] = useState<number>(0);
  const [engineerId, setEngineerId] = useState<number>(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('Confirmed');
  const [payload, setPayload] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const [filterText, setFilterText] = useState('');

  const getDeviceLabel = useCallback((id: number) => {
    const dev = devices.find((d) => d.deviceId === id);
    return dev ? `${dev.kind} - ${dev.assetTag}` : `Device #${id}`;
  }, [devices]);

  const getEngineerLabel = useCallback((id: number) => {
    const eng = engineers.find((e) => e.engineerId === id);
    return eng ? eng.fullName : `Engineer #${id}`;
  }, [engineers]);

  const formatForInput = (val?: string) => {
    if (!val) return '';
    if (val.length >= 16 && val.includes('T')) {
      return val.substring(0, 16);
    }
    try {
      return new Date(val).toISOString().substring(0, 16);
    } catch {
      return '';
    }
  };

  const filteredAllocations = useMemo(() => {
    const query = filterText.trim().toLowerCase();
    if (!query) return allocations;

    return allocations.filter((alloc) => {
      const deviceStr = getDeviceLabel(alloc.deviceId).toLowerCase();
      const engStr = getEngineerLabel(alloc.engineerId).toLowerCase();
      const statusStr = (alloc.status || '').toLowerCase();
      const payloadStr = (alloc.payload || '').toLowerCase();
      const idStr = alloc.bookingId.toString();

      return (
        deviceStr.includes(query) ||
        engStr.includes(query) ||
        statusStr.includes(query) ||
        payloadStr.includes(query) ||
        idStr.includes(query)
      );
    });
  }, [allocations, filterText, getDeviceLabel, getEngineerLabel]);

  const ROW_HEIGHT = 46;
  const CONTAINER_HEIGHT = 500;

  const { startIndex, endIndex, topPadding, bottomPadding, handleScroll } = useVirtualScroll({
    totalItems: filteredAllocations.length,
    rowHeight: ROW_HEIGHT,
    containerHeight: CONTAINER_HEIGHT,
    overscan: 6,
  });

  const visibleItems = filteredAllocations.slice(startIndex, endIndex);

  const openAddModal = () => {
    setEditingId(null);
    setDeviceId(devices[0]?.deviceId || 1);
    setEngineerId(engineers[0]?.engineerId || 1);
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    setStartDate(now.toISOString().substring(0, 16));
    setEndDate(nextWeek.toISOString().substring(0, 16));
    setStatus('Confirmed');
    setPayload('');
    setSaveError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (alloc: AllocationItem) => {
    setEditingId(alloc.bookingId);
    setDeviceId(alloc.deviceId);
    setEngineerId(alloc.engineerId);
    setStartDate(formatForInput(alloc.startDate));
    setEndDate(formatForInput(alloc.endDate));
    setStatus(alloc.status || 'Confirmed');
    setPayload(alloc.payload || '');
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (alloc: AllocationItem) => {
    if (!window.confirm(`Are you sure you want to delete allocation #${alloc.bookingId}?`)) return;
    const result = await deleteAllocation(alloc.bookingId);
    if (!result.success) {
      alert(result.error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const activeDeviceId = Number(deviceId) || devices[0]?.deviceId || 1;
    const activeEngineerId = Number(engineerId) || engineers[0]?.engineerId || 1;

    let result;
    if (editingId) {
      result = await updateAllocation(editingId, {
        deviceId: activeDeviceId,
        engineerId: activeEngineerId,
        startDate,
        endDate,
        status,
        payload,
      });
    } else {
      result = await issueAllocation(
        {
          deviceId: activeDeviceId,
          engineerId: activeEngineerId,
          startDate,
          endDate,
          status,
          payload,
        },
        idempotencyKeyRef.current
      );
    }

    if (result.success) {
      if (!editingId) {
        idempotencyKeyRef.current = crypto.randomUUID();
      }
      setIsModalOpen(false);
    } else {
      setSaveError(result.error);
    }
    setSaving(false);
  };

  return (
    <div className="allocation-editor-container">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2>Live Allocations</h2>
          <span className="entries-count-badge">
            {allocations.length} {allocations.length === 1 ? 'Allocation' : 'Allocations'}
          </span>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          + Add Allocation
        </button>
      </div>

      <div className="toolbar" style={{ marginBottom: '1rem', padding: '0 1rem' }}>
        <div className="search-box" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <span className="search-icon" style={{ position: 'absolute', left: '10px' }}>🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Filter allocations by device, engineer, status..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          {filterText && (
            <button
              type="button"
              className="clear-btn"
              onClick={() => setFilterText('')}
              style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
            >
              &times;
            </button>
          )}
        </div>
      </div>

      <div 
        className="table-scroll-container table-responsive"
        style={{ height: CONTAINER_HEIGHT, overflowY: 'auto' }}
        onScroll={handleScroll}
      >
        <table className="clean-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '80px' }}>ID</th>
              <th>Device</th>
              <th>Engineer</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Notes</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {topPadding > 0 && <tr style={{ height: topPadding }} aria-hidden="true" />}
            {visibleItems.map((alloc) => (
              <tr key={alloc.bookingId} style={{ height: ROW_HEIGHT }}>
                <td><strong>#{alloc.bookingId}</strong></td>
                <td><code>{getDeviceLabel(alloc.deviceId)}</code></td>
                <td>{getEngineerLabel(alloc.engineerId)}</td>
                <td>{alloc.startDate ? new Date(alloc.startDate).toLocaleString() : '—'}</td>
                <td>{alloc.endDate ? new Date(alloc.endDate).toLocaleString() : '—'}</td>
                <td>
                  <span
                    className={`status-badge ${
                      alloc.status === 'Confirmed' || alloc.status === 'Completed'
                        ? 'clean'
                        : 'dirty'
                    }`}
                    style={{ fontSize: '0.7rem' }}
                  >
                    {alloc.status}
                  </span>
                </td>
                <td>{alloc.payload || '—'}</td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    title="Edit"
                    onClick={() => openEditModal(alloc)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', marginRight: '0.5rem' }}
                  >
                    ✏️
                  </button>
                  <button
                    title="Delete"
                    onClick={() => handleDelete(alloc)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
            {bottomPadding > 0 && <tr style={{ height: bottomPadding }} aria-hidden="true" />}
            {filteredAllocations.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-grid-msg">
                  {fetchingAllocations ? 'Loading allocations...' : 'No allocations found in database.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => !saving && setIsModalOpen(false)}
        title={editingId ? 'Edit Allocation' : 'Add Allocation'}
      >
        {saveError && (
          <div className="error-banner" role="alert" style={{ marginBottom: '1rem' }}>
            <span className="error-icon">⚠️</span>
            <span>{saveError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} noValidate className="editor-form">
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="deviceId">Device</label>
            <select
              id="deviceId"
              required
              value={deviceId || ''}
              onChange={(e) => setDeviceId(Number(e.target.value))}
              disabled={saving}
              style={{ width: '100%' }}
            >
              {devices.length === 0 ? (
                <option value={deviceId || 1}>Device #{deviceId || 1}</option>
              ) : (
                devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.kind || 'Device'} - {d.assetTag || `#${d.deviceId}`} ({d.status})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="engineerId">Engineer</label>
            <select
              id="engineerId"
              required
              value={engineerId || ''}
              onChange={(e) => setEngineerId(Number(e.target.value))}
              disabled={saving}
              style={{ width: '100%' }}
            >
              {engineers.length === 0 ? (
                <option value={engineerId || 1}>Engineer #{engineerId || 1}</option>
              ) : (
                engineers.map((eng) => (
                  <option key={eng.engineerId} value={eng.engineerId}>
                    {eng.fullName} ({eng.office})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="startDate">Start Date</label>
            <input
              id="startDate"
              type="datetime-local"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={saving}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="endDate">End Date</label>
            <input
              id="endDate"
              type="datetime-local"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={saving}
              style={{ width: '100%' }}
            />
          </div>

          {editingId && (
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="status">Status</label>
              <select
                id="status"
                required
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={saving}
                style={{ width: '100%' }}
              >
                {status && !['Confirmed', 'Completed', 'Cancelled'].includes(status) && (
                  <option value={status}>{status}</option>
                )}
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="payload">Notes / Payload</label>
            <textarea
              id="payload"
              rows={3}
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              disabled={saving}
              placeholder="Optional notes or payload..."
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : (editingId ? 'Update Allocation' : 'Save Allocation')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
