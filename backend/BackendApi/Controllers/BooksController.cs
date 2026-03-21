using BackendApi.Data;
using BackendApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BackendApi.Controllers;

/// <summary>
/// API controller that handles all HTTP requests for book data.
///
/// [ApiController]  — enables automatic model validation and JSON responses.
/// [Route("api/[controller]")] — maps requests to /api/books
///   ("[controller]" is replaced with the class name minus "Controller").
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BooksController : ControllerBase
{
    // The database context is injected by ASP.NET's dependency injection system.
    // It is readonly so it cannot be accidentally replaced after construction.
    private readonly BookstoreContext _context;

    /// <summary>
    /// Constructor — ASP.NET automatically passes in the registered BookstoreContext.
    /// </summary>
    public BooksController(BookstoreContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Returns a paginated, optionally sorted page of books.
    ///
    /// Example request: GET /api/books?page=2&amp;pageSize=5&amp;sortBy=title
    /// </summary>
    /// <param name="page">1-based page number (default 1).</param>
    /// <param name="pageSize">How many books to return per page (default 5).</param>
    /// <param name="sortBy">Column to sort by: "title" or "default" (insertion order).</param>
    [HttpGet]
    public async Task<IActionResult> GetBooks(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 5,
        [FromQuery] string sortBy = "title")
    {
        // Start with the full Books table as an IQueryable.
        // Nothing hits the database yet — LINQ builds up a query expression tree.
        var query = _context.Books.AsQueryable();

        // Apply the requested sort order using a C# switch expression.
        // "title"   → alphabetical A–Z by Title
        // anything else → natural insertion order by primary key
        query = sortBy.ToLower() switch
        {
            "title" => query.OrderBy(b => b.Title),
            _ => query.OrderBy(b => b.BookID)
        };

        // Count total matching rows (runs one COUNT(*) SQL query).
        // We need this number so the frontend knows how many pages to show.
        var totalBooks = await query.CountAsync();

        // Fetch only the books for the requested page:
        //   Skip() jumps past all books on earlier pages.
        //   Take() limits the result to one page's worth of records.
        // Example: page=2, pageSize=5 → Skip(5).Take(5) → rows 6–10
        var books = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // Return 200 OK with a JSON object containing the books plus
        // the metadata the frontend needs to render pagination controls.
        return Ok(new
        {
            books,
            totalBooks,
            page,
            pageSize,
            // Math.Ceiling ensures a partial last page still counts as a full page.
            // e.g. 16 books / 5 per page = 3.2 → ceiling → 4 pages
            totalPages = (int)Math.Ceiling((double)totalBooks / pageSize)
        });
    }
}
