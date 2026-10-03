import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import '@/i18n'
import { resetMockDb } from '@/mocks/db'
import { server } from '@/mocks/node'

// Tests use the same mock API as the browser. A request without a handler fails the test.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

afterEach(() => {
  cleanup()
  server.resetHandlers()
  resetMockDb()
})

afterAll(() => server.close())
