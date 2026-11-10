# DeepSeek Harness Web 本地工作区

本目录用于在本地安装并启动 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 Web UI。

## 环境要求

- Node.js >= 24.9.0
- npm（随 Node.js 安装）

## 安装

```sh
npm install
```

## 启动 Web UI

```sh
npm run web
```

默认地址：<http://127.0.0.1:3080>，启动后会自动打开浏览器。

如果只想启动服务、不自动打开浏览器：

```sh
npm run web:no-open
```

## 地图 + Harness 一体化页面

`map-chat.html` 是左侧天地图、右侧原版 DeepSeek Harness 的单文件页面：

- 天地图 Key 默认填写为浏览器端 Key；清空并保存后不再加载底图。
- 打开时自动请求浏览器定位，成功后以当前位置为中心（约 14 级）；拒绝、超时或浏览器不支持时回退到西安默认中心。定位结果只在本机用于移动地图，不写入 localStorage。
- 定位期间地图区域显示“正在定位当前位置…”等待层，可点击“跳过定位，先用默认位置”；地图只在定位完成后创建，不会先显示西安视角再跳转。
- 右侧通过 iframe 加载真实的 `dsh web` 界面，不再自绘对话 UI。
- 浏览器会拦截 `file://` 页面内嵌的 Harness 登录 Cookie（SameSite=Strict），所以请使用一键启动脚本：

```sh
# 方式一：双击
启动地图对话.bat

# 方式二：命令行
npm run map
```

脚本会：

1. 启动 `dsh web`（端口 3080），并打开带 token 的登录页；
2. 在 `http://127.0.0.1:3090/map-chat.html` 提供本页面（与 Harness 同站）；
3. 登录完成后自动打开地图页面，右侧即为原版 Harness 界面。

如果只双击 `map-chat.html`，地图本身可以显示，但浏览器通常不允许 `file://` 页面定位，且右侧会提示“需要通过本地服务打开”。

## 说明

- Harness 的会话、配置、插件等数据保存在用户目录的 `~/.dsh` 中，与桌面版共用。
- 本仓库只保存本地启动所需的工程文件；`node_modules` 等生成物已被 `.gitignore` 忽略。
- 官方源码仓库：<https://github.com/deepseek-ai/deepseek-harness>
