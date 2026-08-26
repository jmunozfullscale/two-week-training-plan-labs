using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using EquipmentAllocations.Data;
using EquipmentAllocations.Dtos;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace EquipmentAllocations.Tests
{
    public class BookingsEndpointIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly WebApplicationFactory<Program> _factory;

        public BookingsEndpointIntegrationTests(WebApplicationFactory<Program> factory)
        {
            _factory = factory;
        }

        private WebApplicationFactory<Program> CreateFactoryWithSqlite(out SqliteConnection connection)
        {
            connection = new SqliteConnection("DataSource=:memory:");
            connection.Open();

            var conn = connection;

            var factory = _factory.WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Remove existing DbContext registration
                    var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<EquipmentAllocationsDbContext>));
                    if (descriptor != null) services.Remove(descriptor);

                    // Register SQLite in-memory with open connection
                    services.AddDbContext<EquipmentAllocationsDbContext>(options => options.UseSqlite(conn));

                    // Build the service provider to create a scope and ensure DB
                    var sp = services.BuildServiceProvider();
                    using var scope = sp.CreateScope();
                    var db = scope.ServiceProvider.GetRequiredService<EquipmentAllocationsDbContext>();
                    db.Database.EnsureCreated();
                });
            });

            return factory;
        }

        [Fact]
        public async Task IssueBooking_EndToEnd_CreatesBooking()
        {
            var factory = CreateFactoryWithSqlite(out var conn);
            var client = factory.CreateClient();

            // Create an engineer
            var eng = new CreateEngineerDto { FullName = "Test Eng", Office = "HQ", Email = "eng@example.com" };
            var engResp = await client.PostAsJsonAsync("/api/engineers", eng);
            Assert.Equal(HttpStatusCode.Created, engResp.StatusCode);

            int createdEngId;
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                var createdEngEntity = db.Engineers.FirstOrDefault(e => e.Email == eng.Email);
                if (createdEngEntity == null) throw new Exception("Created engineer not found in DB");
                createdEngId = createdEngEntity.EngineerId;
            }

            // Create a device
            var dev = new CreateDeviceDto { AssetTag = "T1", Kind = "phone", Status = "available", PurchasedOn = DateTime.UtcNow };
            var devResp = await client.PostAsJsonAsync("/api/devices", dev);
            Assert.Equal(HttpStatusCode.Created, devResp.StatusCode);

            int createdDevId;
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                var createdDevEntity = db.Devices.FirstOrDefault(d => d.AssetTag == dev.AssetTag);
                if (createdDevEntity == null) throw new Exception("Created device not found in DB");
                createdDevId = createdDevEntity.DeviceId;
            }

            // Issue booking
            var booking = new CreateBookingDto
            {
                DeviceId = createdDevId,
                EngineerId = createdEngId,
                StartDate = DateTime.UtcNow.Date.AddDays(1),
                EndDate = DateTime.UtcNow.Date.AddDays(2),
                Status = "reserved"
            };

            var req = new HttpRequestMessage(HttpMethod.Post, "/api/bookings/issue") { Content = JsonContent.Create(booking) };
            req.Headers.Add("Idempotency-Key", "test-key-1");

            var resp = await client.SendAsync(req);
            Assert.Equal(HttpStatusCode.Created, resp.StatusCode);

            // Verify booking exists in DB and device status was updated atomically to allocated
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                var exists = db.Bookings.Any(b => b.DeviceId == createdDevId && b.EngineerId == createdEngId);
                Assert.True(exists, "Booking not found in DB");

                var updatedDevice = db.Devices.Find(createdDevId);
                Assert.NotNull(updatedDevice);
                Assert.Equal("allocated", updatedDevice.Status);
            }

            conn.Dispose();
        }

        [Fact]
        public async Task IssueBooking_DuplicateIdempotencyKey_ReturnsConflict()
        {
            var factory = CreateFactoryWithSqlite(out var conn);
            var client = factory.CreateClient();

            // Create engineer
            var eng = new CreateEngineerDto { FullName = "T2", Office = "HQ", Email = "t2@example.com" };
            var engResp = await client.PostAsJsonAsync("/api/engineers", eng);
            Assert.Equal(HttpStatusCode.Created, engResp.StatusCode);

            int createdEngId;
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                var createdEng = db.Engineers.FirstOrDefault(e => e.Email == eng.Email);
                if (createdEng == null) throw new Exception("Created engineer not found in DB");
                createdEngId = createdEng.EngineerId;
            }

            // Create device
            var dev = new CreateDeviceDto { AssetTag = "T2", Kind = "tablet", Status = "available", PurchasedOn = DateTime.UtcNow };
            var devResp = await client.PostAsJsonAsync("/api/devices", dev);
            Assert.Equal(HttpStatusCode.Created, devResp.StatusCode);

            int createdDevId;
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                var createdDev = db.Devices.FirstOrDefault(d => d.AssetTag == dev.AssetTag);
                if (createdDev == null) throw new Exception("Created device not found in DB");
                createdDevId = createdDev.DeviceId;
            }

            var booking = new CreateBookingDto
            {
                DeviceId = createdDevId,
                EngineerId = createdEngId,
                StartDate = DateTime.UtcNow.Date.AddDays(3),
                EndDate = DateTime.UtcNow.Date.AddDays(4),
                Status = "reserved"
            };

            var req1 = new HttpRequestMessage(HttpMethod.Post, "/api/bookings/issue") { Content = JsonContent.Create(booking) };
            req1.Headers.Add("Idempotency-Key", "dup-key-1");

            var resp1 = await client.SendAsync(req1);
            Assert.Equal(HttpStatusCode.Created, resp1.StatusCode);

            var req2 = new HttpRequestMessage(HttpMethod.Post, "/api/bookings/issue") { Content = JsonContent.Create(booking) };
            req2.Headers.Add("Idempotency-Key", "dup-key-1");

            var resp2 = await client.SendAsync(req2);
            Assert.Equal(HttpStatusCode.Conflict, resp2.StatusCode);

            // Verify only one booking exists in DB for that device/engineer
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                var count = db.Bookings.Count(b => b.DeviceId == createdDevId && b.EngineerId == createdEngId);
                Assert.Equal(1, count);
            }

            conn.Dispose();
        }

        [Fact]
        public async Task IssueBooking_MidTransactionFailure_NoPartialWrite()
        {
            var factory = CreateFactoryWithSqlite(out var conn);
            var client = factory.CreateClient();

            // Create engineer
            var eng = new CreateEngineerDto { FullName = "T3", Office = "HQ", Email = "t3@example.com" };
            await client.PostAsJsonAsync("/api/engineers", eng);

            int createdEngId;
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                createdEngId = db.Engineers.First(e => e.Email == eng.Email).EngineerId;
            }

            // Create device with status 'retired' (not available) to trigger failure mid-transaction
            var dev = new CreateDeviceDto { AssetTag = "T3", Kind = "vr", Status = "retired", PurchasedOn = DateTime.UtcNow };
            await client.PostAsJsonAsync("/api/devices", dev);

            int createdDevId;
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                createdDevId = db.Devices.First(d => d.AssetTag == dev.AssetTag).DeviceId;
            }

            var booking = new CreateBookingDto
            {
                DeviceId = createdDevId,
                EngineerId = createdEngId,
                StartDate = DateTime.UtcNow.Date.AddDays(5),
                EndDate = DateTime.UtcNow.Date.AddDays(6),
                Status = "reserved"
            };

            var req = new HttpRequestMessage(HttpMethod.Post, "/api/bookings/issue") { Content = JsonContent.Create(booking) };
            req.Headers.Add("Idempotency-Key", "failed-tx-key");

            var resp = await client.SendAsync(req);
            Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);

            // Assert no booking row was created and device status remains unchanged ('retired')
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                var bookingExists = db.Bookings.Any(b => b.IdempotencyKey == "failed-tx-key");
                Assert.False(bookingExists, "No booking should be persisted after mid-transaction failure");

                var devEntity = db.Devices.Find(createdDevId);
                Assert.NotNull(devEntity);
                Assert.Equal("retired", devEntity.Status);
            }

            conn.Dispose();
        }
    }
}
