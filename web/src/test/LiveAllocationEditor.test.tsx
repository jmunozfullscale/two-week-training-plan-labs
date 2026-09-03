import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';
import { LiveAllocationEditor } from '../components/LiveAllocationEditor';

describe('LiveAllocationEditor E2E Integration Flow', () => {
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders correctly and creates an allocation via the modal', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/devices') {
        return { ok: true, json: async () => [{ deviceId: 1, kind: 'Laptop', assetTag: 'LP-101', status: 'Available' }] };
      }
      if (url === '/api/employees') {
        return { ok: true, json: async () => [{ engineerId: 1, fullName: 'John Doe', office: 'HQ' }] };
      }
      if (url === '/api/allocations') {
        return { ok: true, json: async () => [] };
      }
      if (url === '/api/allocations/issue') {
        return { ok: true, status: 201, json: async () => ({ bookingId: 1 }) };
      }
      return { ok: true, json: async () => [] };
    });

    render(<LiveAllocationEditor />);

    // Click "+ Add Allocation" button to open modal
    const addBtn = screen.getByRole('button', { name: /\+ Add Allocation/i });
    fireEvent.click(addBtn);

    // Fill notes in the modal
    const payloadInput = screen.getByLabelText(/Notes \/ Payload/i);
    fireEvent.change(payloadInput, { target: { value: 'Updated payload for test' } });

    const saveButton = screen.getByRole('button', { name: /save allocation/i });
    expect(saveButton).toBeEnabled();

    // Trigger form submit by clicking Save
    fireEvent.click(saveButton);

    await waitFor(() => {
      const issueCall = fetchMock.mock.calls.find((call: unknown[]) => call[0] === '/api/allocations/issue') as [string, RequestInit] | undefined;
      expect(issueCall).toBeTruthy();
      expect(issueCall![1].method).toBe('POST');
      expect((issueCall![1].headers as Record<string, string>)['Idempotency-Key']).toBeTruthy();
    });
  });

  it('maintains idempotency guarantees by reusing the same idempotency key for double submissions', async () => {
    let capturedIdempotencyKey = '';
    let issueCalls = 0;

    fetchMock.mockImplementation(async (url: string, options?: RequestInit) => {
      if (url === '/api/devices' || url === '/api/employees' || url === '/api/allocations') {
        return { ok: true, json: async () => [] };
      }

      if (url === '/api/allocations/issue') {
        issueCalls++;
        if (issueCalls === 1) {
          capturedIdempotencyKey = (options?.headers as Record<string, string>)['Idempotency-Key'] || '';
          return { ok: false, status: 500, statusText: 'Internal Server Error' };
        }
        if (issueCalls === 2) {
          if ((options?.headers as Record<string, string>)['Idempotency-Key'] === capturedIdempotencyKey) {
            return {
              ok: false,
              status: 409,
              json: async () => ({ message: 'Idempotency key conflict' }),
            };
          }
          return { ok: true, status: 201, json: async () => ({ bookingId: 2 }) };
        }
      }

      return { ok: true, json: async () => [] };
    });

    render(<LiveAllocationEditor />);

    fireEvent.click(screen.getByRole('button', { name: /\+ Add Allocation/i }));

    const payloadInput = screen.getByLabelText(/Notes \/ Payload/i);
    fireEvent.change(payloadInput, { target: { value: 'Updated payload for test 2' } });

    const saveButton = screen.getByRole('button', { name: /save allocation/i });

    // First submission
    fireEvent.click(saveButton);

    // Wait for the error to show up
    await waitFor(() => {
      expect(screen.getByText(/Server returned 500/i)).toBeInTheDocument();
    });

    // Retry submission
    fireEvent.click(saveButton);

    await waitFor(() => {
      const issueCallsList = fetchMock.mock.calls.filter((call: unknown[]) => call[0] === '/api/allocations/issue') as [string, RequestInit][];
      expect(issueCallsList.length).toBe(2);
      expect((issueCallsList[0]![1].headers as Record<string, string>)['Idempotency-Key']).toBe((issueCallsList[1]![1].headers as Record<string, string>)['Idempotency-Key']);
    });

    // Verify UI catches the 409 conflict and shows the error
    await waitFor(() => {
      const errorBanner = screen.getByRole('alert');
      expect(errorBanner).toHaveTextContent(/Allocation already exists \(idempotency conflict\)/i);
    });
  });

  it('renders field-level validation errors from a 400 ProblemDetails response', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/devices' || url === '/api/employees' || url === '/api/allocations') {
        return { ok: true, json: async () => [] };
      }
      if (url === '/api/allocations/issue') {
        return {
          ok: false,
          status: 400,
          json: async () => ({
            type: 'https://tools.ietf.org/html/rfc7231#section-6.5.1',
            title: 'One or more validation errors occurred.',
            status: 400,
            errors: {
              DeviceId: ['Device ID must be greater than 0.'],
              StartDate: ['Start date is invalid.']
            }
          })
        };
      }
      return { ok: true, json: async () => [] };
    });

    render(<LiveAllocationEditor />);

    fireEvent.click(screen.getByRole('button', { name: /\+ Add Allocation/i }));

    const payloadInput = screen.getByLabelText(/Notes \/ Payload/i);
    fireEvent.change(payloadInput, { target: { value: 'Updated payload for test 3' } });

    const saveButton = screen.getByRole('button', { name: /save allocation/i });
    fireEvent.click(saveButton);

    // Assert that the global error banner displays the validation error
    await waitFor(() => {
      const errorBanner = screen.getByRole('alert');
      expect(errorBanner).toHaveTextContent(/One or more validation errors occurred./i);
      expect(errorBanner).toHaveTextContent(/Device ID must be greater than 0./i);
      expect(errorBanner).toHaveTextContent(/Start date is invalid./i);
    });
  });

  it('updates an existing allocation via the edit modal', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/devices') {
        return { ok: true, json: async () => [{ deviceId: 1, kind: 'Laptop', assetTag: 'LP-101', status: 'Available' }] };
      }
      if (url === '/api/employees') {
        return { ok: true, json: async () => [{ engineerId: 1, fullName: 'Jane Smith', office: 'Remote' }] };
      }
      if (url === '/api/allocations') {
        return {
          ok: true,
          json: async () => [
            {
              bookingId: 42,
              deviceId: 1,
              engineerId: 1,
              startDate: '2026-09-01T09:00:00',
              endDate: '2026-09-05T17:00:00',
              status: 'Confirmed',
              payload: 'Original notes',
            },
          ],
        };
      }
      if (url === '/api/allocations/42') {
        return {
          ok: true,
          json: async () => ({ bookingId: 42 }),
        };
      }
      return { ok: true, json: async () => [] };
    });

    render(<LiveAllocationEditor />);

    // Wait for the allocation row to appear
    await waitFor(() => {
      expect(screen.getByText('#42')).toBeInTheDocument();
    });

    // Click the Edit button
    const editBtn = screen.getByTitle('Edit');
    fireEvent.click(editBtn);

    // Check modal title is "Edit Allocation"
    expect(screen.getByText('Edit Allocation')).toBeInTheDocument();

    // Change status and payload
    const statusSelect = screen.getByLabelText(/^Status/i);
    fireEvent.change(statusSelect, { target: { value: 'Completed' } });

    const payloadInput = screen.getByLabelText(/Notes \/ Payload/i);
    fireEvent.change(payloadInput, { target: { value: 'Updated via edit modal' } });

    // Submit update
    const updateBtn = screen.getByRole('button', { name: /update allocation/i });
    fireEvent.click(updateBtn);

    await waitFor(() => {
      const putCall = fetchMock.mock.calls.find((call: unknown[]) => call[0] === '/api/allocations/42') as [string, RequestInit] | undefined;
      expect(putCall).toBeTruthy();
      expect(putCall![1].method).toBe('PUT');
      const body = JSON.parse(putCall![1].body as string);
      expect(body.status).toBe('Completed');
      expect(body.payload).toBe('Updated via edit modal');
    });
  });

  it('deletes an allocation after user confirmation', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/devices' || url === '/api/employees') {
        return { ok: true, json: async () => [] };
      }
      if (url === '/api/allocations') {
        return {
          ok: true,
          json: async () => [
            {
              bookingId: 99,
              deviceId: 1,
              engineerId: 1,
              startDate: '2026-09-01T09:00:00',
              endDate: '2026-09-05T17:00:00',
              status: 'Confirmed',
              payload: 'To delete',
            },
          ],
        };
      }
      if (url === '/api/allocations/99') {
        return { ok: true, status: 204, json: async () => ({}) };
      }
      return { ok: true, json: async () => [] };
    });

    render(<LiveAllocationEditor />);

    await waitFor(() => {
      expect(screen.getByText('#99')).toBeInTheDocument();
    });

    // Click Delete button
    const deleteBtn = screen.getByTitle('Delete');
    fireEvent.click(deleteBtn);

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete allocation #99?');

    await waitFor(() => {
      const deleteCall = fetchMock.mock.calls.find((call: unknown[]) => call[0] === '/api/allocations/99') as [string, RequestInit] | undefined;
      expect(deleteCall).toBeTruthy();
      expect(deleteCall![1].method).toBe('DELETE');
    });
  });
});
