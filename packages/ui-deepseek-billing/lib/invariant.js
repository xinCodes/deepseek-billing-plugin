//#region lib/types/invariant.js
/**
* Package-owned invariant companion for `@deepseek-ai/dsh-client-ui-deepseek-billing`.
* @module @deepseek-ai/dsh-client-ui-deepseek-billing/invariant
*/
const PACKAGE_NAME = "@deepseek-ai/dsh-client-ui-deepseek-billing";
/** Cordis companion plugin name. */
const name = "client-ui-deepseek-billing-invariant";
/** Service required before the companion can reserve package ownership. */
const inject = ["invariants"];
/**
* No runtime invariant: this package is a read-only projection of the
* `tokenUsage` session projection plus one host HTTP route onto one header
* slot entry. It emits no cordis events, owns no cross-plugin mutable state,
* and its single slot registration proves disposal through the HMR-safety
* spec.
*/
const install = () => {};
/**
* Register this package's invariant companion.
* @param ctx - Cordis context carrying the invariant service.
* @returns the installed registration's disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
