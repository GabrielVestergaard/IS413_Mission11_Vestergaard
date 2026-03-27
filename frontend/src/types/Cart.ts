/**
 * Shopping-cart types shared by CartContext and the Cart / BookList UI.
 * Cart line items reference Book; totals are derived in the provider.
 */
import { Book } from './Book';

/**
 * Represents a single line item in the shopping cart.
 * Wraps a Book with an additional quantity field.
 */
export interface CartItem {
  book: Book;      // The book being purchased
  quantity: number; // How many copies the user wants to buy
}

/**
 * Last-known catalog view (page, filters) so the navbar can open /cart with
 * the same "return" info as the View Cart button on BookList.
 */
/** Mirrors BookList controls so /cart can restore the same catalog view. */
export interface CatalogBrowseState {
  page: number;
  category: string;
  pageSize: number;
  sortBy: string;
}

/**
 * The full state shape managed by CartContext.
 */
export interface CartState {
  items: CartItem[];         // All line items currently in the cart
  totalItems: number;        // Sum of all quantities (for the navbar badge)
  totalPrice: number;        // Grand total price across all items
  catalogBrowseState: CatalogBrowseState;
}

/**
 * The value object exposed by CartContext to consumers.
 * Combines state with the functions that mutate it.
 */
export interface CartContextValue extends CartState {
  setCatalogBrowseState: (state: CatalogBrowseState) => void;
  addToCart: (book: Book) => void;         // Add one copy of a book (or increment)
  removeFromCart: (bookID: number) => void; // Remove a line item entirely
  updateQuantity: (bookID: number, qty: number) => void; // Set exact quantity
  clearCart: () => void;                   // Empty the cart completely
}
