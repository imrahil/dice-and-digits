import { useState } from 'react'
import { ArrowDown, Check } from 'lucide-react'
import { useI18n } from '../../i18n'
import { buzz } from '../../lib/haptics'
import { cellPoints, isCount } from '../../lib/scoring'
import type { Scorer } from '../../lib/scorer'
import { Keypad, parseKeypad } from '../Keypad'
import { KeypadDisplay } from '../KeypadDisplay'
import { Avatar, Button, Sheet } from '../ui'
import { seatColor } from '../../lib/pawns'
import { RateBadge } from './sheet/RateBadge'
import type { Cell } from './sheet/SheetTable'
import { SheetTable } from './sheet/SheetTable'
import type { Session } from '../../types'

export function SheetBoard({ session, scorer }: { session: Session; scorer: Scorer }) {
  const { t, tp, text } = useI18n()
  const cats = session.rules.categories ?? []
  const [cell, setCell] = useState<Cell | null>(null)
  const [value, setValue] = useState('')

  const open = (c: Cell) => {
    const v = session.sheet[cats[c.cat].id]?.[session.seats[c.seat].id]

    setValue(v == null ? '' : String(v))
    setCell(c)
  }

  /** The next cell this scorer may fill: down the column, then the next editable player's column. */
  const after = (c: Cell): Cell | null => {
    if (c.cat < cats.length - 1) {
      return { cat: c.cat + 1, seat: c.seat }
    }

    for (let si = c.seat + 1; si < session.seats.length; si++) {
      if (scorer.canEdit(session.seats[si].id)) {
        return { cat: 0, seat: si }
      }
    }

    return null
  }

  /** Store the value, then walk down the player's column (the way people fill a score pad). */
  const commit = (advance: boolean) => {
    if (!cell) {
      return
    }

    const cat = cats[cell.cat]
    const seat = session.seats[cell.seat]

    buzz(8)
    scorer.apply([{ kind: 'cell', p: seat.id, cat: cat.id, v: parseKeypad(value) }])
    const next = advance ? after(cell) : null

    if (next) {
      const v = session.sheet[cats[next.cat].id]?.[session.seats[next.seat].id]

      setValue(v == null ? '' : String(v))
      setCell(next)
    } else {
      setCell(null)
    }
  }

  const cat = cell ? cats[cell.cat] : null
  const seat = cell ? session.seats[cell.seat] : null
  const next = cell ? after(cell) : null

  return (
    <>
      <SheetTable session={session} onCell={open} canEdit={scorer.canEdit} active={cell} />
      <Sheet
        open={!!cell}
        onClose={() => setCell(null)}
        title={
          seat && (
            <span className="flex items-center gap-2">
              <Avatar name={seat.name} color={seatColor(seat)} size="sm" />
              <span className="truncate">{seat.name}</span>
            </span>
          )
        }
      >
        <KeypadDisplay value={value} prefix={cat ? text(cat.name) + (cat.negative ? ' (−)' : '') : ''} />
        {cat && isCount(cat) && (
          <p className="-mt-1 mb-3 flex items-center justify-end gap-2 px-1 text-sm font-bold text-ink/60 dark:text-white/60">
            <RateBadge c={cat} />
            <span className="tabular-nums">= {tp('nPoints', cellPoints(cat, parseKeypad(value) ?? 0))}</span>
          </p>
        )}
        <Keypad value={value} onChange={setValue} allowNegative={!cat?.negative && !(cat && isCount(cat))} />
        <div className="mt-3 flex gap-3">
          {next && (
            <Button size="lg" className="flex-1" onClick={() => commit(false)}>
              <Check className="size-5" /> {t('done')}
            </Button>
          )}
          <Button variant="primary" size="lg" className="flex-1" onClick={() => commit(!!next)}>
            {!next ? (
              <>
                <Check className="size-5" strokeWidth={3} /> {t('done')}
              </>
            ) : (
              <>
                <span className="truncate">
                  {next.cat === 0 ? session.seats[next.seat].name : text(cats[next.cat].name)}
                </span>
                <ArrowDown className="size-5 shrink-0" strokeWidth={3} />
              </>
            )}
          </Button>
        </div>
      </Sheet>
    </>
  )
}
