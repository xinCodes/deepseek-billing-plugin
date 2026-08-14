/**
 * Session-cost pricing over the `tokenUsage` session projection.
 *
 * The official API reports usage as token buckets
 * (uncached input / cache-read input / cache-write input / output) and has NO
 * per-session billing endpoint, so the cost is always an ESTIMATE: token
 * counts are provider-reported facts, money is those counts times the price
 * table below. Prices are snapshotted from the official pricing page
 * (https://api-docs.deepseek.com/zh-cn/quick_start/pricing/) and carry
 * effective-from dates, because DeepSeek pricing changes over time:
 * 2026-08-17 00:00 Beijing switched every model to peak/off-peak tiers
 * (peak = Beijing 9:00-12:00 and 14:00-18:00; off-peak = half price).
 *
 * One approximation remains: the `tokenUsage` projection is cumulative
 * without per-request timestamps, so the whole session is priced with the
 * tier in force at the priced moment. The UI labels the tier used.
 *
 * @module @deepseek-ai/dsh-client-ui-deepseek-billing/pricing
 */
/** One model's price, in CNY per 1M tokens (the official table's unit). */
export interface ModelPrice {
    /** Cache-hit input tokens. */
    readonly cacheHitInputPerM: number;
    /** Cache-miss input tokens. */
    readonly cacheMissInputPerM: number;
    /** Output tokens. */
    readonly outputPerM: number;
}
/** One dated price schedule of a model. */
export interface PriceSchedule {
    /** Beijing date+time (ISO 8601 with +08:00 offset) the schedule takes effect. */
    readonly effectiveFrom: string;
    /** Peak-hour price, present from the 2026-08-17 tier switch onward. */
    readonly peak?: ModelPrice;
    /** Off-peak price, present from the 2026-08-17 tier switch onward. */
    readonly offPeak?: ModelPrice;
    /** Flat all-day price, present before the tier switch. */
    readonly flat?: ModelPrice;
}
/** One priced table entry: newest schedule first, the first applicable wins. */
export interface PriceTableEntry {
    /** Display label for the model tier. */
    readonly label: string;
    /** Human note about the pricing basis (shown in tooltips). */
    readonly note?: string;
    /** Schedules in descending effective-from order. */
    readonly schedules: readonly PriceSchedule[];
}
/** The deployable price table. */
export interface BillingPriceTable {
    /** Table version shown in the UI so a stale table is legible. */
    readonly version: string;
    /** model id → entry; the '*' entry prices models without an exact row. */
    readonly models: Readonly<Record<string, PriceTableEntry>>;
}
/** Beijing-time day tier. */
export type PriceTier = 'peak' | 'offPeak';
/**
 * The tier in force for one moment (Beijing time): peak is 9:00-12:00 and
 * 14:00-18:00, everything else is off-peak.
 * @param when - the moment to classify.
 * @returns the Beijing tier.
 */
export declare function tierFor(when: Date): PriceTier;
/**
 * Official price table, snapshotted from the pricing page on 2026-08-14.
 * The 2026-08-17 00:00 Beijing tier switch is modeled per schedule; before it
 * the flat all-day prices apply. Verify against the pricing page before
 * trusting a displayed total — this table is plain data on purpose.
 */
export declare const DEFAULT_PRICE_TABLE: BillingPriceTable;
/** Provider-reported token buckets of one session (the `tokenUsage` projection). */
export interface TokenUsageBuckets {
    uncachedInputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
}
/** Per-bucket money breakdown. */
export interface CostBreakdown {
    inputMissCost: number;
    inputHitCost: number;
    outputCost: number;
    totalCost: number;
}
/** The tier actually priced: `flat` for pre-tier schedules. */
export type AppliedTier = PriceTier | 'flat';
/** Full pricing answer for one session. */
export interface SessionCost {
    /** Model id the pricing used. */
    model: string;
    /** True when the model matched an exact table row (not the '*' fallback). */
    exactModel: boolean;
    /** Table version priced with. */
    tableVersion: string;
    /** Tier the moment was priced with. */
    tier: AppliedTier;
    /** Token buckets priced. */
    tokens: TokenUsageBuckets;
    /** Money breakdown in CNY. */
    costs: CostBreakdown;
}
/** Select the table entry for one model id (exact row, then the fallback). */
export declare function entryOf(table: BillingPriceTable, model: string): {
    entry: PriceTableEntry;
    exact: boolean;
};
/** Select the schedule in force at one moment (newest-first ordering). */
export declare function scheduleFor(entry: PriceTableEntry, when: Date): PriceSchedule;
/** Resolve the effective price and tier of one entry at one moment. */
export declare function priceAt(entry: PriceTableEntry, when: Date): {
    price: ModelPrice;
    tier: AppliedTier;
};
/**
 * Price one session's token buckets.
 * @param table - price table to use.
 * @param model - model id to price with.
 * @param tokens - provider-reported buckets.
 * @param when - moment to price at (defaults to now).
 * @returns the cost answer.
 */
export declare function priceUsage(table: BillingPriceTable, model: string, tokens: TokenUsageBuckets, when?: Date): SessionCost;
/**
 * Format a CNY amount for the widget: two decimals from ¥0.01 up (rounded
 * with an epsilon so 0.015 reads 0.02, not the float-truncated 0.01), four
 * decimals below so a cheap session still shows movement, and a plain 0.00
 * for zero, negative, and non-finite input.
 * @param amount - CNY value (non-negative).
 * @returns display string without a currency sign.
 */
export declare function formatCny(amount: number): string;
/**
 * Compact token count for the widget: 517 / 12.2K / 517K / 1.2M.
 * @param n - token count.
 * @returns display string.
 */
export declare function formatTokens(n: number): string;
//# sourceMappingURL=pricing.d.ts.map