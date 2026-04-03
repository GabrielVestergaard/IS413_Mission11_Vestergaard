/**
 * Root of the HTTP API (everything before `/books/...`).
 * - Development: `/api` — Vite proxy sends it to the local ASP.NET app.
 * - Production: set `VITE_API_BASE` in `.env.production` (e.g. `https://host/api`).
 */
const raw = (import.meta.env.VITE_API_BASE as string | undefined)?.trim() ?? '/api';
export const API_BASE: string = raw.replace(/\/+$/, '') || '/api';
