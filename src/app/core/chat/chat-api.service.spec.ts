import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { envelope, provideApiTesting } from '../../testing/api-testing';
import { chatMessage, conversation } from '../../testing/chat-fixtures';
import { ChatApiService, attachmentPath } from './chat-api.service';

describe('ChatApiService', () => {
  let api: ChatApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideApiTesting() });
    api = TestBed.inject(ChatApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists conversations and unwraps the envelope', () => {
    let result: unknown;
    api.conversations().subscribe((list) => (result = list));
    http.expectOne('/api/chat/v1/conversations/').flush(envelope([conversation(1)], 1));
    expect(result).toEqual([conversation(1)]);
  });

  it('loads history with only the cursor params given', () => {
    api.messages(12, { before: 884, limit: 50 }).subscribe();
    const req = http.expectOne((r) => r.url === '/api/chat/v1/conversations/12/messages/');
    expect(req.request.params.get('before')).toBe('884');
    expect(req.request.params.get('limit')).toBe('50');
    expect(req.request.params.has('after')).toBeFalse();
    req.flush(envelope([]));
  });

  it('sends text as JSON with the client id', () => {
    api.send(12, { body: 'hi', replyTo: 881, files: [], clientId: 'c1' }).subscribe();
    const req = http.expectOne('/api/chat/v1/conversations/12/messages/');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ body: 'hi', reply_to: 881, client_id: 'c1' });
    req.flush(envelope(chatMessage(1)));
  });

  it('sends files as multipart, repeating the files field', () => {
    const a = new File(['a'], 'a.pdf');
    const b = new File(['b'], 'b.png');
    api.send(12, { body: '', replyTo: null, files: [a, b], clientId: 'c1' }).subscribe();
    const req = http.expectOne('/api/chat/v1/conversations/12/messages/');
    const form = req.request.body as FormData;
    expect(form.getAll('files').length).toBe(2);
    expect(form.get('client_id')).toBe('c1');
    expect(form.has('reply_to')).toBeFalse();
    req.flush(envelope(chatMessage(1)));
  });

  it('starts a direct chat, edits, deletes, reads and counts unread', () => {
    api.direct(45).subscribe();
    expect(http.expectOne('/api/chat/v1/conversations/direct/').request.body).toEqual({ user_id: 45 });

    api.edit(884, 'new').subscribe();
    const edit = http.expectOne('/api/chat/v1/messages/884/');
    expect(edit.request.method).toBe('PATCH');
    edit.flush(envelope(chatMessage(884)));

    let removed = false;
    api.remove(884).subscribe(() => (removed = true));
    http.expectOne('/api/chat/v1/messages/884/').flush(null, { status: 204, statusText: 'No Content' });
    expect(removed).toBeTrue();

    let marker = 0;
    api.read(12, 881).subscribe((id) => (marker = id));
    const read = http.expectOne('/api/chat/v1/conversations/12/read/');
    expect(read.request.body).toEqual({ message_id: 881 });
    read.flush(envelope({ last_read_message_id: 881 }));
    expect(marker).toBe(881);

    let total = 0;
    api.unread().subscribe((s) => (total = s.messages));
    http.expectOne('/api/chat/v1/unread/').flush(envelope({ conversations: 2, messages: 7 }));
    expect(total).toBe(7);
  });

  it('downloads an attachment by its relative url', () => {
    api.attachment('/api/chat/v1/messages/884/attachments/17/').subscribe();
    const req = http.expectOne('/api/chat/v1/messages/884/attachments/17/');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['x']));
  });

  it('strips everything up to /api/ from attachment urls', () => {
    expect(attachmentPath('/api/chat/v1/messages/1/attachments/2/')).toBe('chat/v1/messages/1/attachments/2/');
    expect(attachmentPath('http://host/api/chat/v1/x/')).toBe('chat/v1/x/');
  });
});
