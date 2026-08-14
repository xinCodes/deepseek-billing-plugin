/**
 * Session-header balance widget: the DeepSeek account balance only. The
 * session cost moved into the composer stats strip (`SessionCostGroup`), so
 * this control owns the account read and nothing else. Balance arrives from
 * the host route (see wire.ts) and auto-refreshes while the popover is open.
 */
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { formatCny } from '../pricing.ts'
import { NS } from './locales.ts'
import { parseBalanceBody, type ClientBalanceErrorCode, type ClientBalanceInfo } from './wire.ts'
import css from './BalanceAction.module.css'

/** Host route the widget fetches. */
export const BALANCE_ENDPOINT = '/api/deepseek-billing/balance'

/** Auto-refresh period while the popover is open. */
export const BALANCE_REFRESH_MS = 60_000

/** Balance read state machine. */
export type BalanceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ok'; balance: ClientBalanceInfo }
  | { status: 'error'; code: ClientBalanceErrorCode; message: string }

/** Locale keys the error mapper may produce (typed so `t()` accepts them). */
export type BalanceErrorKey =
  | 'balance.missingKey'
  | 'balance.unauthorized'
  | 'balance.httpError'
  | 'balance.networkError'
  | 'balance.invalidPayload'

/** Map a balance error code to its localized copy key. */
export function errorKey(code: ClientBalanceErrorCode): BalanceErrorKey {
  switch (code) {
    case 'MISSING_KEY': return 'balance.missingKey'
    case 'UNAUTHORIZED': return 'balance.unauthorized'
    case 'HTTP_ERROR': return 'balance.httpError'
    case 'NETWORK_ERROR': return 'balance.networkError'
    case 'INVALID_PAYLOAD': return 'balance.invalidPayload'
    case 'BAD_RESPONSE': return 'balance.invalidPayload'
  }
}

/** Total balance of the first record, for the compact trigger. */
export function firstTotal(balance: ClientBalanceInfo): { currency: string; total: number } {
  const first = balance.records[0]
  if (first === undefined) return { currency: 'CNY', total: 0 }
  return { currency: first.currency, total: first.totalBalance }
}

/** Full props for the session-header balance action. */
export type BalanceActionProps =
  PropsRuntime<'conversation.session.header.actions'> & PropsLocale<typeof NS>

/**
 * Session-header entry point for the balance widget.
 * @param props - runtime slot currency plus the namespace translator.
 * @returns the trigger and its popover panel.
 */
export function BalanceAction({ t }: BalanceActionProps) {
  const [open, setOpen] = useState(false)
  const [balance, setBalance] = useState<BalanceState>({ status: 'idle' })
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const requestSeq = useRef(0)

  const loadBalance = useCallback(async (): Promise<void> => {
    const seq = ++requestSeq.current
    setBalance({ status: 'loading' })
    try {
      const response = await fetch(BALANCE_ENDPOINT, { headers: { accept: 'application/json' } })
      const body = parseBalanceBody(await response.json())
      if (seq !== requestSeq.current) return
      if (body.ok) {
        setBalance({ status: 'ok', balance: body.balance })
        return
      }
      setBalance({ status: 'error', code: body.error.code, message: t(errorKey(body.error.code)) })
    } catch {
      if (seq !== requestSeq.current) return
      setBalance({ status: 'error', code: 'NETWORK_ERROR', message: t('balance.networkError') })
    }
  }, [t])

  useEffect(() => {
    if (!open) return
    void loadBalance()
    const timer = setInterval(() => { void loadBalance() }, BALANCE_REFRESH_MS)
    return () => { clearInterval(timer) }
  }, [open, loadBalance])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent): void => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => { document.removeEventListener('pointerdown', closeOutside) }
  }, [open])

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key !== 'Escape' || !open) return
    event.preventDefault()
    setOpen(false)
    triggerRef.current?.focus()
  }

  const triggerText = balance.status === 'ok'
    ? `${firstTotal(balance.balance).currency} ¥${formatCny(firstTotal(balance.balance).total)}`
    : balance.status === 'loading' || balance.status === 'idle'
      ? '¥…'
      : '¥—'

  return (
    <div ref={rootRef} className={css.root} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className={css.trigger}
        aria-expanded={open}
        aria-label={t('trigger.aria')}
        onClick={() => { setOpen(current => !current) }}
      >
        <span className={css.count}>{triggerText}</span>
        <IconChevronDownOutline14 className={open ? css.triggerOpen : undefined} />
      </button>
      {open
        ? (
          <div className={css.menu}>
            <div className={css.sectionTitle}>{t('balance.title')}</div>
            {balance.status === 'ok' && !balance.balance.isAvailable
              ? <div className={css.note}>{t('balance.unavailable')}</div>
              : null}
            {balance.status === 'ok' && balance.balance.records.length === 0
              ? <div className={css.note}>{t('balance.empty')}</div>
              : null}
            {balance.status === 'ok'
              ? balance.balance.records.map(record => (
                <div key={record.currency} className={css.section}>
                  <Row label={t('balance.total')} value={`${record.currency} ¥${formatCny(record.totalBalance)}`} />
                  <Row label={t('balance.granted')} value={`¥${formatCny(record.grantedBalance)}`} />
                  <Row label={t('balance.toppedUp')} value={`¥${formatCny(record.toppedUpBalance)}`} />
                </div>
              ))
              : null}
            {balance.status === 'error'
              ? <div className={css.note}>{balance.message}</div>
              : null}
            {balance.status === 'loading'
              ? <div className={css.note}>{t('balance.refreshing')}</div>
              : null}
            <button type="button" className={css.refresh} onClick={() => { void loadBalance() }}>
              {t('balance.refresh')}
            </button>
          </div>
        )
        : null}
    </div>
  )
}

/** One label/value row of the popover. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className={css.row}>
      <span className={css.rowLabel}>{label}</span>
      <span className={css.rowValue}>{value}</span>
    </div>
  )
}
