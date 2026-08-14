// @vitest-environment jsdom
/**
 * BalanceAction widget: trigger states, the balance state machine over a
 * stubbed host route, and the pure helpers (errorKey / firstTotal).
 */
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeTranslate } from '@deepseek-ai/dsh-client-test-runtime'
import { zh as commonZh } from '@deepseek-ai/dsh-client-locale/src/locales/zh.ts'
import {
  BalanceAction,
  BALANCE_ENDPOINT,
  BALANCE_REFRESH_MS,
  errorKey,
  firstTotal,
  type BalanceActionProps,
} from '../src/client/BalanceAction.tsx'
import { zh } from '../src/client/locales.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const t = makeTranslate(zh, commonZh)

/** Balance fixture the stubbed host route answers. */
const BALANCE_JSON = {
  ok: true,
  balance: {
    isAvailable: true,
    records: [{ currency: 'CNY', totalBalance: 110, grantedBalance: 10, toppedUpBalance: 100 }],
  },
}

/** Props assembly over the given fetch behavior. */
function props(fetchImpl: () => Promise<{ json: () => Promise<unknown> }>): BalanceActionProps {
  vi.stubGlobal('fetch', vi.fn(fetchImpl))
  return { t } as unknown as BalanceActionProps
}

async function settle(): Promise<void> {
  await act(async () => { await Promise.resolve() })
}

describe('errorKey', () => {
  it('maps every code onto a locale key the dictionary owns', () => {
    const codes = ['BAD_RESPONSE', 'MISSING_KEY', 'UNAUTHORIZED', 'HTTP_ERROR', 'NETWORK_ERROR', 'INVALID_PAYLOAD'] as const
    for (const code of codes) {
      const key = errorKey(code)
      expect(key in zh, `key ${key} for ${code}`).toBe(true)
    }
  })
})

describe('firstTotal', () => {
  it('returns the first record totals', () => {
    expect(firstTotal(BALANCE_JSON.balance)).toEqual({ currency: 'CNY', total: 110 })
  })

  it('defaults to zero CNY with no records', () => {
    expect(firstTotal({ isAvailable: true, records: [] })).toEqual({ currency: 'CNY', total: 0 })
  })
})

describe('BalanceAction', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date('2026-08-14T10:00:00+08:00') })
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => BALANCE_JSON })))
  })

  it('renders the trigger and loads the balance when opened', async () => {
    const view = render(<BalanceAction {...props(async () => ({ json: async () => BALANCE_JSON }))} />)
    expect(view.getByText('¥…')).toBeTruthy()
    expect(view.queryByText(t('balance.title'))).toBeNull()

    fireEvent.click(view.getByRole('button'))
    await settle()

    expect(fetch).toHaveBeenCalledWith(BALANCE_ENDPOINT, { headers: { accept: 'application/json' } })
    expect(view.getByText(t('balance.title'))).toBeTruthy()
    // The total appears twice: the popover row and the compact trigger line.
    expect(view.getAllByText('CNY ¥110.00')).toHaveLength(2)
    expect(view.getByText('¥10.00')).toBeTruthy()
    expect(view.getByText('¥100.00')).toBeTruthy()
  })

  it('shows the unavailable notice when is_available is false', async () => {
    const unavailable = {
      ok: true,
      balance: { isAvailable: false, records: [{ currency: 'CNY', totalBalance: 0, grantedBalance: 0, toppedUpBalance: 0 }] },
    }
    const view = render(<BalanceAction {...props(async () => ({ json: async () => unavailable }))} />)
    fireEvent.click(view.getByRole('button'))
    await settle()
    expect(view.getByText(t('balance.unavailable'))).toBeTruthy()
  })

  it('shows the empty-records notice when the account has no balance records', async () => {
    const empty = { ok: true, balance: { isAvailable: true, records: [] } }
    const view = render(<BalanceAction {...props(async () => ({ json: async () => empty }))} />)
    fireEvent.click(view.getByRole('button'))
    await settle()
    expect(view.getByText(t('balance.empty'))).toBeTruthy()
  })

  it('shows the localized error copy for an unauthorized key', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ json: async () => ({ ok: false, error: { code: 'UNAUTHORIZED' } }) })))
    const view = render(<BalanceAction {...props(async () => ({ json: async () => ({ ok: false, error: { code: 'UNAUTHORIZED' } }) }))} />)
    fireEvent.click(view.getByRole('button'))
    await settle()
    expect(view.getByText(t('balance.unauthorized'))).toBeTruthy()
  })

  it('shows the network error copy when the fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('down') }))
    const view = render(<BalanceAction {...props(async () => { throw new Error('down') })} />)
    fireEvent.click(view.getByRole('button'))
    await settle()
    expect(view.getByText(t('balance.networkError'))).toBeTruthy()
  })

  it('refreshes the balance on demand and on the 60s interval while open', async () => {
    const view = render(<BalanceAction {...props(async () => ({ json: async () => BALANCE_JSON }))} />)
    fireEvent.click(view.getByRole('button'))
    await settle()
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)

    fireEvent.click(view.getByText(t('balance.refresh')))
    await settle()
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2)

    await act(async () => { vi.advanceTimersByTime(BALANCE_REFRESH_MS) })
    await settle()
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(3)
  })

  it('closes on Escape and on an outside pointer press', async () => {
    const view = render(<BalanceAction {...props(async () => ({ json: async () => BALANCE_JSON }))} />)
    fireEvent.click(view.getByRole('button'))
    await settle()
    expect(view.getByText(t('balance.title'))).toBeTruthy()

    fireEvent.keyDown(view.container.firstChild as Element, { key: 'Escape' })
    expect(view.queryByText(t('balance.title'))).toBeNull()

    fireEvent.click(view.getByRole('button'))
    await settle()
    fireEvent.pointerDown(document.body)
    expect(view.queryByText(t('balance.title'))).toBeNull()
  })
})
