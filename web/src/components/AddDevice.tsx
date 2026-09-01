import React, { useState } from 'react';
import { useDevices } from '../hooks/useDevices';
import './AllocationEditor.css'; // Reuse the clean white styling

export const AddDevice: React.FC = () => {
  const [assetTag, setAssetTag] = useState('');
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [purchasedOn, setPurchasedOn] = useState(
    new Date().toISOString().substring(0, 16) // YYYY-MM-DDThh:mm format
  );
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { devices, loading: fetching, createDevice } = useDevices();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      await createDevice({ assetTag, kind, status, purchasedOn, notes });
      alert('Device added successfully!');
      setAssetTag('');
      setKind('');
      setStatus('');
      setNotes('');
    } catch (err: unknown) {
      setSaveError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="allocation-editor-container">
      <div className="card-header">
        <h2>Add Device</h2>
      </div>

      {saveError && (
        <div className="error-banner" role="alert">
          <span className="error-icon">⚠️</span>
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="editor-form">
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="assetTag">Asset Tag</label>
            <input
              id="assetTag"
              type="text"
              required
              maxLength={20}
              value={assetTag}
              onChange={(e) => setAssetTag(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="form-group">
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
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <input
              id="status"
              type="text"
              required
              maxLength={20}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={saving}
              placeholder="e.g. Available"
            />
          </div>

          <div className="form-group">
            <label htmlFor="purchasedOn">Purchased On</label>
            <input
              id="purchasedOn"
              type="datetime-local"
              required
              value={purchasedOn}
              onChange={(e) => setPurchasedOn(e.target.value)}
              disabled={saving}
            />
          </div>
        </div>

        <div className="form-group full-width" style={{ marginTop: '1rem' }}>
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={saving}
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Device'}
          </button>
        </div>
      </form>

      {/* Device Entries Grid */}
      <section className="entries-grid-section">
        <div className="entries-grid-header">
          <h3>Devices List</h3>
          <span className="entries-count-badge">
            {devices.length} {devices.length === 1 ? 'Device' : 'Devices'}
          </span>
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
              </tr>
            </thead>
            <tbody>
              {devices.map((dev) => (
                <tr key={dev.deviceId}>
                  <td><strong>#{dev.deviceId}</strong></td>
                  <td><code>{dev.assetTag}</code></td>
                  <td>{dev.kind}</td>
                  <td>
                    <span className="status-badge clean" style={{ fontSize: '0.7rem' }}>
                      {dev.status}
                    </span>
                  </td>
                  <td>{dev.purchasedOn ? new Date(dev.purchasedOn).toLocaleDateString() : '—'}</td>
                  <td>{dev.notes || '—'}</td>
                </tr>
              ))}
              {devices.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-grid-msg">
                    {fetching ? 'Loading devices...' : 'No devices found in database.'}
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

