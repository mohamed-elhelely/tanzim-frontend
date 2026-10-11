import { daysOverdue } from './sales.models';

describe('daysOverdue', () => {
  const today = new Date(2026, 9, 12); // 12 Oct 2026, local time

  it('counts whole days past the due date for an issued invoice with something still due', () => {
    expect(daysOverdue({ status: 'issued', due_date: '2026-10-02', amount_due: '50.0000' }, today)).toBe(10);
    expect(daysOverdue({ status: 'overdue', due_date: '2026-10-11', amount_due: '1' }, today)).toBe(1);
  });

  it('is 0 on or before the due date, when paid, without a due date, or for drafts and cancelled invoices', () => {
    expect(daysOverdue({ status: 'issued', due_date: '2026-10-12', amount_due: '50' }, today)).toBe(0);
    expect(daysOverdue({ status: 'issued', due_date: '2026-11-01', amount_due: '50' }, today)).toBe(0);
    expect(daysOverdue({ status: 'issued', due_date: '2026-10-01', amount_due: '0.0000' }, today)).toBe(0);
    expect(daysOverdue({ status: 'issued', due_date: null, amount_due: '50' }, today)).toBe(0);
    expect(daysOverdue({ status: 'draft', due_date: '2026-10-01', amount_due: '50' }, today)).toBe(0);
    expect(daysOverdue({ status: 'cancelled', due_date: '2026-10-01', amount_due: '50' }, today)).toBe(0);
  });
});
