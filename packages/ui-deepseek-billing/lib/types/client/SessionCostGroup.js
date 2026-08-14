import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Composer stats-strip group: this session's estimated cost as one short
 * inline label fused into the shipped stats line (registered into
 * `conversation.composer.stats.extra`). The token buckets arrive live through
 * the `tokenUsage` projection; a hover tooltip carries the full breakdown.
 */
import { useMemo } from 'react';
import { Tooltip } from '@deepseek-ai/dsh-client-ui-primitives';
import { DEFAULT_PRICE_TABLE, formatCny, priceUsage } from "../pricing.js";
import css from './SessionCostGroup.module.css';
/** Model priced when the visible window carries no request config. */
export const DEFAULT_MODEL = 'deepseek-v4-pro';
/**
 * Latest model id in the visible window, preferring assistant nodes that
 * carry a request config. The projection totals span the whole log while the
 * window is paged, so a model switched mid-session prices everything with the
 * newest one — the tooltip note covers the difference.
 * @param nodes - conversation nodes in display order.
 * @returns the newest model id, or undefined when no node carries one.
 */
export function latestModel(nodes) {
    for (let i = nodes.length - 1; i >= 0; i--) {
        const node = nodes[i];
        if (node === undefined || node.kind !== 'assistant')
            continue;
        const model = node.requestConfig?.model;
        if (model !== undefined && model.length > 0)
            return model;
    }
    return undefined;
}
/**
 * Inline cost label for the composer stats strip.
 * @param props - runtime slot currency plus the namespace translator.
 * @returns the label, or null when the session has no settled usage.
 */
export function SessionCostGroup({ useSession, useProjection, t }) {
    const nodes = useSession(s => s.nodes);
    const model = latestModel(nodes) ?? DEFAULT_MODEL;
    const usage = useProjection('tokenUsage');
    const cost = useMemo(() => usage === undefined ? undefined : priceUsage(DEFAULT_PRICE_TABLE, model, usage), [usage, model]);
    if (cost === undefined)
        return null;
    if (cost.costs.totalCost <= 0)
        return null;
    const tierText = cost.tier === 'peak'
        ? t('cost.tier.peak')
        : cost.tier === 'offPeak'
            ? t('cost.tier.offPeak')
            : t('cost.tier.flat');
    const detail = t('cost.tooltip', {
        model: cost.model,
        miss: formatCny(cost.costs.inputMissCost),
        hit: formatCny(cost.costs.inputHitCost),
        output: formatCny(cost.costs.outputCost),
        total: formatCny(cost.costs.totalCost),
        tier: tierText,
    });
    return (_jsxs(_Fragment, { children: [_jsx("span", { className: css.sep, "aria-hidden": true, children: "|" }), ' ', _jsx(Tooltip, { label: detail, side: "top", delayMs: 500, children: _jsx("span", { className: css.label, children: t('cost.group', { amount: formatCny(cost.costs.totalCost) }) }) })] }));
}
//# sourceMappingURL=SessionCostGroup.js.map