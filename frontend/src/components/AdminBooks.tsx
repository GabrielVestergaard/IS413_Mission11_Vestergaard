/**
 * AdminBooks.tsx — admin page for managing the book catalog.
 *
 * Responsibilities:
 *  1. Display all books in a paginated table.
 *  2. "Add New Book" button opens a Bootstrap Modal with a blank form.
 *  3. "Edit" button on each row opens the same modal pre-filled with that book's data.
 *  4. "Delete" button on each row asks for confirmation, then calls DELETE /api/books/{id}.
 *  5. After every successful add / edit / delete the table refreshes automatically.
 *
 * API calls:
 *  GET    /api/books?page=&pageSize=&sortBy=  — load page of books
 *  GET    /api/books/categories               — populate Category dropdown
 *  POST   /api/books                          — create new book
 *  PUT    /api/books/{id}                     — update existing book
 *  DELETE /api/books/{id}                     — delete book
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Book, BooksResponse } from '../types/Book';
import { API_BASE } from '../config';

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * The shape of the controlled form. We use strings for everything so
 * <input> values always stay as strings; we parse to numbers on submit.
 */
interface BookForm {
  title: string;
  author: string;
  publisher: string;
  isbn: string;
  classification: string;
  category: string;
  pageCount: string;
  price: string;
}

