import { describe, it, expect } from 'vitest';
import { BookingSchema } from '../schemas/allocation';
import type { Result } from '../types/result';

describe('BookingSchema Boundary Validation', () => {
  const validBooking = {
    bookingId: 1,
    deviceId: 10,
    engineerId: 20,
    startDate: '2026-09-01T09:00:00',
    endDate: '2026-09-08T18:00:00',
    status: 'Confirmed' as const,
    createdOn: '2026-08-30T10:00:00Z',
    payload: 'Notes',
  };

  it('accepts valid booking with ISO datetime strings and valid status', () => {
    const parsed = BookingSchema.safeParse(validBooking);
    expect(parsed.success).toBe(true);
  });

  it('accepts UTC and offset datetime formats', () => {
    const utcBooking = {
      ...validBooking,
      startDate: '2026-09-01T09:00:00Z',
      endDate: '2026-09-08T18:00:00+00:00',
    };
    const parsed = BookingSchema.safeParse(utcBooking);
    expect(parsed.success).toBe(true);
  });

  it('rejects garbage non-date string for startDate', () => {
    const invalid = {
      ...validBooking,
      startDate: 'not-a-date',
    };
    const parsed = BookingSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('rejects garbage non-date string for endDate', () => {
    const invalid = {
      ...validBooking,
      endDate: 'invalid-end-date',
    };
    const parsed = BookingSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('rejects invalid status values outside Confirmed, Completed, Cancelled', () => {
    const invalid = {
      ...validBooking,
      status: 'PendingApproval',
    };
    const parsed = BookingSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('accepts all valid enum statuses', () => {
    const statuses = ['Confirmed', 'Completed', 'Cancelled'] as const;
    for (const status of statuses) {
      const parsed = BookingSchema.safeParse({ ...validBooking, status });
      expect(parsed.success).toBe(true);
    }
  });
});

describe('Result Type Contract', () => {
  it('supports void success arm without data', () => {
    const voidResult: Result = { success: true };
    expect(voidResult.success).toBe(true);
  });

  it('supports data-carrying success arm with required data', () => {
    const dataResult: Result<{ id: number }> = {
      success: true,
      data: { id: 42 },
    };
    expect(dataResult.success).toBe(true);
    if (dataResult.success) {
      expect(dataResult.data.id).toBe(42);
    }
  });

  it('supports failure arm with error message', () => {
    const failResult: Result = {
      success: false,
      error: 'Something went wrong',
    };
    expect(failResult.success).toBe(false);
    if (!failResult.success) {
      expect(failResult.error).toBe('Something went wrong');
    }
  });
});
