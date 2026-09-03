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
                builder.UseSetting(Microsoft.AspNetCore.Hosting.WebHostDefaults.EnvironmentKey, "Testing");
                builder.ConfigureServices(services =>
                {
                    // Remove existing DbContext and provider registrations
                    var descriptors = services.Where(d => d.ServiceType == typeof(DbContextOptions<EquipmentAllocationsDbContext>) || 
                                                          d.ServiceType == typeof(DbContextOptions) ||
                                                          d.ServiceType == typeof(EquipmentAllocationsDbContext)).ToList();
                    foreach (var d in descriptors) services.Remove(d);

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
            int createdDevId;
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                var newDev = new EquipmentAllocations.Entities.Device { AssetTag = "T1", Kind = "phone", Status = "Available", PurchasedOn = DateTime.UtcNow };
                db.Devices.Add(newDev);
                db.SaveChanges();
                createdDevId = newDev.DeviceId;
            }

            // Issue booking
            var booking = new CreateBookingDto
            {
                DeviceId = createdDevId,
                EngineerId = createdEngId,
                StartDate = DateTime.UtcNow.Date.AddDays(1),
                EndDate = DateTime.UtcNow.Date.AddDays(2)
            };

            var req = new HttpRequestMessage(HttpMethod.Post, "/api/bookings/issue") { Content = JsonContent.Create(booking) };
            req.Headers.Add("Idempotency-Key", "test-key-1");

            var resp = await client.SendAsync(req);
            Assert.Equal(HttpStatusCode.Created, resp.StatusCode);

            // Verify booking exists in DB and device status was NOT changed
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                var exists = db.Bookings.Any(b => b.DeviceId == createdDevId && b.EngineerId == createdEngId);
                Assert.True(exists, "Booking not found in DB");

                var updatedDevice = db.Devices.Find(createdDevId);
                Assert.NotNull(updatedDevice);
                Assert.Equal("Available", updatedDevice.Status); // Status should remain unchanged
            }

            conn.Dispose();
        }

        [Fact]
        public async Task IssueFlow_FullWorkingSlice_EndToEnd_SpecRoutes()
        {
            var factory = CreateFactoryWithSqlite(out var conn);
            var client = factory.CreateClient();

            // 1. Create Employee via spec route /api/employees
            var eng = new CreateEngineerDto { FullName = "Spec Employee", Office = "Manila", Email = "employee@example.com" };
            var engResp = await client.PostAsJsonAsync("/api/employees", eng);
            Assert.Equal(HttpStatusCode.Created, engResp.StatusCode);

            int createdEngId;
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                createdEngId = db.Engineers.First(e => e.Email == eng.Email).EngineerId;
            }

            // 2. Create Equipment Device directly in DB
            int createdDevId;
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                var newDev = new EquipmentAllocations.Entities.Device { AssetTag = "SPEC-101", Kind = "vr", Status = "Available", PurchasedOn = DateTime.UtcNow };
                db.Devices.Add(newDev);
                db.SaveChanges();
                createdDevId = newDev.DeviceId;
            }

            // 3. Issue Allocation via spec route /api/allocations/issue
            var booking = new CreateBookingDto
            {
                DeviceId = createdDevId,
                EngineerId = createdEngId,
                StartDate = DateTime.UtcNow.Date.AddDays(10),
                EndDate = DateTime.UtcNow.Date.AddDays(12)
            };

            var req = new HttpRequestMessage(HttpMethod.Post, "/api/allocations/issue") { Content = JsonContent.Create(booking) };
            req.Headers.Add("Idempotency-Key", "spec-slice-key-1");

            var resp = await client.SendAsync(req);
            Assert.Equal(HttpStatusCode.Created, resp.StatusCode);

            // 4. Verify retried allocation with same key returns 409 Conflict
            var reqDup = new HttpRequestMessage(HttpMethod.Post, "/api/allocations/issue") { Content = JsonContent.Create(booking) };
            reqDup.Headers.Add("Idempotency-Key", "spec-slice-key-1");

            var respDup = await client.SendAsync(reqDup);
            Assert.Equal(HttpStatusCode.Conflict, respDup.StatusCode);

            // 5. Verify issuing allocation for the now-allocated device with a new key fails (400 Bad Request)
            var reqUnavailable = new HttpRequestMessage(HttpMethod.Post, "/api/allocations/issue") { Content = JsonContent.Create(booking) };
            reqUnavailable.Headers.Add("Idempotency-Key", "spec-slice-key-2");

            var respUnavailable = await client.SendAsync(reqUnavailable);
            Assert.Equal(HttpStatusCode.BadRequest, respUnavailable.StatusCode);

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
            int createdDevId;
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                var newDev = new EquipmentAllocations.Entities.Device { AssetTag = "T2", Kind = "tablet", Status = "Available", PurchasedOn = DateTime.UtcNow };
                db.Devices.Add(newDev);
                db.SaveChanges();
                createdDevId = newDev.DeviceId;
            }

            var booking = new CreateBookingDto
            {
                DeviceId = createdDevId,
                EngineerId = createdEngId,
                StartDate = DateTime.UtcNow.Date.AddDays(3),
                EndDate = DateTime.UtcNow.Date.AddDays(4)
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

            // Create device with status 'Unavailable' to trigger failure
            int createdDevId;
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                var newDev = new EquipmentAllocations.Entities.Device { AssetTag = "T3", Kind = "vr", Status = "Unavailable", PurchasedOn = DateTime.UtcNow };
                db.Devices.Add(newDev);
                db.SaveChanges();
                createdDevId = newDev.DeviceId;
            }

            var booking = new CreateBookingDto
            {
                DeviceId = createdDevId,
                EngineerId = createdEngId,
                StartDate = DateTime.UtcNow.Date.AddDays(5),
                EndDate = DateTime.UtcNow.Date.AddDays(6)
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
                Assert.Equal("Unavailable", devEntity.Status);
            }

            conn.Dispose();
        }
    }
}
