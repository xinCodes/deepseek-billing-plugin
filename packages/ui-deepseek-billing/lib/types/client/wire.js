/**
 * Wire contract of the host's balance route (`/api/deepseek-billing/balance`,
 * registered by the out-of-tree `deepseek-billing` host plugin). The shape is
 * duplicated here deliberately: client bundles cannot value-import host
 * packages, and the host half is out-of-tree by design.
 */
/** Known error code strings the host emits (everything else is BAD_RESPONSE). */
const KNOWN_CODES = new Set(['MISSING_KEY', 'UNAUTHORIZED', 'HTTP_ERROR', 'NETWORK_ERROR', 'INVALID_PAYLOAD']);
/** Narrow an unknown code to the widget's vocabulary. */
function errorCode(value) {
    return typeof value === 'string' && KNOWN_CODES.has(value)
        ? value
        : 'BAD_RESPONSE';
}
/** Validate one numeric field of a record. */
function numberField(record, field) {
    const value = record[field];
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : Number.NaN;
}
/**
 * Parse and validate the host route's JSON body. Every malformed shape maps
 * to a typed failure instead of throwing, so the widget never crashes on a
 * proxy page or a broken host half.
 * @param value - parsed JSON body.
 * @returns the validated body.
 */
export function parseBalanceBody(value) {
    if (typeof value !== 'object' || value === null) {
        return { ok: false, error: { code: 'BAD_RESPONSE' } };
    }
    const body = value;
    if (body.ok !== true) {
        if (body.ok !== false || typeof body.error !== 'object' || body.error === null) {
            return { ok: false, error: { code: 'BAD_RESPONSE' } };
        }
        const error = body.error;
        return {
            ok: false,
            error: {
                code: errorCode(error.code),
                ...(typeof error.message === 'string' && error.message.length > 0 ? { message: error.message } : {}),
            },
        };
    }
    const rawBalance = body.balance;
    if (typeof rawBalance !== 'object' || rawBalance === null) {
        return { ok: false, error: { code: 'INVALID_PAYLOAD' } };
    }
    const balance = rawBalance;
    if (typeof balance.isAvailable !== 'boolean' || !Array.isArray(balance.records)) {
        return { ok: false, error: { code: 'INVALID_PAYLOAD' } };
    }
    const records = [];
    for (const entry of balance.records) {
        if (typeof entry !== 'object' || entry === null) {
            return { ok: false, error: { code: 'INVALID_PAYLOAD' } };
        }
        const record = entry;
        if (typeof record.currency !== 'string' || record.currency.length === 0) {
            return { ok: false, error: { code: 'INVALID_PAYLOAD' } };
        }
        const totalBalance = numberField(record, 'totalBalance');
        const grantedBalance = numberField(record, 'grantedBalance');
        const toppedUpBalance = numberField(record, 'toppedUpBalance');
        if (!Number.isFinite(totalBalance) || !Number.isFinite(grantedBalance) || !Number.isFinite(toppedUpBalance)) {
            return { ok: false, error: { code: 'INVALID_PAYLOAD' } };
        }
        records.push({ currency: record.currency, totalBalance, grantedBalance, toppedUpBalance });
    }
    return { ok: true, balance: { isAvailable: balance.isAvailable, records } };
}
//# sourceMappingURL=wire.js.map