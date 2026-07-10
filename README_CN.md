<p align="center">
  <img src="https://raw.githubusercontent.com/liuyunss/doodlemap/main/favicon.svg" width="80" alt="DoodleMap">
</p>
<h1 align="center">DoodleMap 🗺️</h1>
<p align="center">手绘/卡通风格地图编辑器 — 可拖拽素材、风格切换、区域边界识别</p>

<p align="center">
  <img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="License">
  <img src="https://img.shields.io/badge/platform-Web-brightgreen?style=flat-square" alt="Platform">
  <img src="https://img.shields.io/badge/PRs-welcome-orange?style=flat-square" alt="PRs">
</p>

<p align="center">
  <a href="README.md">English</a>
</p>

---

## ✨ 功能

| 功能 | 说明 |
|------|------|
| 🔍 **地名搜索** | Photon API 全球地名搜索，支持中文 |
| 📐 **边界识别** | Nominatim OSM 区域边界自动获取，半透明遮罩 + 虚线边框 |
| 🎨 **三种风格** | 手绘 / 卡通 / 简约，一键切换 |
| 🖼️ **素材库** | Iconify 集成 20 万+ 图标，搜索 + 拖拽到地图 |
| ✍️ **手写字体** | 站酷快乐体，卡通/手绘风格标注 |
| 🗺️ **矢量瓦片** | VersaTiles 免费直连，中国区域 name 即中文 |
| 📤 **PNG 导出** | html2canvas 区域截图导出 |

## 🚀 快速开始

### 方式一：GitHub Pages（纯静态）

直接将仓库部署到 GitHub Pages，搜索和地图渲染可用。边界获取需要后端代理。

### 方式二：完整部署（含 Nominatim 代理）

```bash
git clone https://github.com/liuyunss/doodlemap.git
cd doodlemap

# 启动 Python 后端（静态服务 + Nominatim 代理）
python3 server.py --port 9120
# 浏览器打开 http://localhost:9120
```

> **注意**：Nominatim API 在国内需代理访问。`server.py` 内置 `urllib` 代理支持，修改 `NOMINATIM_PROXY` 变量即可。

## 📁 项目结构

```
doodlemap/
├── index.html        # 主页面 (MapLibre + 控制面板)
├── app.js            # 前端核心逻辑 (地图/搜索/素材/导出)
├── style.css         # 全局样式
├── server.py         # Python HTTP 服务 + Nominatim 代理
├── supervisor.py     # 进程守护 (自动重启)
├── test_style.js     # 风格 JSON 验证脚本
└── fonts/
    └── ZCOOLKuaiLe.ttf  # 站酷快乐体 (SIL OFL)
```

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| **MapLibre GL JS** | 矢量地图渲染引擎 |
| **VersaTiles** | 免费矢量瓦片源 (OSM) |
| **Photon API** | 地名搜索 (直连可用) |
| **Nominatim API** | 区域边界查询 (需代理) |
| **Iconify API** | 图标搜索与渲染 |
| **rough.js** | 手绘抖动效果 |
| **html2canvas** | 区域截图导出 |
| **站酷快乐体** | 中文字体 (SIL OFL) |

## 📖 使用说明

### 搜索 & 边界

1. 搜索框输入地名（如"颐和园"）→ 回车
2. 点击搜索结果（优先选 `osm_type=W` 的条目）
3. 地图自动聚焦 + 红色边界线 + 半透明遮罩

### 风格切换

点击顶部风格按钮：✏️ 手绘 → 🎨 卡通 → ⚪ 简约。边界数据切换后保留。

### 素材拖拽

1. 左侧素材库搜索/浏览图标
2. 拖拽到地图任意位置
3. rough.js 自动渲染手绘效果

### 导出

点击红色「导出」按钮 → html2canvas 截图下载。

## 🤝 贡献

```bash
# Fork + Clone
git clone https://github.com/YOUR_USERNAME/doodlemap.git
cd doodlemap

# 启动开发服务器
python3 server.py --port 9120

# 修改后提交 PR
git checkout -b feature/xxx
git commit -m "feat: xxx"
git push origin feature/xxx
```

## 📄 许可证

MIT © [liuyunss](https://github.com/liuyunss)

---

<p align="center">Made with ❤️ and MapLibre</p>
