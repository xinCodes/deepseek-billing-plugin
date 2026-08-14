/**
 * Host-half tests: pure balance mapping/fetching and the webserver route the
 * client widget fetches. The plugin body is exercised over a fake Context
 * capturing the registered route; no server binds.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  fetchBalance,
  mapBalancePayload,
  type FetchLike,
} from '../src/balance.ts'
import {
  apply,
  BALANCE_ROUTE,
  resolveApiKey,
  type Config,
} from '../src/index.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  delete process.env.DEEPSEEK_API_KEY
  delete process.env.MY_KEY
})

const VALID_PAYLOAD = {
  is_available: true,
  balance_infos: [{
    currency: 'CNY',
    total_balance: '110.00',
    granted_balance: '10.00',
    topped_up_balance: '100.00',
  }],
}

describe('mapBalancePayload', () => {
  it('normalizes a valid payload into numbers', () => {
    expect(mapBalancePayload(VALID_PAYLOAD)).toEqual({
      isAvailable: true,
      records: [{
        currency: 'CNY',
        totalBalance: 110,
        grantedBalance: 10,
        toppedUpBalance: 100,
      }],
    })
  })

  it('rejects malformed payloads', () => {
    const cases: unknown[] = [
      null,
      'x',
      {},
      { is_available: 'yes', balance_infos: [] },
      { is_available: true },
      { is_available: true, balance_infos: [null] },
      { is_available: true, balance_infos: [{ currency: '', total_balance: '1', granted_balance: '0', topped_up_balance: '0' }] },
      { is_available: true, balance_infos: [{ currency: 'CNY', total_balance: 'nope', granted_balance: '0', topped_up_balance: '0' }] },
      { is_available: true, balance_infos: [{ currency: 'CNY', total_balance: '-1', granted_balance: '0', topped_up_balance: '0' }] },
    ]
    for (const value of cases) {
      expect(() => mapBalancePayload(value)).toThrow()
    }
  })
})

describe('fetchBalance', () => {
  it('sends the bearer key to the balance endpoint and normalizes success', async () => {
    const fetchFn = vi.fn(async (): Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }> => ({
      ok: true,
      status: 200,
      json: async () => VALID_PAYLOAD,
    })) as unknown as FetchLike
    const result = await fetchBalance('sk-test', 'https://api.deepseek.com', fetchFn)
    expect(result.ok).toBe(true)
    expect(fetchFn).toHaveBeenCalledWith('https://api.deepseek.com/user/balance', {
      headers: { authorization: 'Bearer sk-test', accept: 'application/json' },
    })
  })

  it('maps HTTP 401 to UNAUTHORIZED', async () => {
    const fetchFn = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })) as unknown as FetchLike
    const result = await fetchBalance('sk-bad', 'https://api.deepseek.com', fetchFn)
    expect(result).toMatchObject({ ok: false, error: { code: 'UNAUTHORIZED' } })
  })

  it('maps other HTTP failures to HTTP_ERROR', async () => {
    const fetchFn = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as FetchLike
    const result = await fetchBalance('sk-x', 'https://api.deepseek.com', fetchFn)
    expect(result).toMatchObject({ ok: false, error: { code: 'HTTP_ERROR' } })
  })

  it('maps fetch rejection to NETWORK_ERROR', async () => {
    const fetchFn = vi.fn(async () => { throw new Error('ECONNREFUSED') }) as unknown as FetchLike
    const result = await fetchBalance('sk-x', 'https://api.deepseek.com', fetchFn)
    expect(result).toMatchObject({ ok: false, error: { code: 'NETWORK_ERROR' } })
  })

  it('maps a malformed success body to INVALID_PAYLOAD', async () => {
    const fetchFn = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ is_available: 1 }) })) as unknown as FetchLike
    const result = await fetchBalance('sk-x', 'https://api.deepseek.com', fetchFn)
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_PAYLOAD' } })
  })

  it('rethrows an abort instead of swallowing it as a network error', async () => {
    const fetchFn = vi.fn(async () => { throw new Error('aborted') }) as unknown as FetchLike
    const controller = new AbortController()
    controller.abort()
    await expect(fetchBalance('sk-x', 'https://api.deepseek.com', fetchFn, controller.signal)).rejects.toThrow('aborted')
  })
})

describe('resolveApiKey', () => {
  const ctxOf = (credentials: unknown): Context => ({
    get: () => credentials,
  }) as unknown as Context

  it('prefers the config literal', async () => {
    process.env.DEEPSEEK_API_KEY = 'from-env'
    const ctx = ctxOf({ resolve: async () => ({ value: 'from-creds' }) })
    expect(await resolveApiKey(ctx, { apiKey: 'from-config' })).toBe('from-config')
  })

  it('falls back to the credentials domain, then the environment', async () => {
    const creds = ctxOf({ resolve: async () => ({ value: 'from-creds' }) })
    expect(await resolveApiKey(creds, {} as Config)).toBe('from-creds')

    const missing = ctxOf({ resolve: async () => undefined })
    expect(await resolveApiKey(missing, {} as Config)).toBeUndefined()

    process.env.DEEPSEEK_API_KEY = 'from-env'
    expect(await resolveApiKey(missing, {} as Config)).toBe('from-env')

    const noSeam = ctxOf(undefined)
    expect(await resolveApiKey(noSeam, {} as Config)).toBe('from-env')
  })

  it('ignores empty values and honors a custom reference', async () => {
    const ctx = ctxOf({ resolve: async () => ({ value: '' }) })
    expect(await resolveApiKey(ctx, { apiKeyEnv: 'MY_KEY' } as Config)).toBeUndefined()
    process.env.MY_KEY = 'custom'
    expect(await resolveApiKey(ctx, { apiKeyEnv: 'MY_KEY' } as Config)).toBe('custom')
  })
})

/** Captured route from a fake webServer. */
interface CapturedRoute {
  kind: string
  path: string
  handler: (req: IncomingMessage, res: ServerResponse) => Promise<void> | void
}

