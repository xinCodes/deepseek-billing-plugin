# @deepseek-ai/dsh-client-ui-deepseek-billing

[English](README.md) | 中文

Web 计费小部件，两个表面：会话头部动作展示 DeepSeek 账户余额，`conversation.composer.stats.extra` 分组把本会话的估算费用融合进系统自带的 composer 统计条。浏览器无法直接调用 `api.deepseek.com`（`/user/balance` 不带 CORS 头），因此余额读取经由树外（out-of-tree）的 `deepseek-billing` 宿主插件，它注册了一条同源路由 `/api/deepseek-billing/balance`（配套工程见仓库根目录的 `scratch-plugin-billing`）。API Key 只会被发送到该宿主路由并最终发往 `api.deepseek.com`；宿主按"插件配置 → credentials 域 → 启动环境变量 `DEEPSEEK_API_KEY`"的顺序解析密钥。

会话费用无需任何 RPC：`tokenUsage` 会话投影本身就携带全日志的 provider token 桶，小部件用本包自带的价目表在本地计价，随用量流式更新。结果是一个**估算值**——token 数是 provider 报告的事实，金额是 token 数乘以一张价目表。价目表快照自[官方价格页](https://api-docs.deepseek.com/zh-cn/quick_start/pricing/)，每个 schedule 带生效时间，因此 2026-08-17 北京时间的峰谷调价（高峰 = 北京时间 9:00-12:00、14:00-18:00）在切换前后都能正确计价，实际采用的时段会在面板中标注。价目表就是普通数据（`DEFAULT_PRICE_TABLE`），刻意保持易于替换。

头部动作始终渲染（余额是账户级的），显示首条记录的总余额；弹层列出每条余额记录（总余额 / 赠送 / 充值）和刷新按钮，打开期间每 60 秒自动刷新。统计条分组在会话有已结算用量后渲染"会话 ¥…"，悬停提示携带模型、未命中/命中/输出明细、采用的时段与"估算"声明。Escape 或点击外部关闭弹层并归还焦点。样式只使用设计 token；文案走本包自己的 `billing` locale 命名空间。

## Model Experience

无——本包只为人类渲染账户与用量数字，不接触任何 prompt、消息、schema、流或工具结果。

#### KV Cache effect

无；本包从不组装或发送 provider 请求。

## 已知限制与后续工作

- **费用是估算值**——价目表是官方价格页的快照，请以官方为准。整会话按计价时刻所处时段计价（投影无逐请求时间戳）。
- **每会话单一模型**——小部件用可见窗口中最新的模型给全日志计价；会话中途切换模型时会统一按新模型计价。
- **无设置界面**——API Key 与价格覆盖项在宿主插件的 patch 配置里（`scratch-plugin-billing/cordis.yml`），不在 Web 设置页中。
