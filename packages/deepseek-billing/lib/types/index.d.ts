/**
 * Host plugin serving the DeepSeek account balance to the Web client over one
 * same-origin HTTP route. The browser cannot call api.deepseek.com directly
 * (no CORS headers on /user/balance), so this Node half performs the
 * authenticated request and returns normalized JSON. The API key resolves
 * from the plugin config, the credentials domain, or the launching
 * environment, in that order, and is sent only to api.deepseek.com.
 * @module @deepseek-ai/dsh-deepseek-billing
 */
import type { Context } from '@deepseek-ai/cordis';
import { type BalanceInfo } from './balance.ts';
export { fetchBalance, mapBalancePayload, } from './balance.ts';
export type { BalanceErrorCode, BalanceFailure, BalanceInfo, BalanceRecord, BalanceResult, BalanceWireInfo, BalanceWirePayload, FetchLike, } from './balance.ts';
/** Plugin name used by loader diagnostics. */
export declare const name = "deepseek-billing";
/** The webserver route registry this plugin contributes to. */
export declare const inject: string[];
/** Plugin config; every field is optional. */
export interface Config {
    /** Literal API key; when present it wins over every other source. */
    apiKey?: string;
    /** Credential reference / environment variable name. Defaults to DEEPSEEK_API_KEY. */
    apiKeyEnv?: string;
    /** Endpoint base. Defaults to the public DeepSeek API. */
    baseURL?: string;
}
/** Route path the client widget fetches. */
export declare const BALANCE_ROUTE = "/api/deepseek-billing/balance";
/** Wrapped route response: normalized balance or an error payload. */
export type BalanceRouteBody = {
    ok: true;
    balance: BalanceInfo;
} | {
    ok: false;
    error: {
        code: string;
        message: string;
    };
};
/**
 * Resolve the API key for one request: config literal, then the optional
 * credentials domain, then the process environment.
 * @param ctx - plugin context.
 * @param config - effective plugin config.
 * @returns the key, or undefined when no source carries one.
 */
export declare function resolveApiKey(ctx: Context, config: Config): Promise<string | undefined>;
/**
 * Register the balance route on the webserver. The registration rides a
 * context effect, so plugin unload removes the route.
 * @param ctx - plugin context carrying webServer.
 * @param config - effective plugin config.
 */
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=index.d.ts.map