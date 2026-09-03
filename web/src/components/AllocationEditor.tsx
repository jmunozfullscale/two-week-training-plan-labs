import React from 'react';
import { useAllocationEditor } from '../hooks/useAllocationEditor';
import type { UseAllocationEditorOptions } from '../types/allocation';
import './AllocationEditor.css';

export interface SelectOption {
  value: number;
  label: string;
}

export interface AllocationEditorProps extends UseAllocationEditorOptions {
  title?: string;
  onSuccess?: () => void;
  deviceOptions?: SelectOption[];
  engineerOptions?: SelectOption[];
  requireDirty?: boolean;
}

export const AllocationEditor: React.FC<AllocationEditorProps> = ({
  title = 'Equipment Allocation Editor',
  onSuccess,
  deviceOptions,
  engineerOptions,
  requireDirty = true,
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
    <div className="allocation-editor-container">
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
          {/* Device ID / Device Selection */}
          <div className={`form-group ${fieldErrors.deviceId ? 'has-error' : ''}`}>
            <label htmlFor="deviceId">Device</label>
            {deviceOptions ? (
              <select
                id="deviceId"
                value={draft.deviceId || ''}
                onChange={(e) => updateField('deviceId', parseInt(e.target.value, 10) || 0)}
                disabled={loading}
              >
                <option value="">Select a device...</option>
                {deviceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="deviceId"
                type="number"
                min="1"
                value={draft.deviceId || ''}
                onChange={(e) => updateField('deviceId', parseInt(e.target.value, 10) || 0)}
                disabled={loading}
                placeholder="e.g. 101"
              />
            )}
            {fieldErrors.deviceId && (
              <span className="field-error">{fieldErrors.deviceId}</span>
            )}
          </div>

          {/* Engineer ID / Engineer Selection */}
          <div className={`form-group ${fieldErrors.engineerId ? 'has-error' : ''}`}>
            <label htmlFor="engineerId">Engineer</label>
            {engineerOptions ? (
              <select
                id="engineerId"
                value={draft.engineerId || ''}
                onChange={(e) => updateField('engineerId', parseInt(e.target.value, 10) || 0)}
                disabled={loading}
              >
                <option value="">Select an engineer...</option>
                {engineerOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="engineerId"
                type="number"
                min="1"
                value={draft.engineerId || ''}
                onChange={(e) => updateField('engineerId', parseInt(e.target.value, 10) || 0)}
                disabled={loading}
                placeholder="e.g. 42"
              />
            )}
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
            disabled={loading || !isValid || (requireDirty && !isDirty)}
          >
            {loading ? 'Saving...' : 'Save Allocation'}
          </button>
        </div>
      </form>
    </div>
  );
};
