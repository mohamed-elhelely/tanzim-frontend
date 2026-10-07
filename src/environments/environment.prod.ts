// GitHub Pages only serves static files, so the API lives on the backend's ngrok tunnel.
const BACKEND_URL = 'https://chunk-surcharge-manhood.ngrok-free.dev';

export const environment = {
  production: true,
  apiBaseUrl: `${BACKEND_URL}/api/`,
  wsBaseUrl: `${BACKEND_URL.replace(/^http/, 'ws')}/ws/`,
  /** Extra headers sent with every API request. */
  apiHeaders: {
    // Without it, ngrok's free tier answers browser requests with an HTML warning page instead of the API.
    'ngrok-skip-browser-warning': 'true',
  } as Record<string, string>,
};
