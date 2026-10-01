import { useState } from 'react'
import { Copy, Minus, Play as PlayIcon, Plus, Trash2 } from 'lucide-react'
import { GAME_EMOJIS } from '../data/presets'
import { useI18n } from '../i18n'
import { findGame } from '../lib/games'
import { removeGame, saveGame, uid } from '../lib/store'
import { goBack, navigate } from '../hooks/useRoute'
import { confirm } from '../components/dialogs'
import { ModeBadge } from '../components/ModeBadge'
import { BottomBar, Button, Card, Empty, IconButton, Page, Section, Segmented, Toggle, cx, inputClass } from '../components/ui'
import type { Category, GameDef, ScoringMode } from '../types'

const blank = (): GameDef => ({
  id: uid(),
  emoji: '🎲',
  name: '',
  mode: 'sheet',
  lowWins: false,
  categories: [{ id: uid().slice(0, 8), name: '' }],
  steps: [1, 5, 10],
  updatedAt: 0,
})

export function GameEditor({ id }: { id: string }) {
  const { t } = useI18n()
  const existing = id === 'new' ? undefined : findGame(id)

  if (id !== 'new' && (!existing || existing.deleted)) {
    return (
      <Page back="games">
        <Empty icon="🤷" title="404" />
      </Page>
    )
  }

  if (existing?.builtin) {
    return <BuiltinView game={existing} />
  }

  return <Editor key={id} initial={existing ?? blank()} isNew={!existing} title={existing ? t('editGameDef') : t('newGameDef')} />
}

function BuiltinView({ game }: { game: GameDef }) {
  const { t, text } = useI18n()

  const duplicate = () => {
    const copy: GameDef = {
      ...game,
      id: uid(),
      builtin: undefined,
      name: `${text(game.name)} (2)`,
      // Resolve bilingual labels into the current language: the copy is the user's now.
      categories: game.categories?.map((c) => ({ ...c, name: text(c.name) })),
      bonus: game.bonus && { ...game.bonus, name: text(game.bonus.name) },
      updatedAt: 0,
    }

    saveGame(copy)
    navigate(`games/${copy.id}`, { replace: true })
  }

  return (
    <Page title={`${game.emoji} ${text(game.name)}`} back="games">
      <Card>
        <span className="text-xs font-extrabold tracking-wide text-ink/45 uppercase dark:text-white/45">{t('builtin')}</span>
        <ModeBadge mode={game.mode} target={game.target} lowWins={game.lowWins} />
        {game.categories && (
          <ul className="mt-3 space-y-1">
            {game.categories.map((c) => (
              <li key={c.id} className="flex items-center gap-2 font-semibold">
                <span className={cx('size-1.5 rounded-full', c.negative ? 'bg-danger' : 'bg-accent')} />
                {text(c.name)}
                {c.negative && <span className="text-danger">(−)</span>}
                {c.per && c.per !== 1 && <span className="text-accent">×{c.per}</span>}
                {c.div && <span className="text-accent">÷{c.div}</span>}
              </li>
            ))}
            {game.bonus && (
              <li className="flex items-center gap-2 font-semibold text-mint">
                <span className="size-1.5 rounded-full bg-mint" />
                {text(game.bonus.name)}: +{game.bonus.points} (≥ {game.bonus.atLeast})
              </li>
            )}
          </ul>
        )}
        {game.zeroSum && <p className="mt-3 text-sm font-semibold text-ink/60 dark:text-white/60">🏆 {t('zeroSumHint')}</p>}
        {game.mode === 'winner' && <p className="mt-3 text-sm font-semibold text-ink/60 dark:text-white/60">{t('modeWinnerHint')}</p>}
        {game.steps && (
          <p className="mt-3 text-sm font-semibold text-ink/60 dark:text-white/60">
            {t('quickButtons')}: {game.steps.map((s) => `+${s}`).join(' ')}
          </p>
        )}
      </Card>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button onClick={duplicate}>
          <Copy className="size-5" /> {t('duplicate')}
        </Button>
        <Button variant="primary" onClick={() => navigate(`new/${encodeURIComponent(game.id)}`)}>
          <PlayIcon className="size-5" /> {t('newGame')}
        </Button>
      </div>
    </Page>
  )
}

