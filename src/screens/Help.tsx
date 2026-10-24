import { ChevronDown, ChevronRight } from 'lucide-react'
import { useI18n, type I18n } from '../i18n'
import { cloudEnabled } from '../lib/cloud'
import { navigate } from '../hooks/useRoute'
import { Page } from '../components/ui'

type Key = Parameters<I18n['t']>[0]

type Topic = {
  id: string
  emoji: string
  title: Key
  body: Key
  /** Where to try it: a route and the label of the link. */
  go?: [string, Key]
  /** Needs the backend (live games, backup, groups). */
  cloud?: boolean
}

const TOPICS: Topic[] = [
  { id: 'start', emoji: '🎲', title: 'helpStartTitle', body: 'helpStartBody', go: ['new', 'newGame'] },
  { id: 'modes', emoji: '🧮', title: 'helpModesTitle', body: 'helpModesBody' },
  { id: 'play', emoji: '✍️', title: 'helpPlayTitle', body: 'helpPlayBody' },
  { id: 'live', emoji: '📱', title: 'helpLiveTitle', body: 'helpLiveBody', cloud: true },
  { id: 'my-games', emoji: '❤️', title: 'helpMyGamesTitle', body: 'helpMyGamesBody', go: ['my-games', 'myGames'] },
  { id: 'history', emoji: '🏆', title: 'helpHistoryTitle', body: 'helpHistoryBody', go: ['stats', 'navStats'] },
  { id: 'tools', emoji: '⏳', title: 'helpToolsTitle', body: 'helpToolsBody', go: ['tools', 'navTools'] },
  { id: 'data', emoji: '🔒', title: 'helpDataTitle', body: 'helpDataBody' },
  { id: 'backup', emoji: '☁️', title: 'helpBackupTitle', body: 'helpBackupBody', go: ['advanced', 'backupCloud'], cloud: true },
  { id: 'groups', emoji: '👥', title: 'helpGroupsTitle', body: 'helpGroupsBody', go: ['advanced', 'advanced'], cloud: true },
  { id: 'install', emoji: '📲', title: 'helpInstallTitle', body: 'helpInstallBody' },
]

/** How the app works: short topics that open one at a time. */
export function Help() {
  const { t } = useI18n()
  const topics = TOPICS.filter((x) => cloudEnabled || !x.cloud)

  return (
    <Page title={t('help')} back="more">
      <p className="px-1 text-ink/65 dark:text-white/65">{t('helpIntro')}</p>
      <div className="mt-4 space-y-2">
        {topics.map((x) => (
          <details key={x.id} name="help" className="surface group rounded-3xl">
            <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
              <span className="flex size-11 shrink-0 items-center justify-center emoji-tile rounded-2xl text-2xl">{x.emoji}</span>
              <span className="min-w-0 flex-1 font-extrabold">{t(x.title)}</span>
              <ChevronDown className="size-5 shrink-0 text-ink/40 transition group-open:rotate-180 dark:text-white/40" />
            </summary>
            <div className="space-y-2 px-4 pb-4 text-[15px] leading-relaxed text-ink/75 dark:text-white/75">
              {t(x.body)
                .split('\n')
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              {x.go && (
                <button onClick={() => navigate(x.go![0])} className="flex items-center gap-1 pt-1 font-bold text-accent">
                  {t(x.go[1])} <ChevronRight className="size-4" />
                </button>
              )}
            </div>
          </details>
        ))}
      </div>
    </Page>
  )
}
