// Program.cs is the entry point and composition root of the ASP.NET Core application.
// It configures all services (dependency injection) and then builds and runs the app.

using BackendApi.Data;
using Microsoft.EntityFrameworkCore;

// WebApplication.CreateBuilder sets up configuration (appsettings.json, env vars, etc.)
// and prepares the dependency injection container.
var builder = WebApplication.CreateBuilder(args);

// Register MVC controllers so ASP.NET can discover BooksController automatically.
builder.Services.AddControllers();

// These two lines enable Swagger/OpenAPI documentation.
// In development you can visit /swagger to explore the API in a browser.
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Build the path to Bookstore.sqlite inside the BackendApi project folder.
// This works for both running from the project folder and when published.
// For published apps AppContext.BaseDirectory points to the publish folder.
var possiblePublishedPath = Path.Combine(AppContext.BaseDirectory, "Bookstore.sqlite");
var devPath = Path.Combine(Directory.GetCurrentDirectory(), "Bookstore.sqlite");

string dbPath;
if (File.Exists(possiblePublishedPath))
{
    dbPath = possiblePublishedPath;
}
else if (File.Exists(devPath))
{
    dbPath = devPath;
}
else
{
    // Fall back to the project-relative path to be tolerant during development.
    dbPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "Bookstore.sqlite");
}

// Register BookstoreContext with Entity Framework Core using the SQLite provider.
// AddDbContext makes it available for constructor injection throughout the app.
builder.Services.AddDbContext<BookstoreContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

// CORS — allow Vite dev + deployed Azure Static Web App to call this API.
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "https://lemon-hill-07f449803.1.azurestaticapps.net")
            .AllowAnyHeader()
            .AllowAnyMethod();
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