function Editor({ initial, isNew, title }: { initial: GameDef; isNew: boolean; title: string }) {
  const { t, text } = useI18n()
  const [g, setG] = useState<GameDef>(initial)
  const [stepsText, setStepsText] = useState((initial.steps ?? [1, 5, 10]).join(', '))
  const [target, setTarget] = useState(initial.target ? String(initial.target) : '')
  const patch = (p: Partial<GameDef>) => setG((x) => ({ ...x, ...p }))

  const cats = g.categories ?? []
  const setCat = (i: number, p: Partial<Category>) => patch({ categories: cats.map((c, k) => (k === i ? { ...c, ...p } : c)) })

  const name = text(g.name).trim()
  const validCats = cats.filter((c) => text(c.name).trim())
  const valid = name && (g.mode !== 'sheet' || validCats.length > 0)

  const save = () => {
    if (!valid) {
      return
    }

    const steps = stepsText
      .split(/[,\s]+/)
      .map((s) => parseInt(s, 10))
      .filter((n) => Number.isFinite(n) && n > 0)
      .slice(0, 4)
    const tgt = parseInt(target, 10)

    saveGame({
      ...g,
      name,
      target: Number.isFinite(tgt) && tgt > 0 ? tgt : undefined,
      steps: g.mode === 'counter' ? (steps.length ? steps : [1]) : undefined,
      categories: g.mode === 'sheet' ? validCats.map((c) => ({ ...c, name: text(c.name).trim() })) : undefined,
      bonus: g.mode === 'sheet' ? g.bonus : undefined,
      zeroSum: g.mode === 'rounds' ? g.zeroSum : undefined,
    })
    goBack('games')
  }

  const del = async () => {
    if (!(await confirm(t('deleteGameDefConfirm', { name }), { confirmLabel: t('delete'), danger: true }))) {
      return
    }

    removeGame(g.id)
    navigate('games', { replace: true })
  }

  const modes: { value: ScoringMode; label: string }[] = [
    { value: 'counter', label: t('modeCounter') },
    { value: 'rounds', label: t('modeRounds') },
    { value: 'sheet', label: t('modeSheet') },
    { value: 'winner', label: t('modeWinner') },
  ]
  const hint = { counter: t('modeCounterHint'), rounds: t('modeRoundsHint'), sheet: t('modeSheetHint'), winner: t('modeWinnerHint') }[g.mode]

  return (
    <Page
      title={title}
      back="games"
      bare
      actions={
        !isNew && (
          <IconButton label={t('delete')} onClick={del} className="text-danger dark:text-[#ff8a93]">
            <Trash2 className="size-5" />
          </IconButton>
        )
      }
    >
      <input className={inputClass} placeholder={t('gameName')} value={text(g.name)} onChange={(e) => patch({ name: e.target.value })} maxLength={50} autoFocus={isNew} />

      <Section title={t('icon')}>
        <div className="grid grid-cols-8 gap-1.5">
          {GAME_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => patch({ emoji: e })}
              className={cx('flex aspect-square items-center justify-center rounded-xl text-2xl transition', g.emoji === e ? 'bg-accent/15 ring-2 ring-accent' : 'surface-flat')}
            >
              {e}
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('scoringMode')}>
        <Segmented grid value={g.mode} onChange={(mode) => patch({ mode })} options={modes} />
        <p className="mt-2 px-1 text-sm text-ink/60 dark:text-white/60">{hint}</p>
      </Section>

      {g.mode === 'sheet' && (
        <Section title={t('categories')}>
          <div className="space-y-2">
            {cats.map((c, i) => (
              <div key={c.id} className="flex items-center gap-2">
                <input
                  className={cx(inputClass, '!h-11')}
                  placeholder={`${t('categoryName')} ${i + 1}`}
                  value={text(c.name)}
                  maxLength={40}
                  onChange={(e) => setCat(i, { name: e.target.value })}
                />
                {c.div ? (
                  <span className="flex h-11 w-14 shrink-0 items-center justify-center rounded-xl text-sm font-black text-accent ring-1 ring-edge dark:ring-white/10">
                    ÷{c.div}
                  </span>
                ) : (
                  <label className="flex h-11 w-16 shrink-0 items-center rounded-xl pl-2 ring-1 ring-edge focus-within:ring-2 focus-within:ring-accent dark:ring-white/10" title={t('perItem')}>
                    <span className="text-sm font-black text-ink/40 dark:text-white/40">×</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      aria-label={t('perItem')}
                      className="w-full bg-transparent px-1 text-center font-bold outline-none"
                      value={c.per ?? ''}
                      placeholder="1"
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10)

                        setCat(i, { per: Number.isFinite(n) && n > 1 ? n : undefined })
                      }}
                    />
                  </label>
                )}
                <button
                  onClick={() => setCat(i, { negative: !c.negative })}
                  aria-pressed={!!c.negative}
                  title={t('negativeCategory')}
                  className={cx(
                    'flex size-11 shrink-0 items-center justify-center rounded-xl ring-1 transition',
                    c.negative ? 'bg-danger text-white ring-danger' : 'text-ink/40 ring-edge dark:text-white/40 dark:ring-white/10',
                  )}
                >
                  <Minus className="size-5" strokeWidth={3} />
                </button>
                <IconButton label={t('delete')} onClick={() => patch({ categories: cats.filter((_, k) => k !== i) })} disabled={cats.length === 1}>
                  <Trash2 className="size-5" />
                </IconButton>
              </div>
            ))}
          </div>
          <p className="mt-2 flex items-center gap-1.5 px-1 text-xs text-ink/55 dark:text-white/55">
            <span className="inline-flex size-4 items-center justify-center rounded bg-danger text-white">
              <Minus className="size-3" strokeWidth={3} />
            </span>
            {t('negativeCategory')}
          </p>
          <Button variant="ghost" className="mt-2 w-full" onClick={() => patch({ categories: [...cats, { id: uid().slice(0, 8), name: '' }] })}>
            <Plus className="size-5" /> {t('addCategory')}
          </Button>
        </Section>
      )}

      <Section title={t('options')}>
        <Card className="!py-2">
          <Toggle checked={g.lowWins} onChange={(lowWins) => patch({ lowWins })} label={t('lowestWins')} />
          {g.mode === 'rounds' && (
            <div className="border-t border-edge dark:border-white/8">
              <Toggle checked={!!g.zeroSum} onChange={(zeroSum) => patch({ zeroSum })} label={t('zeroSum')} hint={t('zeroSumHint')} />
            </div>
          )}
          <label className="flex items-center gap-3 border-t border-edge py-3 dark:border-white/8">
            <span className="flex-1 font-semibold">{t('targetScore')}</span>
            <input type="number" inputMode="numeric" min={1} className={cx(inputClass, '!w-28 text-right')} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="—" />
          </label>
          {g.mode === 'counter' && (
            <label className="block border-t border-edge py-3 dark:border-white/8">
              <span className="block font-semibold">{t('quickButtons')}</span>
              <span className="mb-2 block text-sm text-ink/55 dark:text-white/55">{t('quickButtonsHint')}</span>
              <input className={inputClass} value={stepsText} onChange={(e) => setStepsText(e.target.value)} inputMode="numeric" />
            </label>
          )}
        </Card>
      </Section>

      <BottomBar>
        <Button variant="primary" size="lg" className="flex-1" onClick={save} disabled={!valid}>
          {g.mode === 'sheet' && !validCats.length ? t('categoriesNeeded') : t('save')}
        </Button>
      </BottomBar>
    </Page>
  )
}
