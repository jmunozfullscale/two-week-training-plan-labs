import { z } from 'zod';

export const DeviceSchema = z.object({
  deviceId: z.number(),
  assetTag: z.string(),
  kind: z.string(),
  status: z.string(),
  purchasedOn: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const EngineerSchema = z.object({
  engineerId: z.number(),
  fullName: z.string(),
  office: z.string(),
  email: z.string(),
  notes: z.string().nullable().optional(),
});

export const BookingSchema = z.object({
  bookingId: z.number(),
  deviceId: z.number(),
  engineerId: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  status: z.string(),
  createdOn: z.string().nullable().optional(),
  payload: z.string().nullable().optional(),
});
