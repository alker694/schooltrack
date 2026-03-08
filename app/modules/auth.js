// ══════════════════════════════════════════════════════════
//  شاشة PIN
// ══════════════════════════════════════════════════════════
let pinBuffer = '';

function pinPress(digit) {
  if (pinBuffer.length >= 4) return;
  pinBuffer += digit;
  updatePinDots();
  if (pinBuffer.length === 4) setTimeout(pinSubmit, 200);
}
function pinClear() { pinBuffer = pinBuffer.slice(0,-1); updatePinDots(); }
function updatePinDots() {
  for (let i=1;i<=4;i++)
    document.getElementById(`d${i}`).classList.toggle('filled', i <= pinBuffer.length);
}
async function pinSubmit(overridePin) {
  const pin = overridePin !== undefined ? overridePin : pinBuffer;
  if (!pin) return;
  const res  = await fetch(`${API}/auth/verify`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ pin }),
  });
  const data = await res.json();
  if (data.valid) {
    sessionStorage.setItem('halaqat_auth', '1');
    document.getElementById('pinScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    await loadAll(); await loadAndDisplayLogos(); navigate('dashboard');
    refreshNotifBadge();
    waUpdateNavBadge();
    bioOfferEnroll(pin);
    // Real-time WA badge via SSE — falls back to 60s polling if SSE fails
    (function() {
      var es = null;
      var _lastQueueCount = -1;
      function connectSSE() {
        if (es) { try { es.close(); } catch(e){} }
        es = new EventSource('/api/whatsapp/queue/stream');
        es.onmessage = function(e) {
          var count = parseInt(e.data, 10);
          if (isNaN(count)) return;
          var label = count > 99 ? '99+' : (count > 0 ? String(count) : '');
          ['waQueueBadge','menuWaBadge'].forEach(function(id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.textContent = label;
            el.classList.toggle('hidden', count === 0);
          });
          var tc = document.getElementById('waTabCount');
          if (tc) { tc.textContent = label; tc.classList.toggle('hidden', count === 0); }
          // Update notif panel with new queue count
          _waQueueNotifCount = count;
          refreshNotifBadge();
          // Show popup notification when queue grows
          if (_lastQueueCount !== -1 && count > _lastQueueCount) {
            showQueueNotif(count);
          }
          _lastQueueCount = count;
        };
        es.onerror = function() {
          // SSE failed — reconnect after 5s
          try { es.close(); } catch(e){}
          setTimeout(connectSSE, 5000);
        };
      }
      connectSSE();
      // Fallback poll every 60s in case SSE drops silently
      setInterval(waUpdateNavBadge, 60000);
    })();

    // ── Fonnte device status auto-poller ──────────────────
    (function() {
      var _lastDeviceStatus = null; // 'connect' | 'disconnect' | null
      var _devicePollTimer  = null;
      var _devicePollActive = false;

      function showFonnteNotif(connected) {
        var existing = document.getElementById('fonnteStatusNotif');
        if (existing) existing.remove();

        var notif = document.createElement('div');
        notif.id = 'fonnteStatusNotif';
        notif.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
          'color:#fff;border-radius:12px;padding:14px 20px;font-size:14px;font-weight:600;' +
          'box-shadow:0 8px 32px rgba(0,0,0,0.3);z-index:9999;display:flex;align-items:center;' +
          'gap:12px;min-width:280px;animation:slideDown 0.3s ease;' +
          (connected
            ? 'background:#14532d;border-right:4px solid #22c55e;'
            : 'background:#7f1d1d;border-right:4px solid #ef4444;');

        notif.innerHTML = '<span style="font-size:20px">' + (connected ? '<span style="display:inline-flex;align-items:center"><svg width="12" height="12" viewBox="0 0 24 24" fill="#22c55e" stroke="#22c55e" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg></span>' : '<span style="display:inline-flex;align-items:center"><svg width="12" height="12" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg></span>') + '</span>' +
          '<div style="flex:1"><div>' + (connected ? 'واتساب متصل الآن <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' : 'واتساب انقطع الاتصال <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>') + '</div>' +
          '<div style="font-size:11px;opacity:0.75;margin-top:2px;font-weight:400">' +
          (connected ? 'الجهاز جاهز للإرسال' : 'تحقق من هاتفك واتصاله بالإنترنت') +
          '</div></div>';

        var closeBtn = document.createElement('button');
        closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        closeBtn.style.cssText = 'background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font-size:14px;padding:0 0 0 8px;';
        closeBtn.onclick = function() { notif.remove(); };
        notif.appendChild(closeBtn);
        document.body.appendChild(notif);
        setTimeout(function() { if (notif.parentNode) notif.remove(); }, 8000);
      }

      async function pollDeviceStatus() {
        try {
          var res  = await fetch('/api/fonnte/device');
          var data = await res.json();
          if (!data) return;
          // If rate-limited, wait a full minute before retrying — don't change known state
          if (data.reason === 'rate limit') {
            clearTimeout(_devicePollTimer);
            _devicePollTimer = setTimeout(pollDeviceStatus, 60000);
            return;
          }
          if (data.status !== true) return;
          var ds = (data.device_status || '').toLowerCase();
          var connected = ds === 'connect' || ds === 'connected';
          var statusKey = connected ? 'connect' : 'disconnect';

          // Always update the device card with fresh data
          fonnteShowDeviceCard(connected, data);

          // Only notify on actual change (connect ↔ disconnect) — never on first poll
          if (_lastDeviceStatus !== null && _lastDeviceStatus !== statusKey) {
            showFonnteNotif(connected);
            // If just connected and had pending queue — remind them
            if (connected && _waQueueNotifCount > 0) {
              setTimeout(function() {
                showQueueNotif(_waQueueNotifCount);
              }, 3000);
            }
          }
          _lastDeviceStatus = statusKey;

          // If disconnected keep polling every 10s, if connected slow to every 2 min
          clearTimeout(_devicePollTimer);
          _devicePollTimer = setTimeout(pollDeviceStatus, connected ? 30000 : 10000);
        } catch(e) {
          // Network error — retry in 15s
          clearTimeout(_devicePollTimer);
          _devicePollTimer = setTimeout(pollDeviceStatus, 15000);
        }
      }

      // Start polling 3s after login (let app settle first)
      setTimeout(pollDeviceStatus, 3000);
    })();
  } else {
    document.getElementById('pinError').textContent = 'رمز سري غير صحيح. حاول مجددًا.';
    pinBuffer = ''; updatePinDots();
    setTimeout(() => document.getElementById('pinError').textContent = '', 2000);
  }
}
function lockApp() {
  sessionStorage.removeItem('halaqat_auth');
  pinBuffer = ''; updatePinDots();
  document.getElementById('pinError').textContent = '';
  document.getElementById('pinScreen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  closeSidebar();
  bioCheckAndShow();
}

// ══════════════════════════════════════════════════════════
//  بيومتري — WebAuthn (بصمة الإصبع / Face ID)
// ══════════════════════════════════════════════════════════
const BIO_CRED_KEY = 'halaqat_bio_cred';
const BIO_PIN_KEY  = 'halaqat_bio_pin';

function bioIsAvailable() {
  return !!(window.isSecureContext && window.PublicKeyCredential);
}

// Show or hide the fingerprint button on the PIN screen
async function bioCheckAndShow() {
  const btn = document.getElementById('bioBtnLogin');
  if (!btn) return;
  if (!bioIsAvailable()) { btn.classList.add('hidden'); return; }
  const cred = localStorage.getItem(BIO_CRED_KEY);
  const pin  = localStorage.getItem(BIO_PIN_KEY);
  if (!cred || !pin) { btn.classList.add('hidden'); return; }
  btn.classList.remove('hidden');
  // Auto-trigger on mobile after a short pause
  if (window.innerWidth <= 600) setTimeout(() => bioLogin(true), 700);
}

// Triggered by tapping the fingerprint button
async function bioLogin(silent = false) {
  const credB64 = localStorage.getItem(BIO_CRED_KEY);
  const pin     = localStorage.getItem(BIO_PIN_KEY);
  if (!credB64 || !pin) return;

  const btn = document.getElementById('bioBtnLogin');
  if (btn) { btn.classList.add('bio-btn--loading'); btn.disabled = true; }

  try {
    const credId = Uint8Array.from(atob(credB64), c => c.charCodeAt(0));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rpId: window.location.hostname,
        userVerification: 'required',
        timeout: 60000,
        allowCredentials: [{ id: credId, type: 'public-key' }],
      }
    });
    if (assertion) {
      // Bio passed — replay PIN to server
      pinBuffer = pin;
      updatePinDots();
      await pinSubmit(pin);
    }
  } catch(e) {
    if (btn) { btn.classList.remove('bio-btn--loading'); btn.disabled = false; }
    if (!silent && e.name !== 'NotAllowedError') {
      const errEl = document.getElementById('pinError');
      if (errEl) { errEl.textContent = 'تعذّر التحقق البيومتري — استخدم الرمز السري.'; setTimeout(() => { errEl.textContent = ''; }, 3000); }
    }
  }
}

