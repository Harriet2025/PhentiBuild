/**
 * Roof Studio store: one design per project. The important promises:
 *  - each design is loaded from, and saved to, the right URL
 *  - an unsaved edit is saved to the design it was made on before switching
 *  - nothing is saved before a design has loaded (no blank overwrite)
 *  - a different user on the same tab never gets the previous user's design
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { roofStudioStore as store } from './roofStudioStore'

type Call = { method: string; url: string; body: { shapes?: unknown[]; properties?: Record<string, string> } | null }
let calls: Call[]
let designs: Record<string, { shapes: unknown[]; properties: Record<string, string> }>

const keyOf = (url: string) => new URL(url, 'http://x').searchParams.get('projectId') ?? 'own'
const shape = (id: string) => ({ id, type: 'rectangle', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] })

beforeEach(() => {
  vi.useFakeTimers()
  calls = []
  designs = { own: { shapes: [], properties: { pitch: '20' } }, '7': { shapes: [shape('s1')], properties: { pitch: '35' } } }
  vi.stubGlobal('window', globalThis)
  vi.stubGlobal('document', { cookie: '' })
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    const body = init.body ? JSON.parse(String(init.body)) : null
    calls.push({ method: init.method ?? 'GET', url, body })
    const key = keyOf(url)
    if (init.method === 'PUT') designs[key] = { ...designs[key], ...body }
    if (!designs[key]) return new Response(JSON.stringify({ success: false, error: 'Not found' }), { status: 404 })
    return new Response(JSON.stringify({ success: true, data: designs[key] }), { status: 200 })
  }))
  store._reset()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const puts = () => calls.filter((c) => c.method === 'PUT')

describe('roofStudioStore — one design per project', () => {
  it('loads the own design and the project design from different URLs', async () => {
    await store.load(null, 1, () => {})
    expect(store.getProperties().pitch).toBe('20')
    expect(keyOf(calls[0].url)).toBe('own')

    await store.load(7, 1, () => {})
    expect(store.getProperties().pitch).toBe('35')
    expect(store.getShapes()).toHaveLength(1)
    expect(keyOf(calls[1].url)).toBe('7')
  })

  it('saves edits to the design they were made on, even when switching before the debounce', async () => {
    await store.load(7, 1, () => {})
    store.addShape(shape('s2'))
    await store.load(null, 1, () => {}) // switch away within 500 ms
    expect(puts()).toHaveLength(1)
    expect(keyOf(puts()[0].url)).toBe('7')
    expect(puts()[0].body?.shapes).toHaveLength(2)
    expect(designs.own.shapes).toHaveLength(0) // own design untouched
    expect(store.getShapes()).toHaveLength(0)
  })

  it('debounces saves to the current project', async () => {
    await store.load(7, 1, () => {})
    store.setProperty('pitch', '40')
    store.setProperty('pitch', '45')
    expect(puts()).toHaveLength(0)
    await vi.advanceTimersByTimeAsync(600)
    expect(puts()).toHaveLength(1)
    expect(keyOf(puts()[0].url)).toBe('7')
    expect(designs['7'].properties.pitch).toBe('45')
  })

  it('never saves before a design has loaded', async () => {
    store.setProperty('pitch', '99')
    store.addShape(shape('x'))
    await vi.advanceTimersByTimeAsync(600)
    expect(puts()).toHaveLength(0)
  })

  it('reloading the same design is a no-op, but a different user reloads', async () => {
    await store.load(null, 1, () => {})
    await store.load(null, 1, () => {})
    expect(calls).toHaveLength(1)
    await store.load(null, 2, () => {})
    expect(calls).toHaveLength(2)
  })

  it('a missing project (404) is not reported as an error', async () => {
    const onError = vi.fn()
    await store.load(999, 1, onError)
    expect(onError).not.toHaveBeenCalled()
    store.setProperty('pitch', '1')
    await vi.advanceTimersByTimeAsync(600)
    expect(puts()).toHaveLength(0) // nothing loaded -> nothing saved
  })
})
