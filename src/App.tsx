import { useEffect } from 'react'
import { I18nProvider } from './i18n'
import { useStore } from './lib/store'
import { useRoute } from './hooks/useRoute'
import { useTheme } from './hooks/useTheme'
import { DialogHost } from './components/dialogs'
import { BottomNav, TABS } from './components/app/BottomNav'
import { Router } from './components/app/Router'
import { UpdateBanner } from './components/app/UpdateBanner'
import { useAutoSync } from './hooks/useAutoSync'

/** Screens reached from "More" keep its tab highlighted. */
const TAB_OF: Record<string, string> = { players: 'more', games: 'more', 'my-games': 'more', advanced: 'more', help: 'more', restore: 'more', result: 'history' }

export function App() {
  const settings = useStore((s) => s.settings)
  const route = useRoute()

  useTheme(settings.theme, settings.skin)
  useAutoSync()

  useEffect(() => {
    document.documentElement.lang = settings.lang
  }, [settings.lang])

  const head = route[0] ?? ''
  const isTab = TABS.some((tab) => tab.path === head) || (['players', 'games', 'my-games', 'advanced', 'help'].includes(head) && !route[1])
  const active = TAB_OF[head] ?? head

  return (
    <I18nProvider lang={settings.lang}>
      <Router route={route} />
      {isTab && <BottomNav active={active} />}
      <DialogHost />
      <UpdateBanner />
    </I18nProvider>
  )
}
