using BackendApi.Data;
using BackendApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BackendApi.Controllers;

/// <summary>
/// Handles all HTTP requests for book data.
///
/// Endpoints:
///   GET    /api/books/categories  — distinct category list for the filter sidebar
///   GET    /api/books             — paginated + filtered book list
///   GET    /api/books/{id}        — single book by primary key
///   POST   /api/books             — create a new book
///   PUT    /api/books/{id}        — update an existing book
///   DELETE /api/books/{id}        — permanently remove a book
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class BooksController : ControllerBase
{
    // Injected by ASP.NET's dependency injection system (registered in Program.cs).
    private readonly BookstoreContext _context;

    public BooksController(BookstoreContext context)
    {
        _context = context;
    }

    // ── READ ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns all distinct book categories sorted alphabetically.
    /// This route must be declared before {id} to avoid routing ambiguity
    /// (otherwise ASP.NET might try to interpret "categories" as an int id).
    /// GET /api/books/categories
    /// </summary>
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories()
    {
        var categories = await _context.Books
            .Select(b => b.Category)
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();

        return Ok(categories);
    }

    /// <summary>
    /// Returns a paginated, optionally sorted and category-filtered page of books.
    /// GET /api/books?page=1&amp;pageSize=5&amp;sortBy=title&amp;category=Biography
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetBooks(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 5,
        [FromQuery] string sortBy = "title",
        [FromQuery] string category = "")
    {
        var query = _context.Books.AsQueryable();

        // Apply optional category filter before counting or paging.
        if (!string.IsNullOrWhiteSpace(category))
            query = query.Where(b => b.Category == category);

        // Sort by title A–Z or by insertion order (BookID).
        query = sortBy.ToLower() switch
        {
            "title" => query.OrderBy(b => b.Title),
            _       => query.OrderBy(b => b.BookID)
        };

        // Total matching rows — drives the page-count calculation on the frontend.
        var totalBooks = await query.CountAsync();

        // Fetch one page worth of records using Skip/Take.
        var books = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new
        {
            books,
            totalBooks,
            page,
            pageSize,
            category,
            totalPages = (int)Math.Ceiling((double)totalBooks / pageSize)
        });
    }

    /// <summary>
    /// Returns a single book by its primary key.
    /// Used by the admin edit form to confirm the record still exists.
    /// GET /api/books/{id}
    /// </summary>
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetBook(int id)
    {
        var book = await _context.Books.FindAsync(id);
        if (book is null) return NotFound();
        return Ok(book);
    }

    // ── CREATE ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Adds a new book to the database.
    /// Returns 201 Created with a Location header and the saved book
    /// (including the auto-assigned BookID from SQLite AUTOINCREMENT).
    /// POST /api/books
    /// Body: { title, author, publisher, isbn, classification, category, pageCount, price }
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateBook([FromBody] Book book)
    {
        // Zero out the ID so the database assigns a fresh auto-increment value.
        // Without this a client could try to dictate the primary key.
        book.BookID = 0;

        _context.Books.Add(book);
        await _context.SaveChangesAsync();

        // CreatedAtAction returns HTTP 201 and sets the Location header to
        // GET /api/books/{newId} so the caller knows where to find the new record.
        return CreatedAtAction(nameof(GetBook), new { id = book.BookID }, book);
    }

    // ── UPDATE ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Replaces an existing book's fields with the values supplied in the body.
    /// Returns 204 No Content on success (nothing to send back — the client
    /// already has the updated data it just sent us).
    /// PUT /api/books/{id}
    /// Body: full Book object; bookID must match the {id} in the URL.
    /// </summary>
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateBook(int id, [FromBody] Book book)
    {
        // Guard: URL id must match the body's bookID to prevent accidental overwrites.
        if (id != book.BookID)
            return BadRequest("The ID in the URL does not match the ID in the request body.");

        // Guard: make sure the record actually exists before trying to update it.
        var exists = await _context.Books.AnyAsync(b => b.BookID == id);
        if (!exists) return NotFound();

        // EntityState.Modified tells EF Core to generate an UPDATE statement
        // covering every column when SaveChanges is called.
        _context.Entry(book).State = EntityState.Modified;

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateConcurrencyException)
        {
            // Re-check in case the record was deleted between AnyAsync and SaveChanges.
            if (!await _context.Books.AnyAsync(b => b.BookID == id))
                return NotFound();
            throw;
        }

        return NoContent(); // HTTP 204
    }

    // ── DELETE ──────────────────────────────────────────────────────────────

    /// <summary>
    /// Permanently removes a book from the database.
    /// Returns 204 No Content on success.
    /// DELETE /api/books/{id}
    /// </summary>
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteBook(int id)
    {
        var book = await _context.Books.FindAsync(id);
        if (book is null) return NotFound();

        _context.Books.Remove(book);
        await _context.SaveChangesAsync();

        return NoContent(); // HTTP 204
    }
}
