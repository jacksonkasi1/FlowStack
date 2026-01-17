/**
 * Application URL configuration
 *
 * Centralized URLs for frontend and backend
 */
export const APP_URLS = {
    /**
     * Frontend base URL - used for OAuth callbacks
     * Falls back to current origin in development
     */
    frontend:
        import.meta.env.VITE_FRONTEND_URL ||
        (typeof window !== 'undefined' ? window.location.origin : ''),

    /**
     * Backend API base URL
     */
    api: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
} as const
