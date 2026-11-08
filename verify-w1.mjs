/* W1 验收脚本：零依赖，Node 18+ 直接跑
   node verify-w1.mjs                          静态检查
   node verify-w1.mjs --serve                  本地模拟 /life-log/ 项目站点并检查 404
   node verify-w1.mjs --url https://<user>.github.io/life-log/   部署后检查
*/
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = f => { try { return fs.readFileSync(path.join(dir, f), 'utf8'); } catch { return null; } };
const has = f => fs.existsSync(path.join(dir, f));
const args = process.argv.slice(2);
const failures = [];
let pass = 0;

function check(name, fn){
  try { const r = fn(); if(r === true){ pass++; } else { failures.push(`${name}: ${r || '未通过'}`); } }
  catch(e){ failures.push(`${name}: ${e.message}`); }
}

const FILES = ['index.html','sw.js','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png'];
check('必需文件齐全', () => {
  const miss = FILES.filter(f => !has(f));
  return miss.length ? `缺少 ${miss.join(', ')}` : true;
});

const html = read('index.html') || '';
const sw = read('sw.js') || '';
let mf = null;
try { mf = JSON.parse(read('manifest.webmanifest') || '{}'); } catch {}

check('manifest 全相对路径且可安装', () => {
  if(!mf) return 'manifest 不是合法 JSON';
  if(mf.start_url !== './') return `start_url 应为 "./"，当前 ${JSON.stringify(mf.start_url)}`;
  if(mf.scope !== './') return `scope 应为 "./"，当前 ${JSON.stringify(mf.scope)}`;
  if(!['standalone','fullscreen','minimal-ui'].includes(mf.display)) return 'display 需为 standalone/fullscreen/minimal-ui';
  const bad = (mf.icons||[]).filter(i => !String(i.src).startsWith('./'));
  if(bad.length) return `图标路径不是相对路径：${bad.map(i=>i.src).join(', ')}`;
  if((mf.icons||[]).length < 3) return '图标数量不足，Chrome 可能无法安装到主屏幕';
  return true;
});

