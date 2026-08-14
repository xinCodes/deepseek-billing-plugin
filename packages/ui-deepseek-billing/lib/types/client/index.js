import { BalanceAction } from "./BalanceAction.js";
import { SessionCostGroup } from "./SessionCostGroup.js";
import { en, NS, zh } from "./locales.js";
/** Required services: the two slots, the session kit, and the copy. */
export const inject = ['sessions', 'slots', 'locale'];
/**
 * Client plugin body: register the dictionaries and the two surfaces.
 * @param ctx - client root context.
 */
export function apply(ctx) {
    ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-deepseek-billing: dictionaries');
    ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
        name: 'conversation.session.header.actions',
        id: 'deepseek-billing',
        // After the job list: process work reads before account figures.
        order: 30,
        locale: NS,
    }, BalanceAction));
    ctx.slots.inject('conversation.composer.stats.extra', () => ctx.slots.register({
        name: 'conversation.composer.stats.extra',
        id: 'billing-cost',
        order: 0,
        locale: NS,
    }, SessionCostGroup));
}
//# sourceMappingURL=index.js.map