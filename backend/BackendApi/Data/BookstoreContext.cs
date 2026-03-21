using BackendApi.Models;
using Microsoft.EntityFrameworkCore;

namespace BackendApi.Data;

/// <summary>
/// The Entity Framework Core "database context" for the Bookstore application.
///
/// A DbContext is the bridge between your C# code and the database. It:
///   - Holds the connection to Bookstore.sqlite
///   - Tracks changes to objects so it knows what SQL to run
///   - Exposes DbSet properties that act like queryable tables
///
/// This context is registered in Program.cs and injected into controllers
/// via ASP.NET's built-in dependency injection system.
/// </summary>
public class BookstoreContext : DbContext
{
    /// <summary>
    /// Constructor — receives connection/configuration options from dependency injection.
    /// The options (including the SQLite connection string) are configured in Program.cs.
    /// </summary>
    public BookstoreContext(DbContextOptions<BookstoreContext> options) : base(options) { }

    /// <summary>
    /// Represents the Books table in the database.
    /// You can query it with LINQ, e.g.: _context.Books.Where(b => b.Price < 10)
    /// EF Core maps this to the "Books" table by convention (plural of the model name).
    /// </summary>
    public DbSet<Book> Books { get; set; }
}
