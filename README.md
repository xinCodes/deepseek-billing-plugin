# 开发者工具浏览器插件

一个面向日常开发的 Chrome/Edge 浏览器工具集。

## 当前能力

- popup 唯一入口，负责搜索、分类和启动工具。
- 支持小窗、侧栏、独立页面三种工具承载形态。
- 当前标签页摘要。
- JSON 格式化、压缩、校验。
- URL 编码、解码和 query 解析。
- JWT 解码。
- 时间戳转换。
- 本地草稿持久化。
- 页面元信息和页面存储读取协议。
- 页面标题结构、基础无障碍和 SEO 快速检查。
- 网络请求捕获工作台，支持筛选、排序、详情查看和复制为 curl/fetch/Axios。
- 网络请求模型、敏感 header 脱敏、请求 body 预览和 header 复制。
- 本地代码片段库，支持搜索、收藏和一键复制。
- 本地 Checklist，支持勾选、重置和复制为 Markdown。
- popup 收藏工具和最近使用入口。
- 浏览器原生代理切换，支持 HTTP/HTTPS/SOCKS4/SOCKS5。
- Clash YAML 规则导入，支持把可识别规则转换为 PAC 分流。

## 工具打开形态

- 小窗：不复杂、无需大工作区的工具，例如代理、时间戳、URL、JWT、Base64、UUID。
- 侧栏：需要和当前页面交互的工具，例如页面存储、Cookie、DOM/CSS 检查、请求捕获。
- 独立页面：需要大面积阅读或编辑的工具，例如 JSON、Diff、正则、代码转换。

## 代理能力边界

浏览器扩展只使用 Chrome/Edge 原生 `chrome.proxy` 能力：

- 支持：HTTP、HTTPS、SOCKS4、SOCKS5。
- 支持：Clash `DOMAIN`、`DOMAIN-SUFFIX`、`DOMAIN-KEYWORD`、`MATCH` 规则转换为 PAC。
- 部分支持：`IP-CIDR`，仅 host 本身是 IP 时可靠。
- 不支持：直接运行 `vmess`、`hysteria2`、`anytls` 等 Clash 内核协议。
- 不支持：完整 `GEOIP`、`GEOSITE`、`PROCESS-NAME` 分流。

如果导入 Clash 配置，插件会识别可直接使用的标准代理节点，并统计不支持节点数量。

## 技术栈

- Vite 8
- Vue 3
- TypeScript
- Pinia
- Vue Router
- Vitest 4
- Manifest V3
- Chrome proxy API

## 开发命令

```bash
corepack pnpm install
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
```

## 加载未打包插件

1. 运行 `corepack pnpm build`。
2. 打开 Chrome 或 Edge 的扩展页面。
3. 开启开发者模式。
4. 选择“加载已解压的扩展程序”。
5. 选择本项目的 `dist` 目录。

## 手动验证清单

- 插件能加载 `dist/manifest.json`。
- 点击插件图标能打开工具列表 popup。
- popup 能按工具形态打开小窗、侧栏或独立页面。
- 侧栏由 popup 选中的页面交互工具打开，并显示当前标签页摘要。
- JSON、URL、JWT、时间戳工具能正常输入和输出。
- 草稿内容刷新后仍保留。
- 普通网页能读取页面元信息和 storage。
- 普通网页能运行标题结构、无障碍快检和 SEO 快检。
- `chrome://` 等受限页面显示友好错误。
- 请求复制函数的单元测试保持通过。
- 请求捕获工具能读取当前标签页缓存请求，并展示筛选后的详情。
- 代码片段库和 Checklist 刷新后仍保留本地数据。
- 代理工具能切换直连、全局代理和规则分流。

## 设计和开发约束

- 总体规划见 `PLAN.md`。
- 项目协议见 `AGENTS.md`。
- 产品上下文见 `PRODUCT.md`。
- 视觉基线见 `DESIGN.md`。
