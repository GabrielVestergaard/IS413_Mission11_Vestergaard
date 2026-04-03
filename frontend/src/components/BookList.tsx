/**
 * BookList.tsx — the main book catalog page.
 *
 * Responsibilities:
 *  1. Fetch distinct categories from /api/books/categories for the sidebar filter.
 *  2. Fetch a page of books from /api/books whenever page, pageSize, sort, or
 *     category changes (server-side pagination + filtering).
 *  3. Render books in a Bootstrap-Grid card layout.
 *  4. Let the user filter by category via a Bootstrap List Group in the sidebar.
 *  5. Let the user sort and change page size.
 *  6. Show an "Add to Cart" button on each book card.
 *  7. Show a cart summary panel in the sidebar.
 *  8. Show a Bootstrap Toast notification when a book is added to the cart.
 *  9. Sync catalogBrowseState in context so the navbar cart preserves "return" info.
 * 10. Empty-result panel when totalBooks === 0 (no bogus pagination).
 *
 * Bootstrap features used (not covered in class):
 *  #1 — Bootstrap Toast component (js-driven pop-up notification)
 *  #2 — Bootstrap List Group with active state for the category filter
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Book, BooksResponse } from '../types/Book';
import { useCart } from '../context/CartContext';
import { API_BASE } from '../config';

/**
 * Shape of location.state passed back from Cart when the user clicks
 * "Continue Shopping". Allows BookList to restore the user's previous
 * page position, category, sort order, and page size.
 */
interface RestoreState {
  restorePage?: number;
  restoreCategory?: string;
  restorePageSize?: number;
  restoreSortBy?: string;
}

// The choices exposed to the user in the "Results per page" dropdown.
const PAGE_SIZE_OPTIONS = [5, 10, 25];

// Colour map for category badges — gives each genre a distinct colour.
const CATEGORY_COLORS: Record<string, string> = {
  Action: 'danger',
  Biography: 'primary',
  Business: 'success',
  'Christian Books': 'warning',
  Classic: 'secondary',
  Health: 'info',
  Historical: 'dark',
  'Self-Help': 'success',
  Thrillers: 'danger',
};

function categoryBadge(cat: string): string {
  return CATEGORY_COLORS[cat] ?? 'secondary';
}

/**
 * BookList — the main page component of the bookstore app.
 */
