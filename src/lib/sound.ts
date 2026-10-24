let shared: AudioContext | null = null

/** The one audio context, resumed if the browser suspended it; null where there is no audio. */
function audio(): AudioContext | null {
  try {
    shared ??= new AudioContext()

    if (shared.state === 'suspended') {
      shared.resume().catch(() => {})
    }

    return shared
  } catch {
    return null
  }
}

/**
 * Call from a tap. iOS only plays Web Audio from a context started by a user
 * gesture, and the sounds here go off later, from a timer.
 */
export function unlockAudio() {
  audio()
}

/** A short 880 Hz beep for a timer going off; silent where audio isn't allowed. */
export function beep() {
  const ctx = audio()

  if (!ctx) {
    // No audio: the vibration and the screen still say it.
    return
  }

  const o = ctx.createOscillator()
  const g = ctx.createGain()

  o.connect(g)
  g.connect(ctx.destination)
  o.frequency.value = 880
  g.gain.setValueAtTime(0.25, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
  o.start()
  o.stop(ctx.currentTime + 0.8)
}

/** The Hot Potato going off; silent where audio isn't allowed. */
export function explosion() {
  const ctx = audio()

  if (ctx) {
    renderExplosion(ctx, ctx.currentTime + 0.01)
  }
}

/** How long an explosion rings, in seconds. */
export const EXPLOSION_SECONDS = 2.8

/**
 * An explosion, synthesized: a sharp crack, a noise blast whose brightness
 * falls away, a low thump that drops in pitch (with an octave above it, so
 * phone speakers that can't play the fundamental still suggest it), a
 * rumbling tail and scattered debris. Every blast varies a little.
 * Takes any context so it can be rendered offline.
 */
export function renderExplosion(ctx: BaseAudioContext, at: number, random: () => number = Math.random) {
  const vary = (lo: number, hi: number) => lo + random() * (hi - lo)
  const len = vary(0.85, 1.15)

  // Master: a little soft clipping for grit, then a compressor so it is loud but never clips.
  const master = ctx.createGain()
  const grit = ctx.createWaveShaper()
  const comp = ctx.createDynamicsCompressor()

  master.gain.value = 0.9
  grit.curve = softClip(3)
  comp.threshold.value = -12
  comp.knee.value = 6
  comp.ratio.value = 6
  comp.attack.value = 0.002
  comp.release.value = 0.25
  master.connect(grit)
  grit.connect(comp)
  comp.connect(ctx.destination)

  const white = noise(ctx, EXPLOSION_SECONDS, random)
  const brown = noise(ctx, EXPLOSION_SECONDS, random, true)

  // Gain envelope: silent, up to `peak` in `attack`, then exponential decay to nothing by `end`.
  const envelope = (peak: number, attack: number, end: number, hold?: [number, number]) => {
    const g = ctx.createGain()

    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(peak, at + attack)

    if (hold) {
      g.gain.exponentialRampToValueAtTime(hold[0], at + hold[1])
    }

    g.gain.exponentialRampToValueAtTime(0.0001, at + end)
    g.connect(master)

    return g
  }

  const play = (src: AudioScheduledSourceNode, from: number, until: number) => {
    src.start(from)
    src.stop(until)
  }

  // 1. The crack: bright noise, gone in a tenth of a second.
  const crack = ctx.createBufferSource()
  const crackFilter = ctx.createBiquadFilter()

  crack.buffer = white
  crackFilter.type = 'highpass'
  crackFilter.frequency.value = 1500
  crack.connect(crackFilter)
  crackFilter.connect(envelope(1, 0.002, 0.12))
  play(crack, at, at + 0.15)

  // 2. The blast: noise through a low-pass that closes from bright to dull.
  const blast = ctx.createBufferSource()
  const blastFilter = ctx.createBiquadFilter()

  blast.buffer = white
  blastFilter.type = 'lowpass'
  blastFilter.Q.value = 1
  blastFilter.frequency.setValueAtTime(vary(3500, 5500), at)
  blastFilter.frequency.exponentialRampToValueAtTime(320, at + 0.6 * len)
  blastFilter.frequency.exponentialRampToValueAtTime(110, at + 1.8 * len)
  blast.connect(blastFilter)
  blastFilter.connect(envelope(0.9, 0.006, 1.9 * len, [0.3, 0.35 * len]))
  play(blast, at, at + 2 * len)

  // 3. The thump: a sine sweeping down, plus its octave for small speakers.
  for (const [mult, peak] of [[1, 1], [2, 0.45]]) {
    const thump = ctx.createOscillator()
    const from = vary(95, 125) * mult

    thump.frequency.setValueAtTime(from, at)
    thump.frequency.exponentialRampToValueAtTime(from * 0.33, at + 0.5 * len)
    thump.connect(envelope(peak, 0.004, 0.95 * len))
    play(thump, at, at + len)
  }

  // 4. The rumble: deep brown noise that outlasts everything else.
  const rumble = ctx.createBufferSource()
  const rumbleFilter = ctx.createBiquadFilter()

  rumble.buffer = brown
  rumbleFilter.type = 'lowpass'
  rumbleFilter.frequency.value = 260
  rumble.connect(rumbleFilter)
  rumbleFilter.connect(envelope(0.7, 0.05, 2.6 * len))
  play(rumble, at, at + EXPLOSION_SECONDS)

  // 5. Debris: short crackles scattered through the first second.
  const pops = 6 + Math.floor(random() * 5)

  for (let i = 0; i < pops; i++) {
    const t = at + vary(0.12, 1.1) * len
    const pop = ctx.createBufferSource()
    const popFilter = ctx.createBiquadFilter()
    const g = ctx.createGain()
    const dur = vary(0.015, 0.045)

    pop.buffer = white
    popFilter.type = 'bandpass'
    popFilter.frequency.value = vary(1200, 4000)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vary(0.08, 0.3), t + 0.003)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    pop.connect(popFilter)
    popFilter.connect(g)
    g.connect(master)
    play(pop, t, t + dur + 0.01)
  }
}

/** Mono noise: white, or brown (integrated white, deeper and rumblier). */
function noise(ctx: BaseAudioContext, seconds: number, random: () => number, brown = false): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.ceil(seconds * ctx.sampleRate), ctx.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0

  for (let i = 0; i < data.length; i++) {
    const w = random() * 2 - 1

    if (brown) {
      last = (last + 0.02 * w) / 1.02
      data[i] = last * 3.5
    } else {
      data[i] = w
    }
  }

  return buffer
}

/** A tanh curve: gentle saturation that rounds peaks instead of chopping them. */
function softClip(drive: number): Float32Array<ArrayBuffer> {
  const n = 1024
  const curve = new Float32Array(n)

  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1

    curve[i] = Math.tanh(drive * x) / Math.tanh(drive)
  }

  return curve
}

/** Whole seconds as m:ss. */
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`
