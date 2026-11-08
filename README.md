# 部署说明（全程点网页，不用命令行）

**先看这句**：仓库是公开的，别人能看到代码和页面外壳，但**你的记录只存在自己手机/电脑的加密数据库里，不会上传、不经过 GitHub**。页面里没有密钥，也没有任何预置数据。请务必记住自己设的口令——忘记无法恢复，没有后门。

---

## 第一步：建仓库

1. 打开 github.com 并登录 → 右上角 **「+」** → **「New repository」**。
2. **Repository name** 填 `life-log`（全小写、不要空格），选 **Public**。
3. **「Initialize this repository」整块都不要勾**（不要 README、不要 .gitignore、不要 License）→ 点 **「Create repository」**。

> ✅ 预期：看到 `Quick setup` 和 `This repository is empty`。
> ⚠️ 最容易卡住：勾了 README 会多一次提交；仓库名带大写/空格会让网址变复杂；选 Private 免费版打不开 Pages。

## 第二步：上传文件

1. 点 **「Add file」** → **「Upload files」**。
2. 把本文件夹里**所有文件一次性拖进虚线框**（都是平铺文件，没有子文件夹，全选即可）→ 底部选 **「Commit directly to the main branch」** → 点 **「Commit changes」**。

> ✅ 预期：仓库首页列出 `index.html`、`sw.js`、`manifest.webmanifest`、图标和 `verify-w1.mjs`、`README.md`，分支是 `main`。
> ⚠️ 最容易卡住：只拖了外层文件夹会丢文件；`index.html` 必须在最外层（放进子文件夹一定 404）；漏传 `sw.js` 或 `manifest.webmanifest` 会装不上桌面。这份 README 和 `verify-w1.mjs` 一起上传也没关系，不含任何数据。

## 第三步：打开 Pages

1. 点 **「Settings」** → 左侧 **「Pages」**。
2. **Source** 选 **「Deploy from a branch」**，**Branch** 选 `main`，**Folder** 选 `/(root)` → 点 **「Save」**。

> ✅ 预期：等 **1–2 分钟**刷新页面，顶部出现绿色 `Your site is live at https://<你的用户名>.github.io/life-log/`。点 **「Visit site」** 看到「设置口令」页面。
> ⚠️ 最容易卡住：404 = `index.html` 不在根目录；白屏 = 资源路径写成了 `/` 开头（本项目已全部用 `./`，正常不会出现）；改过文件后要再等 1–2 分钟。

## 第四步：验收（电脑）

1. 打开站点，按 **F12** → **「Application」** → 左侧 **「Manifest」**。
2. 左侧 **「Service Workers」** → 再看 **「Console」**。

> ✅ 预期：`Start URL` 是 `https://<用户名>.github.io/life-log/`（**不是** `https://<用户名>.github.io/`）；SW 来源 `.../life-log/sw.js`、状态 `activated and is running`、绿点；Console 没有红色 404。
> ⚠️ 最容易卡住：Start URL 跑到根路径 = manifest 写了 `"/"`；SW 404 = 注册写了 `/sw.js`。本项目已用 `./`，出现即为上传文件不完整。

## 第五步：手机装到桌面（小米14）

1. **必须用 Chrome 打开同一个网址**（不要用小米自带浏览器，它无法手动安装 PWA）。
2. 右上角 **「⋮」** → **「安装应用」**；若没有该项，选 **「添加到主屏幕」**；页面上出现「安装到主屏幕」按钮时也可以直接点它。
3. **保持联网打开一次，等 3–5 秒**，再从桌面图标打开；然后开**飞行模式**，重开图标、记一条、杀掉、再打开。

> ✅ 预期：桌面有图标，全屏无地址栏；断网也能打开、记录保存成功、重开不丢。
> ⚠️ 最容易卡住：国内网络下 Chrome 的安装校验偶尔变慢或只给出普通快捷方式（带地址栏），**只要 SW 是 activated、断网可用就算通过**；断网打不开 = SW 没激活，回到第四步。

---

## 小米14 一次性设置（纯点按）

| 目的 | 点哪里 | 预期 |
|---|---|---|
| 不被限电 | 设置 → 应用设置 → 应用管理 → **Chrome** → 省电策略 → **无限制** | 后台不被限 |
| 允许自启动 | 设置 → 应用设置 → 授权管理 → 自启动管理 → 允许 **Chrome** | 被清理后能恢复 |
| 锁定后台 | 最近任务 → 长按应用卡片 → 点**锁头** | 一键清理不误杀 |
| 别清站点数据 | 手机管家 → 垃圾清理 → **不要勾选浏览器数据**；关掉「锁屏清理缓存」 | 记录不丢 |

菜单名随 HyperOS 版本略有不同，可在设置里直接搜关键词。这些设置**不是免疫**：系统更新后常被重置，所以**每周做一次加密备份**才是可靠防线。

---

## W1 本地验收命令（电脑，Git Bash 里逐条复制）

```bash
cd /d/workbuddy/life-log

node verify-w1.mjs            # 预期 W1 PASS 8/8
node verify-w1.mjs --serve    # 预期 W1 PASS 8/8 · DEPLOY PASS 7/7

# 部署完成后，把地址换成你自己的：
node verify-w1.mjs --url https://<你的用户名>.github.io/life-log/
# 预期 W1 PASS 8/8 · DEPLOY PASS 7/7
```

`--serve` 会在本机模拟 `/life-log/` 子路径，不需要你启动任何服务，直接验证「项目站点不会 404」。

## 每周收工打点（可回滚）

1. 应用里点 **「建立备份点」**（加密快照只存本机）；再点 **「导出 JSON」** 存一份到电脑。
2. 仓库页 → **「Releases」** → **「Create a new release」** → Tag 填 `w1-stable` → **「Publish release」**。
3. 回滚：网页重新上传上一版文件；应用里点对应备份点的 **「恢复」**（恢复前会自动再存一个备份）。

---

**当前状态**：`仅本地，未同步`。手机和电脑各存各的，电脑关机不影响手机记录；W2 起提供「手机导出加密 JSON → 传到电脑 → 导入合并」。AI 仅电脑端，手机端置灰。
