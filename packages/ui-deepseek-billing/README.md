# @deepseek-ai/dsh-client-ui-deepseek-billing

English | [中文](README.zh.md)

Web billing widget, two surfaces: a session-header action showing the DeepSeek account balance, and a `conversation.composer.stats.extra` group that fuses this session's estimated cost into the shipped composer stats strip. The browser cannot call `api.deepseek.com` directly (no CORS headers on `/user/balance`), so the account read goes through the out-of-tree `deepseek-billing` host plugin, which serves one same-origin route, `/api/deepseek-billing/balance` (see the package's `scratch-plugin-billing` companion at the repository root). The API key is never sent anywhere except that host route and onward to `api.deepseek.com`; the host resolves it from the plugin config, the credentials domain, or `DEEPSEEK_API_KEY` in the launching environment.

The session cost needs no RPC: the `tokenUsage` session projection already carries the whole-log provider buckets, so the widget prices them locally with the package's own price table and updates live as usage streams in. The result is an **estimate** — token counts are provider-reported facts, money is counts times a price table. The table is snapshotted from the [official pricing page](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/) and carries effective-from dates per schedule, so the 2026-08-17 Beijing peak/off-peak switch (peak = Beijing 9:00-12:00 and 14:00-18:00) is priced correctly on both sides of the transition; the tier actually applied is labeled in the panel. The table is plain data (`DEFAULT_PRICE_TABLE`) and is deliberately easy to replace.

The header action always renders (balance is account-wide), showing the first record's total; its popover lists every balance record (total / granted / topped-up) and a refresh control, and auto-refreshes every 60s while open. The stats-strip group renders `会话 ¥…` once the session has settled usage, with a hover tooltip carrying the model, the cache-miss/cache-hit/output breakdown, the applied tier, and the estimate caveat. Escape or an outside pointer press closes the popover and returns focus. Styling uses tokens only; copy goes through the package's own `billing` locale namespace.

## Model Experience

None, as this package renders account and usage figures for a human and touches no prompt, message, schema, stream, or tool result.

#### KV Cache effect

None; the package never assembles or sends provider requests.

## Known Limitations and Deferred Work

- **Cost is an estimate** — the table snapshots the official pricing page; verify against it. The whole session is priced with the tier in force at the priced moment (the projection has no per-request timestamps).
- **One model per session** — the widget prices the whole log with the newest model seen in the visible window; a session that switches models mid-flight is priced uniformly.
- **No settings UI** — the API key and price overrides live in the host plugin's patch config (`scratch-plugin-billing/cordis.yml`), not in the web settings page.
