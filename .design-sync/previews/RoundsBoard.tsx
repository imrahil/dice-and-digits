import { useState } from 'react'
import { RoundsBoard } from 'dice-and-digits-ui'
import { scorer, thousand } from './fixtures'

/** Entering round 4 of Thousand: one keypad, a row per player, "next" walks the rows. */
export function EnteringRound() {
  const [entry, setEntry] = useState<number | null>(3)

  return (
    <div className="skin-bg relative h-[860px] w-[420px] overflow-hidden rounded-3xl px-4 pt-4 [transform:translateZ(0)]">
      <RoundsBoard session={thousand} scorer={scorer} entry={entry} setEntry={setEntry} />
    </div>
  )
}

/** The running table; tap a row to edit that round. */
export function Table() {
  const [entry, setEntry] = useState<number | null>(null)

  return (
    <div className="w-[420px]">
      <RoundsBoard session={thousand} scorer={scorer} entry={entry} setEntry={setEntry} />
    </div>
  )
}

/** Before the first round. */
export function NoRounds() {
  const [entry, setEntry] = useState<number | null>(null)

  return (
    <div className="w-[420px]">
      <RoundsBoard session={{ ...thousand, rounds: [] }} scorer={scorer} entry={entry} setEntry={setEntry} />
    </div>
  )
}
