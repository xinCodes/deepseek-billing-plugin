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
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: the 'conversation.session.header.actions' and
// 'conversation.composer.stats.extra' SlotMap rows.
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import { BalanceAction } from './BalanceAction.tsx'
import { SessionCostGroup } from './SessionCostGroup.tsx'
import { en, NS, zh, type BillingKey } from './locales.ts'

export type { BillingKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** Billing widget copy. */
    billing: BillingKey
  }
}

/** Required services: the two slots, the session kit, and the copy. */
export const inject = ['sessions', 'slots', 'locale']

/**
 * Client plugin body: register the dictionaries and the two surfaces.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-deepseek-billing: dictionaries')
  ctx.slots.inject(
    'conversation.session.header.actions',
    () => ctx.slots.register({
      name: 'conversation.session.header.actions',
      id: 'deepseek-billing',
      // After the job list: process work reads before account figures.
      order: 30,
      locale: NS,
    }, BalanceAction),
  )
  ctx.slots.inject(
    'conversation.composer.stats.extra',
    () => ctx.slots.register({
      name: 'conversation.composer.stats.extra',
      id: 'billing-cost',
      order: 0,
      locale: NS,
    }, SessionCostGroup),
  )
}
