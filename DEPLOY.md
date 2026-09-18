# Cloudflare Pages 部署指南

## 第一步：推送代码到 GitHub

```bash
# 如果还没配置 Git 用户信息，先配置
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"

# 在 GitHub 创建新仓库后，添加远程仓库
git remote add origin https://github.com/你的用户名/gongkaosushuan.git

# 推送代码
git push -u origin main
```

## 第二步：部署到 Cloudflare Pages

1. **登录 Cloudflare**
   - 访问 https://dash.cloudflare.com/
   - 注册或登录账号

2. **创建新项目**
   - 左侧菜单选择 `Workers & Pages`
   - 点击 `Create application`
   - 选择 `Pages` 标签
   - 点击 `Connect to Git`

3. **连接 GitHub 仓库**
   - 授权 Cloudflare 访问你的 GitHub
   - 选择 `gongkaosushuan` 仓库
   - 点击 `Begin setup`

4. **配置构建设置**
   - **Project name**: `gongkaosushuan` (或自定义)
   - **Production branch**: `main`
   - **Framework preset**: `Vite`（自动填充下面的配置）
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variables**: 无需配置

5. **部署**
   - 点击 `Save and Deploy`
   - 等待 1-2 分钟构建完成
   - 完成后会得到一个 `*.pages.dev` 的访问地址

## 第三步：后续更新

每次代码修改后：

```bash
git add .
git commit -m "描述修改内容"
git push
```

Cloudflare Pages 会自动检测推送并重新构建部署。

## 绑定自定义域名（可选）

1. 在项目设置中选择 `Custom domains`
2. 点击 `Set up a custom domain`
3. 输入你的域名
4. 按照提示添加 DNS 记录
5. 等待 DNS 生效（几分钟到几小时）

## 故障排查

**构建失败？**
- 检查 Node 版本是否 >= 18
- 检查 `package.json` 中依赖是否完整
- 查看构建日志中的错误信息

**页面打开空白？**
- 检查 `dist` 目录是否正确配置
- 检查浏览器控制台是否有 JavaScript 错误
- 确认 `index.html` 在 `dist` 根目录

**访问慢？**
- Cloudflare Pages 全球 CDN，首次访问可能略慢
- 中国大陆访问速度因地区而异