// Offer biometric enrollment after first successful PIN login
async function bioOfferEnroll(pin) {
  if (!bioIsAvailable()) return;
  if (localStorage.getItem(BIO_CRED_KEY)) return; // already enrolled
  let available = false;
  try { available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch(e) {}
  if (!available) return;

  // Remove any old banner
  document.getElementById('bioOfferBanner')?.remove();

  const banner = document.createElement('div');
  banner.id = 'bioOfferBanner';
  banner.className = 'bio-offer-banner';
  banner.innerHTML = `
    <div class="bio-offer-icon">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 10a2 2 0 0 0-2 2v4a2 2 0 0 0 4 0v-4a2 2 0 0 0-2-2z"/>
        <path d="M12 6a6 6 0 0 1 6 6v2a6 6 0 0 1-6 6 6 6 0 0 1-6-6v-2a6 6 0 0 1 6-6z"/>
        <path d="M12 2a10 10 0 0 1 10 10v2a10 10 0 0 1-10 10A10 10 0 0 1 2 14v-2A10 10 0 0 1 12 2z"/>
      </svg>
    </div>
    <div class="bio-offer-text">
      <strong>تفعيل الدخول البيومتري</strong>
      <span>سجّل دخولك بلمسة إصبع أو بصمة الوجه في المرة القادمة</span>
    </div>
    <div class="bio-offer-actions">
      <button class="btn-secondary" onclick="document.getElementById('bioOfferBanner').remove()">لاحقاً</button>
      <button class="btn-primary" id="bioEnrollBtn" onclick="bioEnroll('${pin.replace(/'/g,"\\'")}')">تفعيل</button>
    </div>`;
  document.body.appendChild(banner);
  requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('bio-offer-banner--show')));
  // Auto-dismiss after 20s
  setTimeout(() => { if (banner.parentNode) { banner.classList.remove('bio-offer-banner--show'); setTimeout(() => banner.remove(), 400); } }, 20000);
}

