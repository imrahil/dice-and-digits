import { afterEach, describe, expect, it, vi } from 'vitest'

type Sound = typeof import('./sound')

/** The module keeps one AudioContext, so every test gets a fresh copy. */
async function freshSound(): Promise<Sound> {
  vi.resetModules()

  return import('./sound')
}

/** Just enough of the Web Audio API to record what an explosion schedules. */
function fakeContext() {
  const sources: { start?: number; stop?: number }[] = []
  const param = () => ({ value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() })
  const node = () => ({ connect: vi.fn(), gain: param(), frequency: param(), Q: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() })

  const source = () => {
    const s: { start?: number; stop?: number } = {}

    sources.push(s)

    return {
      ...node(),
      start: (t: number) => (s.start = t),
      stop: (t: number) => (s.stop = t),
    }
  }

  const ctx = {
    sampleRate: 8000,
    currentTime: 0,
    destination: {},
    state: 'running',
    createGain: node,
    createBiquadFilter: node,
    createWaveShaper: node,
    createDynamicsCompressor: node,
    createOscillator: source,
    createBufferSource: source,
    createBuffer: (_: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
  }

  return { ctx, sources }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('sounds', () => {
  it('stay silent, without throwing, where there is no Web Audio', async () => {
    const s = await freshSound()

    expect(() => s.unlockAudio()).not.toThrow()
    expect(() => s.beep()).not.toThrow()
    expect(() => s.explosion()).not.toThrow()
  })

  it('an explosion starts every layer on time and stops all of them within its length', async () => {
    const s = await freshSound()
    const { ctx, sources } = fakeContext()

    s.renderExplosion(ctx as unknown as BaseAudioContext, 1)

    // Crack, blast, two thumps, rumble, and at least six debris pops.
    expect(sources.length).toBeGreaterThanOrEqual(11)

    for (const src of sources) {
      expect(src.start).toBeGreaterThanOrEqual(1)
      expect(src.stop).toBeGreaterThan(src.start!)
      expect(src.stop).toBeLessThanOrEqual(1 + s.EXPLOSION_SECONDS)
    }
  })

  it('one shared context: unlocking on a tap is what a later explosion plays on', async () => {
    const made: unknown[] = []

    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          made.push(this)
          Object.assign(this, fakeContext().ctx)
        }
      },
    )

    const s = await freshSound()

    s.unlockAudio()
    s.explosion()
    s.beep()
    expect(made).toHaveLength(1)
  })
})
