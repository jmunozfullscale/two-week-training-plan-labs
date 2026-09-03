import React, { useState } from 'react';
import { useDevices } from '../hooks/useDevices';
import type { DeviceItem } from '../hooks/useDevices';
import { Modal } from './Modal';
import './AllocationEditor.css'; // For general table layout

export const AddDevice: React.FC = () => {
  const { devices, loading: fetching, createDevice, updateDevice, deleteDevice } = useDevices();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form state
  const [assetTag, setAssetTag] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('Available');
  const [purchasedOn, setPurchasedOn] = useState(
    new Date().toISOString().substring(0, 16) // YYYY-MM-DDThh:mm format
  );
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingId(null);
    setAssetTag('');
    setKind('');
    setStatus('Available');
    setPurchasedOn(new Date().toISOString().substring(0, 16));
    setNotes('');
    setSaveError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (dev: DeviceItem) => {
    setEditingId(dev.deviceId);
    setAssetTag(dev.assetTag);
    setKind(dev.kind);
    setStatus(dev.status);
    setPurchasedOn(dev.purchasedOn ? new Date(dev.purchasedOn).toISOString().substring(0, 16) : new Date().toISOString().substring(0, 16));
    setNotes(dev.notes || '');
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (dev: DeviceItem) => {
    if (!window.confirm(`Are you sure you want to delete device ${dev.assetTag}?`)) return;
    try {
      await deleteDevice(dev.deviceId);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      const data = { assetTag, kind, status, purchasedOn, notes };
      if (editingId) {
        await updateDevice(editingId, data);
      } else {
        await createDevice(data);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="allocation-editor-container">
      <div className="card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2>Devices</h2>
          <span className="entries-count-badge">
            {devices.length} {devices.length === 1 ? 'Device' : 'Devices'}
          </span>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          + Add Device
        </button>
      </div>

      <div className="table-responsive">
          <table className="clean-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Asset Tag</th>
                <th>Kind</th>
                <th>Status</th>
                <th>Purchased On</th>
                <th>Notes</th>
                <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((dev) => (
                <tr key={dev.deviceId}>
                  <td><strong>#{dev.deviceId}</strong></td>
                  <td><code>{dev.assetTag}</code></td>
                  <td>{dev.kind}</td>
                  <td>
                    <span 
                      className={`status-badge ${dev.status === 'Available' ? 'clean' : 'dirty'}`} 
                      style={{ fontSize: '0.7rem' }}
                    >
                      {dev.status}
                    </span>
                  </td>
                  <td>{dev.purchasedOn ? new Date(dev.purchasedOn).toLocaleDateString() : '—'}</td>
                  <td>{dev.notes || '—'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      title="Edit" 
                      onClick={() => openEditModal(dev)} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', marginRight: '0.5rem' }}>
                      ✏️
                    </button>
                    <button 
                      title="Delete" 
                      onClick={() => handleDelete(dev)} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {devices.length === 0 && (
                <tr>
                  <td colSpan={7} className="empty-grid-msg">
                    {fetching ? 'Loading devices...' : 'No devices found in database.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => !saving && setIsModalOpen(false)} 
        title={editingId ? 'Edit Device' : 'Add Device'}
      >
        {saveError && (
          <div className="error-banner" role="alert" style={{ marginBottom: '1rem' }}>
            <span className="error-icon">⚠️</span>
            <span>{saveError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="editor-form">
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="assetTag">Asset Tag</label>
            <input
              id="assetTag"
              type="text"
              required
              maxLength={20}
              value={assetTag}
              onChange={(e) => setAssetTag(e.target.value)}
              disabled={saving}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="kind">Kind</label>
            <input
              id="kind"
              type="text"
              required
              maxLength={40}
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              disabled={saving}
              placeholder="e.g. Laptop"
              style={{ width: '100%' }}
            />
          </div>

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
              <option value="Available">Available</option>
              <option value="Unavailable">Unavailable</option>
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="purchasedOn">Purchased On</label>
            <input
              id="purchasedOn"
              type="datetime-local"
              required
              value={purchasedOn}
              onChange={(e) => setPurchasedOn(e.target.value)}
              disabled={saving}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
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
              {saving ? 'Saving...' : (editingId ? 'Update Device' : 'Save Device')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
