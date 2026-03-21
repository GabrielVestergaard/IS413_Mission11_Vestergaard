/**
 * App.tsx — the root component of the React application.
 *
 * This is the top-level component that React renders into the <div id="root">
 * element defined in index.html. It provides the overall page layout
 * (navbar + content area) and mounts the BookList component.
 */
import BookList from './components/BookList';

export default function App(): JSX.Element {
  return (
    // min-vh-100 makes the page at least as tall as the viewport.
    // bg-light gives the content area a light grey Bootstrap background.
    <div className="min-vh-100 bg-light">

      {/* Bootstrap dark navbar — sits at the top of every page */}
      <nav className="navbar navbar-dark bg-dark mb-2">
        <div className="container">
          <span className="navbar-brand fw-bold">📖 Online Bookstore</span>
        </div>
      </nav>

      {/*
        BookList handles all book-fetching, display, pagination, and sorting.
        Placing it here makes it the sole content of the page, as required.
      */}
      <BookList />

    </div>
  );
}
