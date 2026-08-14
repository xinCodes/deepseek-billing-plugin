import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Session-header balance widget: the DeepSeek account balance only. The
 * session cost moved into the composer stats strip (`SessionCostGroup`), so
 * this control owns the account read and nothing else. Balance arrives from
 * the host route (see wire.ts) and auto-refreshes while the popover is open.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives';
import { formatCny } from "../pricing.js";
import { parseBalanceBody } from "./wire.js";
import css from './BalanceAction.module.css';
/** Host route the widget fetches. */
export const BALANCE_ENDPOINT = '/api/deepseek-billing/balance';
/** Auto-refresh period while the popover is open. */
export const BALANCE_REFRESH_MS = 60_000;
/** Map a balance error code to its localized copy key. */
export function errorKey(code) {
    switch (code) {
        case 'MISSING_KEY': return 'balance.missingKey';
        case 'UNAUTHORIZED': return 'balance.unauthorized';
        case 'HTTP_ERROR': return 'balance.httpError';
        case 'NETWORK_ERROR': return 'balance.networkError';
        case 'INVALID_PAYLOAD': return 'balance.invalidPayload';
        case 'BAD_RESPONSE': return 'balance.invalidPayload';
    }
}
/** Total balance of the first record, for the compact trigger. */
export function firstTotal(balance) {
    const first = balance.records[0];
    if (first === undefined)
        return { currency: 'CNY', total: 0 };
    return { currency: first.currency, total: first.totalBalance };
}
/**
 * Session-header entry point for the balance widget.
 * @param props - runtime slot currency plus the namespace translator.
 * @returns the trigger and its popover panel.
 */
export function BalanceAction({ t }) {
    const [open, setOpen] = useState(false);
    const [balance, setBalance] = useState({ status: 'idle' });
    const rootRef = useRef(null);
    const triggerRef = useRef(null);
    const requestSeq = useRef(0);
    const loadBalance = useCallback(async () => {
        const seq = ++requestSeq.current;
        setBalance({ status: 'loading' });
        try {
            const response = await fetch(BALANCE_ENDPOINT, { headers: { accept: 'application/json' } });
            const body = parseBalanceBody(await response.json());
            if (seq !== requestSeq.current)
                return;
            if (body.ok) {
                setBalance({ status: 'ok', balance: body.balance });
                return;
            }
            setBalance({ status: 'error', code: body.error.code, message: t(errorKey(body.error.code)) });
        }
        catch {
            if (seq !== requestSeq.current)
                return;
            setBalance({ status: 'error', code: 'NETWORK_ERROR', message: t('balance.networkError') });
        }
    }, [t]);
    useEffect(() => {
        if (!open)
            return;
        void loadBalance();
        const timer = setInterval(() => { void loadBalance(); }, BALANCE_REFRESH_MS);
        return () => { clearInterval(timer); };
    }, [open, loadBalance]);
    useEffect(() => {
        if (!open)
            return;
        const closeOutside = (event) => {
            if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('pointerdown', closeOutside);
        return () => { document.removeEventListener('pointerdown', closeOutside); };
    }, [open]);
    const onKeyDown = (event) => {
        if (event.key !== 'Escape' || !open)
            return;
        event.preventDefault();
        setOpen(false);
        triggerRef.current?.focus();
    };
    const triggerText = balance.status === 'ok'
        ? `${firstTotal(balance.balance).currency} ¥${formatCny(firstTotal(balance.balance).total)}`
        : balance.status === 'loading' || balance.status === 'idle'
            ? '¥…'
            : '¥—';
    return (_jsxs("div", { ref: rootRef, className: css.root, onKeyDown: onKeyDown, children: [_jsxs("button", { ref: triggerRef, type: "button", className: css.trigger, "aria-expanded": open, "aria-label": t('trigger.aria'), onClick: () => { setOpen(current => !current); }, children: [_jsx("span", { className: css.count, children: triggerText }), _jsx(IconChevronDownOutline14, { className: open ? css.triggerOpen : undefined })] }), open
                ? (_jsxs("div", { className: css.menu, children: [_jsx("div", { className: css.sectionTitle, children: t('balance.title') }), balance.status === 'ok' && !balance.balance.isAvailable
                            ? _jsx("div", { className: css.note, children: t('balance.unavailable') })
                            : null, balance.status === 'ok' && balance.balance.records.length === 0
                            ? _jsx("div", { className: css.note, children: t('balance.empty') })
                            : null, balance.status === 'ok'
                            ? balance.balance.records.map(record => (_jsxs("div", { className: css.section, children: [_jsx(Row, { label: t('balance.total'), value: `${record.currency} ¥${formatCny(record.totalBalance)}` }), _jsx(Row, { label: t('balance.granted'), value: `¥${formatCny(record.grantedBalance)}` }), _jsx(Row, { label: t('balance.toppedUp'), value: `¥${formatCny(record.toppedUpBalance)}` })] }, record.currency)))
                            : null, balance.status === 'error'
                            ? _jsx("div", { className: css.note, children: balance.message })
                            : null, balance.status === 'loading'
                            ? _jsx("div", { className: css.note, children: t('balance.refreshing') })
                            : null, _jsx("button", { type: "button", className: css.refresh, onClick: () => { void loadBalance(); }, children: t('balance.refresh') })] }))
                : null] }));
}
/** One label/value row of the popover. */
function Row({ label, value }) {
    return (_jsxs("div", { className: css.row, children: [_jsx("span", { className: css.rowLabel, children: label }), _jsx("span", { className: css.rowValue, children: value })] }));
}
//# sourceMappingURL=BalanceAction.js.map