/** Host loader entry for the browser-only billing plugin. */
export { DEFAULT_PRICE_TABLE, entryOf, formatCny, formatTokens, priceAt, priceUsage, scheduleFor, tierFor, } from './pricing.ts';
export type { AppliedTier, BillingPriceTable, CostBreakdown, ModelPrice, PriceSchedule, PriceTableEntry, PriceTier, SessionCost, TokenUsageBuckets, } from './pricing.ts';
/** Provides no host-side behavior. */
export declare function apply(): void;
//# sourceMappingURL=index.d.ts.map