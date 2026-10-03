import type { UseQueryResult } from '@tanstack/react-query'
import { Construction, SearchX, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { ApiError, isNotFound } from '@/api/client'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export function LoadingState({ lines = 3, className }: { lines?: number; className?: string }) {
  const { t } = useTranslation()
  return (
    <div role="status" className={cn('space-y-2.5 py-2', className)}>
      <span className="sr-only">{t('state.loading')}</span>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={cn('h-4', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

interface MessageProps {
  icon: ReactNode
  title: string
  description?: string
  /** Technical detail, shown small under the description. */
  detail?: string
  action?: ReactNode
  role?: 'alert' | 'status'
  /** Without the card frame, for use inside a Panel. */
  plain?: boolean
  className?: string
}

function Message({ icon, title, description, detail, action, role, plain, className }: MessageProps) {
  return (
    <div
      role={role}
      className={cn(
        'flex flex-col items-start gap-2',
        plain ? 'py-6' : 'animate-panel-in rounded-2xl border bg-card p-7 shadow-panel',
        className,
      )}
    >
      <div
        className="mb-1 grid size-10 place-items-center rounded-xl bg-surface-3 text-muted-foreground [&_svg]:size-5"
        aria-hidden
      >
        {icon}
      </div>
      <h2 className="text-base font-bold">{title}</h2>
      {description && <p className="max-w-prose text-sm text-muted-foreground">{description}</p>}
      {detail && <p className="text-xs text-faint">{detail}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function EmptyState(props: {
  title?: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  return <Message icon={<SearchX />} {...props} title={props.title ?? t('state.empty.title')} />
}

export function ErrorState({
  error,
  onRetry,
  className,
}: {
  error?: unknown
  onRetry?: () => void
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <Message
      role="alert"
      icon={<TriangleAlert />}
      title={t('state.error.title')}
      description={t('state.error.description')}
      // The backend's own message, in English, helps whoever debugs it.
      detail={error instanceof ApiError ? `${error.status}: ${error.message}` : undefined}
      className={className}
      action={
        onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            {t('state.error.retry')}
          </Button>
        )
      }
    />
  )
}

export function NotFoundState({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <Message
      icon={<SearchX />}
      title={t('state.notFound.title')}
      description={t('state.notFound.description')}
      className={className}
      action={
        <Button asChild variant="outline" size="sm">
          <Link to="/board">{t('state.notFound.back')}</Link>
        </Button>
      }
    />
  )
}

/** Placeholder for a section someone is still building. */
export function InProgress({ plain, className }: { plain?: boolean; className?: string }) {
  const { t } = useTranslation()
  return <Message icon={<Construction />} title={t('state.inProgress')} plain={plain} className={className} />
}

interface QueryStateProps<T> {
  query: UseQueryResult<T>
  children: (data: T) => ReactNode
  loading?: ReactNode
  notFound?: ReactNode
}

/**
 * Renders loading, error and "not found" states for a query, and the
 * children once data is there. Use it so every page handles them the same way.
 */
export function QueryState<T>({ query, children, loading, notFound }: QueryStateProps<T>) {
  if (query.isPending) return loading ?? <LoadingState />
  if (query.isError) {
    if (isNotFound(query.error)) return notFound ?? <NotFoundState />
    return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  }
  return children(query.data)
}
