//#region lib/types/balance.js
/**
* Pure balance-domain functions for the DeepSeek official API key billing
* plugin. Everything here is dependency-free so the host route and the tests
* share one implementation.
*
* Wire shape: GET https://api.deepseek.com/user/balance
* (https://api-docs.deepseek.com/zh-cn/api/get-user-balance/)
*/
/** Parse one monetary string into a finite non-negative number. */
function money(value, field) {
	if (typeof value !== "string" || value.trim() === "" || !Number.isFinite(Number(value))) throw new Error(`deepseek-billing: malformed balance field "${field}"`);
	const parsed = Number(value);
	if (parsed < 0) throw new Error(`deepseek-billing: negative balance field "${field}"`);
	return parsed;
}
/**
* Normalize the raw endpoint payload into typed records. Throws on malformed
* input so callers map the failure to INVALID_PAYLOAD.
* @param payload - parsed JSON body of the balance endpoint.
* @returns normalized balance.
*/
function mapBalancePayload(payload) {
	if (typeof payload !== "object" || payload === null) throw new Error("deepseek-billing: balance payload is not an object");
	const raw = payload;
	if (typeof raw.is_available !== "boolean") throw new Error("deepseek-billing: balance payload lacks boolean is_available");
	if (!Array.isArray(raw.balance_infos)) throw new Error("deepseek-billing: balance payload lacks balance_infos array");
	const records = raw.balance_infos.map((entry) => {
		if (typeof entry !== "object" || entry === null) throw new Error("deepseek-billing: malformed balance_infos entry");
		const info = entry;
		if (typeof info.currency !== "string" || info.currency.length === 0) throw new Error("deepseek-billing: malformed balance currency");
		return {
			currency: info.currency,
			totalBalance: money(info.total_balance, "total_balance"),
			grantedBalance: money(info.granted_balance, "granted_balance"),
			toppedUpBalance: money(info.topped_up_balance, "topped_up_balance")
		};
	});
	return {
		isAvailable: raw.is_available,
		records
	};
}
/**
* Read the account balance with an API key. All failure branches are
* normalized into {@link BalanceFailure} codes; malformed success payloads
* become INVALID_PAYLOAD.
* @param apiKey - DeepSeek API key (sent only to api.deepseek.com).
* @param baseURL - endpoint base, defaulting to the public API.
* @param fetchFn - injectable fetch for tests.
* @param signal - optional abort signal.
* @returns normalized result.
*/
async function fetchBalance(apiKey, baseURL, fetchFn = fetch, signal) {
	let response;
	try {
		response = await fetchFn(`${baseURL}/user/balance`, {
			headers: {
				"authorization": `Bearer ${apiKey}`,
				"accept": "application/json"
			},
			...signal === void 0 ? {} : { signal }
		});
	} catch (error) {
		if (signal?.aborted === true) throw error;
		return {
			ok: false,
			error: {
				code: "NETWORK_ERROR",
				message: `无法连接 DeepSeek API：${error instanceof Error ? error.message : String(error)}`
			}
		};
	}
	if (response.status === 401) return {
		ok: false,
		error: {
			code: "UNAUTHORIZED",
			message: "API Key 无效或已被吊销（HTTP 401），请在 DeepSeek 开放平台核对。"
		}
	};
	if (!response.ok) return {
		ok: false,
		error: {
			code: "HTTP_ERROR",
			message: `DeepSeek API 返回 HTTP ${response.status}。`
		}
	};
	try {
		return {
			ok: true,
			balance: mapBalancePayload(await response.json())
		};
	} catch (error) {
		return {
			ok: false,
			error: {
				code: "INVALID_PAYLOAD",
				message: error instanceof Error ? error.message : "DeepSeek 余额响应无法解析。"
			}
		};
	}
}
//#endregion
//#region lib/types/index.js
/**
* Host plugin serving the DeepSeek account balance to the Web client over one
* same-origin HTTP route. The browser cannot call api.deepseek.com directly
* (no CORS headers on /user/balance), so this Node half performs the
* authenticated request and returns normalized JSON. The API key resolves
* from the plugin config, the credentials domain, or the launching
* environment, in that order, and is sent only to api.deepseek.com.
* @module @deepseek-ai/dsh-deepseek-billing
*/
/** Plugin name used by loader diagnostics. */
const name = "deepseek-billing";
/** The webserver route registry this plugin contributes to. */
const inject = ["webServer"];
/** Route path the client widget fetches. */
const BALANCE_ROUTE = "/api/deepseek-billing/balance";
/**
* Resolve the API key for one request: config literal, then the optional
* credentials domain, then the process environment.
* @param ctx - plugin context.
* @param config - effective plugin config.
* @returns the key, or undefined when no source carries one.
*/
async function resolveApiKey(ctx, config) {
	if (config.apiKey !== void 0 && config.apiKey.length > 0) return config.apiKey;
	const ref = config.apiKeyEnv ?? "DEEPSEEK_API_KEY";
	const credentials = ctx.get("credentials");
	if (credentials !== void 0) {
		const hit = await credentials.resolve(ref);
		if (hit !== void 0 && hit.value.length > 0) return hit.value;
	}
	const ambient = process.env[ref];
	return ambient !== void 0 && ambient.length > 0 ? ambient : void 0;
}
/** Send one JSON response body. */
function respondJson(res, status, body) {
	res.writeHead(status, {
		"content-type": "application/json; charset=utf-8",
		"cache-control": "no-store"
	});
	res.end(JSON.stringify(body));
}
/**
* Register the balance route on the webserver. The registration rides a
* context effect, so plugin unload removes the route.
* @param ctx - plugin context carrying webServer.
* @param config - effective plugin config.
*/
function apply(ctx, config = {}) {
	const baseURL = config.baseURL ?? "https://api.deepseek.com";
	ctx.effect(() => ctx.webServer.register({
		kind: "exact",
		path: BALANCE_ROUTE,
		handler: async (req, res) => {
			if (req.method !== "GET" && req.method !== "HEAD") {
				res.writeHead(405);
				res.end();
				return;
			}
			const apiKey = await resolveApiKey(ctx, config).catch(() => void 0);
			if (apiKey === void 0) {
				respondJson(res, 200, {
					ok: false,
					error: {
						code: "MISSING_KEY",
						message: "未配置 DeepSeek API Key。请设置环境变量 DEEPSEEK_API_KEY，或在插件配置中填写。"
					}
				});
				return;
			}
			const result = await fetchBalance(apiKey, baseURL);
			if (result.ok) {
				respondJson(res, 200, {
					ok: true,
					balance: result.balance
				});
				return;
			}
			respondJson(res, 200, {
				ok: false,
				error: result.error
			});
		}
	}), "deepseek-billing: balance route");
}
//#endregion
export { BALANCE_ROUTE, apply, fetchBalance, inject, mapBalancePayload, name, resolveApiKey };
