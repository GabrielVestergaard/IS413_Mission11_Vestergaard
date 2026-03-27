/**
 * Application entry: mounts the React tree into #root, enables Strict Mode,
 * and wraps the app in BrowserRouter so routing hooks work everywhere.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// Bootstrap CSS — gives us all utility classes, components, and grid.
import 'bootstrap/dist/css/bootstrap.min.css';

// Bootstrap JS bundle — includes Popper.js; required for Toast, Dropdown,
// Tooltip, and other interactive Bootstrap components.
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/*
      BrowserRouter wraps the entire app so every component can use
      React Router hooks (useNavigate, useLocation, Link, etc.).
      It lives here (not in App.tsx) so App stays clean of router setup.
    */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
