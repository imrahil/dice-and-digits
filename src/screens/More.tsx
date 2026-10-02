import { useRef, useState, type ReactNode } from 'react'
import { Check, ChevronRight, Cloud, Copy, Download, Gamepad2, KeyRound, LogOut, QrCode, RefreshCw, Share2, Trash2, TriangleAlert, Upload, Users } from 'lucide-react'
import { useI18n } from '../i18n'
import {
  cloudEnabled,
  createBackup,
  createGroup,
  deleteBackup,
  inviteLink,
  leaveGroup,
  markCodeSaved,
  syncNow,
  useCloud,
  type Group,
} from '../lib/cloud'
import { codeWords } from '../lib/recovery'
import { exportBackup, importBackup, setSettings, useStore } from '../lib/store'
import { navigate } from '../hooks/useRoute'
import { confirm, toast } from '../components/dialogs'
import { Logo } from '../components/Logo'
import { Button, Card, Page, Section, Segmented, Sheet, Toggle, cx, inputClass } from '../components/ui'
import { QrCode as QrImage, QrShareSheet, shareUrl } from '../components/QrShare'
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

function LinkRow({ icon, label, detail, onClick }: { icon: ReactNode; label: string; detail?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 py-3 text-left first:pt-1 last:pb-1">
      <span className="emoji-tile flex size-9 items-center justify-center rounded-xl text-accent">{icon}</span>
      <span className="flex-1 font-bold">{label}</span>
      {detail && <span className="text-sm font-semibold text-ink/50 dark:text-white/50">{detail}</span>}
      <ChevronRight className="size-5 text-ink/30 dark:text-white/30" />
    </button>
  )
}

export function More() {
  const { t, num, date } = useI18n()
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

      {cloudEnabled && <BackupSection />}
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

              if (f) {
                doImport(f)
              }

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

/** Group name, last sync or error, and a sync button. */
function SyncStatus({ group }: { group: Group }) {
  const { t, ago } = useI18n()
  const { syncing, error } = useCloud()

  return (
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
  )
}

/**
 * Personal backup: a group of one opened by a recovery code. With a shared
 * group the group already holds a copy, so this only points at its link.
 */
function BackupSection() {
  const { t } = useI18n()
  const { group } = useCloud()
  const [busy, setBusy] = useState(false)
  const [kit, setKit] = useState(false)
  const [invite, setInvite] = useState(false)

  const create = async () => {
    setBusy(true)

    try {
      await createBackup(t('myBackup'))
      setKit(true)
    } catch (e) {
      toast(t('syncError', { error: e instanceof Error ? e.message : String(e) }))
    } finally {
      setBusy(false)
    }
  }

  const turnOff = async () => {
    if (await confirm(t('turnOffConfirm'), { confirmLabel: t('turnOffBackup'), danger: true })) {
      leaveGroup()
    }
  }

  const remove = async () => {
    if (!(await confirm(t('deleteBackupConfirm'), { confirmLabel: t('deleteBackup'), danger: true }))) {
      return
    }

    try {
      await deleteBackup()
      toast(t('backupDeleted'))
    } catch (e) {
      toast(t('syncError', { error: e instanceof Error ? e.message : String(e) }))
    }
  }

  if (group && group.kind !== 'vault') {
    return (
      <Section title={t('backupCloud')}>
        <Card>
          <p className="text-sm text-ink/65 dark:text-white/65">{t('groupKeepsCopy')}</p>
          <Button className="mt-3 w-full" onClick={() => setInvite(true)}>
            <QrCode className="size-5" /> {t('saveInviteLink')}
          </Button>
        </Card>
        <QrShareSheet open={invite} onClose={() => setInvite(false)} title={group.name} caption={t('scanToJoinGroup')} url={inviteLink(group)} />
      </Section>
    )
  }

  return (
    <Section title={t('backupCloud')}>
      <Card>
        {group ? (
          <>
            <SyncStatus group={group} />
            {!group.savedAt && (
              <p role="alert" className="mt-3 flex items-start gap-2 surface-flat rounded-2xl p-3 text-sm font-semibold">
                <TriangleAlert className="size-5 shrink-0 text-gold" /> {t('saveCodeWarning')}
              </p>
            )}
            <Button variant={group.savedAt ? 'secondary' : 'primary'} className="mt-4 w-full" onClick={() => setKit(true)}>
              <KeyRound className="size-5" /> {t('recoveryCode')}
            </Button>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Button onClick={turnOff}>
                <LogOut className="size-5" /> {t('turnOffBackup')}
              </Button>
              <Button variant="danger" onClick={remove}>
                <Trash2 className="size-5" /> {t('deleteBackup')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-ink/65 dark:text-white/65">{t('backupIntro')}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Button variant="primary" onClick={create} disabled={busy}>
                <Cloud className="size-5" /> {t('createBackup')}
              </Button>
              <Button onClick={() => navigate('restore')}>
                <KeyRound className="size-5" /> {t('restoreFromCode')}
              </Button>
            </div>
          </>
        )}
      </Card>
      {group && <RecoveryKit group={group} open={kit} onClose={() => setKit(false)} />}
    </Section>
  )
}

/** The recovery code and link as QR, to save somewhere safe. Generated on the phone, like every QR here. */
function RecoveryKit({ group, open, onClose }: { group: Group; open: boolean; onClose: () => void }) {
  const { t, lang } = useI18n()
  const url = inviteLink(group)
  const words = group.code ? codeWords(group.code, lang) : []

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(words.join(' '))
      toast(t('codeCopied'))
    } catch {
      // No clipboard: the words are on screen and selectable.
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('recoveryCode')}>
      <p className="text-sm text-ink/65 dark:text-white/65">{t('recoveryHint')}</p>
      {words.length > 0 && (
        <ol data-testid="recovery-words" data-words={words.join(' ')} className="mt-3 grid grid-cols-2 gap-2">
          {words.map((w, i) => (
            <li key={i} className="flex items-baseline gap-2 surface-flat rounded-2xl px-3 py-2.5">
              <span className="display w-4 text-sm font-black text-ink/40 tabular-nums dark:text-white/40">{i + 1}</span>
              <span className="display text-xl font-black select-all">{w}</span>
            </li>
          ))}
        </ol>
      )}
      <div className="mt-3 flex justify-center">
        <div className="rounded-3xl bg-white p-2 shadow-sm ring-1 ring-edge dark:ring-0">
          <QrImage text={url} className="size-44 max-h-[50vw] max-w-[50vw]" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Button onClick={copy} disabled={!words.length}>
          <Copy className="size-5" /> {t('copyCode')}
        </Button>
        <Button onClick={() => shareUrl(url, group.name, t('linkCopied'))}>
          <Share2 className="size-5" /> {t('shareLink')}
        </Button>
      </div>
      <Button
        variant="primary"
        className="mt-3 w-full"
        onClick={() => {
          markCodeSaved()
          onClose()
        }}
      >
        <Check className="size-5" strokeWidth={3} /> {t('codeSaved')}
      </Button>
    </Sheet>
  )
}

