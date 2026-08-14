/**
 * Pure pricing module: official table values, schedule transitions across
 * the 2026-08-17 Beijing tier switch, Beijing peak/off-peak classification,
 * fallback semantics, and formatter bounds.
 */
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PRICE_TABLE,
  entryOf,
  formatCny,
  formatTokens,
  priceAt,
  priceUsage,
  scheduleFor,
  tierFor,
  type BillingPriceTable,
  type PriceTableEntry,
} from '../src/pricing.ts'

const TABLE: BillingPriceTable = {
  version: 'test',
  models: {
    exact: {
      label: 'Exact',
      schedules: [
        {
          effectiveFrom: '2026-08-17T00:00:00+08:00',
          peak: { cacheHitInputPerM: 10, cacheMissInputPerM: 20, outputPerM: 100 },
          offPeak: { cacheHitInputPerM: 5, cacheMissInputPerM: 10, outputPerM: 50 },
        },
        {
          effectiveFrom: '2020-01-01T00:00:00+08:00',
          flat: { cacheHitInputPerM: 1, cacheMissInputPerM: 2, outputPerM: 10 },
        },
      ],
    },
    '*': {
      label: 'Fallback',
      schedules: [
        {
          effectiveFrom: '2026-08-17T00:00:00+08:00',
          peak: { cacheHitInputPerM: 10, cacheMissInputPerM: 20, outputPerM: 100 },
          offPeak: { cacheHitInputPerM: 5, cacheMissInputPerM: 10, outputPerM: 50 },
        },
        {
          effectiveFrom: '2020-01-01T00:00:00+08:00',
          flat: { cacheHitInputPerM: 1, cacheMissInputPerM: 2, outputPerM: 10 },
        },
      ],
    },
  },
}

const BUCKETS = {
  uncachedInputTokens: 1_000_000,
  outputTokens: 500_000,
  cacheReadTokens: 2_000_000,
  cacheWriteTokens: 3_000_000,
}

/** 2026-08-14 10:00 Beijing — the flat era. */
const FLAT = new Date('2026-08-14T10:00:00+08:00')
/** 2026-08-18 10:00 Beijing — tiered era, peak hour. */
const TIER_PEAK = new Date('2026-08-18T10:00:00+08:00')
/** 2026-08-18 20:00 Beijing — tiered era, off-peak hour. */
const TIER_OFFPEAK = new Date('2026-08-18T20:00:00+08:00')

describe('tierFor', () => {
  it('classifies the Beijing peak windows', () => {
    expect(tierFor(new Date('2026-08-18T08:59:00+08:00'))).toBe('offPeak')
    expect(tierFor(new Date('2026-08-18T09:00:00+08:00'))).toBe('peak')
    expect(tierFor(new Date('2026-08-18T11:59:59+08:00'))).toBe('peak')
    expect(tierFor(new Date('2026-08-18T12:00:00+08:00'))).toBe('offPeak')
    expect(tierFor(new Date('2026-08-18T13:59:59+08:00'))).toBe('offPeak')
    expect(tierFor(new Date('2026-08-18T14:00:00+08:00'))).toBe('peak')
    expect(tierFor(new Date('2026-08-18T17:59:59+08:00'))).toBe('peak')
    expect(tierFor(new Date('2026-08-18T18:00:00+08:00'))).toBe('offPeak')
  })

  it('is stable across UTC representations of the same Beijing hour', () => {
    expect(tierFor(new Date('2026-08-18T01:00:00Z'))).toBe('peak') // 09:00 Beijing
    expect(tierFor(new Date('2026-08-18T00:59:00Z'))).toBe('offPeak') // 08:59 Beijing
  })
})

