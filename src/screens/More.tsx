import { CircleHelp, Gamepad2, Heart, SlidersHorizontal, TriangleAlert, Users } from 'lucide-react'
import { useI18n } from '../i18n'
import { useCloud } from '../lib/cloud'
import { myGames } from '../lib/games'
import { setSettings, useStore } from '../lib/store'
import { navigate } from '../hooks/useRoute'
import { Logo } from '../components/Logo'
import { Card, Page, Section, Segmented, Toggle } from '../components/ui'
import { LinkRow } from '../components/more/LinkRow'
import { SkinPicker } from '../components/more/SkinPicker'
import type { Lang, Theme } from '../types'

const CONTACT_EMAIL = 'dice-and-digits@imrahil.com'

export function More() {
  const { t, num, date } = useI18n()
  const settings = useStore((s) => s.settings)
  const players = useStore((s) => s.players)
  const games = useStore((s) => s.games)
  const favorites = useStore((s) => s.favorites)
  const { group } = useCloud()

  const playerCount = Object.values(players).filter((p) => !p.deleted).length
  const gameCount = Object.values(games).filter((g) => !g.deleted).length
  const myCount = myGames(favorites, games).length

  return (
    <Page title={t('navMore')}>
      <Card className="divide-y divide-edge !py-1 dark:divide-white/8">
        <LinkRow icon={<Heart className="size-5" />} label={t('myGames')} detail={myCount ? num(myCount) : undefined} onClick={() => navigate('my-games')} />
        <LinkRow icon={<Users className="size-5" />} label={t('players')} detail={num(playerCount)} onClick={() => navigate('players')} />
        <LinkRow icon={<Gamepad2 className="size-5" />} label={t('games')} detail={gameCount ? num(gameCount) : undefined} onClick={() => navigate('games')} />
      </Card>

      <Section title={t('settings')}>
        <Card className="space-y-4">
          <div>
            <p className="mb-2 font-semibold">{t('language')}</p>
            <Segmented<Lang>
              value={settings.lang}
              onChange={(lang) => setSettings({ lang })}
              options={[
                { value: 'pl', label: '🇵🇱 Polski' },
                { value: 'en', label: '🇬🇧 English' },
              ]}
            />
          </div>
          <div>
            <p className="mb-2 font-semibold">{t('skin')}</p>
            <SkinPicker value={settings.skin} onChange={(skin) => setSettings({ skin })} />
          </div>
          <div>
            <p className="mb-2 font-semibold">{t('theme')}</p>
            <Segmented<Theme>
              value={settings.theme}
              onChange={(theme) => setSettings({ theme })}
              options={[
                { value: 'auto', label: t('themeAuto') },
                { value: 'light', label: t('themeLight') },
                { value: 'dark', label: t('themeDark') },
              ]}
            />
          </div>
          <div className="border-t border-edge pt-2 dark:border-white/8">
            <Toggle checked={settings.keepAwake} onChange={(keepAwake) => setSettings({ keepAwake })} label={t('keepAwake')} />
            {'vibrate' in navigator && <Toggle checked={settings.haptics} onChange={(haptics) => setSettings({ haptics })} label={t('haptics')} />}
          </div>
        </Card>
      </Section>

      <Card className="mt-6 divide-y divide-edge !py-1 dark:divide-white/8">
        <LinkRow icon={<CircleHelp className="size-5" />} label={t('help')} onClick={() => navigate('help')} />
        <LinkRow
          icon={<SlidersHorizontal className="size-5" />}
          label={t('advanced')}
          detail={
            // Until the backup's words are saved, More keeps nagging from here.
            group?.kind === 'vault' && !group.savedAt ? (
              <TriangleAlert className="size-5 text-gold" aria-label={t('saveCodeWarning')} />
            ) : (
              group?.name
            )
          }
          onClick={() => navigate('advanced')}
        />
      </Card>

      <Section title={t('about')}>
        <Card className="flex items-start gap-3">
          <Logo className="size-12 shrink-0" />
          <div className="text-sm">
            <p className="text-base font-extrabold">{t('appName')}</p>
            <p className="mt-0.5 text-ink/65 dark:text-white/65">{t('aboutBody')}</p>
            <p className="mt-2 text-ink/65 dark:text-white/65">
              {t('aboutVersion', { version: __APP_VERSION__ })} · {t('aboutBuilt', { date: date(new Date(__BUILD_DATE__).getTime()) })}
            </p>
            <p className="mt-0.5 text-ink/65 dark:text-white/65">
              {t('aboutContact')}: <a href={`mailto:${CONTACT_EMAIL}`} className="font-bold text-accent underline">{CONTACT_EMAIL}</a>
            </p>
            {!matchMedia('(display-mode: standalone)').matches && (
              <p className="mt-2 text-ink/65 dark:text-white/65">📲 {t('installHint')}</p>
            )}
          </div>
        </Card>
      </Section>
    </Page>
  )
}
