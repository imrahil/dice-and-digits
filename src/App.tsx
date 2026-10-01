import { useEffect } from 'react'
import { BarChart3, Dices, History as HistoryIcon, Menu, Play as PlayIcon } from 'lucide-react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { I18nProvider, useI18n, type I18n } from './i18n'
import { useStore } from './lib/store'
import { cloudEnabled, syncNow, useCloud } from './lib/cloud'
import { navigate, useRoute } from './hooks/useRoute'
import { useTheme } from './hooks/useTheme'
import { DialogHost } from './components/dialogs'
import { Button, cx } from './components/ui'
import { Home } from './screens/Home'
import { NewGame } from './screens/NewGame'
import { Play } from './screens/Play'
import { Result } from './screens/Result'
import { History } from './screens/History'
import { Stats } from './screens/Stats'
import { Tools } from './screens/Tools'
import { More } from './screens/More'
import { Players } from './screens/Players'
import { Games } from './screens/Games'
import { GameEditor } from './screens/GameEditor'
import { Live } from './screens/Live'
import { Join } from './screens/Join'

const TABS = [
  { path: '', icon: PlayIcon, label: 'navPlay' },
  { path: 'history', icon: HistoryIcon, label: 'navHistory' },
  { path: 'stats', icon: BarChart3, label: 'navStats' },
  { path: 'tools', icon: Dices, label: 'navTools' },
  { path: 'more', icon: Menu, label: 'navMore' },
] as const satisfies readonly { path: string; icon: unknown; label: Parameters<I18n['t']>[0] }[]

/** Screens reached from "More" keep its tab highlighted. */
const TAB_OF: Record<string, string> = { players: 'more', games: 'more', result: 'history' }

function Router({ route }: { route: string[] }) {
  const [head = '', a] = route

  switch (head) {
    case '':
      return <Home />
    case 'new':
      return <NewGame gameId={a} />
    case 'play':
      return <Play id={a} />
    case 'result':
      return <Result id={a} />
    case 'history':
      return <History />
    case 'stats':
      return <Stats />
    case 'tools':
      return <Tools tab={a} />
    case 'more':
      return <More />
    case 'players':
      return <Players />
    case 'games':
      return a ? <GameEditor id={a} /> : <Games />
    case 'live':
      return <Live code={a} />
    case 'join':
      return <Join token={route.slice(1).join('/')} />
    default:
      return <Home />
  }
}

function BottomNav({ active }: { active: string }) {
  const { t } = useI18n()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)]">
      <div className="nav-dock mx-auto flex max-w-md rounded-[26px] p-1.5 backdrop-blur-xl">
        {TABS.map(({ path, icon: Icon, label }) => {
          const on = active === path

          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              aria-current={on ? 'page' : undefined}
              className={cx(
                'flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] py-1.5 text-[11px] font-bold transition active:scale-90',
                on ? 'nav-on' : 'text-(--nav-ink)',
              )}
            >
              <Icon className={cx('size-5 transition', on && '-rotate-6 scale-110')} strokeWidth={on ? 2.6 : 2} />
              {t(label)}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function UpdateBanner() {
  const { t } = useI18n()
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) {
    return null
  }

  return (
    <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.5rem)] z-[70] flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-2xl bg-ink py-2 pr-2 pl-4 text-sm font-bold text-white shadow-xl dark:bg-white dark:text-ink">
        {t('updateReady')}
        <Button size="sm" variant="primary" onClick={() => updateServiceWorker(true)}>
          {t('reload')}
        </Button>
      </div>
    </div>
  )
}

/** Sync on open, on return to the tab, shortly after local changes, and every 5 min. */
function useAutoSync() {
  const dirty = useStore((s) => s.dirty)
  const { group } = useCloud()
  const hasGroup = Boolean(group)

  useEffect(() => {
    if (!cloudEnabled || !hasGroup) {
      return
    }

    syncNow()
    const onVisible = () => document.visibilityState === 'visible' && syncNow()
    const onOnline = () => syncNow()

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    const id = setInterval(() => document.visibilityState === 'visible' && syncNow(), 5 * 60_000)

    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
      clearInterval(id)
    }
  }, [hasGroup])

  useEffect(() => {
    if (!cloudEnabled || !hasGroup || dirty.length === 0) {
      return
    }

    const id = setTimeout(() => syncNow(), 2500)

    return () => clearTimeout(id)
  }, [dirty, hasGroup])
}

export function App() {
  const settings = useStore((s) => s.settings)
  const route = useRoute()

  useTheme(settings.theme, settings.skin)
  useAutoSync()

  useEffect(() => {
    document.documentElement.lang = settings.lang
  }, [settings.lang])

  const head = route[0] ?? ''
  const isTab = TABS.some((tab) => tab.path === head) || ((head === 'players' || head === 'games') && !route[1])
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
