/**
 * Host plugin serving the DeepSeek account balance to the Web client over one
 * same-origin HTTP route. The browser cannot call api.deepseek.com directly
 * (no CORS headers on /user/balance), so this Node half performs the
 * authenticated request and returns normalized JSON. The API key resolves
 * from the plugin config, the credentials domain, or the launching
 * environment, in that order, and is sent only to api.deepseek.com.
 * @module @deepseek-ai/dsh-deepseek-billing
 */

import type { Context } from '@deepseek-ai/cordis'
// Type-only: merges ctx.webServer into the Context shape.
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { fetchBalance, type BalanceInfo } from './balance.ts'

export {
  fetchBalance,
  mapBalancePayload,
} from './balance.ts'
export type {
  BalanceErrorCode,
  BalanceFailure,
  BalanceInfo,
  BalanceRecord,
  BalanceResult,
  BalanceWireInfo,
  BalanceWirePayload,
  FetchLike,
} from './balance.ts'

/** Plugin name used by loader diagnostics. */
export const name = 'deepseek-billing'

/** The webserver route registry this plugin contributes to. */
export const inject = ['webServer']

/** Minimal credentials-domain shape (the seam is optional in some compositions). */
interface CredentialsSeam {
  resolve(ref: string): Promise<{ value: string } | undefined>
}

/** Plugin config; every field is optional. */
export interface Config {
  /** Literal API key; when present it wins over every other source. */
  apiKey?: string
  /** Credential reference / environment variable name. Defaults to DEEPSEEK_API_KEY. */
  apiKeyEnv?: string
  /** Endpoint base. Defaults to the public DeepSeek API. */
  baseURL?: string
}

/** Route path the client widget fetches. */
export const BALANCE_ROUTE = '/api/deepseek-billing/balance'

/** Wrapped route response: normalized balance or an error payload. */
export type BalanceRouteBody =
  | { ok: true; balance: BalanceInfo }
  | { ok: false; error: { code: string; message: string } }

/**
 * Resolve the API key for one request: config literal, then the optional
 * credentials domain, then the process environment.
 * @param ctx - plugin context.
 * @param config - effective plugin config.
 * @returns the key, or undefined when no source carries one.
 */
export async function resolveApiKey(ctx: Context, config: Config): Promise<string | undefined> {
  if (config.apiKey !== undefined && config.apiKey.length > 0) return config.apiKey
  const ref = config.apiKeyEnv ?? 'DEEPSEEK_API_KEY'
  const credentials = ctx.get('credentials') as CredentialsSeam | undefined
  if (credentials !== undefined) {
    const hit = await credentials.resolve(ref)
    if (hit !== undefined && hit.value.length > 0) return hit.value
  }
  const ambient = process.env[ref]
  return ambient !== undefined && ambient.length > 0 ? ambient : undefined
}

/** Send one JSON response body. */
function respondJson(res: ServerResponse, status: number, body: BalanceRouteBody): void {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(body))
}

/**
 * Register the balance route on the webserver. The registration rides a
 * context effect, so plugin unload removes the route.
 * @param ctx - plugin context carrying webServer.
 * @param config - effective plugin config.
 */
export function apply(ctx: Context, config: Config = {}): void {
  const baseURL = config.baseURL ?? 'https://api.deepseek.com'

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: BALANCE_ROUTE,
    handler: async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405)
        res.end()
        return
      }

      const apiKey = await resolveApiKey(ctx, config).catch(() => undefined)
      if (apiKey === undefined) {
        respondJson(res, 200, {
          ok: false,
          error: {
            code: 'MISSING_KEY',
            message: '未配置 DeepSeek API Key。请设置环境变量 DEEPSEEK_API_KEY，或在插件配置中填写。',
          },
        })
        return
      }

      const result = await fetchBalance(apiKey, baseURL)
      if (result.ok) {
        respondJson(res, 200, { ok: true, balance: result.balance })
        return
      }
      respondJson(res, 200, { ok: false, error: result.error })
    },
  }), 'deepseek-billing: balance route')
}
