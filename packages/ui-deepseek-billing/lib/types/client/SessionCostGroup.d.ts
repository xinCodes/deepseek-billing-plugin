import type { PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
import type { ConversationNode } from '@deepseek-ai/dsh-client-runtime/client';
import { NS } from './locales.ts';
/** Model priced when the visible window carries no request config. */
export declare const DEFAULT_MODEL = "deepseek-v4-pro";
/**
 * Latest model id in the visible window, preferring assistant nodes that
 * carry a request config. The projection totals span the whole log while the
 * window is paged, so a model switched mid-session prices everything with the
 * newest one — the tooltip note covers the difference.
 * @param nodes - conversation nodes in display order.
 * @returns the newest model id, or undefined when no node carries one.
 */
export declare function latestModel(nodes: readonly ConversationNode[]): string | undefined;
/** Full props for the stats-extra group. */
export type SessionCostGroupProps = PropsRuntime<'conversation.composer.stats.extra'> & PropsLocale<typeof NS>;
/**
 * Inline cost label for the composer stats strip.
 * @param props - runtime slot currency plus the namespace translator.
 * @returns the label, or null when the session has no settled usage.
 */
export declare function SessionCostGroup({ useSession, useProjection, t }: SessionCostGroupProps): import("react").JSX.Element | null;
//# sourceMappingURL=SessionCostGroup.d.ts.map