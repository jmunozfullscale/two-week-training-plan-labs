import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import type { Result } from '../types/result.ts';
import { EngineerSchema } from '../schemas/allocation.ts';

export type EngineerItem = z.infer<typeof EngineerSchema>;

export function useEngineers() {
  const [engineers, setEngineers] = useState<EngineerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEngineers = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/employees', { signal });
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      
      const validatedData = z.array(EngineerSchema).parse(data);
      setEngineers(validatedData);
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
    fetchEngineers(abortController.signal);
    return () => abortController.abort();
  }, [fetchEngineers]);

  const createEngineer = async (engineerData: Omit<EngineerItem, 'engineerId'>): Promise<Result> => {
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(engineerData),
      });

      if (!res.ok) {
        let msg = `Server returned ${res.status}`;
        try {
          const problem = await res.json();
          msg = problem.message || problem.title || msg;
        } catch {}
        return { success: false, error: msg };
      }

      await fetchEngineers();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  };

  const updateEngineer = async (id: number, engineerData: Omit<EngineerItem, 'engineerId'>): Promise<Result> => {
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(engineerData),
      });

      if (!res.ok) {
        let msg = `Server returned ${res.status}`;
        try {
          const problem = await res.json();
          msg = problem.message || problem.title || msg;
        } catch {}
        return { success: false, error: msg };
      }

      await fetchEngineers();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  };

  const deleteEngineer = async (id: number): Promise<Result> => {
    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        return { success: false, error: `Server returned ${res.status}` };
      }

      await fetchEngineers();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  };

  return { engineers, loading, error, refetch: fetchEngineers, createEngineer, updateEngineer, deleteEngineer };
}