describe('scheduleFor / priceAt', () => {
  it('picks the newest schedule in force', () => {
    expect(scheduleFor(TABLE.models.exact!, FLAT).effectiveFrom).toBe('2020-01-01T00:00:00+08:00')
    expect(scheduleFor(TABLE.models.exact!, TIER_PEAK).effectiveFrom).toBe('2026-08-17T00:00:00+08:00')
  })

  it('prices the flat schedule before the tier switch', () => {
    expect(priceAt(TABLE.models.exact!, FLAT)).toEqual({
      price: { cacheHitInputPerM: 1, cacheMissInputPerM: 2, outputPerM: 10 },
      tier: 'flat',
    })
  })

  it('prices peak and off-peak after the tier switch', () => {
    expect(priceAt(TABLE.models.exact!, TIER_PEAK).tier).toBe('peak')
    expect(priceAt(TABLE.models.exact!, TIER_PEAK).price.outputPerM).toBe(100)
    expect(priceAt(TABLE.models.exact!, TIER_OFFPEAK).tier).toBe('offPeak')
    expect(priceAt(TABLE.models.exact!, TIER_OFFPEAK).price.outputPerM).toBe(50)
  })

  it('throws when no schedule is in force or a tier price is missing', () => {
    expect(() => scheduleFor(TABLE.models.exact!, new Date('1999-01-01T00:00:00Z'))).toThrow(/no schedule/)
    const malformed: PriceTableEntry = {
      label: 'Broken',
      schedules: [{ effectiveFrom: '2026-08-17T00:00:00+08:00', peak: { cacheHitInputPerM: 1, cacheMissInputPerM: 1, outputPerM: 1 } }],
    }
    expect(() => priceAt(malformed, TIER_OFFPEAK)).toThrow(/no offPeak price/)
  })
})

describe('priceUsage', () => {
  it('prices every bucket with the exact model row in the flat era', () => {
    const cost = priceUsage(TABLE, 'exact', BUCKETS, FLAT)
    expect(cost.exactModel).toBe(true)
    expect(cost.tier).toBe('flat')
    // miss = (1M + 3M)/1M * 2 = 8; hit = 2M/1M * 1 = 2; output = 0.5M/1M * 10 = 5.
    expect(cost.costs.inputMissCost).toBeCloseTo(8)
    expect(cost.costs.inputHitCost).toBeCloseTo(2)
    expect(cost.costs.outputCost).toBeCloseTo(5)
    expect(cost.costs.totalCost).toBeCloseTo(15)
  })

  it('prices peak and off-peak tiers after the switch', () => {
    const peak = priceUsage(TABLE, 'exact', BUCKETS, TIER_PEAK)
    expect(peak.tier).toBe('peak')
    // 4 * 20 + 2 * 10 + 0.5 * 100 = 150.
    expect(peak.costs.totalCost).toBeCloseTo(150)

    const offPeak = priceUsage(TABLE, 'exact', BUCKETS, TIER_OFFPEAK)
    expect(offPeak.tier).toBe('offPeak')
    // 4 * 10 + 2 * 5 + 0.5 * 50 = 75.
    expect(offPeak.costs.totalCost).toBeCloseTo(75)
  })

  it('prices unknown models with the fallback row and flags it', () => {
    const cost = priceUsage(TABLE, 'missing-model', BUCKETS, FLAT)
    expect(cost.exactModel).toBe(false)
    expect(cost.costs.totalCost).toBeCloseTo(15)
  })

  it('returns zero cost for zero tokens', () => {
    const cost = priceUsage(TABLE, 'exact', {
      uncachedInputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    }, FLAT)
    expect(cost.costs.totalCost).toBe(0)
  })

  it('copies the buckets instead of aliasing the caller object', () => {
    const cost = priceUsage(TABLE, 'exact', BUCKETS, FLAT)
    expect(cost.tokens).not.toBe(BUCKETS)
    expect(cost.tokens.uncachedInputTokens).toBe(BUCKETS.uncachedInputTokens)
  })
})

describe('entryOf', () => {
  it('prefers the exact row over the fallback', () => {
    expect(entryOf(TABLE, 'exact').exact).toBe(true)
  })

  it('falls back to the * row', () => {
    expect(entryOf(TABLE, 'other').exact).toBe(false)
  })

  it('throws when neither the model nor a fallback exists', () => {
    const bare: BillingPriceTable = { version: 'bare', models: {} }
    expect(() => entryOf(bare, 'exact')).toThrow(/no entry/)
  })
})

describe('formatCny', () => {
  it('rounds to two decimals from ¥0.01 up', () => {
    expect(formatCny(1)).toBe('1.00')
    expect(formatCny(0.015)).toBe('0.02')
    expect(formatCny(12.345)).toBe('12.35')
  })

  it('keeps four decimals below ¥0.01 so cheap sessions still move', () => {
    expect(formatCny(0.0042)).toBe('0.0042')
    expect(formatCny(0.0001)).toBe('0.0001')
  })

  it('renders zero for non-positive and non-finite input', () => {
    expect(formatCny(0)).toBe('0.00')
    expect(formatCny(-1)).toBe('0.00')
    expect(formatCny(Number.NaN)).toBe('0.00')
    expect(formatCny(Number.POSITIVE_INFINITY)).toBe('0.00')
  })
})

