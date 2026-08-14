/**
 * Pure balance-domain functions for the DeepSeek official API key billing
 * plugin. Everything here is dependency-free so the host route and the tests
 * share one implementation.
 *
 * Wire shape: GET https://api.deepseek.com/user/balance
 * (https://api-docs.deepseek.com/zh-cn/api/get-user-balance/)
 */
/** Wire payload of one balance record (all monetary values are strings). */
export interface BalanceWireInfo {
    currency: string;
    total_balance: string;
    granted_balance: string;
    topped_up_balance: string;
}
/** Wire payload of the balance endpoint. */
export interface BalanceWirePayload {
    is_available: boolean;
    balance_infos: BalanceWireInfo[];
}
/** One normalized balance record with monetary values as numbers. */
export interface BalanceRecord {
    currency: string;
    totalBalance: number;
    grantedBalance: number;
    toppedUpBalance: number;
}
/** Normalized endpoint answer. */
export interface BalanceInfo {
    isAvailable: boolean;
    records: BalanceRecord[];
}
/** Stable error codes surfaced to the client. */
export type BalanceErrorCode = 'INVALID_PAYLOAD' | 'HTTP_ERROR' | 'UNAUTHORIZED' | 'NETWORK_ERROR';
/** Error branch of a balance read. */
export interface BalanceFailure {
    code: BalanceErrorCode;
    message: string;
}
/** Result union of one balance read. */
export type BalanceResult = {
    ok: true;
    balance: BalanceInfo;
} | {
    ok: false;
    error: BalanceFailure;
};
/**
 * Normalize the raw endpoint payload into typed records. Throws on malformed
 * input so callers map the failure to INVALID_PAYLOAD.
 * @param payload - parsed JSON body of the balance endpoint.
 * @returns normalized balance.
 */
export declare function mapBalancePayload(payload: unknown): BalanceInfo;
/** Fetch-compatible surface (defaults to the global fetch so tests inject fakes). */
export type FetchLike = (url: string, init: {
    headers: Record<string, string>;
    signal?: AbortSignal;
}) => Promise<{
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
}>;
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
export declare function fetchBalance(apiKey: string, baseURL: string, fetchFn?: FetchLike, signal?: AbortSignal): Promise<BalanceResult>;
//# sourceMappingURL=balance.d.ts.map