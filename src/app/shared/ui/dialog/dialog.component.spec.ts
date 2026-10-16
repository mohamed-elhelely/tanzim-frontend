import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogComponent, DialogFooterDirective } from './dialog.component';

@Component({
  imports: [DialogComponent, DialogFooterDirective],
  template: `
    <app-dialog [(visible)]="open" header="Title" width="28rem" (shown)="shown = shown + 1">
      <p class="body">Body</p>
      @if (withFooter()) {
        <ng-template appDialogFooter><button class="ok">OK</button></ng-template>
      }
    </app-dialog>
  `,
})
class HostComponent {
  readonly open = signal(true);
  readonly withFooter = signal(false);
  shown = 0;
}

describe('DialogComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [HostComponent] }));
  afterEach(() => document.querySelectorAll('.p-dialog-mask').forEach((el) => el.remove()));

  async function render(withFooter = false) {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.withFooter.set(withFooter);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('shows the header, the content and the width', async () => {
    await render();
    const dialog = document.querySelector<HTMLElement>('.p-dialog')!;
    expect(dialog.textContent).toContain('Title');
    expect(dialog.querySelector('.body')).not.toBeNull();
    expect(dialog.style.width).toBe('28rem');
  });

  it('has no footer area unless one is given', async () => {
    await render();
    expect(document.querySelector('.p-dialog-footer')).toBeNull();
  });

  it('renders the given footer', async () => {
    await render(true);
    expect(document.querySelector('.p-dialog-footer .ok')).not.toBeNull();
  });

  it('closes through the two-way visible binding', async () => {
    const fixture = await render();
    document.querySelector<HTMLElement>('.p-dialog-close-button, .p-dialog-header-close')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.open()).toBeFalse();
  });
});
