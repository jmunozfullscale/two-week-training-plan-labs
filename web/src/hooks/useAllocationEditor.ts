import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  AllocationDraft,
  FieldErrors,
  ValidationRule,
  UseAllocationEditorOptions,
} from '../types/allocation';
import { ValidationError } from '../types/allocation';

const DEFAULT_DRAFT: AllocationDraft = {
  deviceId: 0,
  engineerId: 0,
  startDate: '',
  endDate: '',
  status: 'Pending',
  payload: '',
};

// Default built-in validation rule
export const defaultValidationRule: ValidationRule = (draft: AllocationDraft): FieldErrors => {
  const errors: FieldErrors = {};

  if (!draft.deviceId || draft.deviceId <= 0) {
    errors.deviceId = 'Device ID must be greater than 0.';
  }

  if (!draft.engineerId || draft.engineerId <= 0) {
    errors.engineerId = 'Engineer ID must be greater than 0.';
  }

  if (!draft.startDate) {
    errors.startDate = 'Start date is required.';
  }

  if (!draft.endDate) {
    errors.endDate = 'End date is required.';
  } else if (draft.startDate && new Date(draft.endDate) <= new Date(draft.startDate)) {
    errors.endDate = 'End date must be strictly after start date.';
  }

  if (!draft.status || draft.status.trim() === '') {
    errors.status = 'Status is required.';
  }

  return errors;
};

// Constant array reference to prevent useEffect dependency re-triggers on every render
const DEFAULT_VALIDATION_RULES: ValidationRule[] = [defaultValidationRule];

export function runValidationRules(
  rules: ValidationRule[],
  draft: AllocationDraft
): FieldErrors {
  let combinedErrors: FieldErrors = {};
  for (const rule of rules) {
    if (typeof rule !== 'function') {
      throw new TypeError(`Invalid validation rule injected: ${String(rule)}. Expected function.`);
    }
    const ruleErrors = rule(draft);
    if (ruleErrors && typeof ruleErrors === 'object') {
      combinedErrors = { ...combinedErrors, ...ruleErrors };
    }
  }
  return combinedErrors;
}

export function useAllocationEditor(options: UseAllocationEditorOptions = {}) {
  const {
    initialData,
    validationRules = DEFAULT_VALIDATION_RULES,
    fetchInitialData,
    onSave,
    enableAbortOnUnmount = true,
  } = options;

  const initialDraft = {
    ...DEFAULT_DRAFT,
    ...initialData,
  };

  const [draft, setDraftState] = useState<AllocationDraft>(initialDraft);
  const [initialState, setInitialState] = useState<AllocationDraft>(initialDraft);

  const [loading, setLoading] = useState<boolean>(Boolean(fetchInitialData));
  const [error, setError] = useState<string | null>(null);

  // Immediately validate initial draft & run validation rules (throwing if rule is invalid)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>(() =>
    runValidationRules(validationRules, initialDraft)
  );

  // Keep track of unmount state
  const isMountedRef = useRef<boolean>(true);

  // Validate draft using all injected rules
  const validateDraft = useCallback(
    (currentDraft: AllocationDraft): FieldErrors => {
      return runValidationRules(validationRules, currentDraft);
    },
    [validationRules]
  );

  // Initial fetch with AbortController cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;

    if (!fetchInitialData) {
      return;
    }

    const abortController = new AbortController();
    setLoading(true);
    setError(null);

    fetchInitialData(abortController.signal)
      .then((data) => {
        // If abort-on-unmount is disabled, we simulate the bug by attempting setState even if unmounted
        if (!enableAbortOnUnmount && !isMountedRef.current) {
          setDraftState((prev) => ({ ...prev, ...data }));
          setInitialState((prev) => ({ ...prev, ...data }));
          setLoading(false);
          return;
        }

        if (abortController.signal.aborted || !isMountedRef.current) {
          return;
        }

        const updated = { ...DEFAULT_DRAFT, ...initialData, ...data };
        setDraftState(updated);
        setInitialState(updated);
        setFieldErrors(validateDraft(updated));
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!enableAbortOnUnmount && !isMountedRef.current) {
          setError((err as Error)?.message || 'Fetch failed');
          setLoading(false);
          return;
        }

        if (abortController.signal.aborted || !isMountedRef.current) {
          return;
        }

        if ((err as Error)?.name === 'AbortError') {
          return;
        }

        setError((err as Error)?.message || 'Failed to load allocation data');
        setLoading(false);
      });

    return () => {
      isMountedRef.current = false;
      if (enableAbortOnUnmount) {
        abortController.abort();
      }
    };
  }, [fetchInitialData, enableAbortOnUnmount]);

  // Memoized field updater
  const updateField = useCallback(
    <K extends keyof AllocationDraft>(field: K, value: AllocationDraft[K]) => {
      setDraftState((prev) => {
        const next = { ...prev, [field]: value };
        const errors = validateDraft(next);
        setFieldErrors(errors);
        return next;
      });
    },
    [validateDraft]
  );

  // Memoized save action
  const save = useCallback(async (): Promise<boolean> => {
    const errors = validateDraft(draft);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return false;
    }

    if (!onSave) {
      return true;
    }

    const abortController = new AbortController();
    setLoading(true);
    setError(null);

    try {
      await onSave(draft, abortController.signal);
      if (isMountedRef.current) {
        setInitialState(draft);
        setLoading(false);
      }
      return true;
    } catch (err: unknown) {
      if (isMountedRef.current && (err as Error)?.name !== 'AbortError') {
        if (err instanceof ValidationError) {
          setFieldErrors(err.fieldErrors);
          setError(err.message || 'Validation failed');
        } else {
          setError((err as Error)?.message || 'Failed to save allocation');
        }
        setLoading(false);
      }
      return false;
    }
  }, [draft, validateDraft, onSave]);

  // Memoized reset action
  const reset = useCallback(() => {
    setDraftState(initialState);
    setFieldErrors(validateDraft(initialState));
    setError(null);
  }, [initialState, validateDraft]);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(initialState);
  const isValid = Object.keys(fieldErrors).length === 0;

  return {
    draft,
    loading,
    error,
    fieldErrors,
    isValid,
    isDirty,
    updateField,
    save,
    reset,
    runValidation: () => validateDraft(draft),
    setDraft: setDraftState,
  };
}
