export const environment = {
  production: false,
  apiBaseUrl: '/api/',
  wsBaseUrl: 'ws://localhost:8000/ws/',
  /** Extra headers sent with every API request. */
  apiHeaders: {} as Record<string, string>,
};
