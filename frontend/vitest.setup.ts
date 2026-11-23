import '@testing-library/jest-dom/vitest'

// jsdom에는 ResizeObserver가 없어 FullCalendar v7 daygrid가 종일 이벤트를 숨긴다(높이를 못 재 top이 null → visibility:hidden).
// 관찰을 시작하면 한 번 콜백을 불러 getBoundingClientRect로 크기를 재게 한다. 실제 구현이 있으면 그대로 쓴다.
class ResizeObserverShim {
  constructor(private cb: ResizeObserverCallback) {}
  observe(target: Element) {
    setTimeout(() => this.cb([{ target } as ResizeObserverEntry], this as unknown as ResizeObserver))
  }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverShim as unknown as typeof ResizeObserver
