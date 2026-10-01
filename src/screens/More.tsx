import { useRef, useState, type ReactNode } from 'react'
import { ChevronRight, Cloud, Download, Gamepad2, Link2, LogOut, RefreshCw, Upload, Users } from 'lucide-react'
import { useI18n } from '../i18n'
import { cloudEnabled, createGroup, inviteLink, leaveGroup, syncNow, useCloud } from '../lib/cloud'
import { exportBackup, importBackup, setSettings, useStore } from '../lib/store'
import { navigate } from '../hooks/useRoute'
import { confirm, toast } from '../components/dialogs'
import { Logo } from '../components/Logo'
import { Button, Card, Page, Section, Segmented, Toggle, cx, inputClass } from '../components/ui'
import { shareLink } from './Play'
import type { Lang, Theme } from '../types'

function LinkRow({ icon, label, detail, onClick }: { icon: ReactNode; label: string; detail?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left first:pt-1 last:pb-1">
      <span className="flex size-9 items-center justify-center rounded-xl bg-accent/12 text-accent">{icon}</span>
      <span className="flex-1 font-bold">{label}</span>
      {detail && <span className="text-sm font-semibold text-ink/50 dark:text-white/50">{detail}</span>}
      <ChevronRight className="size-5 text-ink/30 dark:text-white/30" />
    </button>
  )
}

export function More() {
  const { t, num } = useI18n()
  const settings = useStore((s) => s.settings)
  const players = useStore((s) => s.players)
  const games = useStore((s) => s.games)
  const fileRef = useRef<HTMLInputElement>(null)

  const playerCount = Object.values(players).filter((p) => !p.deleted).length
  const gameCount = Object.values(games).filter((g) => !g.deleted).length

  const doExport = () => {
    const blob = new Blob([exportBackup()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `dice-and-digits-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const doImport = async (file: File) => {
    const n = importBackup(await file.text())
    toast(n === null ? t('importFailed') : t('importDone', { n }))
  }

  return (
    <Page title={t('navMore')}>
      <Card className="divide-y divide-edge !py-1 dark:divide-white/8">
        <LinkRow icon={<Users className="size-5" />} label={t('players')} detail={num(playerCount)} onClick={() => navigate('players')} />
        <LinkRow icon={<Gamepad2 className="size-5" />} label={t('games')} detail={gameCount ? num(gameCount) : undefined} onClick={() => navigate('games')} />
      </Card>

      {cloudEnabled && <CloudSection />}

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

      <Section title={t('backup')}>
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={doExport}>
            <Download className="size-5" /> {t('exportData')}
          </Button>
          <Button onClick={() => fileRef.current?.click()}>
            <Upload className="size-5" /> {t('importData')}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) doImport(f)
              e.target.value = ''
            }}
          />
        </div>
      </Section>

      <Section title={t('about')}>
        <Card className="flex items-start gap-3">
          <Logo className="size-12 shrink-0" />
          <div className="text-sm">
            <p className="text-base font-extrabold">{t('appName')}</p>
            <p className="mt-0.5 text-ink/65 dark:text-white/65">{t('aboutBody')}</p>
            {!matchMedia('(display-mode: standalone)').matches && (
              <p className="mt-2 text-ink/65 dark:text-white/65">📲 {t('installHint')}</p>
            )}
          </div>
        </Card>
      </Section>
    </Page>
  )
}

function CloudSection() {
  const { t, ago } = useI18n()
  const { group, syncing, error } = useCloud()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const create = async () => {
    if (!name.trim()) return
    setBusy(true)
    try {
      await createGroup(name.trim())
    } catch (e) {
      toast(t('syncError', { error: e instanceof Error ? e.message : String(e) }))
    } finally {
      setBusy(false)
    }
  }

  const leave = async () => {
    if (await confirm(t('leaveConfirm'), { confirmLabel: t('leaveGroup'), danger: true })) leaveGroup()
  }

  return (
    <Section title={t('cloud')}>
      <Card>
        {group ? (
          <>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-mint/15 text-mint">
                <Cloud className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold">{group.name}</span>
                <span className={cx('block text-sm', error ? 'text-danger' : 'text-ink/55 dark:text-white/55')}>
                  {syncing
                    ? t('syncing')
                    : error
                      ? t('syncError', { error })
                      : group.lastSync
                        ? t('lastSync', { time: ago(group.lastSync) })
                        : t('neverSynced')}
                </span>
              </span>
              <Button size="sm" variant="ghost" onClick={() => syncNow()} disabled={syncing} aria-label={t('syncNow')}>
                <RefreshCw className={cx('size-5', syncing && 'animate-spin')} />
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button onClick={() => shareLink(inviteLink(group), group.name, t('linkCopied'))}>
                <Link2 className="size-5" /> {t('invite')}
              </Button>
              <Button variant="danger" onClick={leave}>
                <LogOut className="size-5" /> {t('leaveGroup')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-ink/65 dark:text-white/65">{t('cloudIntro')}</p>
            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                create()
              }}
            >
              <input
                className={inputClass}
                placeholder={t('groupNamePlaceholder')}
                aria-label={t('groupName')}
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
              />
              <Button type="submit" variant="primary" className="!h-12 shrink-0" disabled={!name.trim() || busy}>
                {t('createGroup')}
              </Button>
            </form>
          </>
        )}
      </Card>
    </Section>
  )
}
