/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // MSW가 켜져 있으면 브라우저에서 가로채므로 무해. 백엔드 연결 시 VITE_MOCK=off 와 함께 사용.
    proxy: { '/api': process.env.VITE_API_TARGET ?? 'http://localhost:8080' },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
