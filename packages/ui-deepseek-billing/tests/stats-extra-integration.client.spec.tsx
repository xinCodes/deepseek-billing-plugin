// @vitest-environment jsdom
/**
 * Full-chain integration of the stats-strip fusion: a stats-like entry
 * declares a session-scoped child slot, a contributor registers into it
 * through the declaration-deferred inject path, and the contributor's
 * projection-based label renders inside the host line — all through the REAL
 * SlotCore and the REAL web-react renderer (root binding included).
 */
import { describe, expect, it } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { afterEach } from 'vitest'
import { SlotCore } from '@deepseek-ai/dsh-client-ui-slots'
import type {
  HostObservable, PropsRenderSlots, SessionMaybeProvideInfo, SessionProvideInfo,
  SlotRendererHost,
} from '@deepseek-ai/dsh-client-ui-slots'
import { createSlotRenderer } from '@deepseek-ai/dsh-client-web-react'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'test.dock': { kind: 'list'; scope: 'session' }
    'test.extra': { kind: 'list'; scope: 'session' }
  }
}

afterEach(cleanup)

function observable<T>(initial: T): HostObservable<T> & { set(next: T): void } {
  let value = initial
  const subs = new Set<() => void>()
  return {
    getSnapshot: () => value,
    subscribe: (fn: () => void) => { subs.add(fn); return () => { subs.delete(fn) } },
    set: (next: T) => { value = next; for (const fn of [...subs]) fn() },
  }
}

/** Stats-like host line: renders its declared child slot inline. */
function StatsHost({ renderSlot }: PropsRenderSlots<'test.extra'>) {
  return <div data-host="stats"><span>1 轮 · 2 步</span>{renderSlot('test.extra', {})}</div>
}

/** Contributor: reads the projection and renders an inline label. */
function ExtraGroup({ useProjection }: { useProjection: (key: string) => unknown }) {
  const value = useProjection('tokenUsage') as { total: number } | undefined
  if (value === undefined) return null
  return <span data-extra="cost">会话 ¥{value.total}</span>
}

/** Root frame body with a slot dispatch seat. */
function RootFrame({ renderSlot }: PropsRenderSlots<'test.dock'>) {
  return <>{renderSlot('test.dock', {})}</>
}

interface Harness {
  host: SlotRendererHost
  usage: ReturnType<typeof observable<{ total: number } | undefined>>
}

function harness(): Harness {
  const core = new SlotCore()
  const usage = observable<{ total: number } | undefined>({ total: 6.05 })
  const projections: SessionProvideInfo['projections'] = {
    faceOf: (key: string) => (key === 'tokenUsage' ? usage : observable(undefined)),
  }
  const info: SessionProvideInfo = {
    sessionId: 's1',
    hooks: { session: observable({ nodes: [] }) },
    props: {},
    projections,
  }
  const provide = observable<SessionMaybeProvideInfo>(info)
  const host: SlotRendererHost = {
    subscribe: (key, fn) => core.subscribe(key, fn),
    getVersion: key => core.getVersion(key),
    entriesOf: key => core.entries(key),
    entriesOfSlot: key => core.entriesOfSlot(key),
    reportEntryError: (key, entry, error, i) => { core.reportEntryError(key, entry, error, i) },
    specOf: key => core.specDynamic(key),
    isLive: entry => core.isLive(entry),
    storeOf: () => undefined,
    sessions: {
      list: observable({ ids: ['s1'] }),
      provideInfo: provide,
    },
    workspaces: { list: observable({}) },
  }

  core.register({
    name: 'root',
    children: { 'test.dock': { kind: 'list', scope: 'session' } },
  }, RootFrame)
  core.register({
    name: 'test.dock',
    id: 'stats',
    children: { 'test.extra': { kind: 'list', scope: 'session' } },
  }, StatsHost)
  core.register({ name: 'test.extra', id: 'cost' }, ExtraGroup)
  return { host, usage }
}

describe('stats-extra fusion chain (real core + real renderer)', () => {
  it('renders the contributor label inside the stats host line', () => {
    const { host } = harness()
    const view = render(<>{createSlotRenderer().renderRoot(host, {})}</>)
    expect(view.getByText('1 轮 · 2 步')).toBeTruthy()
    expect(view.getByText('会话 ¥6.05')).toBeTruthy()
    expect(view.container.querySelector('[data-extra="cost"]')).not.toBeNull()
  })

  it('updates the label live when the projection value changes', () => {
    const { host, usage } = harness()
    const view = render(<>{createSlotRenderer().renderRoot(host, {})}</>)
    act(() => { usage.set({ total: 23.1 }) })
    expect(view.getByText('会话 ¥23.1')).toBeTruthy()
  })

  it('renders nothing extra while the projection carries no value', () => {
    const { host, usage } = harness()
    const view = render(<>{createSlotRenderer().renderRoot(host, {})}</>)
    act(() => { usage.set(undefined) })
    expect(view.queryByText(/会话 ¥/)).toBeNull()
  })
})
