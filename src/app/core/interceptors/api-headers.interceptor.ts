import { HttpInterceptorFn } from '@angular/common/http';

const NGROK_HOST = /^https?:\/\/[^/]+\.ngrok(-free)?\.(app|dev|io)(:\d+)?\//i;

/**
 * ngrok's free tier answers browser requests with an HTML warning page (ERR_NGROK_6024) unless this
 * header is present. Added to every request for an ngrok host, whichever environment points there.
 */
export const apiHeadersInterceptor: HttpInterceptorFn = (req, next) => {
  if (!NGROK_HOST.test(req.url)) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { 'ngrok-skip-browser-warning': 'true' } }));
};
