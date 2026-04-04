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

// API_BASE = ".../api"  — all book endpoints live under ".../api/books"
const BOOKS_API = `${API_BASE}/books`;

// ── Types ─────────────────────────────────────────────────────────────────────

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

  const [books, setBooks] = useState<Book[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalBooks, setTotalBooks] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [listError, setListError] = useState<string | null>(null);

  const [categories, setCategories] = useState<string[]>([]);

  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [form, setForm] = useState<BookForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const [deletingBook, setDeletingBook] = useState<Book | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BOOKS_API}/categories`)
      .then((res) => res.json() as Promise<string[]>)
      .then((cats) => {
        setCategories(cats);
        setForm((prev) => ({ ...prev, category: cats[0] ?? '' }));
      })
      .catch(() => {});
  }, []);

  const fetchBooks = useCallback(() => {
    setLoading(true);
    setListError(null);
    fetch(`${BOOKS_API}?page=${currentPage}&pageSize=${pageSize}&sortBy=title`)
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
  }, [currentPage, pageSize]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  function openAddModal() {
    setEditingBook(null);
    setForm({ ...EMPTY_FORM, category: categories[0] ?? '' });
    setFormError(null);
    setShowModal(true);
  }

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

  function closeModal() {
    setShowModal(false);
    setEditingBook(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setSaving(false);
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!form.title.trim())       return setFormError('Title is required.');
    if (!form.author.trim())      return setFormError('Author is required.');
    if (!form.publisher.trim())   return setFormError('Publisher is required.');
    if (!form.isbn.trim())        return setFormError('ISBN is required.');
    if (!form.category.trim())    return setFormError('Category is required.');

    const pageCountRaw = form.pageCount.trim();
    const pageCount = parseInt(pageCountRaw, 10);
    if (isNaN(pageCount) || pageCount <= 0 || String(pageCount) !== pageCountRaw)
      return setFormError('Page count must be a positive whole number (e.g. 320).');

    const priceRaw = form.price.trim();
    const price = parseFloat(priceRaw);
    if (isNaN(price) || price < 0 || !/^\d+(\.\d{1,2})?$/.test(priceRaw))
      return setFormError('Price must be a valid dollar amount (e.g. 12.99).');

    setSaving(true);
    setFormError(null);

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

    const url    = editingBook ? `${BOOKS_API}/${editingBook.bookID}` : `${BOOKS_API}`;
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

      closeModal();
      fetchBooks();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setSaving(false);
    }
  }

  function handleDeleteClick(book: Book) {
    setDeletingBook(book);
    setDeleteError(null);
  }

  async function handleDeleteConfirm() {
    if (!deletingBook) return;

    try {
      const res = await fetch(`${BOOKS_API}/${deletingBook.bookID}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

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

  return (
    <div className="container-xl py-4">

      <div className="d-flex align-items-center mb-4 flex-wrap gap-2">
        <h1 className="h3 mb-0">⚙️ Manage Books</h1>
        <span className="badge bg-secondary fs-6 ms-2">
          {totalBooks} book{totalBooks !== 1 ? 's' : ''} total
        </span>
        <button className="btn btn-primary ms-auto" onClick={openAddModal}>
          + Add New Book
        </button>
      </div>

      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading…</span>
          </div>
          <p className="mt-2 text-muted">Loading books…</p>
        </div>
      )}

      {listError && (
        <div className="alert alert-danger">
          <strong>Error loading books:</strong> {listError}
        </div>
      )}

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
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        onClick={() => openEditModal(book)}
                      >
                        ✏️ Edit
                      </button>
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

      {/* ── ADD / EDIT MODAL ─────────────────────────────────────────────────── */}

      {showModal && (
        <div className="modal-backdrop fade show" onClick={closeModal} />
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

            <form onSubmit={handleSave}>
              <div className="modal-body">

                {formError && (
                  <div className="alert alert-danger py-2">{formError}</div>
                )}

                <div className="row g-3">

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

                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={closeModal}
                >
                  Cancel
                </button>
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

      {/* ── DELETE CONFIRMATION MODAL ────────────────────────────────────────── */}

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
