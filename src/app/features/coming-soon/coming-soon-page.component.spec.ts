import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { ComingSoonPageComponent } from './coming-soon-page.component';

describe('ComingSoonPageComponent', () => {
  it('takes its title and icon from the route data', () => {
    TestBed.configureTestingModule({
      imports: [ComingSoonPageComponent],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { titleKey: 'nav.sales', icon: 'pi-shopping-cart' } } } },
      ],
    });
    const fixture = TestBed.createComponent(ComingSoonPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('nav.sales');
    expect(fixture.nativeElement.querySelector('.pi-shopping-cart')).not.toBeNull();
  });
});
