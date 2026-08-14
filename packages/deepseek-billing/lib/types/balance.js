/**
 * Pure balance-domain functions for the DeepSeek official API key billing
 * plugin. Everything here is dependency-free so the host route and the tests
 * share one implementation.
 *
 * Wire shape: GET https://api.deepseek.com/user/balance
 * (https://api-docs.deepseek.com/zh-cn/api/get-user-balance/)
 */
/** Parse one monetary string into a finite non-negative number. */
function money(value, field) {
    if (typeof value !== 'string' || value.trim() === '' || !Number.isFinite(Number(value))) {
        throw new Error(`deepseek-billing: malformed balance field "${field}"`);
    }
    const parsed = Number(value);
    if (parsed < 0)
        throw new Error(`deepseek-billing: negative balance field "${field}"`);
    return parsed;
}
/**
 * Normalize the raw endpoint payload into typed records. Throws on malformed
 * input so callers map the failure to INVALID_PAYLOAD.
 * @param payload - parsed JSON body of the balance endpoint.
 * @returns normalized balance.
 */
export function mapBalancePayload(payload) {
    if (typeof payload !== 'object' || payload === null) {
        throw new Error('deepseek-billing: balance payload is not an object');
    }
    const raw = payload;
    if (typeof raw.is_available !== 'boolean') {
        throw new Error('deepseek-billing: balance payload lacks boolean is_available');
    }
    if (!Array.isArray(raw.balance_infos)) {
        throw new Error('deepseek-billing: balance payload lacks balance_infos array');
    }
    const records = raw.balance_infos.map((entry) => {
        if (typeof entry !== 'object' || entry === null) {
            throw new Error('deepseek-billing: malformed balance_infos entry');
        }
        const info = entry;
        if (typeof info.currency !== 'string' || info.currency.length === 0) {
            throw new Error('deepseek-billing: malformed balance currency');
        }
        return {
            currency: info.currency,
            totalBalance: money(info.total_balance, 'total_balance'),
            grantedBalance: money(info.granted_balance, 'granted_balance'),
            toppedUpBalance: money(info.topped_up_balance, 'topped_up_balance'),
        };
    });
    return { isAvailable: raw.is_available, records };
}
/**
 * Read the account balance with an API key. All failure branches are
 * normalized into {@link BalanceFailure} codes; malformed success payloads
 * become INVALID_PAYLOAD.
 * @param apiKey - DeepSeek API key (sent only to api.deepseek.com).
 * @param baseURL - endpoint base, defaulting to the public API.
 * @param fetchFn - injectable fetch for tests.
 * @param signal - optional abort signal.
 * @returns normalized result.
 */
export async function fetchBalance(apiKey, baseURL, fetchFn = fetch, signal) {
    let response;
    try {
        response = await fetchFn(`${baseURL}/user/balance`, {
            headers: {
                'authorization': `Bearer ${apiKey}`,
                'accept': 'application/json',
            },
            ...(signal === undefined ? {} : { signal }),
        });
    }
    catch (error) {
        if (signal?.aborted === true)
            throw error;
        return {
            ok: false,
            error: {
                code: 'NETWORK_ERROR',
                message: `无法连接 DeepSeek API：${error instanceof Error ? error.message : String(error)}`,
            },
        };
    }
    if (response.status === 401) {
        return {
            ok: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'API Key 无效或已被吊销（HTTP 401），请在 DeepSeek 开放平台核对。',
            },
        };
    }
    if (!response.ok) {
        return {
            ok: false,
            error: {
                code: 'HTTP_ERROR',
                message: `DeepSeek API 返回 HTTP ${response.status}。`,
            },
        };
    }
    try {
        return { ok: true, balance: mapBalancePayload(await response.json()) };
    }
    catch (error) {
        return {
            ok: false,
            error: {
                code: 'INVALID_PAYLOAD',
                message: error instanceof Error ? error.message : 'DeepSeek 余额响应无法解析。',
            },
        };
    }
}
//# sourceMappingURL=balance.js.map