/** A blank form used when opening the modal for a new book. */
const EMPTY_FORM: BookForm = {
  title: '',
  author: '',
  publisher: '',
  isbn: '',
  classification: 'Non-Fiction',
  category: '',
  pageCount: '',
  price: '',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminBooks(): JSX.Element {

  // ── Book list state ─────────────────────────────────────────────────────────
  const [books, setBooks] = useState<Book[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);        // Fixed at 10 rows for the admin table
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalBooks, setTotalBooks] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);

  // ── Category dropdown state ─────────────────────────────────────────────────
  // Populated from /api/books/categories so the form always reflects what's in the DB.
  const [categories, setCategories] = useState<string[]>([]);

  // ── Modal / form state ──────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState<boolean>(false);

  // When editingBook is non-null we are in "edit" mode; null means "add" mode.
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  // The controlled form values.
  const [form, setForm] = useState<BookForm>(EMPTY_FORM);

  // Validation / submission error message shown inside the modal.
  const [formError, setFormError] = useState<string | null>(null);

  // True while a POST or PUT is in flight; disables the Save button.
  const [saving, setSaving] = useState<boolean>(false);

  // ── Delete confirmation state ───────────────────────────────────────────────
  // The book the user clicked "Delete" on; null when no confirmation is pending.
  const [deletingBook, setDeletingBook] = useState<Book | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Load categories once on mount ────────────────────────────────────────────
  useEffect(() => {
  fetch(`${API_BASE}/categories`)
      .then((res) => res.json() as Promise<string[]>)
      .then((cats) => {
        setCategories(cats);
        // Default the form's category to the first one so the dropdown is never blank.
        setForm((prev) => ({ ...prev, category: cats[0] ?? '' }));
      })
      .catch(() => { /* non-critical — the dropdown will just be empty */ });
  }, []);

  // ── Fetch the current page of books ──────────────────────────────────────────
  // useCallback keeps the function reference stable so it can safely appear in
  // the useEffect dependency array without causing an infinite re-render loop.
  const fetchBooks = useCallback(() => {
    setLoading(true);
    setListError(null);

  fetch(`${API_BASE}?page=${currentPage}&pageSize=${pageSize}&sortBy=title`)
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
        setListError(err.message);
        setLoading(false);
      });
  }, [currentPage, pageSize]); // re-create only when page or size changes

  // Runs on mount and whenever currentPage changes (or fetchBooks ref updates).
  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // ── Modal helpers ─────────────────────────────────────────────────────────────

  /** Opens the modal in "Add" mode with a blank form. */
  function openAddModal() {
    setEditingBook(null);
    setForm({ ...EMPTY_FORM, category: categories[0] ?? '' });
    setFormError(null);
    setShowModal(true);
  }

  /** Opens the modal in "Edit" mode pre-filled with the given book's data. */
  function openEditModal(book: Book) {
    setEditingBook(book);
    setForm({
      title:          book.title,
      author:         book.author,
      publisher:      book.publisher,
      isbn:           book.isbn,
      classification: book.classification,
      category:       book.category,
      pageCount:      String(book.pageCount),
      price:          String(book.price),
    });
    setFormError(null);
    setShowModal(true);
  }

  /** Closes the modal and resets all form-related state. */
  function closeModal() {
    setShowModal(false);
    setEditingBook(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setSaving(false);
  }

  // ── Form field handler ────────────────────────────────────────────────────────

  /**
   * Single handler for all text/select/number inputs.
   * Reads the field name from the element's `name` attribute and updates
   * the matching key in `form`.
   */
  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // ── Save (POST or PUT) ────────────────────────────────────────────────────────

  /** Validates the form and calls POST (add) or PUT (edit) accordingly. */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    // Basic client-side validation before hitting the API.
    if (!form.title.trim())       return setFormError('Title is required.');
    if (!form.author.trim())      return setFormError('Author is required.');
    if (!form.publisher.trim())   return setFormError('Publisher is required.');
    if (!form.isbn.trim())        return setFormError('ISBN is required.');
    if (!form.category.trim())    return setFormError('Category is required.');
    // Page count: must be a whole positive number — reject decimals like "1.5".
    const pageCountRaw = form.pageCount.trim();
    const pageCount = parseInt(pageCountRaw, 10);
    if (isNaN(pageCount) || pageCount <= 0 || String(pageCount) !== pageCountRaw)
      return setFormError('Page count must be a positive whole number (e.g. 320).');

    // Price: must be a non-negative number — reject scientific notation like "1e5".
    const priceRaw = form.price.trim();
    const price = parseFloat(priceRaw);
    if (isNaN(price) || price < 0 || !/^\d+(\.\d{1,2})?$/.test(priceRaw))
      return setFormError('Price must be a valid dollar amount (e.g. 12.99).');

    setSaving(true);
    setFormError(null);

    // Build the book payload. For a new book bookID is 0 (the backend ignores it).
    const payload: Book = {
      bookID:         editingBook?.bookID ?? 0,
      title:          form.title.trim(),
      author:         form.author.trim(),
      publisher:      form.publisher.trim(),
      isbn:           form.isbn.trim(),
      classification: form.classification,
      category:       form.category,
      pageCount,
      price,
    };

    // Choose POST for new books, PUT for edits.
  const url    = editingBook ? `${API_BASE}/${editingBook.bookID}` : `${API_BASE}`;
    const method = editingBook ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Server error: ${res.status}`);
      }

      // Success — close the modal and reload the table.
      closeModal();
      fetchBooks();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setSaving(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  /** Called when the user clicks the red Delete button on a table row. */
  function handleDeleteClick(book: Book) {
    setDeletingBook(book);
    setDeleteError(null);
  }

  /** Confirmed delete — calls DELETE /api/books/{id} and refreshes the table. */
  async function handleDeleteConfirm() {
    if (!deletingBook) return;

    try {
  const res = await fetch(`${API_BASE}/${deletingBook.bookID}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      // If we just deleted the only book on the last page, go back one page.
      if (books.length === 1 && currentPage > 1) {
        setCurrentPage((p) => p - 1);
      } else {
        fetchBooks();
      }

      setDeletingBook(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed.');
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="container-xl py-4">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="d-flex align-items-center mb-4 flex-wrap gap-2">
        <h1 className="h3 mb-0">⚙️ Manage Books</h1>
        <span className="badge bg-secondary fs-6 ms-2">
          {totalBooks} book{totalBooks !== 1 ? 's' : ''} total
        </span>
        {/* "Add New Book" opens the modal in add mode */}
        <button className="btn btn-primary ms-auto" onClick={openAddModal}>
          + Add New Book
        </button>
      </div>

      {/* ── Loading spinner ──────────────────────────────────────────────────── */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
          <p className="mt-2 text-muted">Loading books…</p>
        </div>
      )}

      {/* ── Error alert ─────────────────────────────────────────────────────── */}
      {listError && (
        <div className="alert alert-danger">
          <strong>Error loading books:</strong> {listError}
        </div>
      )}

      {/* ── Books table ─────────────────────────────────────────────────────── */}
      {!loading && !listError && (
        <>
          <div className="table-responsive shadow-sm rounded mb-3">
            <table className="table table-striped table-hover table-bordered align-middle mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Category</th>
                  <th className="text-end">Price</th>
                  <th className="text-center" style={{ width: '140px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {books.map((book) => (
                  <tr key={book.bookID}>
                    <td className="fw-semibold">{book.title}</td>
                    <td>{book.author}</td>
                    <td>
                      <span className="badge bg-info text-dark">{book.category}</span>
                    </td>
                    <td className="text-end">${book.price.toFixed(2)}</td>
                    <td className="text-center">
                      {/* Edit button — opens modal pre-filled with this book */}
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => openEditModal(book)}
                      >
                        ✏️ Edit
                      </button>
                      {/* Delete button — triggers the confirmation dialog */}
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteClick(book)}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ────────────────────────────────────────────────── */}
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <p className="text-muted mb-0 small">
              {totalBooks === 0
                ? 'No books found.'
                : <>
                    Page {currentPage} of {totalPages} &mdash; showing{' '}
                    {(currentPage - 1) * pageSize + 1}–
                    {Math.min(currentPage * pageSize, totalBooks)} of {totalBooks}
                  </>
              }
            </p>
            <nav aria-label="Admin book pagination">
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage((p) => p - 1)}
                    disabled={currentPage === 1}
                  >
                    &laquo; Prev
                  </button>
                </li>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <li
                    key={page}
                    className={`page-item ${page === currentPage ? 'active' : ''}`}
                  >
                    <button
                      className="page-link"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => setCurrentPage((p) => p + 1)}
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

      {/* ══════════════════════════════════════════════════════════════════════
          ADD / EDIT MODAL
          Controlled entirely by React state (showModal) rather than Bootstrap's
          JS API, so it integrates cleanly with React's rendering cycle.
          Bootstrap classes handle the visual appearance.
      ══════════════════════════════════════════════════════════════════════ */}

      {/* Semi-transparent backdrop behind the modal */}
      {showModal && (
        <div
          className="modal-backdrop fade show"
          onClick={closeModal}  // clicking outside the modal closes it
        />
      )}

      <div
        className={`modal fade ${showModal ? 'show d-block' : ''}`}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bookModalTitle"
        style={{ zIndex: 1055 }}
      >
        <div className="modal-dialog modal-lg modal-dialog-centered">
          <div className="modal-content">

            {/* Modal header */}
            <div className="modal-header bg-dark text-white">
              <h5 className="modal-title" id="bookModalTitle">
                {editingBook ? '✏️ Edit Book' : '+ Add New Book'}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Close"
                onClick={closeModal}
              />
            </div>

            {/* Modal body — the form */}
            <form onSubmit={handleSave}>
              <div className="modal-body">

                {/* Validation / API error banner inside the modal */}
                {formError && (
                  <div className="alert alert-danger py-2">{formError}</div>
                )}

                {/* Two-column layout using Bootstrap Grid for a cleaner form */}
                <div className="row g-3">

                  {/* Title — full width */}
                  <div className="col-12">
                    <label htmlFor="fieldTitle" className="form-label fw-semibold">
                      Title <span className="text-danger">*</span>
                    </label>
                    <input
                      id="fieldTitle"
                      name="title"
                      type="text"
                      className="form-control"
                      value={form.title}
                      onChange={handleFormChange}
                      placeholder="e.g. The Great Gatsby"
                      required
                    />
                  </div>

                  {/* Author */}
                  <div className="col-md-6">
                    <label htmlFor="fieldAuthor" className="form-label fw-semibold">
                      Author <span className="text-danger">*</span>
                    </label>
                    <input
                      id="fieldAuthor"
                      name="author"
                      type="text"
                      className="form-control"
                      value={form.author}
                      onChange={handleFormChange}
                      placeholder="e.g. F. Scott Fitzgerald"
                      required
                    />
                  </div>

                  {/* Publisher */}
                  <div className="col-md-6">
                    <label htmlFor="fieldPublisher" className="form-label fw-semibold">
                      Publisher <span className="text-danger">*</span>
                    </label>
                    <input
                      id="fieldPublisher"
                      name="publisher"
                      type="text"
                      className="form-control"
                      value={form.publisher}
                      onChange={handleFormChange}
                      placeholder="e.g. Scribner"
                      required
                    />
                  </div>

                  {/* ISBN */}
                  <div className="col-md-6">
                    <label htmlFor="fieldIsbn" className="form-label fw-semibold">
                      ISBN <span className="text-danger">*</span>
                    </label>
                    <input
                      id="fieldIsbn"
                      name="isbn"
                      type="text"
                      className="form-control font-monospace"
                      value={form.isbn}
                      onChange={handleFormChange}
                      placeholder="e.g. 978-0743273565"
                      required
                    />
                  </div>

                  {/* Classification dropdown */}
                  <div className="col-md-6">
                    <label htmlFor="fieldClassification" className="form-label fw-semibold">
                      Classification <span className="text-danger">*</span>
                    </label>
                    <select
                      id="fieldClassification"
                      name="classification"
                      className="form-select"
                      value={form.classification}
                      onChange={handleFormChange}
                    >
                      <option value="Fiction">Fiction</option>
                      <option value="Non-Fiction">Non-Fiction</option>
                    </select>
                  </div>

                  {/* Category dropdown — populated from the API */}
                  <div className="col-md-6">
                    <label htmlFor="fieldCategory" className="form-label fw-semibold">
                      Category <span className="text-danger">*</span>
                    </label>
                    <select
                      id="fieldCategory"
                      name="category"
                      className="form-select"
                      value={form.category}
                      onChange={handleFormChange}
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Page count */}
                  <div className="col-md-3">
                    <label htmlFor="fieldPageCount" className="form-label fw-semibold">
                      Pages <span className="text-danger">*</span>
                    </label>
                    <input
                      id="fieldPageCount"
                      name="pageCount"
                      type="number"
                      className="form-control"
                      value={form.pageCount}
                      onChange={handleFormChange}
                      min={1}
                      placeholder="e.g. 320"
                      required
                    />
                  </div>

                  {/* Price */}
                  <div className="col-md-3">
                    <label htmlFor="fieldPrice" className="form-label fw-semibold">
                      Price ($) <span className="text-danger">*</span>
                    </label>
                    <input
                      id="fieldPrice"
                      name="price"
                      type="number"
                      className="form-control"
                      value={form.price}
                      onChange={handleFormChange}
                      min={0}
                      step={0.01}
                      placeholder="e.g. 12.99"
                      required
                    />
                  </div>

                </div>{/* end row */}
              </div>{/* end modal-body */}

              {/* Modal footer */}
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                {/* Disabled while the API call is in flight */}
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving…' : editingBook ? 'Save Changes' : 'Add Book'}
                </button>
              </div>

            </form>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DELETE CONFIRMATION MODAL
          A small modal that asks "Are you sure?" before calling the API.
          Using a second modal keeps the delete flow separate and clear.
      ══════════════════════════════════════════════════════════════════════ */}

      {deletingBook && (
        <div
          className="modal-backdrop fade show"
          style={{ zIndex: 1060 }}
        />
      )}

      <div
        className={`modal fade ${deletingBook ? 'show d-block' : ''}`}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        style={{ zIndex: 1065 }}
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header bg-danger text-white">
              <h5 className="modal-title">🗑️ Confirm Delete</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Close"
                onClick={() => setDeletingBook(null)}
              />
            </div>
            <div className="modal-body">
              {deleteError && (
                <div className="alert alert-danger py-2">{deleteError}</div>
              )}
              <p>
                Are you sure you want to permanently delete{' '}
                <strong>"{deletingBook?.title}"</strong>?
              </p>
              <p className="text-muted small mb-0">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setDeletingBook(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={handleDeleteConfirm}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
