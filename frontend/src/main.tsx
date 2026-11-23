import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from './hooks/useItems'
import App from './App.tsx'
// FullCalendar Forma 스타일 — 팔레트의 --fc-forma-* 변수를 앱 전체(index.css)도 쓴다
import '@fullcalendar/react/skeleton.css'
import '@fullcalendar/react/themes/forma/theme.css'
import '@fullcalendar/react/themes/forma/palettes/blue.css'
import './index.css'

async function start() {
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK !== 'off') {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledFrame: 'bypass' })
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={createQueryClient()}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  )
}

void start()
