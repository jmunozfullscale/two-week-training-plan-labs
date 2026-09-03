import { useState, useEffect, useCallback } from 'react';

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
        let msg = problem.message || problem.title || 'Validation errors occurred.';
        if (problem.errors) {
          const detailMsgs = Object.values(problem.errors).flat().join(' ');
          msg = `${msg} ${detailMsgs}`;
        }
        throw new Error(msg);
      }

      throw new Error(`Server returned ${res.status} ${res.statusText}`);
    }

    await fetchAllocations();
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
  ) => {
    return issueAllocation(draft, idempotencyKey || crypto.randomUUID(), signal);
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
  ) => {
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
      throw new Error(msg);
    }

    await fetchAllocations();
  };

  const deleteAllocation = async (id: number) => {
    const res = await fetch(`/api/allocations/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      let msg = `Server returned ${res.status}`;
      try {
        const problem = await res.json();
        msg = problem.message || problem.title || msg;
      } catch {}
      throw new Error(msg);
    }

    await fetchAllocations();
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

