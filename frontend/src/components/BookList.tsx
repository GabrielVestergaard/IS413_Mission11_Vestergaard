import React, { useEffect, useState } from 'react';
import { Book, BooksResponse } from '../types/Book';

// The choices exposed to the user in the "Results per page" dropdown.
const PAGE_SIZE_OPTIONS = [5, 10, 25];

/**
 * BookList — the main page component of the bookstore app.
 *
 * Responsibilities:
 *  1. Fetch a page of books from the API whenever page, pageSize, or sort changes.
 *  2. Render a Bootstrap-styled table with all book fields.
 *  3. Provide pagination controls (Prev / numbered pages / Next).
 *  4. Let the user change how many results appear per page.
 *  5. Let the user toggle alphabetical sorting by title.
 */
export default function BookList(): JSX.Element {
  // --- State ---

  // The array of books for the currently visible page.
  const [books, setBooks] = useState<Book[]>([]);

  // Which page the user is on (1-based index).
  const [currentPage, setCurrentPage] = useState<number>(1);

  // How many books to show per page. Starts at 5 as required.
  const [pageSize, setPageSize] = useState<number>(5);

  // Total number of pages that exist in the database for the current pageSize.
  const [totalPages, setTotalPages] = useState<number>(1);

  // Grand total of all books in the database (used for the "showing X of Y" label).
  const [totalBooks, setTotalBooks] = useState<number>(0);

  // The active sort field sent to the API ("title" = A–Z, "default" = insertion order).
  const [sortBy, setSortBy] = useState<string>('title');

  // True while a fetch is in flight; hides the table and shows a spinner.
  const [loading, setLoading] = useState<boolean>(true);

  // Holds an error message string if the fetch fails, otherwise null.
  const [error, setError] = useState<string | null>(null);

  // --- Data fetching ---

  /**
   * useEffect runs the fetch any time currentPage, pageSize, or sortBy changes.
   * The dependency array [currentPage, pageSize, sortBy] is what triggers the re-run.
   */
  useEffect(() => {
    setLoading(true);
    setError(null);

    // Build the URL with query parameters for server-side pagination and sorting.
    // The Vite proxy (vite.config.ts) forwards /api/* to http://localhost:5000.
    fetch(
      `/api/books?page=${currentPage}&pageSize=${pageSize}&sortBy=${sortBy}`
    )
      .then((res) => {
        // If the server returns a non-2xx status, turn it into a thrown error.
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        // Parse the JSON body and cast it to our typed BooksResponse interface.
        return res.json() as Promise<BooksResponse>;
      })
      .then((data) => {
        // Update state with the fresh page of data from the API.
        setBooks(data.books);
        setTotalPages(data.totalPages);
        setTotalBooks(data.totalBooks);
        setLoading(false);
      })
      .catch((err: Error) => {
        // Surface any network or server error to the user.
        setError(err.message);
        setLoading(false);
      });
  }, [currentPage, pageSize, sortBy]);

  // --- Event handlers ---

  /**
   * Called when the user picks a different value from the "Results per page" dropdown.
   * Converts the string value to a number and resets to page 1 so the user
   * doesn't land on a page that no longer exists with the new page size.
   */
  function handlePageSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  }

  /**
   * Toggles between title (A–Z) and default (insertion order) sort.
   * Also resets to page 1 because sorted results will be in a different order.
   */
  function handleSortChange() {
    setSortBy((prev) => (prev === 'title' ? 'default' : 'title'));
    setCurrentPage(1);
  }

  /**
   * Changes the current page, but only if the requested page is within range.
   * This prevents going below page 1 or above the last page.
   */
  function handlePageChange(page: number) {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  }

  // --- Render ---

  return (
    <div className="container py-4">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="d-flex align-items-center mb-4">
        <h1 className="h3 mb-0 me-3">
          <span className="text-primary">📚</span> Bookstore Catalog
        </h1>
        {/* Badge shows the total number of books across all pages */}
        <span className="badge bg-secondary ms-auto">
          {totalBooks} book{totalBooks !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Controls bar (sort toggle + page-size picker) ────────────────── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-body d-flex flex-wrap align-items-center gap-3">

          {/* Sort toggle button — active (solid) when sorted by title */}
          <div className="d-flex align-items-center gap-2">
            <label className="form-label mb-0 fw-semibold">Sort:</label>
            <button
              className={`btn btn-sm ${sortBy === 'title' ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={handleSortChange}
            >
              {sortBy === 'title' ? '🔤 Title (A–Z)' : '🔢 Default order'}
            </button>
          </div>

          {/* Results-per-page dropdown. Changing it resets to page 1. */}
          <div className="d-flex align-items-center gap-2 ms-auto">
            <label htmlFor="pageSizeSelect" className="form-label mb-0 fw-semibold">
              Results per page:
            </label>
            <select
              id="pageSizeSelect"
              className="form-select form-select-sm"
              style={{ width: 'auto' }}
              value={pageSize}
              onChange={handlePageSizeChange}
            >
              {/* Render one <option> for each allowed page size */}
              {PAGE_SIZE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Loading spinner ──────────────────────────────────────────────── */}
      {loading && (
        <div className="text-center py-5">
          {/* Bootstrap spinner — visible while fetch is in flight */}
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
          <p className="mt-2 text-muted">Loading books…</p>
        </div>
      )}

      {/* ── Error alert ──────────────────────────────────────────────────── */}
      {error && (
        <div className="alert alert-danger" role="alert">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* ── Book table + pagination (only rendered when data is ready) ───── */}
      {!loading && !error && (
        <>
          {/* table-responsive wraps the table so it scrolls horizontally
              on small screens instead of breaking the page layout. */}
          <div className="table-responsive shadow-sm rounded">
            <table className="table table-striped table-hover table-bordered align-middle mb-0">
              {/* table-dark gives the header a dark background */}
              <thead className="table-dark">
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Publisher</th>
                  <th>ISBN</th>
                  <th>Category</th>
                  <th>Classification</th>
                  <th className="text-center">Pages</th>
                  <th className="text-end">Price</th>
                </tr>
              </thead>
              <tbody>
                {/* Render one table row per book. bookID is used as the React key
                    so React can efficiently diff and update the list. */}
                {books.map((book) => (
                  <tr key={book.bookID}>
                    <td className="fw-semibold">{book.title}</td>
                    <td>{book.author}</td>
                    <td>{book.publisher}</td>
                    <td>
                      {/* Monospace font makes ISBN digits easier to read */}
                      <span className="text-monospace small">{book.isbn}</span>
                    </td>
                    <td>
                      {/* Bootstrap badge gives the category a colored pill */}
                      <span className="badge bg-info text-dark">
                        {book.category}
                      </span>
                    </td>
                    <td>{book.classification}</td>
                    <td className="text-center">{book.pageCount}</td>
                    <td className="text-end">
                      {/* toFixed(2) formats price to always show two decimal places */}
                      ${book.price.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination controls ─────────────────────────────────────── */}
          <div className="d-flex justify-content-between align-items-center mt-4">

            {/* "Page X of Y — showing A–B of N" summary label */}
            <p className="text-muted mb-0 small">
              Page {currentPage} of {totalPages} &mdash; showing{' '}
              {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, totalBooks)} of {totalBooks}
            </p>

            <nav aria-label="Book pagination">
              <ul className="pagination pagination-sm mb-0">

                {/* Previous button — disabled on the first page */}
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    &laquo; Prev
                  </button>
                </li>

                {/* Numbered page buttons.
                    Array.from({ length: totalPages }) creates an array of the
                    right length, then we map it to 1-based page numbers. */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <li
                      key={page}
                      // Bootstrap's "active" class highlights the current page
                      className={`page-item ${page === currentPage ? 'active' : ''}`}
                    >
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    </li>
                  )
                )}

                {/* Next button — disabled on the last page */}
                <li
                  className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}
                >
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next &raquo;
                  </button>
                </li>

              </ul>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
