# deepseek-billing-plugin

[English](#english) | 中文

DeepSeek Harness（DSH）工作台插件：用你的 DeepSeek 官方 API Key 实时查看**账户余额**和**当前会话花费**。

- **顶部标题栏**：余额按钮（`CNY ¥19.16`），弹层含总余额 / 赠送 / 充值明细，60 秒自动刷新。
- **底部统计条**：本会话费用以 `会话 ¥0.0042` 融合进系统自带的 composer 统计条同一行，悬停显示明细（模型 / 未命中 / 命中 / 输出 / 合计 / 计费时段）。费用按官方价格页快照计算（含 2026-08-17 峰谷调价，按北京时间峰谷时段自动选价），是**估算值**，token 数来自 DSH 的 `tokenUsage` 会话投影（provider 报告的真实值）。

## 仓库结构

```
packages/
  deepseek-billing/      宿主插件（dsh.bundle 包）：注册 /api/deepseek-billing/balance 路由，
                         以 apikey 查询官方余额接口；与客户端包一起安装后，
                         其 bundle 补丁自动挂载两行插件
  ui-deepseek-billing/   客户端插件（dsh.client 包）：余额按钮 + 统计条费用组
patches/
  001-composer-stats-extra.patch   （可选）给 dsh 客户端源码打 15 行补丁，
                         解锁"统计条融合"（详见下文）
tools/                   vendored 的 client bundle 构建预设（脱离主仓库也能重建 bundle）
```

预构建产物（`lib/`）已提交，**开箱即用，无需编译**。

## 安装

### 方式一：装进 profile（推荐，无需改源码）

1. 克隆本仓库：
   ```sh
   git clone https://github.com/xinCodes/deepseek-billing-plugin.git
   ```
2. 初始化（或复用）一个 profile，并把**两个包**以 `file:` 依赖挂进去（`<repo>` 指代本仓库路径）：
   ```sh
   cd $DSH_HOME/profiles/billing   # 不存在则 mkdir 后用 dsh plugin --profile billing 初始化
   pnpm add file:<repo>/packages/deepseek-billing file:<repo>/packages/ui-deepseek-billing
   ```
   其中 `packages/deepseek-billing` 声明了 `dsh.bundle`（patch 清单），bundle 机制会把补丁里两行插件（宿主 + 客户端）挂进组合树，无需 `--patch`；客户端包需一并安装（它是补丁引用的包名）。
3. 启动：
   ```sh
   dsh --profile billing web
   ```
4. 打开 http://127.0.0.1:3080 ，标题栏出现余额按钮；若打了解锁补丁（下节），底部统计条出现会话费用。

### 方式二：在你的 deepseek-harness 源码检出内安装（开发者）

1. 把 `packages/deepseek-billing` 拷到检出根 `packages/billing/deepseek-billing`，把 `packages/ui-deepseek-billing` 拷到 `packages/client/ui-deepseek-billing`。
2. `packages/bundle/web-app/package.json` 的 dependencies 加 `"@deepseek-ai/dsh-deepseek-billing": "workspace:^"`（客户端包已在其内则跳过）。
3. `pnpm install` 后，用 bundle 补丁启动：
   ```sh
   pnpm dsh web --patch ./packages/billing/deepseek-billing/cordis.patch.yml
   ```

## API Key

余额接口需要你的 DeepSeek 官方 API Key（open platform 的 `sk-` key）。插件按以下顺序解析，密钥只发往 `api.deepseek.com`：

1. bundle 补丁里的插件配置字面量 `apiKey`
2. DSH 的 credentials 域（Web 设置页"模型"里填过的 `DEEPSEEK_API_KEY`）
3. 启动环境变量 `DEEPSEEK_API_KEY`

覆盖示例（编辑 `packages/deepseek-billing/cordis.patch.yml`）：

```yaml
- insert:
    - id: deepseek-billing
      name: '@deepseek-ai/dsh-deepseek-billing'
      config:
        baseURL: 'https://api.deepseek.com'
        apiKeyEnv: DEEPSEEK_API_KEY
        # apiKey: sk-xxx   # 不推荐写入配置，优先用环境变量/credentials
```

## "统计条融合"的解锁补丁

费用融合依赖 DSH 客户端新增的一个子槽 `conversation.composer.stats.extra`。**未打补丁也能用**（余额功能完整），只是会话费用不显示。要解锁：

```sh
cd <你的 deepseek-harness 检出>
git apply <repo>/patches/001-composer-stats-extra.patch
pnpm --filter @deepseek-ai/dsh-client-ui-conversation bundle   # 重建 conversation 的 client bundle
# 重启 dsh web 并硬刷新页面
```

补丁内容（`StatsLine` 及其 slot 声明共 ~15 行）：给统计条条目声明一个 list 子槽，并在统计行里渲染它，费用组件借此把 `会话 ¥…` 插进同一行。

## 价格表

`packages/ui-deepseek-billing/src/pricing.ts` 的 `DEFAULT_PRICE_TABLE`：按生效时间的多档价目（2026-08-17 起峰谷定价已建模）。官方调价时改这里即可；改动后重新 `pnpm build`（或只用检出内构建）。

## 开发

```sh
pnpm install          # 依赖来自 npm 上的 @deepseek-ai/* rc 包
pnpm build            # 类型检查 + 重建客户端 bundle（lib/client.js）
pnpm test             # 宿主包单元测试（客户端测试需在完整 dsh 检出内运行）
```

## 安全与隐私

- API Key 只发送到 `api.deepseek.com`（余额接口），不落日志、不进前端界面。
- 无任何数据上报；余额/费用全部在本机计算与展示。
- 费用为估算，以官方扣费为准。

## English

A plugin for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) web workbench that shows your DeepSeek account balance (top session header) and the current session's estimated cost (fused into the built-in composer stats strip, live from the `tokenUsage` session projection). Cost pricing snapshots the official pricing page, including the 2026-08-17 Beijing peak/off-peak tiers; it is an estimate. Installation: clone, add both packages to a DSH profile as `file:` dependencies (the `deepseek-billing` package is a `dsh.bundle`, so its patch mounts both halves automatically), then `dsh --profile <name> web`. To enable the stats-strip fusion, apply `patches/001-composer-stats-extra.patch` to your harness checkout and rebuild the conversation client bundle. The API key is read from plugin config → credentials domain → `DEEPSEEK_API_KEY` env, and is sent only to `api.deepseek.com`.

## License

MIT
