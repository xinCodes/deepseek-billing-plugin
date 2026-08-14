/**
 * Host plugin serving the DeepSeek account balance to the Web client over one
 * same-origin HTTP route. The browser cannot call api.deepseek.com directly
 * (no CORS headers on /user/balance), so this Node half performs the
 * authenticated request and returns normalized JSON. The API key resolves
 * from the plugin config, the credentials domain, or the launching
 * environment, in that order, and is sent only to api.deepseek.com.
 * @module @deepseek-ai/dsh-deepseek-billing
 */
import { fetchBalance } from "./balance.js";
export { fetchBalance, mapBalancePayload, } from "./balance.js";
/** Plugin name used by loader diagnostics. */
export const name = 'deepseek-billing';
/** The webserver route registry this plugin contributes to. */
export const inject = ['webServer'];
/** Route path the client widget fetches. */
export const BALANCE_ROUTE = '/api/deepseek-billing/balance';
/**
 * Resolve the API key for one request: config literal, then the optional
 * credentials domain, then the process environment.
 * @param ctx - plugin context.
 * @param config - effective plugin config.
 * @returns the key, or undefined when no source carries one.
 */
export async function resolveApiKey(ctx, config) {
    if (config.apiKey !== undefined && config.apiKey.length > 0)
        return config.apiKey;
    const ref = config.apiKeyEnv ?? 'DEEPSEEK_API_KEY';
    const credentials = ctx.get('credentials');
    if (credentials !== undefined) {
        const hit = await credentials.resolve(ref);
        if (hit !== undefined && hit.value.length > 0)
            return hit.value;
    }
    const ambient = process.env[ref];
    return ambient !== undefined && ambient.length > 0 ? ambient : undefined;
}
/** Send one JSON response body. */
function respondJson(res, status, body) {
    res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
    });
    res.end(JSON.stringify(body));
}
/**
 * Register the balance route on the webserver. The registration rides a
 * context effect, so plugin unload removes the route.
 * @param ctx - plugin context carrying webServer.
 * @param config - effective plugin config.
 */
export function apply(ctx, config = {}) {
    const baseURL = config.baseURL ?? 'https://api.deepseek.com';
    ctx.effect(() => ctx.webServer.register({
        kind: 'exact',
        path: BALANCE_ROUTE,
        handler: async (req, res) => {
            if (req.method !== 'GET' && req.method !== 'HEAD') {
                res.writeHead(405);
                res.end();
                return;
            }
            const apiKey = await resolveApiKey(ctx, config).catch(() => undefined);
            if (apiKey === undefined) {
                respondJson(res, 200, {
                    ok: false,
                    error: {
                        code: 'MISSING_KEY',
                        message: '未配置 DeepSeek API Key。请设置环境变量 DEEPSEEK_API_KEY，或在插件配置中填写。',
                    },
                });
                return;
            }
            const result = await fetchBalance(apiKey, baseURL);
            if (result.ok) {
                respondJson(res, 200, { ok: true, balance: result.balance });
                return;
            }
            respondJson(res, 200, { ok: false, error: result.error });
        },
    }), 'deepseek-billing: balance route');
}
//# sourceMappingURL=index.js.map