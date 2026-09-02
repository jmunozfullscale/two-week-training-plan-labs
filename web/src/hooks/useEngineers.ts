import { useState, useEffect, useCallback } from 'react';

export interface EngineerItem {
  engineerId: number;
  fullName: string;
  office: string;
  email: string;
  notes?: string;
}

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
      if (Array.isArray(data)) {
        setEngineers(data);
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
    fetchEngineers(abortController.signal);
    return () => abortController.abort();
  }, [fetchEngineers]);

  const createEngineer = async (engineerData: Omit<EngineerItem, 'engineerId'>) => {
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
      throw new Error(msg);
    }

    await fetchEngineers();
  };

  return { engineers, loading, error, refetch: fetchEngineers, createEngineer };
}
