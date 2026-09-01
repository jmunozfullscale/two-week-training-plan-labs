import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LiveAllocationEditor } from '../components/LiveAllocationEditor';

describe('LiveAllocationEditor E2E Integration Flow', () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders correctly and submits successfully', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/devices' || url === '/api/employees' || url === '/api/allocations') {
        return { ok: true, json: async () => [] };
      }
      if (url === '/api/allocations/issue') {
        return { ok: true, status: 201, json: async () => ({ id: 1 }) };
      }
      return { ok: true, json: async () => [] };
    });

    render(<LiveAllocationEditor />);

    // Make form dirty to enable save button
    const payloadInput = screen.getByLabelText(/Notes \/ Payload/i);
    fireEvent.change(payloadInput, { target: { value: 'Updated payload for test' } });

    const saveButton = screen.getByRole('button', { name: /save allocation/i });
    expect(saveButton).toBeEnabled();

    // Trigger form submit by clicking Save
    fireEvent.click(saveButton);

    await waitFor(() => {
      const issueCall = fetchMock.mock.calls.find((call: any[]) => call[0] === '/api/allocations/issue');
      expect(issueCall).toBeTruthy();
      expect(issueCall[1].method).toBe('POST');
      expect(issueCall[1].headers['Idempotency-Key']).toBeTruthy();
    });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Allocation created successfully!');
    });
  });

  it('maintains idempotency guarantees by reusing the same idempotency key for double submissions', async () => {
    let capturedIdempotencyKey = '';
    let issueCalls = 0;

    fetchMock.mockImplementation(async (url: string, options?: any) => {
      if (url === '/api/devices' || url === '/api/employees' || url === '/api/allocations') {
        return { ok: true, json: async () => [] };
      }

      if (url === '/api/allocations/issue') {
        issueCalls++;
        if (issueCalls === 1) {
          capturedIdempotencyKey = options.headers['Idempotency-Key'];
          return { ok: false, status: 500, statusText: 'Internal Server Error' };
        }
        if (issueCalls === 2) {
          if (options.headers['Idempotency-Key'] === capturedIdempotencyKey) {
            return {
              ok: false,
              status: 409,
              json: async () => ({ message: 'Idempotency key conflict' }),
            };
          }
          return { ok: true, status: 201, json: async () => ({ id: 2 }) };
        }
      }

      return { ok: true, json: async () => [] };
    });

    render(<LiveAllocationEditor />);
    
    // Make form dirty
    const payloadInput = screen.getByLabelText(/Notes \/ Payload/i);
    fireEvent.change(payloadInput, { target: { value: 'Updated payload for test 2' } });

    const saveButton = screen.getByRole('button', { name: /save allocation/i });

    // First submission
    fireEvent.click(saveButton);

    // Wait for the error to show up, meaning loading finished and button is enabled again
    await waitFor(() => {
      expect(screen.getByText(/Server returned 500/i)).toBeInTheDocument();
    });

    // Retry submission
    fireEvent.click(saveButton);

    await waitFor(() => {
      const issueCallsList = fetchMock.mock.calls.filter((call: any[]) => call[0] === '/api/allocations/issue');
      expect(issueCallsList.length).toBe(2);
      expect(issueCallsList[0][1].headers['Idempotency-Key']).toBe(issueCallsList[1][1].headers['Idempotency-Key']);
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

    // Make form dirty
    const payloadInput = screen.getByLabelText(/Notes \/ Payload/i);
    fireEvent.change(payloadInput, { target: { value: 'Updated payload for test 3' } });

    const saveButton = screen.getByRole('button', { name: /save allocation/i });
    fireEvent.click(saveButton);

    // Assert that the global error banner and field-level errors appear
    await waitFor(() => {
      const errorBanner = screen.getByRole('alert');
      expect(errorBanner).toHaveTextContent(/One or more validation errors occurred./i);

      // We expect the custom hook to map 'DeviceId' -> 'deviceId' and render it under the input
      expect(screen.getByText('Device ID must be greater than 0.')).toBeInTheDocument();
      expect(screen.getByText('Start date is invalid.')).toBeInTheDocument();
    });
  });
});
