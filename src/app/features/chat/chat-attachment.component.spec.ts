import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { ChatApiService } from '../../core/chat/chat-api.service';
import { ChatAttachment } from '../../core/chat/chat.models';
import { ChatAttachmentComponent } from './chat-attachment.component';

describe('ChatAttachmentComponent', () => {
  const image: ChatAttachment = { id: 1, filename: 'photo.png', content_type: 'image/png', size: 2048, url: '/api/chat/v1/messages/1/attachments/1/' };
  const doc: ChatAttachment = { id: 2, filename: 'plan.pdf', content_type: 'application/pdf', size: 3 * 1024 * 1024, url: '/api/chat/v1/messages/1/attachments/2/' };
  let attachment: jasmine.Spy;
  let create: jasmine.Spy;
  let revoke: jasmine.Spy;

  beforeEach(() => {
    attachment = jasmine.createSpy('attachment');
    create = spyOn(URL, 'createObjectURL').and.returnValue('blob:test');
    revoke = spyOn(URL, 'revokeObjectURL');
    TestBed.configureTestingModule({ imports: [ChatAttachmentComponent], providers: [{ provide: ChatApiService, useValue: { attachment } }] });
  });

  function render(value: ChatAttachment) {
    const fixture = TestBed.createComponent(ChatAttachmentComponent);
    fixture.componentRef.setInput('attachment', value);
    fixture.detectChanges();
    return fixture;
  }

  it('shows an image thumbnail from a blob and revokes the object URL on destroy', () => {
    const blob = new Blob(['x']);
    attachment.and.returnValue(of(blob));
    const fixture = render(image);
    fixture.detectChanges();
    expect(attachment).toHaveBeenCalledWith(image.url);
    expect(create).toHaveBeenCalledWith(blob);
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe('blob:test');
    fixture.destroy();
    expect(revoke).toHaveBeenCalledWith('blob:test');
  });

  it('creates no object URL when destroyed before the response arrives', () => {
    const response = new Subject<Blob>();
    attachment.and.returnValue(response);
    const fixture = render(image);
    fixture.destroy();
    response.next(new Blob(['x']));
    expect(response.observed).toBeFalse();
    expect(create).not.toHaveBeenCalled();
  });

  it('shows a file chip with name and size for a non-image', () => {
    const el: HTMLElement = render(doc).nativeElement;
    expect(attachment).not.toHaveBeenCalled();
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain('plan.pdf');
    expect(el.textContent).toContain('3.0 MB');
  });

  it('downloads the file through the api and hands the blob on', () => {
    const blob = new Blob(['pdf']);
    attachment.and.returnValue(of(blob));
    const fixture = render(doc);
    fixture.nativeElement.querySelector('button').click();
    expect(attachment).toHaveBeenCalledWith(doc.url);
    expect(create).toHaveBeenCalledWith(blob);
  });
});
