import { BarChart3, Dices, History as HistoryIcon, Menu, Play as PlayIcon } from 'lucide-react'
import { useI18n, type I18n } from '../../i18n'
import { navigate } from '../../hooks/useRoute'
import { cx } from '../ui'

export const TABS = [
  { path: '', icon: PlayIcon, label: 'navPlay' },
  { path: 'history', icon: HistoryIcon, label: 'navHistory' },
  { path: 'stats', icon: BarChart3, label: 'navStats' },
  { path: 'tools', icon: Dices, label: 'navTools' },
  { path: 'more', icon: Menu, label: 'navMore' },
] as const satisfies readonly { path: string; icon: unknown; label: Parameters<I18n['t']>[0] }[]

export function BottomNav({ active }: { active: string }) {
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
