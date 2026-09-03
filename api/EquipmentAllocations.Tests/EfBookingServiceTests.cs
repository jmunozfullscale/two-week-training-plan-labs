using EquipmentAllocations.Data;
using EquipmentAllocations.Dtos;
using EquipmentAllocations.Services;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using System;
using System.IO;
using System.Threading.Tasks;
using Xunit;

namespace EquipmentAllocations.Tests
{
    // Service-level tests: exercise EfBookingTransactionalService with a real SQLite DB
    public class EfBookingServiceTests
    {
        [Fact]
        public async Task IssueBooking_DuplicateIdempotencyKey_ProducesConflict()
        {
            // Arrange: Create a temporary sqlite file
            var dbPath = Path.Combine(Path.GetTempPath(), $"ea_test_{Guid.NewGuid()}.db");
            var connString = $"Data Source={dbPath}";

            var options = new DbContextOptionsBuilder<EquipmentAllocationsDbContext>()
                .UseSqlite(connString)
                .Options;

            try
            {
                using (var db = new EquipmentAllocationsDbContext(options))
                {
                    db.Database.EnsureCreated();

                    // Add a device and engineer
                    db.Devices.Add(new Entities.Device { AssetTag = "A123", Kind = "Tablet", Status = "Available", PurchasedOn = DateTime.UtcNow });
                    db.Engineers.Add(new Entities.Engineer { FullName = "Chino", Office = "Makati", Email = "chino@example.com" });
                    db.SaveChanges();
                }

                var dto = new CreateBookingDto
                {
                    DeviceId = 1,
                    EngineerId = 1,
                    StartDate = DateTime.UtcNow.Date.AddDays(1),
                    EndDate = DateTime.UtcNow.Date.AddDays(2),
                    Payload = "{}"
                };

                // Act: Call service twice with same idempotency key
                using (var db = new EquipmentAllocationsDbContext(options))
                {
                    var svc = new EfBookingTransactionalService(db);
                    var key = "abc-123";
                    var r1 = await svc.IssueBookingAsync(dto, key);

                    // Assert: Second call should throw IdempotencyConflictException
                    await Assert.ThrowsAsync<IdempotencyConflictException>(async () => await svc.IssueBookingAsync(dto, key));
                }
            }
            finally
            {
                try { File.Delete(dbPath); } catch { }
            }
        }

        [Fact]
        public async Task IssueBooking_WhenPreviousBookingCancelled_AllowsNewBookingOnSameDate()
        {
            var dbPath = Path.Combine(Path.GetTempPath(), $"ea_test_{Guid.NewGuid()}.db");
            var connString = $"Data Source={dbPath}";

            var options = new DbContextOptionsBuilder<EquipmentAllocationsDbContext>()
                .UseSqlite(connString)
                .Options;

            try
            {
                using (var db = new EquipmentAllocationsDbContext(options))
                {
                    db.Database.EnsureCreated();

                    db.Devices.Add(new Entities.Device { AssetTag = "D-100", Kind = "Laptop", Status = "Available", PurchasedOn = DateTime.UtcNow });
                    db.Engineers.Add(new Entities.Engineer { FullName = "Alice", Office = "Cebu", Email = "alice@example.com" });
                    db.SaveChanges();
                }

                var start = DateTime.UtcNow.Date.AddDays(1);
                var end = DateTime.UtcNow.Date.AddDays(5);

                using (var db = new EquipmentAllocationsDbContext(options))
                {
                    var svc = new EfBookingTransactionalService(db);
                    var booking1 = await svc.IssueBookingAsync(new CreateBookingDto
                    {
                        DeviceId = 1,
                        EngineerId = 1,
                        StartDate = start,
                        EndDate = end,
                        Payload = "First booking"
                    }, "key-1");

                    // Overlap should fail while it's Confirmed
                    await Assert.ThrowsAsync<InvalidOperationException>(async () =>
                    {
                        await svc.IssueBookingAsync(new CreateBookingDto
                        {
                            DeviceId = 1,
                            EngineerId = 1,
                            StartDate = start,
                            EndDate = end,
                            Payload = "Second booking attempt"
                        }, "key-2");
                    });

                    // Cancel the first booking
                    await svc.UpdateBookingAsync(booking1.BookingId, new UpdateBookingDto
                    {
                        DeviceId = 1,
                        EngineerId = 1,
                        StartDate = start,
                        EndDate = end,
                        Status = "Cancelled",
                        Payload = "Cancelled reason"
                    });

                    // Now re-booking the same device on the same date should succeed!
                    var booking2 = await svc.IssueBookingAsync(new CreateBookingDto
                    {
                        DeviceId = 1,
                        EngineerId = 1,
                        StartDate = start,
                        EndDate = end,
                        Payload = "Second booking after cancellation"
                    }, "key-3");

                    Assert.NotNull(booking2);
                    Assert.Equal("Confirmed", booking2.Status);
                }
            }
            finally
            {
                try { File.Delete(dbPath); } catch { }
            }
        }
    }
}
