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

// Build the path to Bookstore.sqlite, which lives two directories above the
// backend project (at the repository root alongside the frontend folder).
// Path.Combine handles OS-specific path separators automatically.
var dbPath = Path.Combine(Directory.GetCurrentDirectory(), "..", "..", "Bookstore.sqlite");

// Register BookstoreContext with Entity Framework Core using the SQLite provider.
// AddDbContext makes it available for constructor injection throughout the app.
builder.Services.AddDbContext<BookstoreContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

// CORS (Cross-Origin Resource Sharing) policy.
// Browsers block requests from one origin (e.g. localhost:5173) to another
// (e.g. localhost:5000) by default. This tells the browser our API allows it.
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .WithOrigins("http://localhost:5173") // Vite dev server origin
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
