/**
 * App.tsx — root component of the React application.
 *
 * Sets up:
 *  - CartProvider  : wraps the whole app so any component can read/write
 *                    the shopping cart without prop-drilling.
 *  - React Router  : <Routes> maps URL paths to page components.
 *      /      → BookList (the catalog page)
 *      /cart  → Cart (the shopping cart page)
 *  - Navbar        : always visible at the top; shows a live cart badge.
 */

import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { CartProvider, useCart } from './context/CartContext';
import BookList from './components/BookList';
import Cart from './components/Cart';
import AdminBooks from './components/AdminBooks';

// ── Inner layout component ───────────────────────────────────────────────────
// Separated from App so it can call useCart() (which requires being inside
// CartProvider) and useNavigate() (which requires being inside Router).
function Layout(): JSX.Element {
  const { totalItems, catalogBrowseState } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-vh-100 bg-light">

      {/* Top bar: brand + cart. Cart passes the same router `state` shape as
          BookList's "View Cart" so Continue Shopping works from here too. */}
      <nav className="navbar navbar-dark bg-dark mb-2 shadow">
        <div className="container-xl">

          {/* Brand / home link */}
          <Link className="navbar-brand fw-bold" to="/">
            📖 Online Bookstore
          </Link>

          <div className="d-flex align-items-center gap-2">
            {/* Admin link */}
            <Link className="btn btn-outline-light btn-sm" to="/adminbooks">
              ⚙️ Admin
            </Link>

            {/* Cart: badge shows total line-item count; click forwards browse snapshot */}
            <button
              className="btn btn-outline-light btn-sm position-relative"
              onClick={() =>
                navigate('/cart', {
                  state: {
                    returnPage: catalogBrowseState.page,
                    returnCategory: catalogBrowseState.category,
                    returnPageSize: catalogBrowseState.pageSize,
                    returnSortBy: catalogBrowseState.sortBy,
                  },
                })
              }
              aria-label="View shopping cart"
            >
              🛒 Cart
              {totalItems > 0 && (
                <span
                  className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                  style={{ fontSize: '0.65rem' }}
                >
                  {totalItems}
                  <span className="visually-hidden">items in cart</span>
                </span>
              )}
            </button>
          </div>

        </div>
      </nav>

      {/* ── Page content — swapped by the router ─────────────────────────── */}
      <Routes>
        <Route path="/" element={<BookList />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/adminbooks" element={<AdminBooks />} />
      </Routes>

    </div>
  );
}

// ── Root App component ───────────────────────────────────────────────────────
// BrowserRouter is mounted one level up in index.tsx, so we only need
// CartProvider here.
export default function App(): JSX.Element {
  return (
    <CartProvider>
      <Layout />
    </CartProvider>
  );
}
