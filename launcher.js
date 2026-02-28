/**
 * ═══════════════════════════════════════════════════════════
 *  حضور الحلقات — launcher.js
 *  مُشغِّل التطبيق الصامت
 *  يبدأ الخادم في الخلفية، يفتح المتصفح، وينسخ رابط الشبكة
 * ═══════════════════════════════════════════════════════════
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const os   = require('os');
const fs   = require('fs');

const PORT       = 3000;
const SERVER_JS  = path.join(__dirname, 'server.js');
const LOG_FILE   = path.join(__dirname, 'launcher.log');

// ── وظيفة التسجيل ───────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try { fs.appendFileSync(LOG_FILE, line); } catch(e) {}
}

// ── الحصول على IP الشبكة ────────────────────────────────
function getNetworkIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

// ── نسخ النص إلى الحافظة (Windows) ─────────────────────
function copyToClipboard(text) {
  return new Promise((resolve) => {
    // Windows: استخدام PowerShell
    const ps = spawn('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      `Set-Clipboard -Value '${text}'`
    ], { windowsHide: true });
    ps.on('close', () => resolve());
    ps.on('error', () => {
      // fallback: clip command
      exec(`echo ${text}| clip`, (err) => resolve());
    });
    setTimeout(() => resolve(), 3000);
  });
}

// ── فتح المتصفح ─────────────────────────────────────────
function openBrowser(url) {
  const cmd = process.platform === 'win32'
    ? `start "" "${url}"`
    : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, (err) => { if (err) log('Browser open error: ' + err); });
}

// ── انتظار بدء الخادم ────────────────────────────────────
function waitForServer(url, retries = 20) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const http = require('http');
    const check = () => {
      attempts++;
      const req = http.get(url, (res) => {
        if (res.statusCode < 500) resolve();
        else { if (attempts < retries) setTimeout(check, 500); else reject(); }
      });
      req.on('error', () => {
        if (attempts < retries) setTimeout(check, 500);
        else reject(new Error('Server did not start in time'));
      });
      req.setTimeout(1000, () => { req.destroy(); });
    };
    check();
  });
}

// ══════════════════════════════════════════════════════════
//  الإجراء الرئيسي
// ══════════════════════════════════════════════════════════
async function main() {
  log('Launcher started');

  // 1. تشغيل الخادم في الخلفية
  if (!fs.existsSync(SERVER_JS)) {
    log('ERROR: server.js not found at ' + SERVER_JS);
    process.exit(1);
  }

  const server = spawn(process.execPath, [SERVER_JS], {
    detached:    true,
    stdio:       'ignore',
    windowsHide: true,
    cwd:         __dirname,
  });
  server.unref();
  log(`Server process spawned (PID: ${server.pid})`);

  // 2. انتظار بدء الخادم
  try {
    await waitForServer(`http://localhost:${PORT}/api/stats`);
    log('Server is ready');
  } catch(e) {
    log('Warning: server readiness check timed out, continuing anyway');
  }

  // 3. الحصول على IP وإعداد الروابط
  const ip         = getNetworkIP();
  const localUrl   = `http://localhost:${PORT}`;
  const networkUrl = ip ? `http://${ip}:${PORT}` : localUrl;
  log(`Local:   ${localUrl}`);
  log(`Network: ${networkUrl}`);

  // 4. نسخ رابط الشبكة إلى الحافظة
  if (ip) {
    await copyToClipboard(networkUrl);
    log(`Copied to clipboard: ${networkUrl}`);
  }

  // 5. فتح المتصفح
  openBrowser(localUrl);
  log('Browser opened');
  log('Launcher finished — server running in background');
}

main().catch(e => { log('FATAL: ' + e.message); process.exit(1); });