/** Boot the plugin over fake services and capture the registered route. */
function boot(config: Config = {}, credentials?: unknown): { route: CapturedRoute; dispose: () => void } {
  let route: CapturedRoute | undefined
  const registered: Array<() => void> = []
  const ctx = {
    get: () => credentials,
    effect: (callback: () => unknown): (() => void) => {
      callback()
      return () => {}
    },
    webServer: {
      register: (entry: CapturedRoute): (() => void) => {
        route = entry
        const dispose = (): void => { route = undefined }
        registered.push(dispose)
        return dispose
      },
    },
  }
  apply(ctx as unknown as Context, config)
  return { route: route as unknown as CapturedRoute, dispose: registered[0] as () => void }
}

/** Invoke the captured route with a method and collect the response. */
async function call(route: CapturedRoute, method: string): Promise<{ status: number; body: unknown }> {
  let status = 0
  let raw = ''
  const res = {
    writeHead: (code: number) => { status = code },
    end: (body?: string) => { raw = body ?? '' },
  } as unknown as ServerResponse
  await route.handler({ method } as IncomingMessage, res)
  return { status, body: raw.length > 0 ? JSON.parse(raw) : null }
}

describe('apply (balance route)', () => {
  it('registers the exact balance route and removes it on dispose', () => {
    const { route, dispose } = boot()
    expect(route.kind).toBe('exact')
    expect(route.path).toBe(BALANCE_ROUTE)
    expect(typeof route.handler).toBe('function')
    dispose()
  })

  it('rejects non-GET methods with 405', async () => {
    const { route } = boot({ apiKey: 'sk-x' })
    const response = await call(route, 'POST')
    expect(response.status).toBe(405)
  })

  it('answers MISSING_KEY when no source carries a key', async () => {
    const { route } = boot()
    const response = await call(route, 'GET')
    expect(response).toMatchObject({ status: 200, body: { ok: false, error: { code: 'MISSING_KEY' } } })
  })

  it('serves the normalized balance for a configured key', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => VALID_PAYLOAD })))
    const { route } = boot({ apiKey: 'sk-x' })
    const response = await call(route, 'GET')
    expect(response).toMatchObject({
      status: 200,
      body: {
        ok: true,
        balance: {
          isAvailable: true,
          records: [{ currency: 'CNY', totalBalance: 110, grantedBalance: 10, toppedUpBalance: 100 }],
        },
      },
    })
  })

  it('forwards provider failures into the body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })))
    const { route } = boot({ apiKey: 'sk-bad' })
    const response = await call(route, 'GET')
    expect(response).toMatchObject({ status: 200, body: { ok: false, error: { code: 'UNAUTHORIZED' } } })
  })
})
