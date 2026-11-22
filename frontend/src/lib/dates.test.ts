import { addDays, addMinutes, compareDateTime, toLocalDate, toLocalTime, todayLocal } from './dates';

test('todayLocal은 로컬 날짜', () => expect(todayLocal(new Date(2026, 10, 22, 23, 59))).toBe('2026-11-22'));

test('addDays는 월/연 경계를 넘는다', () => {
  expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
  expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  expect(addDays('2026-12-01', -1)).toBe('2026-11-30');
});

test('addMinutes는 자정을 넘으면 날짜도 넘긴다', () =>
  expect(addMinutes('2026-11-22', '23:30', 60)).toEqual({ date: '2026-11-23', time: '00:30' }));

test('toLocalDate/Time', () => {
  const d = new Date(2026, 0, 5, 9, 7);
  expect(toLocalDate(d)).toBe('2026-01-05');
  expect(toLocalTime(d)).toBe('09:07');
});

test('compareDateTime', () => {
  expect(compareDateTime('2026-11-22', '10:00', '2026-11-22', '09:00')).toBeGreaterThan(0);
  expect(compareDateTime('2026-11-22', null, '2026-11-22', '00:00')).toBe(0);
});