export default function BookList(): JSX.Element {
  // ── Cart context ──────────────────────────────────────────────────────────
  const {
    addToCart,
    items: cartItems,
    totalItems,
    totalPrice,
    setCatalogBrowseState,
  } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  // Pull any "restore" state that Cart passed back via "Continue Shopping".
  const restore = (location.state as RestoreState) ?? {};

  // ── Book list state ───────────────────────────────────────────────────────

  // The array of books for the currently visible page.
  const [books, setBooks] = useState<Book[]>([]);

  // Which page the user is on (1-based index).
  // Initialised from restore state so "Continue Shopping" returns the user
  // to exactly the page they were on.
  const [currentPage, setCurrentPage] = useState<number>(restore.restorePage ?? 1);

  // How many books to show per page.
  const [pageSize, setPageSize] = useState<number>(restore.restorePageSize ?? 5);

  // Total number of pages for the current filter + page size.
  const [totalPages, setTotalPages] = useState<number>(1);

  // Grand total of books matching the current filter.
  const [totalBooks, setTotalBooks] = useState<number>(0);

  // The active sort field: "title" = A–Z, "default" = insertion order.
  const [sortBy, setSortBy] = useState<string>(restore.restoreSortBy ?? 'title');

  // The active category filter. Empty string means "All Categories".
  const [selectedCategory, setSelectedCategory] = useState<string>(
    restore.restoreCategory ?? ''
  );

  // True while a book fetch is in flight; shows spinner.
  const [loading, setLoading] = useState<boolean>(true);

  // Holds an error message if the book fetch fails.
  const [error, setError] = useState<string | null>(null);

  // ── Categories state ──────────────────────────────────────────────────────

  // Distinct category names loaded from /api/books/categories.
  const [categories, setCategories] = useState<string[]>([]);

  // ── Toast state ───────────────────────────────────────────────────────────
  // NEW BOOTSTRAP FEATURE #1: Bootstrap Toast
  // We track the most recently added book title to display in the toast.
  const [toastBook, setToastBook] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep context in sync so the navbar "Cart" button can pass the same
  // return-to-catalog info as "View Cart →".
  useEffect(() => {
    setCatalogBrowseState({
      page: currentPage,
      category: selectedCategory,
      pageSize,
      sortBy,
    });
  }, [currentPage, selectedCategory, pageSize, sortBy, setCatalogBrowseState]);

  // ── Load categories once on mount ─────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/books/categories`)
      .then((res) => res.json() as Promise<string[]>)
      .then(setCategories)
      .catch(() => {/* silently ignore — categories are non-critical */});
  }, []);

  // ── Fetch books whenever filter/sort/page changes ─────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);

    // Build the URL. `API_BASE` is `/api` in dev (Vite proxy → localhost:5000) or your deployed API root.
    const params = new URLSearchParams({
      page: String(currentPage),
      pageSize: String(pageSize),
      sortBy,
    });
    if (selectedCategory) params.set('category', selectedCategory);

  fetch(`${API_BASE}/books?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json() as Promise<BooksResponse>;
      })
      .then((data) => {
        setBooks(data.books);
        setTotalPages(data.totalPages);
        setTotalBooks(data.totalBooks);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [currentPage, pageSize, sortBy, selectedCategory]);

  // ── Event handlers ────────────────────────────────────────────────────────

  function handlePageSizeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  }

  function handleSortChange() {
    setSortBy((prev) => (prev === 'title' ? 'default' : 'title'));
    setCurrentPage(1);
  }

  /** Clamps to valid range so Prev/Next cannot leave the result set. */
  function handlePageChange(page: number) {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  }

  /**
   * Selecting a category resets to page 1 (the filtered result set is new).
   * Passing an empty string means "All Categories".
   */
  function handleCategorySelect(cat: string) {
    setSelectedCategory(cat);
    setCurrentPage(1);
  }

  /**
   * Adds a book to the cart and fires the Bootstrap Toast notification.
   * The toast auto-dismisses after 3 seconds.
   */
  function handleAddToCart(book: Book) {
    addToCart(book);
    setToastBook(book.title);
    setShowToast(true);

    // Clear any existing timer before starting a new one
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setShowToast(false), 3000);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    // Bootstrap container gives us 12-column grid + responsive padding.
    <div className="container-xl py-4">

      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="d-flex align-items-center mb-4">
        <h1 className="h3 mb-0 me-3">
          <span className="text-primary">📚</span> Bookstore Catalog
        </h1>
        <span className="badge bg-secondary ms-auto fs-6">
          {totalBooks} book{totalBooks !== 1 ? 's' : ''}
          {selectedCategory ? ` in "${selectedCategory}"` : ''}
        </span>
      </div>

      {/* ── Bootstrap Grid: sidebar (col-lg-3) + main content (col-lg-9) ── */}
      <div className="row g-4">

        {/* ─────────────────────── LEFT SIDEBAR ─────────────────────────── */}
        <div className="col-lg-3">

          {/* ── Category Filter (NEW BOOTSTRAP FEATURE #2: List Group) ─── */}
          {/*
            Bootstrap List Group with active state.
            list-group-flush removes the outer border so it integrates cleanly
            inside the card. Each item uses list-group-item-action to get the
            hover and cursor-pointer behaviour. The "active" class highlights
            whichever category is selected.
          */}
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-dark text-white fw-bold">
              🗂️ Filter by Category
            </div>
            <ul className="list-group list-group-flush">
              {/* "All" option — active when selectedCategory is empty */}
              <li
                className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedCategory === '' ? 'active' : ''}`}
                onClick={() => handleCategorySelect('')}
                style={{ cursor: 'pointer' }}
              >
                All Categories
                <span className={`badge rounded-pill ${selectedCategory === '' ? 'bg-light text-dark' : 'bg-secondary'}`}>
                  {/* We don't have a total per-category count here, so show
                      totalBooks only when "All" is active */}
                  {selectedCategory === '' ? totalBooks : ''}
                </span>
              </li>

              {/* One list item per category */}
              {categories.map((cat) => (
                <li
                  key={cat}
                  className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => handleCategorySelect(cat)}
                  style={{ cursor: 'pointer' }}
                >
                  {cat}
                  <span className={`badge rounded-pill bg-${categoryBadge(cat)} ${cat === 'Christian Books' ? 'text-dark' : ''}`}>
                    &nbsp;
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Cart Summary ─────────────────────────────────────────────── */}
          <div className="card shadow-sm sticky-top" style={{ top: '1rem', zIndex: 10 }}>
            <div className="card-header bg-success text-white fw-bold d-flex align-items-center justify-content-between">
              🛒 Cart Summary
              {totalItems > 0 && (
                <span className="badge bg-white text-success rounded-pill">
                  {totalItems}
                </span>
              )}
            </div>
            <div className="card-body p-0">
              {cartItems.length === 0 ? (
                <p className="text-muted small p-3 mb-0">Your cart is empty.</p>
              ) : (
                <>
                  <ul className="list-group list-group-flush">
                    {cartItems.map((item) => (
                      <li key={item.book.bookID} className="list-group-item px-3 py-2">
                        <div className="fw-semibold small text-truncate" title={item.book.title}>
                          {item.book.title}
                        </div>
                        <div className="d-flex justify-content-between text-muted small">
                          <span>×{item.quantity}</span>
                          <span>${(item.book.price * item.quantity).toFixed(2)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="px-3 py-2 border-top">
                    <div className="d-flex justify-content-between fw-bold">
                      <span>Total:</span>
                      <span className="text-success">${totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="card-footer p-2">
              <button
                className="btn btn-success btn-sm w-100"
                disabled={cartItems.length === 0}
                onClick={() =>
                  navigate('/cart', {
                    state: {
                      returnPage: currentPage,
                      returnCategory: selectedCategory,
                      returnPageSize: pageSize,
                      returnSortBy: sortBy,
                    },
                  })
                }
              >
                View Cart →
              </button>
            </div>
          </div>
        </div>

        {/* ─────────────────────── MAIN CONTENT ─────────────────────────── */}
        <div className="col-lg-9">

          {/* ── Controls bar ───────────────────────────────────────────── */}
          <div className="card mb-4 shadow-sm">
            <div className="card-body d-flex flex-wrap align-items-center gap-3">

              {/* Sort toggle */}
              <div className="d-flex align-items-center gap-2">
                <label className="form-label mb-0 fw-semibold">Sort:</label>
                <button
                  className={`btn btn-sm ${sortBy === 'title' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={handleSortChange}
                >
                  {sortBy === 'title' ? '🔤 Title (A–Z)' : '🔢 Default order'}
                </button>
              </div>

              {/* Active category badge */}
              {selectedCategory && (
                <span className="badge bg-info text-dark">
                  {selectedCategory}{' '}
                  <button
                    type="button"
                    className="btn-close btn-close-white btn-sm ms-1"
                    style={{ fontSize: '0.6rem' }}
                    aria-label="Clear category filter"
                    onClick={() => handleCategorySelect('')}
                  />
                </span>
              )}

              {/* Results-per-page dropdown */}
              <div className="d-flex align-items-center gap-2 ms-auto">
                <label htmlFor="pageSizeSelect" className="form-label mb-0 fw-semibold">
                  Per page:
                </label>
                <select
                  id="pageSizeSelect"
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={pageSize}
                  onChange={handlePageSizeChange}
                >
                  {PAGE_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Loading spinner ─────────────────────────────────────────── */}
          {loading && (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading…</span>
              </div>
              <p className="mt-2 text-muted">Loading books…</p>
            </div>
          )}

          {/* ── Error alert ─────────────────────────────────────────────── */}
          {error && (
            <div className="alert alert-danger" role="alert">
              <strong>Error:</strong> {error}
            </div>
          )}

          {/* ── Results: empty panel OR card grid + pagination ─────────────── */}
          {!loading && !error && (
            <>
              {totalBooks === 0 ? (
                <div
                  className="text-center py-5 px-3 border rounded-3 bg-white shadow-sm"
                  role="status"
                >
                  {/* Shown when API returns totalBooks === 0 (filter too narrow or empty DB). */}
                  <p className="display-6 text-muted mb-2" aria-hidden="true">
                    📭
                  </p>
                  <p className="fw-semibold text-body mb-1">No books found</p>
                  <p className="text-muted small mb-3">
                    {selectedCategory ? (
                      <>
                        Nothing matches this category. Try &ldquo;All
                        Categories&rdquo; or pick another genre from the sidebar.
                      </>
                    ) : (
                      <>The catalog has no books to show right now.</>
                    )}
                  </p>
                  {selectedCategory && (
                    <button
                      type="button"
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => handleCategorySelect('')}
                    >
                      Clear category filter
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Books rendered as Bootstrap cards in a responsive grid.
                      row-cols-* sets how many columns of cards to show per breakpoint.
                      g-3 adds equal gutters between all cards. */}
                  <div className="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-3 mb-4">
                    {books.map((book) => {
                      const inCart = cartItems.find(
                        (item) => item.book.bookID === book.bookID
                      );
                      return (
                        <div key={book.bookID} className="col">
                          <div className="card h-100 shadow-sm">
                            {/* Coloured header strip by classification */}
                            <div
                              className={`card-header text-white fw-semibold small ${book.classification === 'Fiction' ? 'bg-primary' : 'bg-secondary'}`}
                            >
                              {book.classification} &middot; {book.category}
                            </div>
                            <div className="card-body d-flex flex-column">
                              <h6 className="card-title fw-bold mb-1 text-truncate" title={book.title}>
                                {book.title}
                              </h6>
                              <p className="text-muted small mb-2">{book.author}</p>
                              <p className="text-muted small mb-0">
                                <span className="me-2">🏢 {book.publisher}</span>
                              </p>
                              <p className="text-muted small mb-0">
                                <span className="me-2">📄 {book.pageCount} pages</span>
                              </p>
                              <p className="text-muted small mb-3">
                                <span className="font-monospace">ISBN: {book.isbn}</span>
                              </p>
                              {/* Price + Add to Cart pushed to bottom of card */}
                              <div className="mt-auto d-flex align-items-center justify-content-between">
                                <span className="h5 mb-0 text-success fw-bold">
                                  ${book.price.toFixed(2)}
                                </span>
                                <button
                                  className={`btn btn-sm ${inCart ? 'btn-success' : 'btn-outline-success'}`}
                                  onClick={() => handleAddToCart(book)}
                                >
                                  {inCart ? `✓ In Cart (${inCart.quantity})` : '+ Add to Cart'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── Pagination ─────────────────────────────────────────── */}
                  <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap gap-2">
                    {/* Math.min keeps the range honest on the last page (partial row). */}
                    <p className="text-muted mb-0 small">
                      Page {currentPage} of {totalPages} &mdash; showing{' '}
                      {Math.min((currentPage - 1) * pageSize + 1, totalBooks)}–
                      {Math.min(currentPage * pageSize, totalBooks)} of {totalBooks}
                    </p>

                    <nav aria-label="Book pagination">
                      <ul className="pagination pagination-sm mb-0">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            &laquo; Prev
                          </button>
                        </li>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                          (page) => (
                            <li
                              key={page}
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

                        <li
                          className={`page-item ${currentPage >= totalPages || totalPages === 0 ? 'disabled' : ''}`}
                        >
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages || totalPages === 0}
                          >
                            Next &raquo;
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </>
              )}
            </>
          )}
        </div>{/* end col-lg-9 */}
      </div>{/* end row */}

      {/* ── Bootstrap Toast notification (NEW BOOTSTRAP FEATURE #1) ────────
          The toast appears in the bottom-right corner whenever a book is
          added to the cart. It is controlled by React state (showToast)
          rather than Bootstrap's JS API so it integrates cleanly with React.
          Classes used:
            position-fixed bottom-0 end-0 p-3 — positions the toast container
            toast show / toast (hidden) — Bootstrap's visibility classes
            toast-header / toast-body — Bootstrap's toast anatomy classes
      ────────────────────────────────────────────────────────────────────── */}
      <div
        className="position-fixed bottom-0 end-0 p-3"
        style={{ zIndex: 1100 }}
        aria-live="polite"
        aria-atomic="true"
      >
        <div
          className={`toast align-items-center text-bg-success border-0 ${showToast ? 'show' : ''}`}
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
        >
          <div className="d-flex">
            <div className="toast-body fw-semibold">
              🛒 Added to cart:{' '}
              <span className="fw-normal fst-italic">
                {toastBook.length > 35 ? toastBook.slice(0, 35) + '…' : toastBook}
              </span>
            </div>
            <button
              type="button"
              className="btn-close btn-close-white me-2 m-auto"
              aria-label="Close"
              onClick={() => setShowToast(false)}
            />
          </div>
        </div>
      </div>

    </div>
  );
}
