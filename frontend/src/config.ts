// Central API base URL — read from Vite env var when building for production.
// Defaults back to the deployed backend URL used during development if the
// environment variable is not set.
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://bookstore-gabriel-backend-fydzcvg0ebhrf3fa.francecentral-01.azurewebsites.net/api';
