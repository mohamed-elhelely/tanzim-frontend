import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideTranslateService } from '@ngx-translate/core';
import { ActivatedRoute } from '@angular/router';
import { AccessService } from '../../../core/auth/access.service';
import { ModuleActivityService } from '../../activity/module-activity';
import { PageHeaderComponent } from './page-header.component';

/** A routed screen at `segments` (what the header reads its module from). */
function routeAt(...segments: string[]) {
  return { snapshot: { pathFromRoot: [{ url: [] }, ...segments.map((path) => ({ url: [{ path }] }))] } };
}

describe('PageHeaderComponent', () => {
  it('emits back when the back button is clicked', () => {
    TestBed.configureTestingModule({
      imports: [PageHeaderComponent],
      providers: [provideTranslateService(), provideAnimations()],
    });
    const fixture = TestBed.createComponent(PageHeaderComponent);
    fixture.componentInstance.showBack = true;
    fixture.detectChanges();

    let clicked = false;
    fixture.componentInstance.back.subscribe(() => (clicked = true));
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(clicked).toBeTrue();
  });

  describe('activity log button', () => {
    function render(route: unknown, canReadLog: boolean) {
      const drawer = jasmine.createSpyObj<ModuleActivityService>('ModuleActivityService', ['open']);
      TestBed.configureTestingModule({
        imports: [PageHeaderComponent],
        providers: [
          provideTranslateService(),
          provideAnimations(),
          { provide: ActivatedRoute, useValue: route },
          { provide: AccessService, useValue: { can: (codename: string) => canReadLog && codename === 'view_auditlog' } },
          { provide: ModuleActivityService, useValue: drawer },
        ],
      });
      const fixture = TestBed.createComponent(PageHeaderComponent);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('[aria-label="activityLog.button"]') as HTMLElement | null;
      return { button, drawer };
    }

    it("opens the module's log on a module list screen", () => {
      const { button, drawer } = render(routeAt('sales', 'orders'), true);
      expect(button).not.toBeNull();
      (button?.querySelector('button') ?? button)?.click();
      expect(drawer.open).toHaveBeenCalledWith({ titleKey: 'nav.salesOrders', resources: ['salesorder', 'salesorderline'] });
    });

    it('is hidden without view_auditlog', () => {
      expect(render(routeAt('sales', 'orders'), false).button).toBeNull();
    });

    it('is hidden on detail screens and screens without module activity', () => {
      expect(render(routeAt('sales', 'orders', '5'), true).button).toBeNull();
    });
  });
});
