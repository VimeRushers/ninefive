import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LANGUAGE, isUiLanguage, NAMESPACES, resources, type UiLanguage } from './resources'

const STORAGE_KEY = 'ninefive.language'

function storedLanguage(): UiLanguage {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (isUiLanguage(value)) return value
  } catch {
    // Storage can be blocked; fall back to the default.
  }
  return DEFAULT_LANGUAGE
}

void i18n.use(initReactI18next).init({
  resources,
  lng: storedLanguage(),
  fallbackLng: DEFAULT_LANGUAGE,
  ns: NAMESPACES,
  defaultNS: 'common',
  interpolation: { escapeValue: false },
})

document.documentElement.lang = i18n.language

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
  try {
    localStorage.setItem(STORAGE_KEY, language)
  } catch {
    // Not remembering the choice is fine.
  }
})

export default i18n
