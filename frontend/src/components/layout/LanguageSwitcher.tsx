import { useTranslation } from 'react-i18next'
import { LANGUAGES } from '@/i18n/resources'
import { cn } from '@/lib/utils'

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  return (
    <div role="group" aria-label={t('language.label')} className="flex items-center">
      {LANGUAGES.map((language) => {
        const active = i18n.language === language
        return (
          <button
            key={language}
            type="button"
            lang={language}
            title={t(`language.${language}`)}
            aria-pressed={active}
            onClick={() => void i18n.changeLanguage(language)}
            className={cn(
              'h-8 rounded-full px-2.5 text-xs font-bold transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {language.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
