import { LogoShapes } from './LogoShapes'

/**
 * The app mark: a die and a tally-mark score card. Same drawing as
 * public/icons/icon.svg; in the app the die takes the skin's accent (red in Classic).
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="64 64 384 384" className={className} aria-hidden>
      <LogoShapes />
    </svg>
  )
}
