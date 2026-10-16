import { TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ButtonComponent] }));

  function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(ButtonComponent);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    return { fixture, host, button: host.querySelector('button') as HTMLButtonElement };
  }

  it('renders the label and icon and emits clicks', () => {
    const { fixture, button } = render({ label: 'Save', icon: 'pi pi-check' });
    let clicks = 0;
    fixture.componentInstance.clicked.subscribe(() => clicks++);
    expect(button.textContent).toContain('Save');
    expect(button.querySelector('.pi-check')).not.toBeNull();
    button.click();
    expect(clicks).toBe(1);
  });

  it('is a plain button unless told to submit', () => {
    expect(render().button.type).toBe('button');
    expect(render({ type: 'submit' }).button.type).toBe('submit');
  });

  it('maps severity and variant to the library classes', () => {
    const { button } = render({ severity: 'danger', variant: 'outlined' });
    expect(button.className).toContain('p-button-danger');
    expect(button.className).toContain('p-button-outlined');
    expect(render({ variant: 'text' }).button.className).toContain('p-button-text');
  });

  it('does not emit while disabled', () => {
    const { fixture, button } = render({ label: 'Save', disabled: true });
    let clicks = 0;
    fixture.componentInstance.clicked.subscribe(() => clicks++);
    button.click();
    expect(button.disabled).toBeTrue();
    expect(clicks).toBe(0);
  });

  it('fills the width always or only on small screens', () => {
    expect(render({ width: 'always' }).host.className).toContain('w-full');
    const mobile = render({ width: 'mobile' }).host.className;
    expect(mobile).toContain('w-full');
    expect(mobile).toContain('sm:w-auto');
    expect(render().host.className).not.toContain('w-full');
  });

  it('labels icon-only buttons for screen readers', () => {
    expect(render({ icon: 'pi pi-times', ariaLabel: 'Close' }).button.getAttribute('aria-label')).toBe('Close');
  });
});
