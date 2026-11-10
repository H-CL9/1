#!/usr/bin/env node
/**
 * 一键启动：DeepSeek Harness 原版 Web UI + 地图页面本地服务
 *
 * 为什么需要这个脚本？
 *   dsh web 的登录 Cookie 是 SameSite=Strict。浏览器会拦截
 *   file:// 页面里内嵌的 Harness Cookie，导致 iframe 显示
 *   "authentication required"。把 map-chat.html 从
 *   http://127.0.0.1:3090 提供，与 Harness 的 127.0.0.1:3080
 *   同站（SameSite 只比较 scheme + host，不比较端口），登录态
 *   才能带进 iframe。这里只是一个静态文件服务，不代理任何聊天
 *   请求，也不接触 API Key。
 */
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PAGE_PORT = 3090;
const HARNESS_PORT = 3080;
const PAGE_URL = `http://127.0.0.1:${PAGE_PORT}/map-chat.html`;
const HARNESS_URL = `http://127.0.0.1:${HARNESS_PORT}`;
const DSH_BIN = path.join(ROOT, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js');
const HTML_FILE = path.join(ROOT, 'map-chat.html');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const NO_OPEN = process.env.DSH_MAP_NO_OPEN === '1';

function openUrl(url) {
  if (NO_OPEN) {
    console.log('[NO_OPEN] ' + url);
    return;
  }
  try {
    if (process.platform === 'win32') {
      execFile('cmd.exe', ['/c', 'start', '""', url], { windowsHide: false }, () => {});
    } else if (process.platform === 'darwin') {
      execFile('open', [url], () => {});
    } else {
      execFile('xdg-open', [url], () => {});
    }
  } catch (e) {
    console.log('请手动打开：' + url);
  }
}

async function harnessRunning() {
  try {
    const res = await fetch(HARNESS_URL + '/manifest.webmanifest', {
      signal: AbortSignal.timeout(2500)
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

async function waitForTokenOrTimeout(child, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      resolve('');
    }, timeoutMs);

    const scan = (chunk) => {
      if (done) return;
      const text = chunk.toString();
      const match = text.match(/http:\/\/[^\s]+?token=[^\s]+/);
      if (match) {
        done = true;
        clearTimeout(timer);
        resolve(match[0]);
      }
    };

    child.stdout.on('data', scan);
    child.stderr.on('data', scan);
    child.once('exit', () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve('');
    });
  });
}

// ---------- 1. 静态页面服务（只提供本目录文件） ----------
const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);

    // 只提供地图页面本身，避免把本目录的其他文件暴露给浏览器
    if (pathname !== '/' && pathname !== '/index.html' && pathname !== '/map-chat.html') {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    const data = await readFile(HTML_FILE);
    const ext = path.extname(HTML_FILE).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'text/html; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    res.end(data);
  } catch (e) {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`端口 ${PAGE_PORT} 已被占用，请关闭占用该端口的程序后重试。`);
  } else {
    console.error('本地页面服务启动失败：', err);
  }
  process.exit(1);
});

let harnessChild = null;

server.listen(PAGE_PORT, '127.0.0.1', async () => {
  console.log(`地图页面：${PAGE_URL}`);
  console.log(`Harness： ${HARNESS_URL}`);

  if (await harnessRunning()) {
    console.log('检测到 dsh web 已在运行。');
    setTimeout(() => openUrl(PAGE_URL), 300);
    return;
  }

  if (!existsSync(DSH_BIN)) {
    console.error('找不到 DeepSeek Harness（node_modules 未安装）。请先运行：npm install');
    openUrl(PAGE_URL);
    return;
  }

  console.log('正在启动 dsh web（原版 DeepSeek Harness，首次启动可能需要 30 秒）…');
  harnessChild = spawn(process.execPath, [DSH_BIN, 'web', '--no-open', '--port', String(HARNESS_PORT)], {
    cwd: ROOT,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: false
  });

  harnessChild.stdout.on('data', (d) => process.stdout.write(d));
  harnessChild.stderr.on('data', (d) => process.stderr.write(d));
  harnessChild.once('error', (err) => {
    console.error('dsh web 启动失败：', err.message);
    openUrl(PAGE_URL);
  });
  harnessChild.once('exit', (code) => {
    if (code !== 0 && code !== null) console.error(`dsh web 已退出（code ${code}）。`);
  });

  // dsh web 启动后会打印带 token 的一次性登录 URL，用它完成登录，
  // 浏览器拿到 SameSite Cookie 后，iframe 才能显示原版界面。
  const loginUrl = await waitForTokenOrTimeout(harnessChild, 60000);
  if (loginUrl) {
    console.log('已打开 Harness 登录页，登录完成后自动打开地图页面。');
    openUrl(loginUrl);
    setTimeout(() => openUrl(PAGE_URL), 1600);
  } else {
    console.log('未捕获到登录 URL，请查看上方 dsh web 输出，或手动运行 npm run web。');
    openUrl(PAGE_URL);
  }
});

function shutdown() {
  server.close();
  if (harnessChild) {
    try { harnessChild.kill(); } catch (e) { /* ignore */ }
  }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