function CloudSection() {
  const { t } = useI18n()
  const { group } = useCloud()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [qr, setQr] = useState(false)

  const create = async () => {
    if (!name.trim()) {
      return
    }

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
    if (await confirm(t('leaveConfirm'), { confirmLabel: t('leaveGroup'), danger: true })) {
      leaveGroup()
    }
  }

  return (
    <Section title={t('cloud')}>
      <Card>
        {group?.kind === 'vault' ? (
          <p className="text-sm text-ink/65 dark:text-white/65">{t('groupWhileBackup')}</p>
        ) : group ? (
          <>
            <SyncStatus group={group} />
            <p className="mt-3 text-sm text-ink/65 dark:text-white/65">{t('cloudInGroupHint')}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button onClick={() => setQr(true)}>
                <QrCode className="size-5" /> {t('invite')}
              </Button>
              <Button variant="danger" onClick={leave}>
                <LogOut className="size-5" /> {t('leaveGroup')}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2 text-sm text-ink/65 dark:text-white/65">
              <p>{t('cloudIntro')}</p>
              <p>{t('cloudOptional')}</p>
              <details>
                <summary className="cursor-pointer py-2 font-bold text-accent">{t('cloudHowItWorks')}</summary>
                <div className="space-y-2">
                  <p>{t('cloudShared')}</p>
                  <p>{t('cloudHowJoin')}</p>
                  <p>{t('cloudSamePlayers')}</p>
                </div>
              </details>
            </div>
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
      {group && group.kind !== 'vault' && (
        <QrShareSheet open={qr} onClose={() => setQr(false)} title={group.name} caption={t('scanToJoinGroup')} url={inviteLink(group)} />
      )}
    </Section>
  )
}
