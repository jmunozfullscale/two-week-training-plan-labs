import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import type { Result } from '../types/result.ts';
import { DeviceSchema } from '../schemas/allocation.ts';

export type DeviceItem = z.infer<typeof DeviceSchema>;

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
      
      const validatedData = z.array(DeviceSchema).parse(data);
      setDevices(validatedData);
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

  const createDevice = async (deviceData: Omit<DeviceItem, 'deviceId'>): Promise<Result> => {
    try {
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
        return { success: false, error: msg };
      }

      await fetchDevices();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  };

  const updateDevice = async (id: number, deviceData: Omit<DeviceItem, 'deviceId'>): Promise<Result> => {
    try {
      const res = await fetch(`/api/devices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceData),
      });

      if (!res.ok) {
        let msg = `Server returned ${res.status}`;
        try {
          const problem = await res.json();
          msg = problem.message || problem.title || msg;
        } catch {}
        return { success: false, error: msg };
      }

      await fetchDevices();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  };

  const deleteDevice = async (id: number): Promise<Result> => {
    try {
      const res = await fetch(`/api/devices/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        return { success: false, error: `Server returned ${res.status}` };
      }

      await fetchDevices();
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: (err as Error).message };
    }
  };

  return { devices, loading, error, refetch: fetchDevices, createDevice, updateDevice, deleteDevice };
}
