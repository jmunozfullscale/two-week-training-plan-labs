import { useState, useEffect, useCallback } from 'react';

export interface DeviceItem {
  deviceId: number;
  assetTag: string;
  kind: string;
  status: string;
  purchasedOn: string;
  notes?: string;
}

export function useDevices() {
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/devices', { signal });
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setDevices(data);
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
    fetchDevices(abortController.signal);
    return () => abortController.abort();
  }, [fetchDevices]);

  const createDevice = async (deviceData: Omit<DeviceItem, 'deviceId'>) => {
    const res = await fetch('/api/devices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deviceData),
    });

    if (!res.ok) {
      let msg = `Server returned ${res.status}`;
      try {
        const problem = await res.json();
        msg = problem.message || problem.title || msg;
      } catch {}
      throw new Error(msg);
    }

    await fetchDevices();
  };

  return { devices, loading, error, refetch: fetchDevices, createDevice };
}
