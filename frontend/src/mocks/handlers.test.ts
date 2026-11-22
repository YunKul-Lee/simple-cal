// @vitest-environment node
import { setupServer } from 'msw/node';
import type { Calendar, Item, ItemInput } from '../types';
import { createDb } from './db';
import { createHandlers } from './handlers';

/** 테스트용 메모리 Storage */
function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    key: (index: number) => Array.from(map.keys())[index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
  };
}

let seq = 0;
/** 예측 가능한 id 생성기 (테스트마다 0부터) */
const seqId = () => `id-${++seq}`;

const BASE = 'http://localhost';
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  seq = 0;
  server.resetHandlers(...createHandlers(createDb(memoryStorage(), seqId)));
});
afterAll(() => server.close());

function send(method: string, path: string, body?: unknown) {
  return fetch(`${BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function firstCalendarId(): Promise<string> {
  const res = await send('GET', '/api/calendars');
  const calendars = (await res.json()) as Calendar[];
  return calendars[0].id;
}

function eventInput(calendarId: string, overrides: Partial<ItemInput> = {}): ItemInput {
  return {
    calendarId,
    type: 'event',
    title: '회의',
    memo: null,
    date: '2026-11-23',
    startTime: '10:00',
    endDate: null,
    endTime: '11:00',
    done: false,
    ...overrides,
  };
}

function taskInput(calendarId: string, overrides: Partial<ItemInput> = {}): ItemInput {
  return {
    calendarId,
    type: 'task',
    title: '할 일',
    memo: null,
    date: '2026-11-23',
    startTime: null,
    endDate: null,
    endTime: null,
    done: false,
    ...overrides,
  };
}

async function createItem(input: ItemInput): Promise<Item> {
  const res = await send('POST', '/api/items', input);
  expect(res.status).toBe(201);
  return (await res.json()) as Item;
}

async function listItems(from: string, to: string): Promise<Item[]> {
  const res = await send('GET', `/api/items?from=${from}&to=${to}`);
  expect(res.status).toBe(200);
  return (await res.json()) as Item[];
}

test("첫 실행이면 '내 캘린더'를 시드한다", async () => {
  const res = await send('GET', '/api/calendars');
  expect(res.status).toBe(200);
  const calendars = (await res.json()) as Calendar[];
  expect(calendars).toHaveLength(1);
  expect(calendars[0].name).toBe('내 캘린더');
});

test('캘린더 생성·수정', async () => {
  const created = await send('POST', '/api/calendars', { name: '회사', color: '#e08a2c' });
  expect(created.status).toBe(201);
  const cal = (await created.json()) as Calendar;
  expect(cal).toMatchObject({ name: '회사', color: '#e08a2c', visible: true });

  const patched = await send('PATCH', `/api/calendars/${cal.id}`, { visible: false });
  expect(patched.status).toBe(200);
  const updated = (await patched.json()) as Calendar;
  expect(updated.name).toBe('회사');
  expect(updated.visible).toBe(false);
});

test('캘린더 삭제는 소속 항목도 지운다', async () => {
  const calId = await firstCalendarId();
  const item = await createItem(eventInput(calId));

  const res = await send('DELETE', `/api/calendars/${calId}`);
  expect(res.status).toBe(204);

  const items = await listItems('2026-01-01', '2026-12-31');
  expect(items.find((i) => i.id === item.id)).toBeUndefined();
});

test('기간 조회는 겹치는 항목을 포함한다', async () => {
  const calId = await firstCalendarId();
  const multiDay = await createItem(
    eventInput(calId, { date: '2026-11-20', startTime: null, endDate: '2026-11-24', endTime: null }),
  );
  const after = await createItem(taskInput(calId, { date: '2026-11-30' }));
  const lastDay = await createItem(taskInput(calId, { date: '2026-11-29' }));

  const ids = (await listItems('2026-11-23', '2026-11-29')).map((i) => i.id);
  expect(ids).toContain(multiDay.id);
  expect(ids).toContain(lastDay.id);
  expect(ids).not.toContain(after.id);
  expect(ids).toHaveLength(2);
});

test('밀린 할 일 조회', async () => {
  const calId = await firstCalendarId();
  const overdue = await createItem(taskInput(calId, { date: '2026-11-20' }));
  await createItem(taskInput(calId, { date: '2026-11-20', done: true }));
  await createItem(eventInput(calId, { date: '2026-11-20' }));
  await createItem(taskInput(calId, { date: '2026-11-22' }));

  const res = await send('GET', '/api/items/overdue?today=2026-11-22');
  expect(res.status).toBe(200);
  const items = (await res.json()) as Item[];
  expect(items.map((i) => i.id)).toEqual([overdue.id]);
});

test('PATCH는 빠진 필드를 유지하고 null은 비운다', async () => {
  const calId = await firstCalendarId();
  const task = await createItem(taskInput(calId, { memo: 'a', startTime: '09:00' }));

  const res = await send('PATCH', `/api/items/${task.id}`, { startTime: null });
  expect(res.status).toBe(200);
  const updated = (await res.json()) as Item;
  expect(updated.startTime).toBeNull();
  expect(updated.memo).toBe('a');
});

type Problem = { type: string; title: string; status: number; detail: string; instance: string };

function expectProblemContentType(res: Response) {
  expect(res.headers.get('content-type') ?? '').toMatch(/^application\/problem\+json/);
}

test('PATCH 결과가 유효하지 않으면 422', async () => {
  const calId = await firstCalendarId();
  const event = await createItem(eventInput(calId));

  const res = await send('PATCH', `/api/items/${event.id}`, { endTime: '09:00' });
  expect(res.status).toBe(422);
  expectProblemContentType(res);
  const body = (await res.json()) as Problem;
  expect(body.type).toBe('/problems/end-before-start');
  expect(body.detail).toBe('종료가 시작보다 빠를 수 없습니다');
  expect(body.instance).toBe(`/api/items/${event.id}`);

  const stored = (await listItems('2026-11-23', '2026-11-23')).find((i) => i.id === event.id);
  expect(stored?.endTime).toBe('11:00');
});

test('없는 캘린더로 생성하면 422', async () => {
  const res = await send('POST', '/api/items', eventInput('nope'));
  expect(res.status).toBe(422);
  expectProblemContentType(res);
  const body = (await res.json()) as Problem;
  expect(body.type).toBe('/problems/calendar-not-found');
  expect(body.detail).toBe('캘린더를 찾을 수 없습니다');
});

test('없는 항목 PATCH는 404', async () => {
  const res = await send('PATCH', '/api/items/nope', { title: '바꿈' });
  expect(res.status).toBe(404);
  expectProblemContentType(res);
  const body = (await res.json()) as Problem;
  expect(body.type).toBe('/problems/not-found');
  expect(body.detail).toBe('찾을 수 없습니다');
  expect(body.title).toBe('Not Found');
});

test('기간 조회에 to가 없으면 400', async () => {
  const res = await send('GET', '/api/items?from=2026-11-23');
  expect(res.status).toBe(400);
  expectProblemContentType(res);
  const body = (await res.json()) as Problem;
  expect(body.type).toBe('/problems/missing-parameter');
  expect(body.detail).toBe('from, to가 필요합니다');
});

test('새로 만든 db는 localStorage에서 복원된다', () => {
  const storage = memoryStorage();
  const first = createDb(storage, seqId);
  const created = first.createCalendar({ name: '회사', color: '#e08a2c' });

  const second = createDb(storage, seqId);
  expect(second.listCalendars().map((c) => c.name)).toContain('회사');
  expect(second.listCalendars().map((c) => c.id)).toContain(created.id);
});
