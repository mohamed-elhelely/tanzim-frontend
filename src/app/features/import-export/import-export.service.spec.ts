import { fileToDataUri } from './import-export.service';

describe('import helpers', () => {
  it('sends CSV as text/csv and Excel with the "@file/…" prefix the backend expects, whatever the browser says', async () => {
    const csv = await fileToDataUri(new File(['name\nA\n'], 'cats.csv', { type: 'application/vnd.ms-excel' }));
    expect(csv).toBe('data:text/csv;base64,' + btoa('name\nA\n'));
    const xlsx = await fileToDataUri(new File(['x'], 'cats.XLSX'));
    expect(xlsx.startsWith('data:@file/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,')).toBeTrue();
  });
});
