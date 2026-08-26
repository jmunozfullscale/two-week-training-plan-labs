using EquipmentAllocations;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();

// EF DbContext: Use SQLite file by default for now (Data/equipment_allocations.db)
var connectionString = builder.Configuration.GetConnectionString("EquipmentAllocations") ?? "Data Source=Data/equipment_allocations.db";
builder.Services.AddDbContext<EquipmentAllocations.Data.EquipmentAllocationsDbContext>(opts =>
    opts.UseSqlite(connectionString));

// register application services
builder.Services.AddEquipmentAllocationsServices();

//// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
//builder.Services.AddOpenApi();

// Add Swagger generation services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Ensure SQLite DB is created when app starts (development/local)
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<EquipmentAllocations.Data.EquipmentAllocationsDbContext>();
    db.Database.EnsureCreated();
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
