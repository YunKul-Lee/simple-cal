import type { ItemInput } from '../types';
import { validateItem } from './validateItem';

const baseEvent: ItemInput = {
  calendarId: 'c1',
  type: 'event',
  title: '회의',
  memo: null,
  date: '2026-11-23',
  startTime: '10:00',
  endDate: null,
  endTime: '11:00',
  done: false,
};

const baseTask: ItemInput = { ...baseEvent, type: 'task', endDate: null, endTime: null };

test('기준 이벤트는 유효', () => {
  expect(validateItem(baseEvent)).toBeNull();
});

test('제목이 공백뿐이면 오류', () => {
  expect(validateItem({ ...baseEvent, title: '  ' })).toBe('제목을 입력해 주세요');
});

test('날짜 형식이 틀리면 오류', () => {
  expect(validateItem({ ...baseEvent, date: '2026/11/23' })).toBe('날짜 형식이 올바르지 않습니다');
});

test('이벤트에 시작 시간만 있으면 종료 시간 필요', () => {
  expect(validateItem({ ...baseEvent, endTime: null })).toBe('종료 시간을 입력해 주세요');
});

test('이벤트에 종료 시간만 있으면 시작 시간 필요', () => {
  expect(validateItem({ ...baseEvent, startTime: null, endTime: '11:00' })).toBe('시작 시간을 입력해 주세요');
});

test('같은 날 종료 시간이 시작보다 이르면 오류', () => {
  expect(validateItem({ ...baseEvent, endTime: '09:00' })).toBe('종료가 시작보다 빠를 수 없습니다');
});

test('종료 날짜가 시작 날짜보다 이르면 오류', () => {
  expect(validateItem({ ...baseEvent, endDate: '2026-11-22' })).toBe('종료가 시작보다 빠를 수 없습니다');
});

test('자정을 넘기는 이벤트는 유효', () => {
  expect(
    validateItem({ ...baseEvent, startTime: '23:30', endDate: '2026-11-24', endTime: '00:30' }),
  ).toBeNull();
});

test('할 일에는 종료를 지정할 수 없다', () => {
  expect(validateItem({ ...baseTask, endTime: '11:00' })).toBe('할 일에는 종료를 지정할 수 없습니다');
  expect(validateItem({ ...baseTask, endDate: '2026-11-24' })).toBe('할 일에는 종료를 지정할 수 없습니다');
});

test('여러 날 하루 종일 이벤트는 유효', () => {
  expect(
    validateItem({ ...baseEvent, startTime: null, endTime: null, endDate: '2026-11-25' }),
  ).toBeNull();
});
