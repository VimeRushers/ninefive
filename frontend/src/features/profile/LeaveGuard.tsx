import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useBlocker } from 'react-router'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

/** Asks before leaving the page, in the app or by closing the tab, while the form has unsaved changes. */
export function LeaveGuard({ when }: { when: boolean }) {
  const { t } = useTranslation('profile')
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    return when && currentLocation.pathname !== nextLocation.pathname
  })

  useEffect(() => {
    if (!when) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [when])

  return (
    <Dialog open={blocker.state === 'blocked'} onOpenChange={(open) => !open && blocker.reset?.()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="font-bold">{t('leave.title')}</DialogTitle>
          <DialogDescription>{t('leave.description')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => blocker.reset?.()}>
            {t('leave.stay')}
          </Button>
          <Button variant="destructive" onClick={() => blocker.proceed?.()}>
            {t('leave.leave')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
