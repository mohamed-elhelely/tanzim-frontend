import { Page, Route, WebSocketRoute } from '@playwright/test';

/** The backend's envelope: `{ success, data, metadata }`. */
export function envelope(data: unknown, totalCount?: number) {
  return {
    success: true,
    data,
    metadata: { timestamp: '2026-10-16T00:00:00Z', version: '1.0', ...(totalCount === undefined ? {} : { total_count: totalCount }) },
  };
}

export function errorEnvelope(code: number, message: string, errors: Record<string, string[]> = {}) {
  return { success: false, data: null, metadata: { timestamp: '2026-10-16T00:00:00Z', version: '1.0' }, error: { code, message, errors } };
}

/** An unsigned JWT: the app only decodes tokens, the (mocked) backend is what would verify them. */
function token(payload: Record<string, unknown>): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
}

export const USER_ID = 7;
const FAR_FUTURE = 4_102_444_800; // 2100-01-01

export const accessToken = token({ user_id: USER_ID, company_id: 1, company_role: 'Admin', is_company_admin: true, exp: FAR_FUTURE });
export const refreshToken = token({ user_id: USER_ID, exp: FAR_FUTURE });

/** GET company/v1/me/: a company admin with every module, so every menu and screen is open. */
export const me = {
  user: { id: USER_ID, email: 'admin@test.local', first_name: 'Test', last_name: 'Admin', profile_picture: null },
  is_staff: false,
  company: { id: 1, name: 'Test Company', logo: null, primary_color: '#4f46e5', secondary_color: '#1e1b4b' },
  role: { id: 1, name_en: 'Admin', name_ar: 'مدير', is_admin: true },
  is_company_admin: true,
  is_department_manager: false,
  is_team_lead: false,
  has_full_access: true,
  permissions: ['access_chat', 'view_chat'],
  modules: ['inventory', 'location', 'accounting'],
};

type Handler = (route: Route) => unknown | Promise<unknown>;

/**
 * Answers every /api/ request. Register specific handlers with `on(method, path, handler)` (path relative to /api/,
 * matched without the query string); anything else gets an empty success (`[]` for GET, `{}` otherwise), so screens
 * that load side data don't fail the test.
 */
export class MockApi {
  readonly requests: { method: string; path: string; url: URL; body: unknown }[] = [];
  private readonly handlers: { method: string; path: string; handler: Handler }[] = [];

  constructor(private readonly page: Page) {}

  on(method: string, path: string, handler: Handler | object): this {
    const fn: Handler = typeof handler === 'function' ? (handler as Handler) : (route) => route.fulfill({ json: handler });
    this.handlers.unshift({ method, path, handler: fn });
    return this;
  }

  async install(): Promise<void> {
    await this.page.route('**/api/**', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname.replace(/^.*?\/api\//, '');
      const body = request.postDataJSON?.() ?? null;
      this.requests.push({ method: request.method(), path, url, body });
      const match = this.handlers.find((h) => h.method === request.method() && h.path === path);
      if (match) {
        await match.handler(route);
        return;
      }
      await route.fulfill({ json: envelope(request.method() === 'GET' ? [] : {}, 0) });
    });
  }

  last(method: string, path: string) {
    return [...this.requests].reverse().find((r) => r.method === method && r.path === path);
  }
}

/** The notifications socket; `push()` sends a server frame to the page. */
export class MockSocket {
  private socket: WebSocketRoute | null = null;
  readonly sent: unknown[] = [];

  constructor(private readonly page: Page) {}

  async install(): Promise<void> {
    await this.page.routeWebSocket(/\/ws\/notifications\//, (ws) => {
      this.socket = ws;
      ws.onMessage((message) => {
        const frame = JSON.parse(String(message));
        this.sent.push(frame);
        if (frame.action === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      });
      ws.send(JSON.stringify({ type: 'connection_established', unread_notification: 0 }));
    });
  }

  push(frame: object): void {
    if (!this.socket) {
      throw new Error('The page has not opened the notifications socket yet');
    }
    this.socket.send(JSON.stringify(frame));
  }
}

/** Signs in without the login form: tokens and user in localStorage, /me answered. */
export async function signIn(page: Page, api: MockApi, lang: 'en' | 'ar' = 'en'): Promise<void> {
  api.on('GET', 'company/v1/me/', envelope(me));
  await page.addInitScript(
    ({ access, refresh, lang }) => {
      localStorage.setItem('tanzim.accessToken', access);
      localStorage.setItem('tanzim.refreshToken', refresh);
      localStorage.setItem('tanzim.user', JSON.stringify({ id: '7', name: 'Test Admin', role: 'COMPANY' }));
      localStorage.setItem('tanzim.lang', lang);
    },
    { access: accessToken, refresh: refreshToken, lang },
  );
}
