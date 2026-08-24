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
            var engReq = new HttpRequestMessage(HttpMethod.Post, "/api/engineers") { Content = JsonContent.Create(eng) };
            engReq.Headers.Add("X-Test-NoResponseBody", "1");
            var engResp = await client.SendAsync(engReq);
            if (!engResp.IsSuccessStatusCode)
            {
                var txt = await engResp.Content.ReadAsStringAsync();
                throw new Exception($"Creating engineer failed: {engResp.StatusCode} - {txt}");
            }

            int createdEngId;
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                var createdEngEntity = db.Engineers.FirstOrDefault(e => e.Email == eng.Email);
                if (createdEngEntity == null) throw new Exception("Created engineer not found in DB");
                createdEngId = createdEngEntity.EngineerId;
            }

            // Create a device
            var dev = new CreateDeviceDto { AssetTag = "T1", Kind = "phone", Status = "available", PurchasedOn = DateTime.UtcNow };
            var devReq = new HttpRequestMessage(HttpMethod.Post, "/api/devices") { Content = JsonContent.Create(dev) };
            devReq.Headers.Add("X-Test-NoResponseBody", "1");
            var devResp = await client.SendAsync(devReq);
            if (!devResp.IsSuccessStatusCode)
            {
                var txt = await devResp.Content.ReadAsStringAsync();
                throw new Exception($"Creating device failed: {devResp.StatusCode} - {txt}");
            }

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
            req.Headers.Add("X-Test-NoResponseBody", "1");

            var resp = await client.SendAsync(req);
            if (resp.StatusCode != HttpStatusCode.Created)
            {
                var txt = await resp.Content.ReadAsStringAsync();
                throw new Exception($"Booking issue failed: {resp.StatusCode} - {txt}");
            }

            // Verify booking exists in DB
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                var exists = db.Bookings.Any(b => b.DeviceId == createdDevId && b.EngineerId == createdEngId);
                Assert.True(exists, "Booking not found in DB");
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
            var engReq = new HttpRequestMessage(HttpMethod.Post, "/api/engineers") { Content = JsonContent.Create(eng) };
            engReq.Headers.Add("X-Test-NoResponseBody", "1");
            var engResp = await client.SendAsync(engReq);
            if (!engResp.IsSuccessStatusCode)
            {
                var txt = await engResp.Content.ReadAsStringAsync();
                throw new Exception($"Creating engineer failed: {engResp.StatusCode} - {txt}");
            }

            int createdEngId;
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                var createdEng = db.Engineers.FirstOrDefault(e => e.Email == eng.Email);
                if (createdEng == null) throw new Exception("Created engineer not found in DB");
                createdEngId = createdEng.EngineerId;
            }

            // Create device
            var dev = new CreateDeviceDto { AssetTag = "T2", Kind = "tablet", Status = "available", PurchasedOn = DateTime.UtcNow };
            var devReq = new HttpRequestMessage(HttpMethod.Post, "/api/devices") { Content = JsonContent.Create(dev) };
            devReq.Headers.Add("X-Test-NoResponseBody", "1");
            var devResp = await client.SendAsync(devReq);
            if (!devResp.IsSuccessStatusCode)
            {
                var txt = await devResp.Content.ReadAsStringAsync();
                throw new Exception($"Creating device failed: {devResp.StatusCode} - {txt}");
            }

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
            req1.Headers.Add("X-Test-NoResponseBody", "1");

            var req2 = new HttpRequestMessage(HttpMethod.Post, "/api/bookings/issue") { Content = JsonContent.Create(booking) };
            req2.Headers.Add("Idempotency-Key", "dup-key-1");
            req2.Headers.Add("X-Test-NoResponseBody", "1");

            var t1 = client.SendAsync(req1);
            var t2 = client.SendAsync(req2);

            var results = await Task.WhenAll(new[] { t1, t2 });

            // At least one request should have created the booking
            Assert.Contains(results, r => r.StatusCode == HttpStatusCode.Created);

            // Verify only one booking exists in DB for that device/engineer
            using (var db = new EquipmentAllocationsDbContext(new DbContextOptionsBuilder<EquipmentAllocationsDbContext>().UseSqlite(conn).Options))
            {
                var count = db.Bookings.Count(b => b.DeviceId == createdDevId && b.EngineerId == createdEngId);
                Assert.Equal(1, count);
            }

            conn.Dispose();
        }
    }
}
