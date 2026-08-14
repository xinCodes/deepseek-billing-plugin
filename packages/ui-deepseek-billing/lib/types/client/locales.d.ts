/** `billing` namespace dictionaries. */
/** Dictionary namespace owned by this plugin. */
export declare const NS = "billing";
/** Simplified Chinese dictionary (the key-set source of truth). */
export declare const zh: {
    readonly 'trigger.label': "余额";
    readonly 'trigger.aria': "查看 DeepSeek 账户余额";
    readonly 'balance.title': "DeepSeek 账户余额";
    readonly 'balance.unavailable': "账户当前不可用（is_available=false）";
    readonly 'balance.total': "总余额";
    readonly 'balance.granted': "赠送余额";
    readonly 'balance.toppedUp': "充值余额";
    readonly 'balance.empty': "暂无余额记录";
    readonly 'balance.missingKey': "未配置 API Key（环境变量 DEEPSEEK_API_KEY 或插件配置 apiKey）";
    readonly 'balance.refresh': "刷新余额";
    readonly 'balance.refreshing': "刷新中…";
    readonly 'balance.networkError': "网络错误：无法连接 DeepSeek API";
    readonly 'balance.unauthorized': "API Key 无效（HTTP 401），请在开放平台核对";
    readonly 'balance.httpError': "DeepSeek API 请求失败（HTTP {status}）";
    readonly 'balance.invalidPayload': "余额响应无法解析";
    readonly 'cost.group': "会话 ¥{amount}";
    readonly 'cost.tooltip': "{model} · 未命中 ¥{miss} · 命中 ¥{hit} · 输出 ¥{output} · 合计 ¥{total}（{tier}，估算）";
    readonly 'cost.tier.peak': "高峰时段";
    readonly 'cost.tier.offPeak': "空闲时段";
    readonly 'cost.tier.flat': "统一价";
};
/** English dictionary, key-identical to the Chinese source of truth. */
export declare const en: Record<BillingKey, string>;
/** Key domain of the `billing` namespace (zh is the source of truth). */
export type BillingKey = keyof typeof zh;
//# sourceMappingURL=locales.d.ts.map