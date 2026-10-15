import { detailSections } from './record-details';

describe('detailSections', () => {
  it("shows the record's own fields first, references by name, and nested objects as their own section", () => {
    const sections = detailSections(
      {
        id: 4,
        company: 1,
        name: 'Main store',
        is_active: true,
        notes: '',
        manager: { id: 7, name_en: 'Sara', name_ar: 'سارة' },
        tags: ['a', 'b'],
        created_at: '2026-10-12T09:15:02Z',
        address: { street: 'King Rd', city: 'Jeddah', geo: { lat: 1 } },
      },
      'ar',
    );
    expect(sections[0]).toEqual({
      key: null,
      fields: [
        { key: 'name', value: 'Main store' },
        { key: 'is_active', value: 'common.yes', translate: true },
        { key: 'notes', value: '—' },
        { key: 'manager', value: 'سارة' },
        { key: 'tags', value: 'a, b' },
        { key: 'created_at', value: '2026-10-12 09:15' },
      ],
    });
    // Ids, the tenant and objects nested two levels down stay out.
    expect(sections[1]).toEqual({
      key: 'address',
      fields: [
        { key: 'street', value: 'King Rd' },
        { key: 'city', value: 'Jeddah' },
      ],
    });
  });

  it('counts lists of things without a name', () => {
    expect(detailSections({ lines: [{ qty: 1 }, { qty: 2 }] }, 'en')[0].fields).toEqual([{ key: 'lines', value: '2' }]);
  });
});
