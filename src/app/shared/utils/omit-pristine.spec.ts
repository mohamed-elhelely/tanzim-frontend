import { FormControl, FormGroup } from '@angular/forms';
import { omitPristine } from './omit-pristine';

describe('omitPristine', () => {
  it('drops the listed fields the user did not change, keeps the rest', () => {
    const form = new FormGroup({ name: new FormControl('A'), email: new FormControl(''), phone: new FormControl('') });
    form.controls.phone.setValue('123');
    form.controls.phone.markAsDirty();
    const body = omitPristine({ name: 'A', email: '', phone: '123' }, form, ['email', 'phone']);
    expect(body).toEqual({ name: 'A', phone: '123' });
  });
});
