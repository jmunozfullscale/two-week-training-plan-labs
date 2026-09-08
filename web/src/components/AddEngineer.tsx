import React, { useState } from 'react';
import { useEngineers } from '../hooks/useEngineers';
import type { EngineerItem } from '../hooks/useEngineers';
import { Modal } from './Modal';
import './AllocationEditor.css'; // For general table layout

export const AddEngineer: React.FC = () => {
  const { engineers, loading: fetching, createEngineer, updateEngineer, deleteEngineer } = useEngineers();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [office, setOffice] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const openAddModal = () => {
    setEditingId(null);
    setFullName('');
    setOffice('');
    setEmail('');
    setNotes('');
    setSaveError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (eng: EngineerItem) => {
    setEditingId(eng.engineerId);
    setFullName(eng.fullName);
    setOffice(eng.office);
    setEmail(eng.email);
    setNotes(eng.notes || '');
    setSaveError(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (eng: EngineerItem) => {
    if (!window.confirm(`Are you sure you want to delete engineer ${eng.fullName}?`)) return;
    const result = await deleteEngineer(eng.engineerId);
    if (!result.success) {
      alert(result.error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    const data = { fullName, office, email, notes };
    let result;
    if (editingId) {
      result = await updateEngineer(editingId, data);
    } else {
      result = await createEngineer(data);
    }

    if (result.success) {
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
          <h2>Engineers</h2>
          <span className="entries-count-badge">
            {engineers.length} {engineers.length === 1 ? 'Engineer' : 'Engineers'}
          </span>
        </div>
        <button className="btn btn-primary" onClick={openAddModal}>
          + Add Engineer
        </button>
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
                <th style={{ width: '100px', textAlign: 'center' }}>Actions</th>
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
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      title="Edit" 
                      onClick={() => openEditModal(eng)} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', marginRight: '0.5rem' }}>
                      ✏️
                    </button>
                    <button 
                      title="Delete" 
                      onClick={() => handleDelete(eng)} 
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
              {engineers.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-grid-msg">
                    {fetching ? 'Loading engineers...' : 'No engineers found in database.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => !saving && setIsModalOpen(false)} 
        title={editingId ? 'Edit Engineer' : 'Add Engineer'}
      >
        {saveError && (
          <div className="error-banner" role="alert" style={{ marginBottom: '1rem' }}>
            <span className="error-icon">⚠️</span>
            <span>{saveError}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="editor-form">
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              required
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={saving}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="office">Office</label>
            <input
              id="office"
              type="text"
              required
              maxLength={60}
              value={office}
              onChange={(e) => setOffice(e.target.value)}
              disabled={saving}
              style={{ width: '100%' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              {saving ? 'Saving...' : (editingId ? 'Update Engineer' : 'Save Engineer')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
