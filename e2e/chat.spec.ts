import { expect, test } from '@playwright/test';
import { MockApi, MockSocket, USER_ID, envelope, signIn } from './support/mock-api';

const sara = { id: 45, name: 'Sara Ali', is_active: true };
const myself = { id: USER_ID, name: 'Test Admin', is_active: true };

function message(id: number, sender: typeof sara | null, body: string, clientId: string | null = null) {
  return {
    id,
    conversation: 12,
    sender,
    body,
    data: {},
    reply_to: null,
    attachments: [],
    mentions: [],
    mentions_all: false,
    edited_at: null,
    is_deleted: false,
    created_at: new Date().toISOString(),
    client_id: clientId,
  };
}

const conversation = {
  id: 12,
  kind: 'group',
  name_en: 'Warehouse leads',
  name_ar: 'قادة المستودع',
  title: 'Warehouse leads',
  description: '',
  avatar: null,
  team: null,
  posting_policy: 'everyone',
  last_message_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  other_user: null,
  unread_count: 0,
  members_count: 2,
  last_message: message(1, sara, 'Count at 3 pm'),
  my_role: 'member',
  muted_until: null,
  mute_mentions: false,
  is_muted: false,
  can_post: true,
};

test.describe('chat drawer', () => {
  let api: MockApi;
  let socket: MockSocket;

  test.beforeEach(async ({ page }) => {
    api = new MockApi(page);
    await api.install();
    socket = new MockSocket(page);
    await socket.install();
    await signIn(page, api);
    api
      .on('GET', 'chat/v1/unread/', envelope({ conversations: 0, messages: 0 }))
      .on('GET', 'chat/v1/conversations/', envelope([conversation], 1))
      .on('GET', 'chat/v1/conversations/12/messages/', envelope([message(1, sara, 'Count at 3 pm')]))
      .on('GET', 'chat/v1/conversations/12/members/', envelope([
        { user: sara, role: 'member', is_synced: false, created_at: new Date().toISOString() },
        { user: myself, role: 'member', is_synced: false, created_at: new Date().toISOString() },
      ]));
  });

  test('sends a message that shows once, and shows one pushed by someone else', async ({ page }) => {
    api.on('POST', 'chat/v1/conversations/12/messages/', (route) => {
      const body = route.request().postDataJSON() as { body: string; client_id: string };
      const stored = message(2, myself, body.body, body.client_id);
      // The socket echo of my own message usually races the POST answer; both must end up as one bubble.
      socket.push({ type: 'chat.message', conversation_id: 12, message: stored });
      return route.fulfill({ status: 201, json: envelope(stored) });
    });

    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Open chat' }).click();
    await page.getByText('Warehouse leads').click();
    await expect(page.getByText('Count at 3 pm')).toBeVisible();

    const box = page.getByRole('textbox', { name: 'Write a message' });
    await box.fill('On my way');
    await box.press('Enter');
    await expect(page.getByText('On my way')).toHaveCount(1);

    socket.push({ type: 'chat.message', conversation_id: 12, message: message(3, sara, 'See you there') });
    await expect(page.getByText('See you there')).toBeVisible();
  });
});
