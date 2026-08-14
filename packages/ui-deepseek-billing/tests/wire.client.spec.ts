/**
 * Wire body parsing: every malformed host-route shape maps to a typed failure
 * instead of throwing, and valid bodies validate field by field.
 */
import { describe, expect, it } from 'vitest'
import { parseBalanceBody } from '../src/client/wire.ts'

describe('parseBalanceBody', () => {
  it('accepts a well-formed success body', () => {
    expect(parseBalanceBody({
      ok: true,
      balance: {
        isAvailable: true,
        records: [{ currency: 'CNY', totalBalance: 1.5, grantedBalance: 0, toppedUpBalance: 1.5 }],
      },
    })).toEqual({
      ok: true,
      balance: {
        isAvailable: true,
        records: [{ currency: 'CNY', totalBalance: 1.5, grantedBalance: 0, toppedUpBalance: 1.5 }],
      },
    })
  })

  it('passes through a known error code with its message', () => {
    expect(parseBalanceBody({ ok: false, error: { code: 'UNAUTHORIZED', message: 'nope' } })).toEqual({
      ok: false,
      error: { code: 'UNAUTHORIZED', message: 'nope' },
    })
  })

  it('maps unknown error codes to BAD_RESPONSE and drops non-string messages', () => {
    expect(parseBalanceBody({ ok: false, error: { code: 'weird', message: 42 } })).toEqual({
      ok: false,
      error: { code: 'BAD_RESPONSE' },
    })
  })

  it('rejects non-object bodies and non-boolean ok flags', () => {
    expect(parseBalanceBody(null)).toEqual({ ok: false, error: { code: 'BAD_RESPONSE' } })
    expect(parseBalanceBody('x')).toEqual({ ok: false, error: { code: 'BAD_RESPONSE' } })
    expect(parseBalanceBody({ ok: 'yes' })).toEqual({ ok: false, error: { code: 'BAD_RESPONSE' } })
    expect(parseBalanceBody({ ok: false, error: null })).toEqual({ ok: false, error: { code: 'BAD_RESPONSE' } })
  })

  it('rejects malformed balance shapes field by field', () => {
    const cases: unknown[] = [
      { ok: true, balance: null },
      { ok: true, balance: {} },
      { ok: true, balance: { isAvailable: 'yes', records: [] } },
      { ok: true, balance: { isAvailable: true, records: {} } },
      { ok: true, balance: { isAvailable: true, records: [null] } },
      { ok: true, balance: { isAvailable: true, records: [{ currency: '', totalBalance: 1, grantedBalance: 0, toppedUpBalance: 0 }] } },
      { ok: true, balance: { isAvailable: true, records: [{ currency: 'CNY', totalBalance: '1', grantedBalance: 0, toppedUpBalance: 0 }] } },
      { ok: true, balance: { isAvailable: true, records: [{ currency: 'CNY', totalBalance: -1, grantedBalance: 0, toppedUpBalance: 0 }] } },
      { ok: true, balance: { isAvailable: true, records: [{ currency: 'CNY', totalBalance: 1, grantedBalance: 0, toppedUpBalance: Number.NaN }] } },
    ]
    for (const value of cases) {
      expect(parseBalanceBody(value)).toEqual({ ok: false, error: { code: 'INVALID_PAYLOAD' } })
    }
  })
})
