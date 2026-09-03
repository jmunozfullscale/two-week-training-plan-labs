import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import type { Result } from '../types/result.ts';
import { BookingSchema } from '../schemas/allocation.ts';

export type AllocationItem = z.infer<typeof BookingSchema>;

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
      
      // Zod boundary validation
      const validatedData = z.array(BookingSchema).parse(data);
      
      // Only set UI state if the API payload matches our strict schema expectations
      setAllocations(validatedData);
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

  const issueAllocation = async (
    draft: Omit<AllocationItem, 'bookingId' | 'createdOn'>,
    idempotencyKey: string,
    signal?: AbortSignal
  ): Promise<Result> => {
    try {
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
          return { success: false, error: 'Allocation already exists (idempotency conflict).' };
        }

        if (res.status === 400) {
          const problem = await res.json();
          let msg = problem.message || problem.title || 'Validation errors occurred.';
          if (problem.errors) {
            const detailMsgs = Object.values(problem.errors).flat().join(' ');
            msg = `${msg} ${detailMsgs}`;
          }
          return { success: false, error: msg };
        }

        return { success: false, error: `Server returned ${res.status} ${res.statusText}` };
      }

      await fetchAllocations();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  };

  const createAllocation = async (
    draft: {
      deviceId: number;
      engineerId: number;
      startDate: string;
      endDate: string;
      payload?: string;
    },
    idempotencyKey?: string,
    signal?: AbortSignal
  ): Promise<Result> => {
    return issueAllocation(
      { ...draft, status: 'Confirmed' } as Omit<AllocationItem, 'bookingId' | 'createdOn'>,
      idempotencyKey || crypto.randomUUID(),
      signal
    );
  };

  const updateAllocation = async (
    id: number,
    data: {
      deviceId: number;
      engineerId: number;
      startDate: string;
      endDate: string;
      status: string;
      payload?: string;
    }
  ): Promise<Result> => {
    try {
      const res = await fetch(`/api/allocations/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        let msg = `Server returned ${res.status}`;
        try {
          const problem = await res.json();
          if (problem.errors) {
            const messages = Object.values(problem.errors).flat().join(' ');
            msg = messages || problem.title || msg;
          } else {
            msg = problem.message || problem.title || msg;
          }
        } catch {}
        return { success: false, error: msg };
      }

      await fetchAllocations();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  };

  const deleteAllocation = async (id: number): Promise<Result> => {
    try {
      const res = await fetch(`/api/allocations/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        let msg = `Server returned ${res.status}`;
        try {
          const problem = await res.json();
          msg = problem.message || problem.title || msg;
        } catch {}
        return { success: false, error: msg };
      }

      await fetchAllocations();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  };

  return {
    allocations,
    loading,
    error,
    refetch: fetchAllocations,
    issueAllocation,
    createAllocation,
    updateAllocation,
    deleteAllocation,
  };
}

