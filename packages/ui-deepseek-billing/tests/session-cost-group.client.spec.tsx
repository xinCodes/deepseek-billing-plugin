// @vitest-environment jsdom
/**
 * SessionCostGroup: the inline stats-strip label, its hover tooltip
 * breakdown, the empty states, and the latestModel helper.
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ConversationNode, ConversationSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { TokenUsageProjection } from '@deepseek-ai/dsh-token-meter/client'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import {
  latestModel,
  SessionCostGroup,
  type SessionCostGroupProps,
} from '../src/client/SessionCostGroup.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const t = makeTranslate(zh, commonZh)

const USAGE: TokenUsageProjection = {
  uncachedInputTokens: 1_000_000,
  outputTokens: 500_000,
  cacheReadTokens: 2_000_000,
  cacheWriteTokens: 0,
}

const ZERO: TokenUsageProjection = {
  uncachedInputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
}

/** One assistant node carrying the V4-Pro request config. */
const NODE = {
  kind: 'assistant',
  seq: 1,
  time: 1,
  turn: 1,
  step: 1,
  blocks: [],
  requestConfig: { provider: 'deepseek-official', model: 'deepseek-v4-pro' },
} as ConversationNode

function snapshot(nodes: readonly ConversationNode[]): ConversationSnapshot {
  return { nodes } as unknown as ConversationSnapshot
}

/** Props assembly over the given projection and node window. */
function props(
  usage: TokenUsageProjection | undefined,
  nodes: readonly ConversationNode[] = [NODE],
): SessionCostGroupProps {
  const useSession = (selector: (s: ConversationSnapshot) => unknown): unknown => selector(snapshot(nodes))
  const useProjection = (key: string): unknown => (key === 'tokenUsage' ? usage : undefined)
  return {
    useSession,
    useProjection,
    sessionId: 's1',
    t,
  } as unknown as SessionCostGroupProps
}

async function revealTooltip(view: ReturnType<typeof render>): Promise<void> {
  fireEvent.mouseEnter(view.getByText(/会话 ¥/))
  await act(async () => { vi.advanceTimersByTime(500) })
}

describe('latestModel', () => {
  it('reads the newest assistant request config', () => {
    expect(latestModel([NODE])).toBe('deepseek-v4-pro')
  })

  it('skips nodes without a model and returns undefined when none carries one', () => {
    expect(latestModel([{ kind: 'user', seq: 0, time: 0, content: [], source: null }])).toBeUndefined()
    expect(latestModel([])).toBeUndefined()
    const emptyModel = { ...NODE, requestConfig: { provider: 'x', model: '' } }
    expect(latestModel([emptyModel])).toBeUndefined()
  })
})

describe('SessionCostGroup', () => {
  beforeEach(() => {
    // Pin the wall clock into the flat-pricing era (before the 2026-08-17
    // Beijing tier switch) so expectations do not drift with real time.
    vi.useFakeTimers({ now: new Date('2026-08-14T10:00:00+08:00') })
  })

  it('renders the inline cost label fused into the stats strip', () => {
    const view = render(<SessionCostGroup {...props(USAGE)} />)
    // Flat-era V4-Pro: miss 1M*3 + hit 2M*0.025 + output 0.5M*6 = 6.05.
    expect(view.getByText(t('cost.group', { amount: '6.05' }))).toBeTruthy()
  })

  it('reveals the breakdown in the hover tooltip with the tier label', async () => {
    const view = render(<SessionCostGroup {...props(USAGE)} />)
    await revealTooltip(view)
    expect(view.container.querySelector('[role="tooltip"]')?.textContent)
      .toContain('合计 ¥6.05')
    expect(view.container.querySelector('[role="tooltip"]')?.textContent)
      .toContain(t('cost.tier.flat'))
  })

  it('prices the peak tier after the 2026-08-17 switch', async () => {
    vi.setSystemTime(new Date('2026-08-18T10:00:00+08:00')) // Beijing peak hour
    const view = render(<SessionCostGroup {...props(USAGE)} />)
    // miss 1M*9 + hit 2M*0.30 + output 0.5M*27 = 23.10.
    expect(view.getByText(t('cost.group', { amount: '23.10' }))).toBeTruthy()
    await revealTooltip(view)
    expect(view.container.querySelector('[role="tooltip"]')?.textContent)
      .toContain(t('cost.tier.peak'))
  })

  it('renders nothing without usage or with zero usage', () => {
    const absent = render(<SessionCostGroup {...props(undefined)} />)
    expect(absent.container.textContent).toBe('')
    const zero = render(<SessionCostGroup {...props(ZERO)} />)
    expect(zero.container.textContent).toBe('')
  })

  it('prices unknown models with the fallback row and says so in the tooltip', async () => {
    const unknownNode = {
      ...NODE,
      requestConfig: { provider: 'deepseek-official', model: 'unknown-model' },
    }
    const view = render(<SessionCostGroup {...props(USAGE, [unknownNode])} />)
    await revealTooltip(view)
    expect(view.container.querySelector('[role="tooltip"]')?.textContent)
      .toContain('unknown-model')
  })
})