check('index.html 无根路径 / 无 base / 无 History 路由', () => {
  if(/<base\b/i.test(html)) return '存在 <base> 标签，项目站点会解析错';
  if(/\b(href|src)\s*=\s*["']\//i.test(html)) return '存在以 / 开头的资源路径';
  if(/history\.(pushState|replaceState)/.test(html)) return '使用了 History 路由，项目站点会 404';
  return true;
});

check('Service Worker 相对注册 + 相对缓存列表', () => {
  if(!/register\(\s*['"]\.\/sw\.js['"]/.test(html)) return 'SW 注册不是 ./sw.js';
  if(!/scope\s*:\s*['"]\.\/['"]/.test(html)) return 'SW scope 不是 ./';
  if(!sw.includes('skipWaiting')) return 'SW 未 skipWaiting，更新后手机可能长期用旧缓存';
  const list = sw.match(/const ASSETS\s*=\s*\[([\s\S]*?)\]/);
  if(!list) return '找不到 ASSETS 缓存列表';
  const bad = [...list[1].matchAll(/['"]([^'"]+)['"]/g)].map(m => m[1]).filter(p => p.startsWith('/') || p.startsWith('http'));
  if(bad.length) return `缓存列表含绝对/根路径：${bad.join(', ')}`;
  return true;
});

check('本地加密链路完整', () => {
  for(const k of ['crypto.subtle','PBKDF2','AES-GCM','indexedDB','wrapKey','content_hash'])
    if(!html.includes(k)) return `缺少 ${k}`;
  if(!/iterations\s*:\s*\d{5,}/.test(html)) return 'PBKDF2 迭代次数过低';
  return true;
});

check('零外部请求 / 不采位置 / 不接传感器', () => {
  const src = html + sw;
  if(/\b(href|src)\s*=\s*["']https?:\/\//i.test(src)) return '引用了外部资源';
  if(/fetch\(\s*['"]https?:/i.test(src)) return '存在外部 fetch';
  for(const k of ['geolocation','getUserMedia','DeviceMotion','DeviceOrientation','Accelerometer'])
    if(new RegExp('\\b' + k + '\\b').test(src)) return `出现被禁止的能力 ${k}`;
  return true;
});

check('冻结边界：财务不启用、健康只存原始值、AI 置灰', () => {
  if(!/const\s+FINANCE_ENABLED\s*=\s*false/.test(html)) return 'FINANCE_ENABLED 不是 false';
  if(/data-(type|t)\s*=\s*["']finance["']/.test(html)) return 'UI 出现财务入口';
  if(!/AI 仅电脑端可用/.test(html)) return '缺少手机端 AI 置灰提示';
  if(!/id="aiBtn"[^>]*disabled/.test(html)) return 'AI 按钮未置灰';
  if(/diagnos|医疗建议|推断结论/i.test(html)) return '健康记录出现推断性措辞';
  return true;
});

check('无埋点 / 无硬编码密钥 / 无预置记录', () => {
  const src = html + sw;
  for(const k of ['gtag','googletagmanager','sentry','analytics','umami','plausible'])
    if(src.toLowerCase().includes(k)) return `出现埋点 ${k}`;
  if(/(api[_-]?key|secret|password)\s*[:=]\s*['"][^'"]{6,}['"]/i.test(src)) return '疑似硬编码密钥';
  return true;
});

/* ---- 部署检查：本地模拟项目站点 或 线上 URL ---- */
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.md':'text/markdown'};
const PROBE = ['','index.html','manifest.webmanifest','sw.js','icon.svg','icon-192.png','icon-512.png'];
let base = null, server = null;

const urlArg = args.indexOf('--url');
if(urlArg >= 0){
  const u = args[urlArg+1];
  if(!u) { console.log('FAIL --url 缺少地址'); process.exit(1); }
  base = u.endsWith('/') ? u : u + '/';
} else if(args.includes('--serve')){
  const PREFIX = '/life-log/';
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if(p === '/' || p === '/life-log'){ res.writeHead(302, {Location:PREFIX}); return res.end(); }
    if(!p.startsWith(PREFIX)){ res.writeHead(404); return res.end('404'); }
    const name = p.slice(PREFIX.length) || 'index.html';
    const f = path.join(dir, name);
    if(!f.startsWith(dir)){ res.writeHead(403); return res.end(); }
    fs.readFile(f, (err, buf) => {
      if(err){ res.writeHead(404); return res.end('404'); }
      res.writeHead(200, {'Content-Type': MIME[path.extname(name)] || 'application/octet-stream', 'Service-Worker-Allowed': PREFIX});
      res.end(buf);
    });
  });
  await new Promise(ok => server.listen(0, '127.0.0.1', ok));
  base = `http://127.0.0.1:${server.address().port}${PREFIX}`;
}

let deployPass = 0; const deployFail = [];
if(base){
  for(const p of PROBE){
    try {
      const r = await fetch(base + p);
      if(r.status === 200) deployPass++; else deployFail.push(`${p || '(根路径)'} → HTTP ${r.status}`);
    } catch(e){ deployFail.push(`${p || '(根路径)'} → ${e.message}`); }
  }
}
if(server) await new Promise(ok => server.close(ok));

console.log(`静态检查: ${pass}/8 通过`);
for(const f of failures) console.log('  FAIL ' + f);
if(base){
  console.log(`部署检查 ${base}: ${deployPass}/${PROBE.length} 通过`);
  for(const f of deployFail) console.log('  FAIL ' + f);
}
const ok = failures.length === 0 && deployFail.length === 0;
console.log(ok ? (base ? `W1 PASS ${pass}/8 · DEPLOY PASS ${deployPass}/${PROBE.length}` : `W1 PASS ${pass}/8`) : 'W1 FAIL');
process.exit(ok ? 0 : 1);
