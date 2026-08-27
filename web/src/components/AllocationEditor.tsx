import React from 'react';
import { useAllocationEditor } from '../hooks/useAllocationEditor';
import type { UseAllocationEditorOptions } from '../types/allocation';
import './AllocationEditor.css';

export interface AllocationEditorProps extends UseAllocationEditorOptions {
  title?: string;
  onSuccess?: () => void;
}

export const AllocationEditor: React.FC<AllocationEditorProps> = ({
  title = 'Equipment Allocation Editor',
  onSuccess,
  ...hookOptions
}) => {
  const {
    draft,
    loading,
    error,
    fieldErrors,
    isValid,
    isDirty,
    updateField,
    save,
    reset,
  } = useAllocationEditor(hookOptions);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await save();
    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="allocation-editor-card">
      <div className="card-header">
        <h2>{title}</h2>
        <span className={`status-badge ${isDirty ? 'dirty' : 'clean'}`}>
          {isDirty ? 'Unsaved Changes' : 'Saved'}
        </span>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="editor-form">
        <div className="form-grid">
          {/* Device ID */}
          <div className={`form-group ${fieldErrors.deviceId ? 'has-error' : ''}`}>
            <label htmlFor="deviceId">Device ID</label>
            <input
              id="deviceId"
              type="number"
              min="1"
              value={draft.deviceId || ''}
              onChange={(e) => updateField('deviceId', parseInt(e.target.value, 10) || 0)}
              disabled={loading}
              placeholder="e.g. 101"
            />
            {fieldErrors.deviceId && (
              <span className="field-error">{fieldErrors.deviceId}</span>
            )}
          </div>

          {/* Engineer ID */}
          <div className={`form-group ${fieldErrors.engineerId ? 'has-error' : ''}`}>
            <label htmlFor="engineerId">Engineer ID</label>
            <input
              id="engineerId"
              type="number"
              min="1"
              value={draft.engineerId || ''}
              onChange={(e) => updateField('engineerId', parseInt(e.target.value, 10) || 0)}
              disabled={loading}
              placeholder="e.g. 42"
            />
            {fieldErrors.engineerId && (
              <span className="field-error">{fieldErrors.engineerId}</span>
            )}
          </div>

          {/* Start Date */}
          <div className={`form-group ${fieldErrors.startDate ? 'has-error' : ''}`}>
            <label htmlFor="startDate">Start Date</label>
            <input
              id="startDate"
              type="datetime-local"
              value={draft.startDate}
              onChange={(e) => updateField('startDate', e.target.value)}
              disabled={loading}
            />
            {fieldErrors.startDate && (
              <span className="field-error">{fieldErrors.startDate}</span>
            )}
          </div>

          {/* End Date */}
          <div className={`form-group ${fieldErrors.endDate ? 'has-error' : ''}`}>
            <label htmlFor="endDate">End Date</label>
            <input
              id="endDate"
              type="datetime-local"
              value={draft.endDate}
              onChange={(e) => updateField('endDate', e.target.value)}
              disabled={loading}
            />
            {fieldErrors.endDate && (
              <span className="field-error">{fieldErrors.endDate}</span>
            )}
          </div>

          {/* Status */}
          <div className={`form-group ${fieldErrors.status ? 'has-error' : ''}`}>
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={draft.status}
              onChange={(e) => updateField('status', e.target.value)}
              disabled={loading}
            >
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            {fieldErrors.status && (
              <span className="field-error">{fieldErrors.status}</span>
            )}
          </div>

          {/* Payload / Notes */}
          <div className="form-group full-width">
            <label htmlFor="payload">Notes / Payload</label>
            <textarea
              id="payload"
              rows={3}
              value={draft.payload || ''}
              onChange={(e) => updateField('payload', e.target.value)}
              disabled={loading}
              placeholder="Optional notes or payload string..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={reset}
            disabled={loading || !isDirty}
          >
            Reset
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !isValid || !isDirty}
          >
            {loading ? 'Saving...' : 'Save Allocation'}
          </button>
        </div>
      </form>
    </div>
  );
};
