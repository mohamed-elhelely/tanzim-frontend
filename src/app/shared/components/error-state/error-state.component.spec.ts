import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { ErrorStateComponent } from './error-state.component';

describe('ErrorStateComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ErrorStateComponent], providers: [provideTranslateService()] });
  });

  function heading(inputs: Record<string, unknown>): string {
    const fixture = TestBed.createComponent(ErrorStateComponent);
    for (const [key, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(key, value);
    }
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('h3')!.textContent!.trim();
  }

  it('titles the panel from the error status', () => {
    expect(heading({ error: { status: 404, message: '', errors: {} } })).toBe('common.notFound');
    expect(heading({ error: { status: 403, message: '', errors: {} } })).toBe('common.forbidden');
    expect(heading({ error: { status: 500, message: '', errors: {} } })).toBe('common.error');
  });

  it('uses an explicit title when there is no error', () => {
    expect(heading({ title: 'sales.notLoaded' })).toBe('sales.notLoaded');
    expect(heading({})).toBe('common.error');
  });
});
