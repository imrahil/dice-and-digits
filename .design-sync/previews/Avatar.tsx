import { Avatar } from 'dice-and-digits-ui'
import { seats } from './fixtures'

/** Initials on the player's colour, outlined like a sticker. */
export function Sizes() {
  return (
    <div className="flex items-end gap-3">
      <Avatar name="Ola Nowak" color="#e05a9c" size="lg" />
      <Avatar name="Kuba" color="#2e86de" size="md" />
      <Avatar name="Maja" color="#2a9d5c" size="sm" />
    </div>
  )
}

/** A table of players. */
export function Players() {
  return (
    <div className="flex gap-2">
      {seats.map((s) => (
        <Avatar key={s.id} name={s.name} color={s.color} />
      ))}
    </div>
  )
}

/** Overlapping stack, as in game rows: ring each one in the card colour. */
export function Stack() {
  return (
    <span className="flex -space-x-1.5">
      {seats.map((s) => (
        <span key={s.id} className="rounded-full ring-2 ring-card">
          <Avatar name={s.name} color={s.color} size="sm" />
        </span>
      ))}
    </span>
  )
}
