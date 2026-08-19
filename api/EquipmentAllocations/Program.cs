var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();

//// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
//builder.Services.AddOpenApi();

// Add Swagger generation services
builder.Services.AddEndpointsApiExplorer(); // Required for endpoint discovery
builder.Services.AddSwaggerGen();           // Generates the Swagger specification

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    // app.MapOpenApi();
    app.UseSwagger();   // Serves the generated JSON document (openapi.json)
    app.UseSwaggerUI(); // Serves the interactive web UI page
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
