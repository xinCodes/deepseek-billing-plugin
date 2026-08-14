import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import { NS } from './locales.ts';
import { type ClientBalanceErrorCode, type ClientBalanceInfo } from './wire.ts';
/** Host route the widget fetches. */
export declare const BALANCE_ENDPOINT = "/api/deepseek-billing/balance";
/** Auto-refresh period while the popover is open. */
export declare const BALANCE_REFRESH_MS = 60000;
/** Balance read state machine. */
export type BalanceState = {
    status: 'idle';
} | {
    status: 'loading';
} | {
    status: 'ok';
    balance: ClientBalanceInfo;
} | {
    status: 'error';
    code: ClientBalanceErrorCode;
    message: string;
};
/** Locale keys the error mapper may produce (typed so `t()` accepts them). */
export type BalanceErrorKey = 'balance.missingKey' | 'balance.unauthorized' | 'balance.httpError' | 'balance.networkError' | 'balance.invalidPayload';
/** Map a balance error code to its localized copy key. */
export declare function errorKey(code: ClientBalanceErrorCode): BalanceErrorKey;
/** Total balance of the first record, for the compact trigger. */
export declare function firstTotal(balance: ClientBalanceInfo): {
    currency: string;
    total: number;
};
/** Full props for the session-header balance action. */
export type BalanceActionProps = PropsRuntime<'conversation.session.header.actions'> & PropsLocale<typeof NS>;
/**
 * Session-header entry point for the balance widget.
 * @param props - runtime slot currency plus the namespace translator.
 * @returns the trigger and its popover panel.
 */
export declare function BalanceAction({ t }: BalanceActionProps): import("react").JSX.Element;
//# sourceMappingURL=BalanceAction.d.ts.map