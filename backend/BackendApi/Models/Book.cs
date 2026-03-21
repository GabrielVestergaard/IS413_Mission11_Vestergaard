namespace BackendApi.Models;

/// <summary>
/// Represents a single book record in the Bookstore database.
/// Each property maps directly to a column in the Books table of Bookstore.sqlite.
/// Entity Framework Core uses these property names to match the database columns.
/// </summary>
public class Book
{
    /// <summary>
    /// Primary key — auto-incremented by the database (AUTOINCREMENT in SQLite).
    /// EF Core recognizes "BookID" as the primary key by convention.
    /// </summary>
    public int BookID { get; set; }

    /// <summary>The full title of the book (e.g. "Les Miserables").</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>The author's full name (e.g. "Victor Hugo").</summary>
    public string Author { get; set; } = string.Empty;

    /// <summary>The publishing company (e.g. "Signet").</summary>
    public string Publisher { get; set; } = string.Empty;

    /// <summary>
    /// The International Standard Book Number, stored as a string so leading
    /// zeros and hyphens are preserved (e.g. "978-0451419439").
    /// </summary>
    public string ISBN { get; set; } = string.Empty;

    /// <summary>
    /// Broad classification — typically "Fiction" or "Non-Fiction".
    /// Stored in the Classification column of the database.
    /// </summary>
    public string Classification { get; set; } = string.Empty;

    /// <summary>
    /// More specific genre/category (e.g. "Biography", "Classic", "Historical").
    /// Stored in the Category column of the database.
    /// </summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>Total number of pages in the book.</summary>
    public int PageCount { get; set; }

    /// <summary>Retail price in US dollars (e.g. 9.95).</summary>
    public double Price { get; set; }
}
