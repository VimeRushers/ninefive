import { Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'

/**
 * Required next to AI eligibility results ("legal") and win-chance estimates
 * ("winChance"). Uses translated text rather than the backend's English one.
 */
export function DisclaimerBanner({ kind, className }: { kind: 'legal' | 'winChance'; className?: string }) {
  const { t } = useTranslation()
  return (
    // A note, not an alert: screen readers shouldn't announce it as urgent on every page load.
    <Alert role="note" className={className}>
      <Info aria-hidden />
      <AlertDescription>{t(`disclaimer.${kind}`)}</AlertDescription>
    </Alert>
  )
}
