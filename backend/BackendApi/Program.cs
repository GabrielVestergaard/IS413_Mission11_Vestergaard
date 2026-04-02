// Program.cs is the entry point and composition root of the ASP.NET Core application.
// It configures all services (dependency injection) and then builds and runs the app.

using BackendApi.Data;
using Microsoft.EntityFrameworkCore;
using System;

// WebApplication.CreateBuilder sets up configuration (appsettings.json, env vars, etc.)
// and prepares the dependency injection container.
var builder = WebApplication.CreateBuilder(args);

// Register MVC controllers so ASP.NET can discover BooksController automatically.
builder.Services.AddControllers();

// These two lines enable Swagger/OpenAPI documentation.
// In development you can visit /swagger to explore the API in a browser.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Determine a reliable path for the SQLite database that works both when
// running via `dotnet run` from the project folder and when the app is
// published and executed from the publish output directory.
// - When published the assembly files live in AppContext.BaseDirectory,
//   so we look there first. Otherwise fall back to the repo-relative path
//   used during development (two levels up from the project folder).
var baseDir = AppContext.BaseDirectory;
var publishedPath = Path.Combine(baseDir, "Bookstore.sqlite");
var devPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "Bookstore.sqlite");

string dbPath;
if (File.Exists(publishedPath))
{
    dbPath = publishedPath;
}
else if (File.Exists(devPath))
{
    dbPath = devPath;
}
else
{
    // Log a clear message and throw so the host sees a helpful startup error
    // instead of a vague HTTP 500 later when a controller tries to use the DB.
    var msg = $"Bookstore.sqlite not found. Checked: {publishedPath} and {devPath}.";
    Console.Error.WriteLine(msg);
    throw new FileNotFoundException(msg);
}

// Register BookstoreContext with Entity Framework Core using the SQLite provider.
builder.Services.AddDbContext<BookstoreContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

// CORS (Cross-Origin Resource Sharing) policy.
// Browsers block requests from one origin (e.g. localhost:5173) to another
// (e.g. localhost:5000) by default. This tells the browser our API allows it.
// Configure CORS origins. Use the FRONTEND_ORIGINS environment variable
// (comma-separated) in production to list allowed origins, e.g.
// FRONTEND_ORIGINS=https://your-frontend.azurewebsites.net
var frontendOriginsEnv = builder.Configuration["FRONTEND_ORIGINS"] ?? Environment.GetEnvironmentVariable("FRONTEND_ORIGINS") ?? string.Empty;
string[] frontendOrigins = string.IsNullOrWhiteSpace(frontendOriginsEnv)
    ? new[] { "http://localhost:5173" }
    : frontendOriginsEnv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        // If running in Production and no FRONTEND_ORIGINS were provided,
        // allow any origin temporarily so deployed frontends can talk to the API
        // while you set the environment variable in Azure. This avoids a
        // blank page due to CORS blocking. Log a warning so it's obvious.
        if (builder.Environment.IsProduction() && frontendOrigins.Length == 1 && frontendOrigins[0] == "http://localhost:5173")
        {
            Console.Error.WriteLine("WARNING: No FRONTEND_ORIGINS configured and running in Production — allowing any origin temporarily.");
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        }
        else
        {
            policy.WithOrigins(frontendOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
    });
});

// Build the configured WebApplication from all registered services.
var app = builder.Build();

// Only expose Swagger UI in the development environment — not in production.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Middleware pipeline — order matters.
// UseCors must come before UseAuthorization and MapControllers.
app.UseCors();
app.UseAuthorization();

// Map attribute-routed controller actions (e.g. [Route("api/[controller]")]).
app.MapControllers();

// Start the web server and begin listening for HTTP requests.
app.Run();
