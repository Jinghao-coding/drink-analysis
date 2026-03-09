# 2026 喝酒记录日历 🍻

一款专为2026年设计的精致饮酒记录工具，动态多人日历、状态追踪、云端同步，完美记录与好友共饮的每一刻。

👉 [在线演示](https://jinghao-coding.github.io/drink-analysis/)

---

## ✨ 功能亮点

- 📅 **2026年专属日历** — 全年月历视图，按成员数量自动调整网格展示
- 🧑‍🤝‍🧑 **多人团队记录** — 支持动态增删改成员（建议最多 16 位），姓名/简称/颜色可配置
- 🟢 **三种状态标记** — 微醺（金黄）、刚刚好（翠绿）、醉了（朱红），一目了然
- 📸 **照片记忆** — 每日可上传照片，年度报告自动汇总
- 🍶 **酒类明细** — 可按成员记录酒种与数量，状态切换为“无”时会自动清空该成员当日酒类记录
- 🔍 **筛选与排行** — 按成员筛选日历、查看月度排行榜及详细统计
- 📊 **年度报告** — 为每位成员生成专属年度喝酒报告（天数、状态、照片集锦）
- ☁️ **云端同步** — 基于 JSONBin.io 的免费数据存储，多设备自动同步
- 💾 **数据管理** — 一键导入/导出 JSON 备份，安全迁移
- 🌓 **农历与节日** — 显示农历日期及传统节日（春节、端午、中秋等）



---

## 🛠️ 技术栈

- **纯前端** — HTML5 / CSS3 / JavaScript (ES6+)
- **存储方案** — JSONBin.io REST API（数据持久化） + LocalStorage（本地用户配置）
- **国际化** — Intl.DateTimeFormat 农历支持（含备查表）
- **构建** — 零依赖，单文件即开即用

---

## 🚀 快速开始

### 1. 下载或克隆本仓库
```bash
git clone https://github.com/jinghao-coding/drink-analysis.git
```

### 2. 打开页面
直接双击 `index.html` 或在本地启动一个静态服务器：
```bash
npx http-server .
```

### 3. 配置你自己的 JSONBin 密钥（可选，如需云端同步）

> ⚠️ 代码中内置了演示用的 `BIN_ID` 和 `API_KEY`，**多人同时使用会互相覆盖**。强烈建议你免费注册 [JSONBin.io](https://jsonbin.io/)，创建自己的 Bin 并替换密钥。

1. 注册 JSONBin.io，创建一个私有 Bin。
2. 获取你的 `BIN_ID`（URL 中的 ID）和 `API_KEY`（X-Master-Key）。
3. 在 `index.html` 中找到以下两行并替换：

```javascript
const BIN_ID = "你的BIN_ID";
const API_KEY = "你的X-Master-Key";
```

4. 再次刷新页面，数据将同步到你的私有 Bin。

---

## 📁 数据存储说明

- **日历记录**：以 `年份` → `月份` → `日期` 为层级，存储每位成员的状态（通过用户 ID 关联）、酒类明细 `drinks`、消费 `extra`、备注 `note` 及当日照片（Base64）。
- **用户信息**：存储在 LocalStorage 中，包含姓名、简称、颜色、位置。每次修改后会自动同步至 JSONBin 的 `_meta.users` 字段，确保跨设备一致。
- **数据迁移**：自动将旧版数据结构（数字索引）升级为基于用户 ID 的新版，无需手动干预。

> 所有照片均以 **Base64 字符串** 形式存入 JSONBin，请注意单个 Bin 的容量限制（免费版 10MB）。建议定期导出备份。

---

## 🌐 部署到 GitHub Pages

1. 将本仓库 Fork / Push 到你的 GitHub 仓库。
2. 进入仓库 Settings → Pages，选择 `main` 分支，根目录 `/` 保存。
3. 几分钟后即可通过 `https://你的用户名.github.io/仓库名` 访问。

---

## 🤖 Codex Skill（自动修改/验证/推送）

仓库内提供了可复用 skill：`skills/drink-analysis-maintainer/`，用于让 Codex 在每次改动后完成以下流程：

1. 理解并修改 `index.html` / `README.md`
2. 运行校验脚本
3. 提交并推送到远程（用于 GitHub Pages 发布）

常用命令：

```bash
skills/drink-analysis-maintainer/scripts/verify_project.sh
skills/drink-analysis-maintainer/scripts/commit_and_push.sh "feat: 你的改动说明"
```

---

## 🎨 自定义成员

- 点击右上角「**人员管理**」按钮，可添加、编辑、删除成员。
- 动态支持多人，建议最多 **16 位成员** 以保持最佳显示效果。
- 可自定义姓名、简称（1~2字）、头像背景色。
- 成员数据会同步到云端，但历史记录中的旧成员数据不会被删除（仅不再显示）。

---

## 📱 移动端适配

- 完全响应式，适配手机、平板、桌面。
- 使用 `viewport-fit=cover` 兼容刘海屏。
- 底部抽屉表单，滑出式交互，体验流畅。

---

## 🤝 贡献指南

欢迎提交 Issue 或 Pull Request：

1. Fork 本仓库
2. 新建功能分支：`git checkout -b feature/awesome-feature`
3. 提交更改：`git commit -m 'feat: 添加xxx'`
4. 推送分支：`git push origin feature/awesome-feature`
5. 提交 Pull Request

---

## 📄 许可证

MIT License © 2026 [Jinghao-coding]

---

## 🙏 致谢

- 农历算法借鉴 [Intl.DateTimeFormat](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat) 中文日历扩展
- 数据存储由 [JSONBin.io](https://jsonbin.io/) 提供支持
- 灵感来源于生活中每一次微醺的欢聚

---

> 本项目为纯静态页面，无任何后端服务器，所有数据均保存在你自己的浏览器与 JSONBin 中，放心使用。  
> **祝大家理性饮酒，记录快乐！** 🥂
