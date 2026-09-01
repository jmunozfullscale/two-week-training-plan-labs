using EquipmentAllocations;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();

// EF DbContext: Support SQL Server if configured, otherwise default to local SQLite file
var connectionString = builder.Configuration.GetConnectionString("EquipmentAllocations");
builder.Services.AddDbContext<EquipmentAllocations.Data.EquipmentAllocationsDbContext>(opts =>
{
    var useSqlServer = !string.IsNullOrEmpty(connectionString) && 
                       (connectionString.Contains("Server=") || connectionString.Contains("Data Source=tcp:") || connectionString.Contains("Trusted_Connection=")) &&
                       !string.Equals(builder.Environment.EnvironmentName, "Testing", StringComparison.OrdinalIgnoreCase);

    if (useSqlServer)
    {
        opts.UseSqlServer(connectionString);
    }
    else
    {
        opts.UseSqlite(connectionString ?? "Data Source=Data/equipment_allocations.db");
    }
});

// register application services
builder.Services.AddEquipmentAllocationsServices();

//// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
//builder.Services.AddOpenApi();

// Add Swagger generation services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Ensure DB is created / migrated on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<EquipmentAllocations.Data.EquipmentAllocationsDbContext>();
    if (app.Environment.IsEnvironment("Testing") || db.Database.IsSqlite())
    {
        db.Database.EnsureCreated();
    }
    else
    {
        db.Database.Migrate();
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // app.MapOpenApi();
    app.UseSwagger();  
    app.UseSwaggerUI(); 
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();

// Required for WebApplicationFactory tests
public partial class Program { }
