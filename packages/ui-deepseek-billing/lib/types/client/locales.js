/** `billing` namespace dictionaries. */
/** Dictionary namespace owned by this plugin. */
export const NS = 'billing';
/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
    'trigger.label': '余额',
    'trigger.aria': '查看 DeepSeek 账户余额',
    'balance.title': 'DeepSeek 账户余额',
    'balance.unavailable': '账户当前不可用（is_available=false）',
    'balance.total': '总余额',
    'balance.granted': '赠送余额',
    'balance.toppedUp': '充值余额',
    'balance.empty': '暂无余额记录',
    'balance.missingKey': '未配置 API Key（环境变量 DEEPSEEK_API_KEY 或插件配置 apiKey）',
    'balance.refresh': '刷新余额',
    'balance.refreshing': '刷新中…',
    'balance.networkError': '网络错误：无法连接 DeepSeek API',
    'balance.unauthorized': 'API Key 无效（HTTP 401），请在开放平台核对',
    'balance.httpError': 'DeepSeek API 请求失败（HTTP {status}）',
    'balance.invalidPayload': '余额响应无法解析',
    'cost.group': '会话 ¥{amount}',
    'cost.tooltip': '{model} · 未命中 ¥{miss} · 命中 ¥{hit} · 输出 ¥{output} · 合计 ¥{total}（{tier}，估算）',
    'cost.tier.peak': '高峰时段',
    'cost.tier.offPeak': '空闲时段',
    'cost.tier.flat': '统一价',
};
/** English dictionary, key-identical to the Chinese source of truth. */
export const en = {
    'trigger.label': 'Balance',
    'trigger.aria': 'Show the DeepSeek account balance',
    'balance.title': 'DeepSeek account balance',
    'balance.unavailable': 'Account currently unavailable (is_available=false)',
    'balance.total': 'Total balance',
    'balance.granted': 'Granted balance',
    'balance.toppedUp': 'Topped-up balance',
    'balance.empty': 'No balance records',
    'balance.missingKey': 'No API key configured (env DEEPSEEK_API_KEY or plugin config apiKey)',
    'balance.refresh': 'Refresh balance',
    'balance.refreshing': 'Refreshing…',
    'balance.networkError': 'Network error: could not reach the DeepSeek API',
    'balance.unauthorized': 'API key rejected (HTTP 401); verify it on the open platform',
    'balance.httpError': 'DeepSeek API request failed (HTTP {status})',
    'balance.invalidPayload': 'Balance response could not be parsed',
    'cost.group': 'session ¥{amount}',
    'cost.tooltip': '{model} · miss ¥{miss} · hit ¥{hit} · output ¥{output} · total ¥{total} ({tier}, estimate)',
    'cost.tier.peak': 'peak hours',
    'cost.tier.offPeak': 'off-peak hours',
    'cost.tier.flat': 'flat pricing',
};
//# sourceMappingURL=locales.js.map