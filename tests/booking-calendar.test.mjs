import assert from 'node:assert/strict';
import {test} from 'node:test';
import {bookingCalendarDays, isCalendarDate, shiftCalendarDate, workshopToday} from '../src/lib/booking-calendar.ts';

test('calendar can move backward and forward across month and year boundaries',()=>{
 assert.equal(shiftCalendarDate('2026-01-02',-5),'2025-12-28');
 assert.equal(shiftCalendarDate('2026-12-29',5),'2027-01-03');
});
test('dates stay consecutive across UK daylight saving changes',()=>{
 assert.deepEqual(bookingCalendarDays('2026-10-23').map(d=>d.date),['2026-10-23','2026-10-24','2026-10-25','2026-10-26','2026-10-27']);
 assert.equal(shiftCalendarDate('2026-03-28',2),'2026-03-30');
});
test('past and future dates outside the original window have their own calendar range',()=>{
 assert.equal(bookingCalendarDays('2025-02-03')[0].date,'2025-02-03');
 assert.equal(bookingCalendarDays('2027-08-09')[4].date,'2027-08-13');
});
test('today follows the workshop timezone at midnight',()=>{
 const now=new Date('2026-07-04T23:30:00Z');
 assert.equal(workshopToday('Europe/London',now),'2026-07-05');
 assert.equal(workshopToday('UTC',now),'2026-07-04');
});
test('invalid query dates are rejected instead of rolling into another month',()=>{
 for(const date of ['2026-02-29','2026-04-31','2026-13-01','tomorrow','2026-01-01T10:00:00Z'])assert.equal(isCalendarDate(date),false,date);
 assert.equal(isCalendarDate('2028-02-29'),true);
});
