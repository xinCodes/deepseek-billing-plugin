/**
 * Billing plugin, browser half, two surfaces:
 * - the session-header action shows the DeepSeek ACCOUNT BALANCE (fetched
 *   from the host route registered by the out-of-tree `deepseek-billing` host
 *   plugin; see wire.ts);
 * - a `conversation.composer.stats.extra` group fuses THIS SESSION'S estimated
 *   cost into the shipped composer stats strip, priced locally from the
 *   `tokenUsage` session projection with the package's price table.
 * No RPC, no store of its own beyond popover visibility.
 * @module @deepseek-ai/dsh-client-ui-deepseek-billing/client
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
import { type BillingKey } from './locales.ts';
export type { BillingKey } from './locales.ts';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** Billing widget copy. */
        billing: BillingKey;
    }
}
/** Required services: the two slots, the session kit, and the copy. */
export declare const inject: string[];
/**
 * Client plugin body: register the dictionaries and the two surfaces.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map