// Register the WebAuthn credential
async function bioEnroll(pin) {
  document.getElementById('bioOfferBanner')?.remove();
  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'حلقات مجمع الخير', id: window.location.hostname },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: 'admin', displayName: 'المشرف' },
        pubKeyCredParams: [{ alg: -7, type: 'public-key' }, { alg: -257, type: 'public-key' }],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
        timeout: 60000,
      }
    });
    if (credential) {
      const credB64 = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      localStorage.setItem(BIO_CRED_KEY, credB64);
      localStorage.setItem(BIO_PIN_KEY, pin);
      toast('<span data-toast="ok"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span> تم تفعيل الدخول البيومتري بنجاح');
    }
  } catch(e) {
    if (e.name !== 'NotAllowedError') toast('<span data-toast="err">⚠️</span> تعذّر تفعيل البيومتري. تأكد من دعم الجهاز لهذه الميزة.');
  }
}

// Revoke / remove stored biometric (can be called from settings)
function bioRevoke() {
  localStorage.removeItem(BIO_CRED_KEY);
  localStorage.removeItem(BIO_PIN_KEY);
  document.getElementById('bioBtnLogin')?.classList.add('hidden');
  toast('تم إلغاء تفعيل البصمة');
}

// ══════════════════════════════════════════════════════════
