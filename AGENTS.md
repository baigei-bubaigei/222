# 仓库指南

## 项目结构与模块组织

- `app/` 是 React/vinext 应用目录：`page.tsx` 负责天气界面和数据流，`layout.tsx` 定义文档外壳，`globals.css` 存放全局样式。
- `app/_sites-preview/` 存放可替换的加载预览组件及其独立样式。
- `db/` 包含 Drizzle 数据库模式和客户端；`examples/d1/` 提供可选的 Cloudflare D1 路由示例。
- `worker/` 包含部署用 Worker 入口，`public/` 存放静态资源。
- `tests/` 包含渲染 HTML 测试。`.next/`、`dist/` 和 `.wrangler/` 是生成目录，不应提交。

## 构建、测试与开发命令

使用 Node.js `>=22.13.0`，先运行 `npm install` 安装依赖。

- `npm run dev`：启动本地 vinext 开发服务器。
- `npm run build`：构建应用和 Worker 输出。
- `npm start`：本地运行已构建的应用。
- `npm test`：先构建，再运行渲染 HTML 回归测试。
- `npm run lint`：运行 ESLint，并忽略生成目录。
- `npm run db:generate`：修改 `db/schema.ts` 后生成 Drizzle 迁移文件。

## 代码风格与命名约定

使用 TypeScript 和 React 函数组件，并遵循现有 ESLint、React Hooks、JSX 无障碍检查及 Next Core Web Vitals 规则。使用两个空格缩进、分号、双引号，以及多行对象或调用中的尾随逗号。组件和类型使用 `PascalCase`，函数和变量使用 `camelCase`，CSS 类名保持描述性。天气 API 类型应靠近使用它们的代码；除非正在修改本地化，否则保留面向用户的中文文案。

## 测试指南

测试使用 Node 内置的 `node:test` 运行器和严格断言，文件位于 `tests/*.test.mjs`。测试名称应描述可观察行为，例如 `server-renders-*` 或 `keeps-*`。提交前运行 `npm test`，它会验证生产构建和加载骨架的渲染结果。目前未配置覆盖率阈值。

## 提交与拉取请求指南

仓库目前没有 Git 提交记录，因此尚无既定的提交信息规范。建议使用简短、祈使语气的主题，例如 `Improve city search error handling`，并将无关变更分开。拉取请求应说明行为变化、列出已运行的验证命令、在适用时关联 Issue；涉及天气界面或视觉变化时，应附截图或简短录屏。

## 安全与配置提示

不要提交凭据、私有令牌、生成文件或本地 Wrangler 状态。ChatGPT 登录保留路由应继续由 `app/chatgpt-auth.ts` 处理；`returnTo` 仅使用同源路径，并在服务端对私有数据或写操作执行授权检查。

## 风格选择

风格尽量简洁，让使用者更舒心

## 文件编写规则

不要每次对话都改动文件，要我和你说清楚问题之后再开始改动文件

