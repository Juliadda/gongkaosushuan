# Agent Observation: 假设分配

- 项目默认系统 Node 架构不兼容，验证需显式使用 `/Users/yc/.nvm/versions/node/v22.23.2/bin`。
- Vitest/Vite 会写入 `node_modules/.vite-temp`，受限执行环境需要项目目录写权限。
- In-app browser 的隐藏标签页提供 1280×720 视口；精确 390×844 使用本机 Chrome 无头模式验证。
- 现有 Cloudflare Pages 配置为监听 GitHub `main`，推送后应核验构建状态和线上域名。
