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
  readonly cacheHitInputPerM: number
  /** Cache-miss input tokens. */
  readonly cacheMissInputPerM: number
  /** Output tokens. */
  readonly outputPerM: number
}

/** One dated price schedule of a model. */
export interface PriceSchedule {
  /** Beijing date+time (ISO 8601 with +08:00 offset) the schedule takes effect. */
  readonly effectiveFrom: string
  /** Peak-hour price, present from the 2026-08-17 tier switch onward. */
  readonly peak?: ModelPrice
  /** Off-peak price, present from the 2026-08-17 tier switch onward. */
  readonly offPeak?: ModelPrice
  /** Flat all-day price, present before the tier switch. */
  readonly flat?: ModelPrice
}

/** One priced table entry: newest schedule first, the first applicable wins. */
export interface PriceTableEntry {
  /** Display label for the model tier. */
  readonly label: string
  /** Human note about the pricing basis (shown in tooltips). */
  readonly note?: string
  /** Schedules in descending effective-from order. */
  readonly schedules: readonly PriceSchedule[]
}

/** The deployable price table. */
export interface BillingPriceTable {
  /** Table version shown in the UI so a stale table is legible. */
  readonly version: string
  /** model id → entry; the '*' entry prices models without an exact row. */
  readonly models: Readonly<Record<string, PriceTableEntry>>
}

/** Beijing-time day tier. */
export type PriceTier = 'peak' | 'offPeak'

/**
 * The tier in force for one moment (Beijing time): peak is 9:00-12:00 and
 * 14:00-18:00, everything else is off-peak.
 * @param when - the moment to classify.
 * @returns the Beijing tier.
 */
export function tierFor(when: Date): PriceTier {
  const beijing = new Date(when.getTime() + 8 * 3_600_000)
  const hour = beijing.getUTCHours()
  return (hour >= 9 && hour < 12) || (hour >= 14 && hour < 18) ? 'peak' : 'offPeak'
}

/** The sentinel schedule keeping pre-tier history priced. */
const EPOCH = '2020-01-01T00:00:00+08:00'

/**
 * Official price table, snapshotted from the pricing page on 2026-08-14.
 * The 2026-08-17 00:00 Beijing tier switch is modeled per schedule; before it
 * the flat all-day prices apply. Verify against the pricing page before
 * trusting a displayed total — this table is plain data on purpose.
 */
export const DEFAULT_PRICE_TABLE: BillingPriceTable = {
  version: '官方价格页快照 2026-08-14（含 08-17 峰谷调价）',
  models: {
    'deepseek-v4-pro': {
      label: 'DeepSeek-V4-Pro (0813)',
      schedules: [
        {
          effectiveFrom: '2026-08-17T00:00:00+08:00',
          peak: { cacheHitInputPerM: 0.30, cacheMissInputPerM: 9, outputPerM: 27 },
          offPeak: { cacheHitInputPerM: 0.15, cacheMissInputPerM: 4.5, outputPerM: 13.5 },
        },
        {
          effectiveFrom: EPOCH,
          flat: { cacheHitInputPerM: 0.025, cacheMissInputPerM: 3, outputPerM: 6 },
        },
      ],
      note: '08-17 起峰谷定价；此前为命中 ¥0.025/未命中 ¥3/输出 ¥6（每百万 tokens）。',
    },
    'deepseek-v4-flash': {
      label: 'DeepSeek-V4-Flash (0731)',
      schedules: [
        {
          effectiveFrom: '2026-08-17T00:00:00+08:00',
          peak: { cacheHitInputPerM: 0.10, cacheMissInputPerM: 3, outputPerM: 9 },
          offPeak: { cacheHitInputPerM: 0.05, cacheMissInputPerM: 1.5, outputPerM: 4.5 },
        },
        {
          effectiveFrom: EPOCH,
          flat: { cacheHitInputPerM: 0.02, cacheMissInputPerM: 1, outputPerM: 2 },
        },
      ],
      note: '08-17 起峰谷定价；此前为命中 ¥0.02/未命中 ¥1/输出 ¥2（每百万 tokens）。',
    },
    '*': {
      label: 'Fallback',
      schedules: [
        {
          effectiveFrom: '2026-08-17T00:00:00+08:00',
          peak: { cacheHitInputPerM: 0.30, cacheMissInputPerM: 9, outputPerM: 27 },
          offPeak: { cacheHitInputPerM: 0.15, cacheMissInputPerM: 4.5, outputPerM: 13.5 },
        },
        {
          effectiveFrom: EPOCH,
          flat: { cacheHitInputPerM: 0.025, cacheMissInputPerM: 3, outputPerM: 6 },
        },
      ],
      note: '未收录模型的回退价，与 V4-Pro 一致；请在价格表中补充该模型。',
    },
  },
}

