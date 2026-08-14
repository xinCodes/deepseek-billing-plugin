window.__ModuleLoader__.load({
	id: "@deepseek-ai/dsh-client-ui-deepseek-billing",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/pricing.ts
		/**
		* The tier in force for one moment (Beijing time): peak is 9:00-12:00 and
		* 14:00-18:00, everything else is off-peak.
		* @param when - the moment to classify.
		* @returns the Beijing tier.
		*/
		function tierFor(when) {
			const hour = new Date(when.getTime() + 8 * 36e5).getUTCHours();
			return hour >= 9 && hour < 12 || hour >= 14 && hour < 18 ? "peak" : "offPeak";
		}
		/** The sentinel schedule keeping pre-tier history priced. */
		const EPOCH = "2020-01-01T00:00:00+08:00";
		/**
		* Official price table, snapshotted from the pricing page on 2026-08-14.
		* The 2026-08-17 00:00 Beijing tier switch is modeled per schedule; before it
		* the flat all-day prices apply. Verify against the pricing page before
		* trusting a displayed total — this table is plain data on purpose.
		*/
		const DEFAULT_PRICE_TABLE = {
			version: "官方价格页快照 2026-08-14（含 08-17 峰谷调价）",
			models: {
				"deepseek-v4-pro": {
					label: "DeepSeek-V4-Pro (0813)",
					schedules: [{
						effectiveFrom: "2026-08-17T00:00:00+08:00",
						peak: {
							cacheHitInputPerM: .3,
							cacheMissInputPerM: 9,
							outputPerM: 27
						},
						offPeak: {
							cacheHitInputPerM: .15,
							cacheMissInputPerM: 4.5,
							outputPerM: 13.5
						}
					}, {
						effectiveFrom: EPOCH,
						flat: {
							cacheHitInputPerM: .025,
							cacheMissInputPerM: 3,
							outputPerM: 6
						}
					}],
					note: "08-17 起峰谷定价；此前为命中 ¥0.025/未命中 ¥3/输出 ¥6（每百万 tokens）。"
				},
				"deepseek-v4-flash": {
					label: "DeepSeek-V4-Flash (0731)",
					schedules: [{
						effectiveFrom: "2026-08-17T00:00:00+08:00",
						peak: {
							cacheHitInputPerM: .1,
							cacheMissInputPerM: 3,
							outputPerM: 9
						},
						offPeak: {
							cacheHitInputPerM: .05,
							cacheMissInputPerM: 1.5,
							outputPerM: 4.5
						}
					}, {
						effectiveFrom: EPOCH,
						flat: {
							cacheHitInputPerM: .02,
							cacheMissInputPerM: 1,
							outputPerM: 2
						}
					}],
					note: "08-17 起峰谷定价；此前为命中 ¥0.02/未命中 ¥1/输出 ¥2（每百万 tokens）。"
				},
				"*": {
					label: "Fallback",
					schedules: [{
						effectiveFrom: "2026-08-17T00:00:00+08:00",
						peak: {
							cacheHitInputPerM: .3,
							cacheMissInputPerM: 9,
							outputPerM: 27
						},
						offPeak: {
							cacheHitInputPerM: .15,
							cacheMissInputPerM: 4.5,
							outputPerM: 13.5
						}
					}, {
						effectiveFrom: EPOCH,
						flat: {
							cacheHitInputPerM: .025,
							cacheMissInputPerM: 3,
							outputPerM: 6
						}
					}],
					note: "未收录模型的回退价，与 V4-Pro 一致；请在价格表中补充该模型。"
				}
			}
		};
		/** Convert per-1M-token price and token count into CNY. */
		function moneyOf(tokens, perM) {
			return tokens / 1e6 * perM;
		}
		/** Select the table entry for one model id (exact row, then the fallback). */
		function entryOf(table, model) {
			const exact = table.models[model];
			if (exact !== void 0) return {
				entry: exact,
				exact: true
			};
			const fallback = table.models["*"];
			if (fallback === void 0) throw new Error(`billing pricing: table "${table.version}" has no entry for "${model}" and no '*' fallback`);
			return {
				entry: fallback,
				exact: false
			};
		}
		/** Select the schedule in force at one moment (newest-first ordering). */
		function scheduleFor(entry, when) {
			const at = when.getTime();
			for (const schedule of entry.schedules) if (at >= Date.parse(schedule.effectiveFrom)) return schedule;
			throw new Error(`billing pricing: model "${entry.label}" has no schedule for ${when.toISOString()}`);
		}
		/** Resolve the effective price and tier of one entry at one moment. */
		function priceAt(entry, when) {
			const schedule = scheduleFor(entry, when);
			if (schedule.flat !== void 0) return {
				price: schedule.flat,
				tier: "flat"
			};
			const tier = tierFor(when);
			const price = tier === "peak" ? schedule.peak : schedule.offPeak;
			if (price === void 0) throw new Error(`billing pricing: model "${entry.label}" has no ${tier} price for ${when.toISOString()}`);
			return {
				price,
				tier
			};
		}
		/**
		* Price one session's token buckets.
		* @param table - price table to use.
		* @param model - model id to price with.
		* @param tokens - provider-reported buckets.
		* @param when - moment to price at (defaults to now).
		* @returns the cost answer.
		*/
		function priceUsage(table, model, tokens, when = /* @__PURE__ */ new Date()) {
			const { entry, exact } = entryOf(table, model);
			const { price, tier } = priceAt(entry, when);
			const inputHitCost = moneyOf(tokens.cacheReadTokens, price.cacheHitInputPerM);
			const inputMissCost = moneyOf(tokens.uncachedInputTokens + tokens.cacheWriteTokens, price.cacheMissInputPerM);
			const outputCost = moneyOf(tokens.outputTokens, price.outputPerM);
			return {
				model,
				exactModel: exact,
				tableVersion: table.version,
				tier,
				tokens: {
					uncachedInputTokens: tokens.uncachedInputTokens,
					outputTokens: tokens.outputTokens,
					cacheReadTokens: tokens.cacheReadTokens,
					cacheWriteTokens: tokens.cacheWriteTokens
				},
				costs: {
					inputMissCost,
					inputHitCost,
					outputCost,
					totalCost: inputHitCost + inputMissCost + outputCost
				}
			};
		}
		/**
		* Format a CNY amount for the widget: two decimals from ¥0.01 up (rounded
		* with an epsilon so 0.015 reads 0.02, not the float-truncated 0.01), four
		* decimals below so a cheap session still shows movement, and a plain 0.00
		* for zero, negative, and non-finite input.
		* @param amount - CNY value (non-negative).
		* @returns display string without a currency sign.
		*/
		function formatCny(amount) {
			if (!Number.isFinite(amount) || amount <= 0) return "0.00";
			if (amount >= .01) return (Math.round((amount + Number.EPSILON) * 100) / 100).toFixed(2);
			return amount.toFixed(4);
		}
		//#endregion
		//#region src/client/wire.ts
		/** Known error code strings the host emits (everything else is BAD_RESPONSE). */
		const KNOWN_CODES = new Set([
			"MISSING_KEY",
			"UNAUTHORIZED",
			"HTTP_ERROR",
			"NETWORK_ERROR",
			"INVALID_PAYLOAD"
		]);
		/** Narrow an unknown code to the widget's vocabulary. */
		function errorCode(value) {
			return typeof value === "string" && KNOWN_CODES.has(value) ? value : "BAD_RESPONSE";
		}
		/** Validate one numeric field of a record. */
		function numberField(record, field) {
			const value = record[field];
			return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : NaN;
		}
		/**
		* Parse and validate the host route's JSON body. Every malformed shape maps
		* to a typed failure instead of throwing, so the widget never crashes on a
		* proxy page or a broken host half.
		* @param value - parsed JSON body.
		* @returns the validated body.
		*/
		function parseBalanceBody(value) {
			if (typeof value !== "object" || value === null) return {
				ok: false,
				error: { code: "BAD_RESPONSE" }
			};
			const body = value;
			if (body.ok !== true) {
				if (body.ok !== false || typeof body.error !== "object" || body.error === null) return {
					ok: false,
					error: { code: "BAD_RESPONSE" }
				};
				const error = body.error;
				return {
					ok: false,
					error: {
						code: errorCode(error.code),
						...typeof error.message === "string" && error.message.length > 0 ? { message: error.message } : {}
					}
				};
			}
			const rawBalance = body.balance;
			if (typeof rawBalance !== "object" || rawBalance === null) return {
				ok: false,
				error: { code: "INVALID_PAYLOAD" }
			};
			const balance = rawBalance;
			if (typeof balance.isAvailable !== "boolean" || !Array.isArray(balance.records)) return {
				ok: false,
				error: { code: "INVALID_PAYLOAD" }
			};
			const records = [];
			for (const entry of balance.records) {
				if (typeof entry !== "object" || entry === null) return {
					ok: false,
					error: { code: "INVALID_PAYLOAD" }
				};
				const record = entry;
				if (typeof record.currency !== "string" || record.currency.length === 0) return {
					ok: false,
					error: { code: "INVALID_PAYLOAD" }
				};
				const totalBalance = numberField(record, "totalBalance");
				const grantedBalance = numberField(record, "grantedBalance");
				const toppedUpBalance = numberField(record, "toppedUpBalance");
				if (!Number.isFinite(totalBalance) || !Number.isFinite(grantedBalance) || !Number.isFinite(toppedUpBalance)) return {
					ok: false,
					error: { code: "INVALID_PAYLOAD" }
				};
				records.push({
					currency: record.currency,
					totalBalance,
					grantedBalance,
					toppedUpBalance
				});
			}
			return {
				ok: true,
				balance: {
					isAvailable: balance.isAvailable,
					records
				}
			};
		}
		//#endregion
		//#region \0dsh-css:D:\dsh\deepseek-harness\packages\client\ui-deepseek-billing\src\client\BalanceAction.module.css.mjs
		const css$1 = "._13jTaG_root{position:relative}._13jTaG_trigger{min-height:28px;color:var(--dsw-alias-label-tertiary);cursor:pointer;background:0 0;border:0;border-radius:6px;align-items:center;gap:3px;padding:3px 2px;font-size:12px;line-height:18px;display:inline-flex}._13jTaG_trigger:hover,._13jTaG_trigger:focus-visible{color:var(--dsw-alias-label-secondary)}._13jTaG_trigger svg{transition:transform .12s}._13jTaG_triggerOpen{transform:rotate(180deg)}._13jTaG_count{font-variant-numeric:tabular-nums;margin:0 5px}._13jTaG_menu{z-index:100;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-specific-menu);--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2);width:260px;max-width:min(400px,100vw - 32px);max-height:min(480px,100vh - 140px);box-shadow:var(--dsw-shadow-lv3);border-radius:12px;flex-direction:column;gap:2px;padding:10px;display:flex;position:absolute;top:calc(100% + 5px);left:0;overflow:auto}._13jTaG_sectionTitle{color:var(--dsw-alias-label-secondary);text-transform:uppercase;letter-spacing:.04em;font-size:11px;line-height:16px}._13jTaG_section{flex-direction:column;gap:1px;display:flex}._13jTaG_row{min-height:22px;color:var(--dsw-alias-label-primary);justify-content:space-between;align-items:baseline;gap:12px;font-size:12px;line-height:18px;display:flex}._13jTaG_rowLabel{color:var(--dsw-alias-label-tertiary);white-space:nowrap}._13jTaG_rowValue{min-width:0;font-family:var(--dsw-font-mono);font-variant-numeric:tabular-nums;white-space:nowrap;text-overflow:ellipsis;overflow:hidden}._13jTaG_note{color:var(--dsw-alias-label-tertiary);overflow-wrap:anywhere;font-size:11px;line-height:16px}._13jTaG_refresh{border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border-radius:6px;align-self:flex-start;margin-top:6px;padding:2px 8px;font-size:12px;line-height:18px}._13jTaG_refresh:hover,._13jTaG_refresh:focus-visible{color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l1)}";
		const tagId$1 = "@deepseek-ai/dsh-client-ui-deepseek-billing/BalanceAction.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId$1) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-deepseek-billing";
			tag.dataset.pluginCss = tagId$1;
			tag.textContent = css$1;
			document.head.appendChild(tag);
		}
		var BalanceAction_module_css_default = {
			"count": "_13jTaG_count",
			"section": "_13jTaG_section",
			"triggerOpen": "_13jTaG_triggerOpen",
			"rowValue": "_13jTaG_rowValue",
			"rowLabel": "_13jTaG_rowLabel",
			"trigger": "_13jTaG_trigger",
			"root": "_13jTaG_root",
			"note": "_13jTaG_note",
			"row": "_13jTaG_row",
			"sectionTitle": "_13jTaG_sectionTitle",
			"menu": "_13jTaG_menu",
			"refresh": "_13jTaG_refresh"
		};
		//#endregion
		//#region src/client/BalanceAction.tsx
		/**
		* Session-header balance widget: the DeepSeek account balance only. The
		* session cost moved into the composer stats strip (`SessionCostGroup`), so
		* this control owns the account read and nothing else. Balance arrives from
		* the host route (see wire.ts) and auto-refreshes while the popover is open.
		*/
		/** Host route the widget fetches. */
		const BALANCE_ENDPOINT = "/api/deepseek-billing/balance";
		/** Auto-refresh period while the popover is open. */
		const BALANCE_REFRESH_MS = 6e4;
		/** Map a balance error code to its localized copy key. */
		function errorKey(code) {
			switch (code) {
				case "MISSING_KEY": return "balance.missingKey";
				case "UNAUTHORIZED": return "balance.unauthorized";
				case "HTTP_ERROR": return "balance.httpError";
				case "NETWORK_ERROR": return "balance.networkError";
				case "INVALID_PAYLOAD": return "balance.invalidPayload";
				case "BAD_RESPONSE": return "balance.invalidPayload";
			}
		}
		/** Total balance of the first record, for the compact trigger. */
		function firstTotal(balance) {
			const first = balance.records[0];
			if (first === void 0) return {
				currency: "CNY",
				total: 0
			};
			return {
				currency: first.currency,
				total: first.totalBalance
			};
		}
		/**
		* Session-header entry point for the balance widget.
		* @param props - runtime slot currency plus the namespace translator.
		* @returns the trigger and its popover panel.
		*/
		function BalanceAction({ t }) {
			const [open, setOpen] = (0, react.useState)(false);
			const [balance, setBalance] = (0, react.useState)({ status: "idle" });
			const rootRef = (0, react.useRef)(null);
			const triggerRef = (0, react.useRef)(null);
			const requestSeq = (0, react.useRef)(0);
			const loadBalance = (0, react.useCallback)(async () => {
				const seq = ++requestSeq.current;
				setBalance({ status: "loading" });
				try {
					const body = parseBalanceBody(await (await fetch(BALANCE_ENDPOINT, { headers: { accept: "application/json" } })).json());
					if (seq !== requestSeq.current) return;
					if (body.ok) {
						setBalance({
							status: "ok",
							balance: body.balance
						});
						return;
					}
					setBalance({
						status: "error",
						code: body.error.code,
						message: t(errorKey(body.error.code))
					});
				} catch {
					if (seq !== requestSeq.current) return;
					setBalance({
						status: "error",
						code: "NETWORK_ERROR",
						message: t("balance.networkError")
					});
				}
			}, [t]);
			(0, react.useEffect)(() => {
				if (!open) return;
				loadBalance();
				const timer = setInterval(() => {
					loadBalance();
				}, BALANCE_REFRESH_MS);
				return () => {
					clearInterval(timer);
				};
			}, [open, loadBalance]);
			(0, react.useEffect)(() => {
				if (!open) return;
				const closeOutside = (event) => {
					if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
				};
				document.addEventListener("pointerdown", closeOutside);
				return () => {
					document.removeEventListener("pointerdown", closeOutside);
				};
			}, [open]);
			const onKeyDown = (event) => {
				if (event.key !== "Escape" || !open) return;
				event.preventDefault();
				setOpen(false);
				triggerRef.current?.focus();
			};
			const triggerText = balance.status === "ok" ? `${firstTotal(balance.balance).currency} ¥${formatCny(firstTotal(balance.balance).total)}` : balance.status === "loading" || balance.status === "idle" ? "¥…" : "¥—";
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				ref: rootRef,
				className: BalanceAction_module_css_default.root,
				onKeyDown,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					ref: triggerRef,
					type: "button",
					className: BalanceAction_module_css_default.trigger,
					"aria-expanded": open,
					"aria-label": t("trigger.aria"),
					onClick: () => {
						setOpen((current) => !current);
					},
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: BalanceAction_module_css_default.count,
						children: triggerText
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: open ? BalanceAction_module_css_default.triggerOpen : void 0 })]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: BalanceAction_module_css_default.menu,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: BalanceAction_module_css_default.sectionTitle,
							children: t("balance.title")
						}),
						balance.status === "ok" && !balance.balance.isAvailable ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: BalanceAction_module_css_default.note,
							children: t("balance.unavailable")
						}) : null,
						balance.status === "ok" && balance.balance.records.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: BalanceAction_module_css_default.note,
							children: t("balance.empty")
						}) : null,
						balance.status === "ok" ? balance.balance.records.map((record) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: BalanceAction_module_css_default.section,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
									label: t("balance.total"),
									value: `${record.currency} ¥${formatCny(record.totalBalance)}`
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
									label: t("balance.granted"),
									value: `¥${formatCny(record.grantedBalance)}`
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)(Row, {
									label: t("balance.toppedUp"),
									value: `¥${formatCny(record.toppedUpBalance)}`
								})
							]
						}, record.currency)) : null,
						balance.status === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: BalanceAction_module_css_default.note,
							children: balance.message
						}) : null,
						balance.status === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: BalanceAction_module_css_default.note,
							children: t("balance.refreshing")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: BalanceAction_module_css_default.refresh,
							onClick: () => {
								loadBalance();
							},
							children: t("balance.refresh")
						})
					]
				}) : null]
			});
		}
		/** One label/value row of the popover. */
		function Row({ label, value }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: BalanceAction_module_css_default.row,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: BalanceAction_module_css_default.rowLabel,
					children: label
				}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: BalanceAction_module_css_default.rowValue,
					children: value
				})]
			});
		}
		//#endregion
		//#region \0dsh-css:D:\dsh\deepseek-harness\packages\client\ui-deepseek-billing\src\client\SessionCostGroup.module.css.mjs
		const css = ".-Myswq_sep{color:var(--dsw-alias-separator-primary);margin:0 10px}.-Myswq_label{font-variant-numeric:tabular-nums;cursor:default}";
		const tagId = "@deepseek-ai/dsh-client-ui-deepseek-billing/SessionCostGroup.module.css";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "@deepseek-ai/dsh-client-ui-deepseek-billing";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}
		var SessionCostGroup_module_css_default = {
			"sep": "-Myswq_sep",
			"label": "-Myswq_label"
		};
		/**
		* Latest model id in the visible window, preferring assistant nodes that
		* carry a request config. The projection totals span the whole log while the
		* window is paged, so a model switched mid-session prices everything with the
		* newest one — the tooltip note covers the difference.
		* @param nodes - conversation nodes in display order.
		* @returns the newest model id, or undefined when no node carries one.
		*/
		function latestModel(nodes) {
			for (let i = nodes.length - 1; i >= 0; i--) {
				const node = nodes[i];
				if (node === void 0 || node.kind !== "assistant") continue;
				const model = node.requestConfig?.model;
				if (model !== void 0 && model.length > 0) return model;
			}
		}
		/**
		* Inline cost label for the composer stats strip.
		* @param props - runtime slot currency plus the namespace translator.
		* @returns the label, or null when the session has no settled usage.
		*/
		function SessionCostGroup({ useSession, useProjection, t }) {
			const model = latestModel(useSession((s) => s.nodes)) ?? "deepseek-v4-pro";
			const usage = useProjection("tokenUsage");
			const cost = (0, react.useMemo)(() => usage === void 0 ? void 0 : priceUsage(DEFAULT_PRICE_TABLE, model, usage), [usage, model]);
			if (cost === void 0) return null;
			if (cost.costs.totalCost <= 0) return null;
			const tierText = cost.tier === "peak" ? t("cost.tier.peak") : cost.tier === "offPeak" ? t("cost.tier.offPeak") : t("cost.tier.flat");
			const detail = t("cost.tooltip", {
				model: cost.model,
				miss: formatCny(cost.costs.inputMissCost),
				hit: formatCny(cost.costs.inputHitCost),
				output: formatCny(cost.costs.outputCost),
				total: formatCny(cost.costs.totalCost),
				tier: tierText
			});
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: SessionCostGroup_module_css_default.sep,
					"aria-hidden": true,
					children: "|"
				}),
				" ",
				/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
					label: detail,
					side: "top",
					delayMs: 500,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: SessionCostGroup_module_css_default.label,
						children: t("cost.group", { amount: formatCny(cost.costs.totalCost) })
					})
				})
			] });
		}
		//#endregion
		//#region src/client/locales.ts
		/** `billing` namespace dictionaries. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "billing";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"trigger.label": "余额",
			"trigger.aria": "查看 DeepSeek 账户余额",
			"balance.title": "DeepSeek 账户余额",
			"balance.unavailable": "账户当前不可用（is_available=false）",
			"balance.total": "总余额",
			"balance.granted": "赠送余额",
			"balance.toppedUp": "充值余额",
			"balance.empty": "暂无余额记录",
			"balance.missingKey": "未配置 API Key（环境变量 DEEPSEEK_API_KEY 或插件配置 apiKey）",
			"balance.refresh": "刷新余额",
			"balance.refreshing": "刷新中…",
			"balance.networkError": "网络错误：无法连接 DeepSeek API",
			"balance.unauthorized": "API Key 无效（HTTP 401），请在开放平台核对",
			"balance.httpError": "DeepSeek API 请求失败（HTTP {status}）",
			"balance.invalidPayload": "余额响应无法解析",
			"cost.group": "会话 ¥{amount}",
			"cost.tooltip": "{model} · 未命中 ¥{miss} · 命中 ¥{hit} · 输出 ¥{output} · 合计 ¥{total}（{tier}，估算）",
			"cost.tier.peak": "高峰时段",
			"cost.tier.offPeak": "空闲时段",
			"cost.tier.flat": "统一价"
		};
		/** English dictionary, key-identical to the Chinese source of truth. */
		const en = {
			"trigger.label": "Balance",
			"trigger.aria": "Show the DeepSeek account balance",
			"balance.title": "DeepSeek account balance",
			"balance.unavailable": "Account currently unavailable (is_available=false)",
			"balance.total": "Total balance",
			"balance.granted": "Granted balance",
			"balance.toppedUp": "Topped-up balance",
			"balance.empty": "No balance records",
			"balance.missingKey": "No API key configured (env DEEPSEEK_API_KEY or plugin config apiKey)",
			"balance.refresh": "Refresh balance",
			"balance.refreshing": "Refreshing…",
			"balance.networkError": "Network error: could not reach the DeepSeek API",
			"balance.unauthorized": "API key rejected (HTTP 401); verify it on the open platform",
			"balance.httpError": "DeepSeek API request failed (HTTP {status})",
			"balance.invalidPayload": "Balance response could not be parsed",
			"cost.group": "session ¥{amount}",
			"cost.tooltip": "{model} · miss ¥{miss} · hit ¥{hit} · output ¥{output} · total ¥{total} ({tier}, estimate)",
			"cost.tier.peak": "peak hours",
			"cost.tier.offPeak": "off-peak hours",
			"cost.tier.flat": "flat pricing"
		};
		//#endregion
		//#region src/client/index.ts
		/** Required services: the two slots, the session kit, and the copy. */
		const inject = [
			"sessions",
			"slots",
			"locale"
		];
		/**
		* Client plugin body: register the dictionaries and the two surfaces.
		* @param ctx - client root context.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-deepseek-billing: dictionaries");
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "deepseek-billing",
				order: 30,
				locale: NS
			}, BalanceAction));
			ctx.slots.inject("conversation.composer.stats.extra", () => ctx.slots.register({
				name: "conversation.composer.stats.extra",
				id: "billing-cost",
				order: 0,
				locale: NS
			}, SessionCostGroup));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map