using EquipmentAllocations.Data;
using EquipmentAllocations.Dtos;
using EquipmentAllocations.Entities;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading.Tasks;

namespace EquipmentAllocations.Services
{
    public class EfBookingTransactionalService : IBookingTransactionalService
    {
        private readonly EquipmentAllocationsDbContext _db;

        public EfBookingTransactionalService(EquipmentAllocationsDbContext db)
        {
            _db = db;
        }

        public async Task<BookingDto> IssueBookingAsync(CreateBookingDto dto, string? idempotencyKey)
        {
            // Start transaction
            await using var tx = await _db.Database.BeginTransactionAsync();

            try
            {
                // Check idempotency key first before device state validation
                if (!string.IsNullOrEmpty(idempotencyKey))
                {
                    var existing = await _db.Bookings.AsNoTracking().FirstOrDefaultAsync(b => b.IdempotencyKey == idempotencyKey);
                    if (existing != null)
                    {
                        throw new IdempotencyConflictException(existing.BookingId);
                    }
                }

                // Ensure device exists and is available for allocation
                var device = await _db.Devices.FindAsync(dto.DeviceId);
                if (device == null) throw new InvalidOperationException($"Device {dto.DeviceId} not found");
                if (!string.Equals(device.Status, "available", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException($"Device {dto.DeviceId} is not available for allocation (current status: '{device.Status}')");
                }

                // Ensure engineer exists
                var engineer = await _db.Engineers.FindAsync(dto.EngineerId);
                if (engineer == null) throw new InvalidOperationException($"Engineer {dto.EngineerId} not found");

                // Check overlapping booking for same device
                var overlap = await _db.Bookings.AnyAsync(b => b.DeviceId == dto.DeviceId && b.StartDate < dto.EndDate && b.EndDate > dto.StartDate);
                if (overlap) throw new InvalidOperationException("Device already booked for the requested range");

                var entity = new Booking
                {
                    DeviceId = dto.DeviceId,
                    EngineerId = dto.EngineerId,
                    StartDate = dto.StartDate,
                    EndDate = dto.EndDate,
                    Status = "Confirmed",
                    Payload = dto.Payload,
                    CreatedOn = DateTime.UtcNow,
                    IdempotencyKey = idempotencyKey
                };

                _db.Bookings.Add(entity);

                try
                {
                    await _db.SaveChangesAsync();
                }
                catch (DbUpdateException)
                {
                    if (!string.IsNullOrEmpty(idempotencyKey))
                    {
                        var existingAfter = await _db.Bookings.AsNoTracking().FirstOrDefaultAsync(b => b.IdempotencyKey == idempotencyKey);
                        if (existingAfter != null)
                        {
                            throw new IdempotencyConflictException(existingAfter.BookingId);
                        }
                    }
                    throw;
                }

                await tx.CommitAsync();

                return new BookingDto
                {
                    BookingId = entity.BookingId,
                    DeviceId = entity.DeviceId,
                    EngineerId = entity.EngineerId,
                    StartDate = entity.StartDate,
                    EndDate = entity.EndDate,
                    Status = entity.Status,
                    CreatedOn = entity.CreatedOn,
                    Payload = entity.Payload
                };
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }

        public async Task<BookingDto> UpdateBookingAsync(int id, UpdateBookingDto dto)
        {
            await using var tx = await _db.Database.BeginTransactionAsync();

            try
            {
                var entity = await _db.Bookings.FindAsync(id);
                if (entity == null) throw new System.Collections.Generic.KeyNotFoundException($"Booking {id} not found");

                var device = await _db.Devices.FindAsync(dto.DeviceId);
                if (device == null) throw new InvalidOperationException($"Device {dto.DeviceId} not found");
                if (!string.Equals(device.Status, "available", StringComparison.OrdinalIgnoreCase))
                {
                    throw new InvalidOperationException($"Device {dto.DeviceId} is not available for allocation (current status: '{device.Status}')");
                }

                var engineer = await _db.Engineers.FindAsync(dto.EngineerId);
                if (engineer == null) throw new InvalidOperationException($"Engineer {dto.EngineerId} not found");

                var overlap = await _db.Bookings.AnyAsync(b => b.DeviceId == dto.DeviceId && b.BookingId != id && b.StartDate < dto.EndDate && b.EndDate > dto.StartDate);
                if (overlap) throw new InvalidOperationException("Device already booked for the requested range");

                entity.DeviceId = dto.DeviceId;
                entity.EngineerId = dto.EngineerId;
                entity.StartDate = dto.StartDate;
                entity.EndDate = dto.EndDate;
                entity.Status = dto.Status;
                entity.Payload = dto.Payload;

                await _db.SaveChangesAsync();
                await tx.CommitAsync();

                return new BookingDto
                {
                    BookingId = entity.BookingId,
                    DeviceId = entity.DeviceId,
                    EngineerId = entity.EngineerId,
                    StartDate = entity.StartDate,
                    EndDate = entity.EndDate,
                    Status = entity.Status,
                    CreatedOn = entity.CreatedOn,
                    Payload = entity.Payload
                };
            }
            catch
            {
                await tx.RollbackAsync();
                throw;
            }
        }
    }

    public class IdempotencyConflictException : Exception
    {
        public long ExistingBookingId { get; }
        public IdempotencyConflictException(long existingBookingId)
            : base("Idempotency key conflict")
        {
            ExistingBookingId = existingBookingId;
        }
    }
}