/** Provider-reported token buckets of one session (the `tokenUsage` projection). */
export interface TokenUsageBuckets {
  uncachedInputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

/** Per-bucket money breakdown. */
export interface CostBreakdown {
  inputMissCost: number
  inputHitCost: number
  outputCost: number
  totalCost: number
}

/** The tier actually priced: `flat` for pre-tier schedules. */
export type AppliedTier = PriceTier | 'flat'

/** Full pricing answer for one session. */
export interface SessionCost {
  /** Model id the pricing used. */
  model: string
  /** True when the model matched an exact table row (not the '*' fallback). */
  exactModel: boolean
  /** Table version priced with. */
  tableVersion: string
  /** Tier the moment was priced with. */
  tier: AppliedTier
  /** Token buckets priced. */
  tokens: TokenUsageBuckets
  /** Money breakdown in CNY. */
  costs: CostBreakdown
}

/** Convert per-1M-token price and token count into CNY. */
function moneyOf(tokens: number, perM: number): number {
  return (tokens / 1_000_000) * perM
}

/** Select the table entry for one model id (exact row, then the fallback). */
export function entryOf(table: BillingPriceTable, model: string): { entry: PriceTableEntry; exact: boolean } {
  const exact = table.models[model]
  if (exact !== undefined) return { entry: exact, exact: true }
  const fallback = table.models['*']
  if (fallback === undefined) {
    throw new Error(`billing pricing: table "${table.version}" has no entry for "${model}" and no '*' fallback`)
  }
  return { entry: fallback, exact: false }
}

/** Select the schedule in force at one moment (newest-first ordering). */
export function scheduleFor(entry: PriceTableEntry, when: Date): PriceSchedule {
  const at = when.getTime()
  for (const schedule of entry.schedules) {
    if (at >= Date.parse(schedule.effectiveFrom)) return schedule
  }
  throw new Error(`billing pricing: model "${entry.label}" has no schedule for ${when.toISOString()}`)
}

/** Resolve the effective price and tier of one entry at one moment. */
export function priceAt(entry: PriceTableEntry, when: Date): { price: ModelPrice; tier: AppliedTier } {
  const schedule = scheduleFor(entry, when)
  if (schedule.flat !== undefined) return { price: schedule.flat, tier: 'flat' }
  const tier = tierFor(when)
  const price = tier === 'peak' ? schedule.peak : schedule.offPeak
  if (price === undefined) {
    throw new Error(`billing pricing: model "${entry.label}" has no ${tier} price for ${when.toISOString()}`)
  }
  return { price, tier }
}

/**
 * Price one session's token buckets.
 * @param table - price table to use.
 * @param model - model id to price with.
 * @param tokens - provider-reported buckets.
 * @param when - moment to price at (defaults to now).
 * @returns the cost answer.
 */
export function priceUsage(
  table: BillingPriceTable,
  model: string,
  tokens: TokenUsageBuckets,
  when: Date = new Date(),
): SessionCost {
  const { entry, exact } = entryOf(table, model)
  const { price, tier } = priceAt(entry, when)
  const inputHitCost = moneyOf(tokens.cacheReadTokens, price.cacheHitInputPerM)
  const inputMissCost = moneyOf(tokens.uncachedInputTokens + tokens.cacheWriteTokens, price.cacheMissInputPerM)
  const outputCost = moneyOf(tokens.outputTokens, price.outputPerM)
  return {
    model,
    exactModel: exact,
    tableVersion: table.version,
    tier,
    tokens: {
      uncachedInputTokens: tokens.uncachedInputTokens,
      outputTokens: tokens.outputTokens,
      cacheReadTokens: tokens.cacheReadTokens,
      cacheWriteTokens: tokens.cacheWriteTokens,
    },
    costs: {
      inputMissCost,
      inputHitCost,
      outputCost,
      totalCost: inputHitCost + inputMissCost + outputCost,
    },
  }
}

/**
 * Format a CNY amount for the widget: two decimals from ¥0.01 up (rounded
 * with an epsilon so 0.015 reads 0.02, not the float-truncated 0.01), four
 * decimals below so a cheap session still shows movement, and a plain 0.00
 * for zero, negative, and non-finite input.
 * @param amount - CNY value (non-negative).
 * @returns display string without a currency sign.
 */
export function formatCny(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return '0.00'
  if (amount >= 0.01) {
    return ((Math.round((amount + Number.EPSILON) * 100) / 100).toFixed(2))
  }
  return amount.toFixed(4)
}

/**
 * Compact token count for the widget: 517 / 12.2K / 517K / 1.2M.
 * @param n - token count.
 * @returns display string.
 */
export function formatTokens(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0'
  const scaled = (v: number): string =>
    v >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10)
  if (n < 1_000) return String(n)
  if (n < 1_000_000) return `${scaled(n / 1_000)}K`
  return `${scaled(n / 1_000_000)}M`
}
