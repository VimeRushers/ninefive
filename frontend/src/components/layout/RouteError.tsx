import { useRouteError } from 'react-router'
import { ErrorState } from '@/components/shared/states'

/** Shown when a page crashes while rendering. */
export function RouteError() {
  const error = useRouteError()
  return (
    <div className="mx-auto max-w-[1600px] px-4 sm:px-6">
      <ErrorState error={error} onRetry={() => window.location.reload()} />
    </div>
  )
}
