import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/** Same handlers as the browser, for tests. */
export const server = setupServer(...handlers)
