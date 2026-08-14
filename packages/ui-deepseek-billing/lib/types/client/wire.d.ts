/**
 * Wire contract of the host's balance route (`/api/deepseek-billing/balance`,
 * registered by the out-of-tree `deepseek-billing` host plugin). The shape is
 * duplicated here deliberately: client bundles cannot value-import host
 * packages, and the host half is out-of-tree by design.
 */
/** One normalized balance record from the host route. */
export interface ClientBalanceRecord {
    currency: string;
    totalBalance: number;
    grantedBalance: number;
    toppedUpBalance: number;
}
/** Normalized balance from the host route. */
export interface ClientBalanceInfo {
    isAvailable: boolean;
    records: ClientBalanceRecord[];
}
/** Error codes the widget maps to localized copy. */
export type ClientBalanceErrorCode = 'BAD_RESPONSE' | 'MISSING_KEY' | 'UNAUTHORIZED' | 'HTTP_ERROR' | 'NETWORK_ERROR' | 'INVALID_PAYLOAD';
/** Success or failure body of the host route. */
export type ClientBalanceBody = {
    ok: true;
    balance: ClientBalanceInfo;
} | {
    ok: false;
    error: {
        code: ClientBalanceErrorCode;
        message?: string;
    };
};
/**
 * Parse and validate the host route's JSON body. Every malformed shape maps
 * to a typed failure instead of throwing, so the widget never crashes on a
 * proxy page or a broken host half.
 * @param value - parsed JSON body.
 * @returns the validated body.
 */
export declare function parseBalanceBody(value: unknown): ClientBalanceBody;
//# sourceMappingURL=wire.d.ts.map