/** A short 880 Hz beep for a timer going off; silent where audio isn't allowed. */
export function beep() {
  try {
    const ctx = new AudioContext()
    const o = ctx.createOscillator()
    const g = ctx.createGain()

    o.connect(g)
    g.connect(ctx.destination)
    o.frequency.value = 880
    g.gain.setValueAtTime(0.25, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
    o.start()
    o.stop(ctx.currentTime + 0.8)
    o.onended = () => ctx.close()
  } catch {
    // No audio: the vibration and the screen still say it.
  }
}

/** Whole seconds as m:ss. */
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`
