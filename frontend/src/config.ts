// Central API base for frontend. Uses Vite env at build time with a fallback
// to '/api' so local dev (Vite proxy) continues to work.
export const API_BASE: string = (import.meta.env.VITE_API_BASE as string) ?? '/api';
