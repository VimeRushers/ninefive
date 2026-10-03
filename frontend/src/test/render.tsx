import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from '@/routes'

function testQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

/** Renders the whole app at a path, against the mock API. */
export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return {
    router,
    ...render(
      <QueryClientProvider client={testQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  }
}

/** Renders a component with a query client (no router). */
export function renderWithQuery(ui: ReactNode) {
  return render(<QueryClientProvider client={testQueryClient()}>{ui}</QueryClientProvider>)
}
