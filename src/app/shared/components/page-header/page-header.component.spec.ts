import { TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideTranslateService } from '@ngx-translate/core';
import { PageHeaderComponent } from './page-header.component';

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
});
