/**
 * CartContext.tsx — provides session-persistent shopping cart state
 * to the entire React application via the Context API.
 *
 * Any component that needs to read or modify cart state can call
 * useCart() instead of prop-drilling through the component tree.
 *
 * The cart lives in React state (in memory) so it persists for the
 * duration of the browser session — navigating between pages does NOT
 * reset it because the CartProvider wraps the entire app in App.tsx.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { Book } from '../types/Book';
import {
  CartItem,
  CartContextValue,
  CatalogBrowseState,
} from '../types/Cart';

/** Used before BookList mounts or when opening /cart without visiting the catalog. */
const DEFAULT_CATALOG_BROWSE: CatalogBrowseState = {
  page: 1,
  category: '',
  pageSize: 5,
  sortBy: 'title',
};

// ── Context creation ────────────────────────────────────────────────────────
// We start with `undefined` so useCart() can detect when it's used outside
// of a <CartProvider>. The generic type annotation prevents TypeScript errors
// when consuming the context.
const CartContext = createContext<CartContextValue | undefined>(undefined);

// ── Provider component ──────────────────────────────────────────────────────

/**
 * CartProvider wraps the whole app (mounted in App.tsx) so every component
 * can access cart state without prop drilling.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  // The core state: an array of { book, quantity } objects.
  const [items, setItems] = useState<CartItem[]>([]);

  // Updated by BookList whenever page / filters change — used when opening
  // /cart from the navbar so "Continue Shopping" can restore the same view.
  const [catalogBrowseState, setCatalogBrowseState] =
    useState<CatalogBrowseState>(DEFAULT_CATALOG_BROWSE);

  // ── Derived values ──────────────────────────────────────────────────────
  // useMemo so these only recompute when `items` changes, not on every render.

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.book.price * item.quantity, 0),
    [items]
  );

  // ── Cart mutation functions ─────────────────────────────────────────────
  // useCallback prevents creating new function references on every render,
  // which matters for components that memo-ize based on prop equality.

  /**
   * Adds one copy of the given book to the cart.
   * If the book is already in the cart, its quantity is incremented by 1.
   */
  const addToCart = useCallback((book: Book) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.book.bookID === book.bookID);
      if (existing) {
        // Increment quantity of existing item
        return prev.map((item) =>
          item.book.bookID === book.bookID
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      // Add brand-new line item with quantity 1
      return [...prev, { book, quantity: 1 }];
    });
  }, []);

  /**
   * Removes the line item for the given bookID entirely from the cart.
   */
  const removeFromCart = useCallback((bookID: number) => {
    setItems((prev) => prev.filter((item) => item.book.bookID !== bookID));
  }, []);

  /**
   * Sets the quantity for a specific book to an exact number.
   * If qty <= 0 the item is removed (prevents 0-quantity ghost rows).
   */
  const updateQuantity = useCallback((bookID: number, qty: number) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((item) => item.book.bookID !== bookID));
    } else {
      setItems((prev) =>
        prev.map((item) =>
          item.book.bookID === bookID ? { ...item, quantity: qty } : item
        )
      );
    }
  }, []);

  /**
   * Empties the entire cart.
   */
  const clearCart = useCallback(() => setItems([]), []);

  // ── Context value object ────────────────────────────────────────────────
  // Spread all state + all mutation functions into one object for convenience.
  const value: CartContextValue = {
    items,
    totalItems,
    totalPrice,
    catalogBrowseState,
    setCatalogBrowseState,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// ── Custom hook ─────────────────────────────────────────────────────────────

/**
 * useCart() — the easy way for any component to access the cart.
 *
 * Usage:
 *   const { items, addToCart, totalItems } = useCart();
 *
 * Throws if called outside of a <CartProvider> to prevent silent bugs.
 */
export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a <CartProvider>');
  }
  return context;
}
