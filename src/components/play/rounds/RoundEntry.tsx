import { useState } from 'react'
import { ArrowRight, Check, Trash2, Trophy } from 'lucide-react'
import { useI18n } from '../../../i18n'
import { buzz } from '../../../lib/haptics'
import { updateSession } from '../../../lib/store'
import { zeroSumWinner } from '../../../lib/ops'
import type { Scorer } from '../../../lib/scorer'
import { Keypad, parseKeypad } from '../../Keypad'
import { Avatar, Button, IconButton, Sheet, cx } from '../../ui'
import { seatColor } from '../../../lib/pawns'
import type { Session } from '../../../types'

/**
 * Bottom sheet: one keypad, one row per player the scorer may edit, "Next"
 * walks the rows. Rows nobody has touched show the live value, so a score a
 * player sends from their own phone while this is open is neither hidden nor
 * overwritten.
 */
export function RoundEntry({ session, scorer, index, onClose }: { session: Session; scorer: Scorer; index: number; onClose: () => void }) {
  const { t } = useI18n()
  const seats = session.seats.filter((s) => scorer.canEdit(s.id))
  const everyone = seats.length === session.seats.length
  const editing = index < session.rounds.length
  const current = session.rounds[index] ?? {}
  const [typed, setTyped] = useState<Record<string, string>>({})
  const shown = (id: string) => typed[id] ?? (current[id] != null ? String(current[id]) : '')
  const [focus, setFocus] = useState(0)
  const seat = seats[focus]
  const last = focus === seats.length - 1

  const save = () => {
    // Send what was typed, and fill still-empty rows with 0 so the round is complete.
    const ops = seats
      .filter((s) => s.id in typed || current[s.id] == null)
      .map((s) => ({ kind: 'round' as const, p: s.id, index, v: parseKeypad(typed[s.id] ?? '') ?? 0 }))

    buzz([8, 40, 8])
    scorer.apply(ops)
    onClose()
  }

  const remove = () => {
    updateSession(session.id, (s) => ({ ...s, rounds: s.rounds.filter((_, i) => i !== index) }))
    onClose()
  }

  if (!seat) {
    return null
  }

  const twoCol = seats.length > 4

  return (
    <Sheet
      open
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          {editing ? t('editRound', { n: index + 1 }) : t('roundN', { n: index + 1 })}
          {editing && everyone && (
            <IconButton label={t('deleteRound')} onClick={remove} className="ml-auto !text-danger dark:!text-[#ff8a93]">
              <Trash2 className="size-5" />
            </IconButton>
          )}
        </span>
      }
    >
      <div className={cx('mb-3 grid gap-1.5', twoCol && 'grid-cols-2')}>
        {seats.map((s, i) => {
          const v = shown(s.id)

          return (
            <button
              key={s.id}
              onClick={() => setFocus(i)}
              className={cx(
                'flex h-12 items-center gap-2 rounded-2xl px-2 text-left transition',
                i === focus ? 'bg-card ring-2 ring-accent dark:bg-night' : 'bg-ink/4 dark:bg-white/5',
              )}
            >
              <Avatar name={s.name} color={seatColor(s)} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-bold">{s.name}</span>
              <span className={cx('display text-xl font-black tabular-nums', v === '' && 'text-ink/25 dark:text-white/25', v.startsWith('-') && 'text-danger')}>
                {v || '0'}
              </span>
            </button>
          )
        })}
      </div>
      {session.rules.zeroSum && everyone && (
        <button
          className="mb-2 flex w-full items-center gap-3 rounded-2xl bg-gold/12 px-3 py-2 text-left transition active:scale-[0.98]"
          onClick={() => {
            const others = seats.filter((s) => s.id !== seat.id).map((s) => parseKeypad(shown(s.id)) ?? 0)

            setTyped((x) => ({ ...x, [seat.id]: String(zeroSumWinner(others)) }))
          }}
        >
          <Trophy className="size-5 shrink-0 text-gold" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-extrabold">
              {t('roundWinner')}: {seat.name}
            </span>
            <span className="block text-xs text-ink/55 dark:text-white/55">{t('roundWinnerHint')}</span>
          </span>
        </button>
      )}
      <Keypad value={shown(seat.id)} onChange={(v) => setTyped((x) => ({ ...x, [seat.id]: v }))} />
      <div className="mt-3 flex gap-3">
        {!last && (
          <Button size="lg" className="flex-1" onClick={save}>
            <Check className="size-5" /> {t('save')}
          </Button>
        )}
        <Button variant="primary" size="lg" className="flex-1" onClick={() => (last ? save() : setFocus(focus + 1))}>
          {last ? (
            <>
              <Check className="size-5" strokeWidth={3} /> {t('save')}
            </>
          ) : (
            <>
              <span className="truncate">{seats[focus + 1].name}</span> <ArrowRight className="size-5 shrink-0" strokeWidth={3} />
            </>
          )}
        </Button>
      </div>
    </Sheet>
  )
}
