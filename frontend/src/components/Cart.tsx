/**
 * Cart.tsx — full-page shopping cart.
 *
 * Responsibilities:
 *  1. List line items with quantity, unit price, and line subtotal (qty × price).
 *  2. Quantity steppers, remove row, clear cart, and order-summary total.
 *  3. "Continue Shopping" sends restore state to `/` so BookList reopens on the
 *     same page, category, sort, and page size.
 *
 * `location.state` is set by BookList ("View Cart") or the navbar Cart button
 * (both pass the same `return*` keys, sourced from catalogBrowseState in context).
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';

/**
 * Shape of the state passed from BookList when navigating to /cart.
 * Allows "Continue Shopping" to return the user to exactly where they left off.
 */
interface CartLocationState {
  returnPage?: number;
  returnCategory?: string;
  returnPageSize?: number;
  returnSortBy?: string;
}

export default function Cart(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  // Optional router state — undefined if user bookmarked /cart (defaults in handler).
  const returnState = (location.state as CartLocationState) ?? {};

  // Cart context — everything we need to read and mutate the cart.
  const {
    items,
    totalItems,
    totalPrice,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  // ── "Continue Shopping" handler ───────────────────────────────────────────
  // Navigate back to / with the same state so BookList can restore the user's
  // previous page position, category filter, sort order, and page size.
  function handleContinueShopping() {
    navigate('/', {
      state: {
        restorePage: returnState.returnPage ?? 1,
        restoreCategory: returnState.returnCategory ?? '',
        restorePageSize: returnState.returnPageSize ?? 5,
        restoreSortBy: returnState.returnSortBy ?? 'title',
      },
    });
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="container py-4">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="d-flex align-items-center mb-4 flex-wrap gap-2">
        <h1 className="h3 mb-0">
          🛒 Shopping Cart
        </h1>
        {totalItems > 0 && (
          <span className="badge bg-success fs-6 ms-2">
            {totalItems} item{totalItems !== 1 ? 's' : ''}
          </span>
        )}
        <button
          className="btn btn-outline-primary btn-sm ms-auto"
          onClick={handleContinueShopping}
        >
          ← Continue Shopping
        </button>
      </div>

      {/* ── Empty cart state ─────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="text-center py-5">
          <p className="display-6 text-muted mb-3">🛒</p>
          <p className="lead text-muted">Your cart is empty.</p>
          <button
            className="btn btn-primary"
            onClick={handleContinueShopping}
          >
            ← Browse Books
          </button>
        </div>
      ) : (
        // Two-column layout (lg+): line items vs. sticky summary card
        <div className="row g-4">

          {/* ── Cart line items ─────────────────────────────────────────── */}
          <div className="col-lg-8">
            <div className="card shadow-sm">
              <div className="card-header bg-dark text-white fw-bold">
                Cart Items
              </div>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Book</th>
                      <th className="text-center" style={{ width: '130px' }}>Qty</th>
                      <th className="text-end">Unit Price</th>
                      <th className="text-end">Subtotal</th>
                      <th className="text-center">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.book.bookID}>
                        {/* Book info */}
                        <td>
                          <div className="fw-semibold">{item.book.title}</div>
                          <div className="text-muted small">{item.book.author}</div>
                          <div className="mt-1">
                            <span className={`badge bg-info text-dark small`}>
                              {item.book.category}
                            </span>
                          </div>
                        </td>

                        {/* Quantity stepper */}
                        <td className="text-center">
                          <div className="input-group input-group-sm justify-content-center" style={{ width: '110px', margin: '0 auto' }}>
                            <button
                              className="btn btn-outline-secondary"
                              type="button"
                              onClick={() =>
                                updateQuantity(item.book.bookID, item.quantity - 1)
                              }
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              className="form-control text-center"
                              value={item.quantity}
                              min={1}
                              onChange={(e) =>
                                updateQuantity(
                                  item.book.bookID,
                                  Math.max(1, Number(e.target.value))
                                )
                              }
                              aria-label="Quantity"
                            />
                            <button
                              className="btn btn-outline-secondary"
                              type="button"
                              onClick={() =>
                                updateQuantity(item.book.bookID, item.quantity + 1)
                              }
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        {/* Unit price */}
                        <td className="text-end">
                          ${item.book.price.toFixed(2)}
                        </td>

                        {/* Subtotal = qty × price */}
                        <td className="text-end fw-semibold text-success">
                          ${(item.book.price * item.quantity).toFixed(2)}
                        </td>

                        {/* Remove button */}
                        <td className="text-center">
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeFromCart(item.book.bookID)}
                            title="Remove from cart"
                            aria-label={`Remove ${item.book.title}`}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Clear cart link */}
              <div className="card-footer text-end">
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={clearCart}
                >
                  🗑️ Clear Cart
                </button>
              </div>
            </div>
          </div>

          {/* ── Order summary sidebar ───────────────────────────────────── */}
          <div className="col-lg-4">
            <div className="card shadow-sm sticky-top" style={{ top: '1rem' }}>
              <div className="card-header bg-success text-white fw-bold">
                Order Summary
              </div>
              <div className="card-body">

                {/* Per-item summary lines */}
                <ul className="list-group list-group-flush mb-3">
                  {items.map((item) => (
                    <li
                      key={item.book.bookID}
                      className="list-group-item d-flex justify-content-between px-0 py-2"
                    >
                      <span className="small text-truncate me-2" style={{ maxWidth: '200px' }} title={item.book.title}>
                        {item.book.title}{' '}
                        <span className="text-muted">×{item.quantity}</span>
                      </span>
                      <span className="small fw-semibold flex-shrink-0">
                        ${(item.book.price * item.quantity).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* Divider + grand total */}
                <div className="d-flex justify-content-between align-items-center border-top pt-3">
                  <span className="h5 mb-0">Total:</span>
                  <span className="h5 mb-0 text-success fw-bold">
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>

                {/* Item count */}
                <p className="text-muted small mt-1 mb-3">
                  {totalItems} item{totalItems !== 1 ? 's' : ''} in cart
                </p>

                {/* Checkout placeholder button */}
                <button className="btn btn-success w-100 mb-2" disabled>
                  Proceed to Checkout
                </button>
                <button
                  className="btn btn-outline-primary w-100"
                  onClick={handleContinueShopping}
                >
                  ← Continue Shopping
                </button>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
