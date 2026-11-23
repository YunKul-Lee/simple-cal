import { defineConfig, devices } from '@playwright/test'

const PORT = 5199

// e2e는 개발 서버(MSW 가짜 API)를 띄워 실제 브라우저로 확인한다.
// 브라우저 컨텍스트가 테스트마다 새로 만들어지므로 localStorage(가짜 DB)도 매번 비어 있다.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    viewport: { width: 1400, height: 900 },
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1400, height: 900 } } }],
  webServer: {
    command: `pnpm exec vite --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
