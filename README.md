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

## 说明

- Harness 的会话、配置、插件等数据保存在用户目录的 `~/.dsh` 中，与桌面版共用。
- 本仓库只保存本地启动所需的工程文件；`node_modules` 等生成物已被 `.gitignore` 忽略。
- 官方源码仓库：<https://github.com/deepseek-ai/deepseek-harness>
