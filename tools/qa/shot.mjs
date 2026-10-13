// Headless Chrome screenshots with real WebGL (SwiftShader), for checking the 3D preview.
// node tools/qa/shot.mjs <url> <width> <height> <out.png> [--pre file.js] [--eval file.js] [--wait expr] [--mobile] [--settle ms]
// Launches on a free debug port (DevToolsActivePort) with a watchdog, so it never hangs another
// chat's Chrome or waits forever.
import {spawn} from 'node:child_process';
import {writeFileSync, readFileSync, mkdtempSync, existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const args = process.argv.slice(2);
const [url, W, H, out] = args;
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const flag = n => args.includes(n);
const profile = mkdtempSync(join(process.env.SHOT_TMP || tmpdir(), 'pecasa-shot-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--hide-scrollbars', '--no-first-run',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', `--window-size=${W},${H}`, 'about:blank'], {stdio: 'ignore'});
const watchdog = setTimeout(() => { try { chrome.kill('SIGKILL'); } catch {} console.error('watchdog'); process.exit(2); }, Number(opt('--timeout', 150000)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pending = new Map(); const logs = [];
async function wsUrl() {
  for (let i = 0; i < 80; i++) {
    const f = join(profile, 'DevToolsActivePort');
    if (existsSync(f)) {
      const port = readFileSync(f, 'utf8').split('\n')[0];
      try { const r = await fetch(`http://127.0.0.1:${port}/json/list`, {signal: AbortSignal.timeout(3000)}); const t = (await r.json()).find(x => x.type === 'page'); if (t) return t.webSocketDebuggerUrl; } catch {}
    }
    await sleep(250);
  }
  throw new Error('no chrome');
}
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, {res, rej}); ws.send(JSON.stringify({id: i, method, params})); });
try {
  ws = new WebSocket(await wsUrl());
  await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); });
  ws.addEventListener('message', m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result); } else if (d.method === 'Runtime.consoleAPICalled') logs.push(d.params.type + ': ' + d.params.args.map(a => a.value ?? a.description).join(' ')); else if (d.method === 'Runtime.exceptionThrown') logs.push('EXC: ' + JSON.stringify(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text)); });
  await send('Page.enable'); await send('Runtime.enable');
  const mobile = flag('--mobile');
  await send('Emulation.setDeviceMetricsOverride', {width: Number(W), height: Number(H), deviceScaleFactor: Number(opt('--dpr', 1)), mobile});
  if (mobile) await send('Emulation.setTouchEmulationEnabled', {enabled: true, maxTouchPoints: 5});
  const pre = opt('--pre', null);
  if (pre) await send('Page.addScriptToEvaluateOnNewDocument', {source: readFileSync(pre, 'utf8')});
  await send('Page.navigate', {url});
  const wait = opt('--wait', null);
  if (wait) { for (let i = 0; i < 240; i++) { const r = await send('Runtime.evaluate', {expression: wait, returnByValue: true}); if (r.result.value) break; await sleep(250); } }
  await sleep(Number(opt('--settle', 1500)));
  const ev = opt('--eval', null);
  if (ev) { const r = await send('Runtime.evaluate', {expression: readFileSync(ev, 'utf8'), awaitPromise: true, returnByValue: true}); console.log(JSON.stringify(r.result.value ?? r.exceptionDetails ?? null, null, 1)); await sleep(Number(opt('--after', 1200))); }
  if (out && out !== '-') { const shot = await send('Page.captureScreenshot', {format: 'png'}); writeFileSync(out, Buffer.from(shot.data, 'base64')); }
  if (logs.length) console.log(logs.slice(0, 30).join('\n'));
} catch (e) { console.error(String(e)); process.exitCode = 1; }
finally { clearTimeout(watchdog); try { chrome.kill('SIGKILL'); } catch {} }
