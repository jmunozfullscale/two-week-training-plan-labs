import { useState, useEffect, useCallback } from 'react';
import { ValidationError } from '../types/allocation';

export interface AllocationItem {
  bookingId: number;
  deviceId: number;
  engineerId: number;
  startDate: string;
  endDate: string;
  status: string;
  createdOn: string;
  payload?: string;
}

export function useAllocations() {
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllocations = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/allocations', { signal });
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setAllocations(data);
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const abortController = new AbortController();
    fetchAllocations(abortController.signal);
    return () => abortController.abort();
  }, [fetchAllocations]);

  const issueAllocation = async (draft: any, idempotencyKey: string, signal?: AbortSignal) => {
    const res = await fetch('/api/allocations/issue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        deviceId: draft.deviceId,
        engineerId: draft.engineerId,
        startDate: draft.startDate,
        endDate: draft.endDate,
        status: draft.status,
        payload: draft.payload,
      }),
      signal,
    });

    if (!res.ok) {
      if (res.status === 409) {
        throw new Error('Allocation already exists (idempotency conflict).');
      }

      if (res.status === 400) {
        const problem = await res.json();
        if (problem.errors) {
          const apiFieldErrors: Record<string, string> = {};
          for (const key in problem.errors) {
            const cleanKey = key.replace(/^(\$\.|dto\.)/, '');
            const camelKey = cleanKey.charAt(0).toLowerCase() + cleanKey.slice(1);
            apiFieldErrors[camelKey] = problem.errors[key].join(' ');
          }
          // Throw the generic object matching the structure we expect;
          // ValidationError class will be handled correctly by the caller.
          throw new ValidationError(problem.title || 'Validation errors occurred.', apiFieldErrors);
        }
        throw new Error(problem.message || 'Bad Request');
      }

      throw new Error(`Server returned ${res.status} ${res.statusText}`);
    }

    await fetchAllocations();
  };

  return { allocations, loading, error, refetch: fetchAllocations, issueAllocation };
}
