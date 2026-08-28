import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAllocationEditor, defaultValidationRule } from './useAllocationEditor';
import type { AllocationDraft, ValidationRule } from '../types/allocation';

describe('useAllocationEditor Custom Hook', () => {
  const mockValidDraft: AllocationDraft = {
    deviceId: 1,
    engineerId: 10,
    startDate: '2026-09-01T09:00',
    endDate: '2026-09-05T17:00',
    status: 'Approved',
    payload: 'Testing note',
  };

  it('1. Loading & Initial State: populates default/initial values correctly', () => {
    const { result } = renderHook(() =>
      useAllocationEditor({ initialData: mockValidDraft })
    );

    expect(result.current.draft).toEqual(mockValidDraft);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isValid).toBe(true);
    expect(result.current.isDirty).toBe(false);
  });

  it('1b. Loading State: sets loading true during initial fetch and false when resolved', async () => {
    let resolvePromise!: (val: Partial<AllocationDraft>) => void;
    const fetchInitialData = vi.fn(
      (_signal?: AbortSignal) =>
        new Promise<Partial<AllocationDraft>>((resolve) => {
          resolvePromise = resolve;
        })
    );

    const { result } = renderHook(() => useAllocationEditor({ fetchInitialData }));

    // Should start with loading = true
    expect(result.current.loading).toBe(true);

    // Resolve fetch and wait for async react state update tick
    await act(async () => {
      resolvePromise(mockValidDraft);
      await new Promise((r) => setTimeout(r, 10));
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.draft.deviceId).toBe(1);
    expect(result.current.draft.engineerId).toBe(10);
  });

  it('2. Error State: surfaces top-level error message on fetch failure', async () => {
    const fetchInitialData = vi.fn().mockRejectedValue(new Error('Network error 500'));

    const { result } = renderHook(() => useAllocationEditor({ fetchInitialData }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error 500');
  });

  it('3. Structured Validation Result: validates field-level errors and prevents save when invalid', async () => {
    const invalidDraft: AllocationDraft = {
      deviceId: 0,
      engineerId: -1,
      startDate: '2026-09-10T09:00',
      endDate: '2026-09-01T09:00', // EndDate BEFORE StartDate!
      status: '',
    };

    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useAllocationEditor({
        initialData: invalidDraft,
        validationRules: [defaultValidationRule],
        onSave,
      })
    );

    expect(result.current.isValid).toBe(false);
    expect(result.current.fieldErrors.deviceId).toBe('Device ID must be greater than 0.');
    expect(result.current.fieldErrors.engineerId).toBe('Engineer ID must be greater than 0.');
    expect(result.current.fieldErrors.endDate).toBe('End date must be strictly after start date.');
    expect(result.current.fieldErrors.status).toBe('Status is required.');

    let saveSuccess = false;
    await act(async () => {
      saveSuccess = await result.current.save();
    });

    expect(saveSuccess).toBe(false);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('3b. Custom Injected Validation Rules: enforces custom injected rules', () => {
    const customRule: ValidationRule = (draft) => {
      const errors: Record<string, string> = {};
      if (draft.payload && draft.payload.length < 5) {
        errors.payload = 'Payload must be at least 5 characters.';
      }
      return errors;
    };

    const { result } = renderHook(() =>
      useAllocationEditor({
        initialData: { ...mockValidDraft, payload: 'abc' },
        validationRules: [defaultValidationRule, customRule],
      })
    );

    expect(result.current.isValid).toBe(false);
    expect(result.current.fieldErrors.payload).toBe('Payload must be at least 5 characters.');
  });

  it('4. Cancellation (Abort-on-Unmount): aborts in-flight request on unmount', async () => {
    let capturedSignal: AbortSignal | undefined;
    const fetchInitialData = vi.fn((signal?: AbortSignal) => {
      capturedSignal = signal;
      return new Promise<Partial<AllocationDraft>>(() => {
        // Pending promise that never resolves before unmount
      });
    });

    const { unmount } = renderHook(() =>
      useAllocationEditor({ fetchInitialData, enableAbortOnUnmount: true })
    );

    expect(fetchInitialData).toHaveBeenCalled();
    expect(capturedSignal?.aborted).toBe(false);

    // Unmount mid-fetch
    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });

  it('5. What Breaks #1: Removing abort-on-unmount leaves AbortSignal unaborted on unmount', async () => {
    let capturedSignal: AbortSignal | undefined;
    const fetchInitialData = vi.fn((signal?: AbortSignal) => {
      capturedSignal = signal;
      return new Promise<Partial<AllocationDraft>>(() => {});
    });

    const { unmount } = renderHook(() =>
      useAllocationEditor({ fetchInitialData, enableAbortOnUnmount: false })
    );

    expect(capturedSignal?.aborted).toBe(false);

    // Unmount mid-fetch with enableAbortOnUnmount = false
    unmount();

    // Signal is NOT aborted when cleanup is missing!
    expect(capturedSignal?.aborted).toBe(false);
  });

  it('5. What Breaks #2: Injecting an invalid validation rule throws an explicit TypeError', () => {
    const invalidRule = 'not-a-function' as unknown as ValidationRule;

    expect(() => {
      renderHook(() =>
        useAllocationEditor({
          initialData: mockValidDraft,
          validationRules: [invalidRule],
        })
      );
    }).toThrow(TypeError);
  });
});
