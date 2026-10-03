import '@fontsource-variable/manrope'
import './index.css'
import '@/i18n'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { setNetworkErrorRecovery } from '@/api/client'
import { API_BASE_URL, USE_MOCKS } from '@/config'
import { initTheme } from '@/theme/theme'
import App from './App.tsx'

initTheme()

/** Starts the mock API in the browser. Off when VITE_API_MOCKS=false. */
async function startMockApi() {
  if (!USE_MOCKS) return
  const { worker } = await import('./mocks/browser')
  const options = {
    // Warn only about backend calls that have no mock yet; let assets through quietly.
    onUnhandledRequest: (request: Request, print: { warning: () => void }) => {
      if (request.url.startsWith(API_BASE_URL)) print.warning()
    },
  }
  await worker.start(options)
  // A sleeping worker wakes up without mocking; switch it back on and the request is repeated.
  setNetworkErrorRecovery(async () => {
    worker.stop()
    await worker.start({ ...options, quiet: true })
  })
}

void startMockApi().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