describe('formatTokens', () => {
  it('keeps sub-thousand counts verbatim and zero for empty input', () => {
    expect(formatTokens(0)).toBe('0')
    expect(formatTokens(-5)).toBe('0')
    expect(formatTokens(517)).toBe('517')
    expect(formatTokens(999)).toBe('999')
  })

  it('scales to K with one decimal under three digits', () => {
    expect(formatTokens(1_000)).toBe('1K')
    expect(formatTokens(12_200)).toBe('12.2K')
    expect(formatTokens(123_000)).toBe('123K')
  })

  it('scales to M with one decimal under three digits', () => {
    expect(formatTokens(1_000_000)).toBe('1M')
    expect(formatTokens(1_234_567)).toBe('1.2M')
    expect(formatTokens(517_000_000)).toBe('517M')
  })
})

describe('DEFAULT_PRICE_TABLE', () => {
  it('carries a non-empty version and a * fallback', () => {
    expect(DEFAULT_PRICE_TABLE.version.length).toBeGreaterThan(0)
    expect(DEFAULT_PRICE_TABLE.models['*']).toBeDefined()
  })

  it('every entry has descending schedules, each with flat XOR peak+offPeak, all prices positive', () => {
    for (const [model, entry] of Object.entries(DEFAULT_PRICE_TABLE.models)) {
      expect(entry.label.length, `label of ${model}`).toBeGreaterThan(0)
      expect(entry.schedules.length, `schedules of ${model}`).toBeGreaterThan(0)
      let previous = Number.POSITIVE_INFINITY
      for (const schedule of entry.schedules) {
        const at = Date.parse(schedule.effectiveFrom)
        expect(Number.isFinite(at), `effectiveFrom of ${model}`).toBe(true)
        expect(at, `ordering of ${model}`).toBeLessThan(previous)
        previous = at
        const tiered = schedule.peak !== undefined || schedule.offPeak !== undefined
        const flat = schedule.flat !== undefined
        expect(tiered !== flat, `schedule shape of ${model}`).toBe(true)
        for (const price of [schedule.flat, schedule.peak, schedule.offPeak]) {
          if (price === undefined) continue
          expect(price.cacheHitInputPerM, `hit of ${model}`).toBeGreaterThan(0)
          expect(price.cacheMissInputPerM, `miss of ${model}`).toBeGreaterThan(0)
          expect(price.outputPerM, `output of ${model}`).toBeGreaterThan(0)
          expect(Number.isFinite(price.outputPerM)).toBe(true)
        }
      }
    }
  })

  it('pins the official 2026-08-14 snapshot values (regression guard)', () => {
    const pro = DEFAULT_PRICE_TABLE.models['deepseek-v4-pro']!
    const flash = DEFAULT_PRICE_TABLE.models['deepseek-v4-flash']!
    // Flat (in force until 2026-08-17 00:00 Beijing).
    expect(pro.schedules[1]?.flat).toEqual({ cacheHitInputPerM: 0.025, cacheMissInputPerM: 3, outputPerM: 6 })
    expect(flash.schedules[1]?.flat).toEqual({ cacheHitInputPerM: 0.02, cacheMissInputPerM: 1, outputPerM: 2 })
    // Tiered (in force from 2026-08-17 00:00 Beijing).
    expect(pro.schedules[0]?.peak).toEqual({ cacheHitInputPerM: 0.30, cacheMissInputPerM: 9, outputPerM: 27 })
    expect(pro.schedules[0]?.offPeak).toEqual({ cacheHitInputPerM: 0.15, cacheMissInputPerM: 4.5, outputPerM: 13.5 })
    expect(flash.schedules[0]?.peak).toEqual({ cacheHitInputPerM: 0.10, cacheMissInputPerM: 3, outputPerM: 9 })
    expect(flash.schedules[0]?.offPeak).toEqual({ cacheHitInputPerM: 0.05, cacheMissInputPerM: 1.5, outputPerM: 4.5 })
  })
})
