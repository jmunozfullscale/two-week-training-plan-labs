import React, { useState } from 'react';
import { useEngineers } from '../hooks/useEngineers';
import './AllocationEditor.css'; // Reuse the clean white styling

export const AddEngineer: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [office, setOffice] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { engineers, loading: fetching, createEngineer } = useEngineers();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    try {
      await createEngineer({ fullName, office, email, notes });
      alert('Engineer added successfully!');
      setFullName('');
      setOffice('');
      setEmail('');
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
        <h2>Add Engineer</h2>
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
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              required
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="office">Office</label>
            <input
              id="office"
              type="text"
              required
              maxLength={60}
              value={office}
              onChange={(e) => setOffice(e.target.value)}
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {saving ? 'Saving...' : 'Save Engineer'}
          </button>
        </div>
      </form>

      {/* Engineer Entries Grid */}
      <section className="entries-grid-section">
        <div className="entries-grid-header">
          <h3>Engineers List</h3>
          <span className="entries-count-badge">
            {engineers.length} {engineers.length === 1 ? 'Engineer' : 'Engineers'}
          </span>
        </div>

        <div className="table-responsive">
          <table className="clean-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>ID</th>
                <th>Full Name</th>
                <th>Office</th>
                <th>Email</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {engineers.map((eng) => (
                <tr key={eng.engineerId}>
                  <td><strong>#{eng.engineerId}</strong></td>
                  <td>{eng.fullName}</td>
                  <td>{eng.office}</td>
                  <td>{eng.email}</td>
                  <td>{eng.notes || '—'}</td>
                </tr>
              ))}
              {engineers.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-grid-msg">
                    {fetching ? 'Loading engineers...' : 'No engineers found in database.'}
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

