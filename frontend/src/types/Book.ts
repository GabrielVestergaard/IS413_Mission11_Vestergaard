/**
 * Book and API response types — frontend mirror of BackendApi.Models.Book
 * and the JSON envelope from GET /api/books.
 *
 * Note: ASP.NET Core serializes property names in camelCase by default,
 * so "BookID" becomes "bookID", "PageCount" becomes "pageCount", etc.
 * These names must match exactly what the API sends.
 */
export interface Book {
  bookID: number;         // Primary key (auto-incremented in the database)
  title: string;          // Full book title
  author: string;         // Author's name
  publisher: string;      // Publishing company
  isbn: string;           // International Standard Book Number
  classification: string; // Broad type: "Fiction" or "Non-Fiction"
  category: string;       // Specific genre: "Biography", "Classic", etc.
  pageCount: number;      // Total number of pages
  price: number;          // Retail price in USD
}

/**
 * Shape of the JSON object returned by GET /api/books.
 * Includes the page of books AND the pagination metadata needed to render
 * the Previous / Next / page-number controls.
 * Also includes the active category so the frontend can reflect it.
 */
export interface BooksResponse {
  books: Book[];       // The books on the current page
  totalBooks: number;  // Total books matching the current filter
  page: number;        // The current 1-based page number
  pageSize: number;    // How many books are shown per page
  totalPages: number;  // Total number of pages (Math.ceil(totalBooks / pageSize))
  category: string;    // The active category filter (empty = all)
}
