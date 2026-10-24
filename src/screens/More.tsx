import type { ReactNode } from 'react'
import { Check, ChevronRight, CircleHelp, Gamepad2, Heart, SlidersHorizontal, TriangleAlert, Users } from 'lucide-react'
import { useI18n } from '../i18n'
import { useCloud } from '../lib/cloud'
import { myGames } from '../lib/games'
import { setSettings, useStore } from '../lib/store'
import { navigate } from '../hooks/useRoute'
import { Logo } from '../components/Logo'
import { Card, Page, Section, Segmented, Toggle, cx } from '../components/ui'
import type { Lang, Skin, Theme } from '../types'

const CONTACT_EMAIL = 'dice-and-digits@imrahil.com'

const SKINS = [
  { id: 'arcade', label: 'skinArcade', hint: 'skinArcadeHint' },
  { id: 'bubble', label: 'skinBubble', hint: 'skinBubbleHint' },
  { id: 'classic', label: 'skinClassic', hint: 'skinClassicHint' },
] as const satisfies readonly { id: Skin; label: string; hint: string }[]

/** Each tile renders a tiny scene in its own skin: data-skin rescopes every token below it. */
function SkinPicker({ value, onChange }: { value: Skin; onChange: (skin: Skin) => void }) {
  const { t } = useI18n()

  return (
    <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('skin')}>
      {SKINS.map((s) => {
        const on = s.id === value

        return (
          <button
            key={s.id}
            role="radio"
            aria-checked={on}
            onClick={() => onChange(s.id)}
            className={cx('relative rounded-2xl p-1 text-left transition active:scale-95', on ? 'ring-[3px] ring-accent' : 'ring-1 ring-ink/10 dark:ring-white/10')}
          >
            <div data-skin={s.id} className="skin-bg overflow-hidden rounded-xl p-2">
              <div className="surface rounded-xl p-2">
                <div className="flex items-center gap-1">
                  <span className="avatar-ring size-4 rounded-full bg-[#2e86de]" />
                  <span className="avatar-ring -ml-2 size-4 rounded-full bg-[#e05a9c]" />
                  <span className="display ml-auto text-lg leading-none font-black">42</span>
                </div>
                <div className="btn-cta mt-2 h-5 rounded-lg" />
              </div>
              <p className="display mt-2 truncate text-[13px] leading-tight font-extrabold">{t(s.label)}</p>
              <p className="truncate text-[11px] leading-tight opacity-60">{t(s.hint)}</p>
            </div>
            {on && (
              <span className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-accent text-white">
                <Check className="size-4" strokeWidth={3.5} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function LinkRow({ icon, label, detail, onClick }: { icon: ReactNode; label: string; detail?: ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left first:pt-1 last:pb-1">
      <span className="emoji-tile flex size-9 items-center justify-center rounded-xl text-accent">{icon}</span>
      <span className="flex-1 font-bold">{label}</span>
      {detail && <span className="flex items-center text-sm font-semibold text-ink/50 dark:text-white/50">{detail}</span>}
      <ChevronRight className="size-5 text-ink/30 dark:text-white/30" />
    </button>
  )
}

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
