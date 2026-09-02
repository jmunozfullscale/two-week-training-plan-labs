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
    }
}
