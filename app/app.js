/**
 * ═══════════════════════════════════════════════════════════
 *  حضور الحلقات — app.js
 *  منطق الواجهة الأمامية بالكامل
 * ═══════════════════════════════════════════════════════════
 */

const BASE = window.location.origin;
const API  = `${BASE}/api`;

let state = {
  students: [], classes: [], teachers: [],
  teacherLog: [], holidays: [], quranProgress: [], currentPage: 'dashboard',
};

// Track students with active leaves so setAttStatus can block them
let _leaveStudentIds = new Set();
// Full leave map for current attendance view {studentId: leaveObj}
let _currentLeaveMap = {};
// Track if attendance is already saved for current class+date (once-a-day lock)
let _attAlreadySaved  = false;
let _attForceUnlocked = false;

// ══════════════════════════════════════════════════════════
//  القرآن الكريم — أسماء السور وأرقام الأجزاء
// ══════════════════════════════════════════════════════════
const SURAHS = [
  {n:1,name:'الفاتحة',juz:1},{n:2,name:'البقرة',juz:1},{n:3,name:'آل عمران',juz:3},
  {n:4,name:'النساء',juz:4},{n:5,name:'المائدة',juz:6},{n:6,name:'الأنعام',juz:7},
  {n:7,name:'الأعراف',juz:8},{n:8,name:'الأنفال',juz:9},{n:9,name:'التوبة',juz:10},
  {n:10,name:'يونس',juz:11},{n:11,name:'هود',juz:11},{n:12,name:'يوسف',juz:12},
  {n:13,name:'الرعد',juz:13},{n:14,name:'إبراهيم',juz:13},{n:15,name:'الحجر',juz:14},
  {n:16,name:'النحل',juz:14},{n:17,name:'الإسراء',juz:15},{n:18,name:'الكهف',juz:15},
  {n:19,name:'مريم',juz:16},{n:20,name:'طه',juz:16},{n:21,name:'الأنبياء',juz:17},
  {n:22,name:'الحج',juz:17},{n:23,name:'المؤمنون',juz:18},{n:24,name:'النور',juz:18},
  {n:25,name:'الفرقان',juz:18},{n:26,name:'الشعراء',juz:19},{n:27,name:'النمل',juz:19},
  {n:28,name:'القصص',juz:20},{n:29,name:'العنكبوت',juz:20},{n:30,name:'الروم',juz:21},
  {n:31,name:'لقمان',juz:21},{n:32,name:'السجدة',juz:21},{n:33,name:'الأحزاب',juz:21},
  {n:34,name:'سبأ',juz:22},{n:35,name:'فاطر',juz:22},{n:36,name:'يس',juz:22},
  {n:37,name:'الصافات',juz:23},{n:38,name:'ص',juz:23},{n:39,name:'الزمر',juz:23},
  {n:40,name:'غافر',juz:24},{n:41,name:'فصلت',juz:24},{n:42,name:'الشورى',juz:25},
  {n:43,name:'الزخرف',juz:25},{n:44,name:'الدخان',juz:25},{n:45,name:'الجاثية',juz:25},
  {n:46,name:'الأحقاف',juz:26},{n:47,name:'محمد',juz:26},{n:48,name:'الفتح',juz:26},
  {n:49,name:'الحجرات',juz:26},{n:50,name:'ق',juz:26},{n:51,name:'الذاريات',juz:26},
  {n:52,name:'الطور',juz:27},{n:53,name:'النجم',juz:27},{n:54,name:'القمر',juz:27},
  {n:55,name:'الرحمن',juz:27},{n:56,name:'الواقعة',juz:27},{n:57,name:'الحديد',juz:27},
  {n:58,name:'المجادلة',juz:28},{n:59,name:'الحشر',juz:28},{n:60,name:'الممتحنة',juz:28},
  {n:61,name:'الصف',juz:28},{n:62,name:'الجمعة',juz:28},{n:63,name:'المنافقون',juz:28},
  {n:64,name:'التغابن',juz:28},{n:65,name:'الطلاق',juz:28},{n:66,name:'التحريم',juz:28},
  {n:67,name:'الملك',juz:29},{n:68,name:'القلم',juz:29},{n:69,name:'الحاقة',juz:29},
  {n:70,name:'المعارج',juz:29},{n:71,name:'نوح',juz:29},{n:72,name:'الجن',juz:29},
  {n:73,name:'المزمل',juz:29},{n:74,name:'المدثر',juz:29},{n:75,name:'القيامة',juz:29},
  {n:76,name:'الإنسان',juz:29},{n:77,name:'المرسلات',juz:29},{n:78,name:'النبأ',juz:30},
  {n:79,name:'النازعات',juz:30},{n:80,name:'عبس',juz:30},{n:81,name:'التكوير',juz:30},
  {n:82,name:'الانفطار',juz:30},{n:83,name:'المطففين',juz:30},{n:84,name:'الانشقاق',juz:30},
  {n:85,name:'البروج',juz:30},{n:86,name:'الطارق',juz:30},{n:87,name:'الأعلى',juz:30},
  {n:88,name:'الغاشية',juz:30},{n:89,name:'الفجر',juz:30},{n:90,name:'البلد',juz:30},
  {n:91,name:'الشمس',juz:30},{n:92,name:'الليل',juz:30},{n:93,name:'الضحى',juz:30},
  {n:94,name:'الشرح',juz:30},{n:95,name:'التين',juz:30},{n:96,name:'العلق',juz:30},
  {n:97,name:'القدر',juz:30},{n:98,name:'البينة',juz:30},{n:99,name:'الزلزلة',juz:30},
  {n:100,name:'العاديات',juz:30},{n:101,name:'القارعة',juz:30},{n:102,name:'التكاثر',juz:30},
  {n:103,name:'العصر',juz:30},{n:104,name:'الهمزة',juz:30},{n:105,name:'الفيل',juz:30},
  {n:106,name:'قريش',juz:30},{n:107,name:'الماعون',juz:30},{n:108,name:'الكوثر',juz:30},
  {n:109,name:'الكافرون',juz:30},{n:110,name:'النصر',juz:30},{n:111,name:'المسد',juz:30},
  {n:112,name:'الإخلاص',juz:30},{n:113,name:'الفلق',juz:30},{n:114,name:'الناس',juz:30},
];
const QURAN_TYPE_AR  = { memorization:'🆕 حفظ جديد', revision:'🔄 مراجعة', recitation:'🎤 تلاوة' };
const QURAN_GRADE_COLOR = { 'ممتاز':'#166534','جيد جداً':'#1e40af','جيد':'#92400e','مقبول':'#374151','ضعيف':'#991b1b' };
const QURAN_GRADE_BG    = { 'ممتاز':'#dcfce7','جيد جداً':'#dbeafe','جيد':'#fef3c7','مقبول':'#f3f4f6','ضعيف':'#fee2e2' };

// ══════════════════════════════════════════════════════════
//  أسماء الأيام والأشهر بالعربية
// ══════════════════════════════════════════════════════════
const HIJRI_MONTHS = [
  '', 'محرم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];
const GREGORIAN_MONTHS = [
  '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];
const ARABIC_DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

// ══════════════════════════════════════════════════════════
//  تحويل التاريخ الميلادي إلى هجري
// ══════════════════════════════════════════════════════════
function toHijri(dateStr) {
  // Parse date parts directly from string to avoid timezone shifts
  const parts = (typeof dateStr === 'string' ? dateStr : dateStr.toISOString().slice(0,10)).split('-');
  const gy = +parts[0], gm = +parts[1], gd = +parts[2];

  // Gregorian → Julian Day Number (proleptic Gregorian calendar)
  const a   = Math.floor((14 - gm) / 12);
  const yy  = gy + 4800 - a;
  const mm  = gm + 12 * a - 3;
  const jdn = gd + Math.floor((153 * mm + 2) / 5) + 365 * yy +
              Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;

  // Julian Day Number → Hijri (tabular Islamic calendar, epoch JDN 1948440)
  const EPOCH = 1948440, CYCLE = 10631;
  const LEAP  = new Set([2,5,7,10,13,15,18,21,24,26,29]);
  const yLen  = y => LEAP.has(y % 30 === 0 ? 30 : y % 30) ? 355 : 354;
  const mLen  = (y, m) => m % 2 === 1 ? 30 : (m === 12 && LEAP.has(y % 30 === 0 ? 30 : y % 30) ? 30 : 29);

  let n      = jdn - EPOCH;
  const cyc  = Math.floor(n / CYCLE);
  n         -= cyc * CYCLE;

  let yin = 1;
  while (n >= yLen(yin)) { n -= yLen(yin); yin++; if (yin > 30) break; }

  const hYear = cyc * 30 + yin;
  let hMonth = 1;
  while (n >= mLen(hYear, hMonth)) { n -= mLen(hYear, hMonth); hMonth++; if (hMonth > 12) break; }

  return { year: hYear, month: hMonth, day: n + 1 };
}

function formatHijri(dateStr) {
  const h = toHijri(dateStr);
  return `${h.day} ${HIJRI_MONTHS[h.month]} ${h.year}هـ`;
}

function formatHijriFull(dateStr) {
  const d   = new Date(dateStr);
  const h   = toHijri(dateStr);
  const day = ARABIC_DAYS[d.getDay()];
  return `${day}، ${h.day} ${HIJRI_MONTHS[h.month]} ${h.year}هـ`;
}

function calcMinutes(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const [h1, m1] = checkIn.split(':').map(Number);
  const [h2, m2] = checkOut.split(':').map(Number);
  return Math.max(0, (h2*60+m2) - (h1*60+m1));
}

function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '—';
  const h = Math.floor(minutes/60), m = minutes%60;
  if (h===0) return `${m} دقيقة`;
  if (m===0) return `${h} ساعة`;
  return `${h} ساعة ${m} دقيقة`;
}

// ══════════════════════════════════════════════════════════
//  تهيئة
// ══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  updateTodayBadge();
  startClock();
  loadAndDisplayLogos(); // عرض الشعارات قبل الدخول
  loadPinQR();           // تحميل QR عند كل تحميل للصفحة

  // ── Keyboard PIN entry (desktop only — real keyboard) ────
  document.addEventListener('keydown', (e) => {
    const pinScreen = document.getElementById('pinScreen');
    if (!pinScreen || pinScreen.classList.contains('hidden')) return;
    if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;

    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      pinPress(Number(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      pinClear();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pinSubmit();
    }
  });
});

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
async function pinSubmit() {
  if (!pinBuffer) return;
  const res  = await fetch(`${API}/auth/verify`, {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ pin: pinBuffer }),
  });
  const data = await res.json();
  if (data.valid) {
    document.getElementById('pinScreen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    await loadAll(); await loadAndDisplayLogos(); navigate('dashboard');
    refreshNotifBadge();
  } else {
    document.getElementById('pinError').textContent = 'رمز سري غير صحيح. حاول مجددًا.';
    pinBuffer = ''; updatePinDots();
    setTimeout(() => document.getElementById('pinError').textContent = '', 2000);
  }
}
function lockApp() {
  pinBuffer = ''; updatePinDots();
  document.getElementById('pinError').textContent = '';
  document.getElementById('pinScreen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
  closeSidebar();
}

// ══════════════════════════════════════════════════════════
//  تحميل البيانات
// ══════════════════════════════════════════════════════════
async function loadAll() {
  const [students, classes, teachers, teacherLog, holidays] = await Promise.all([
    apiFetch('/students'), apiFetch('/classes'), apiFetch('/teachers'),
    apiFetch('/teacher-log?date='+todayISO()), apiFetch('/holidays'),
  ]);
  state.students   = students   || [];
  state.classes    = classes    || [];
  state.teachers   = teachers   || [];
  state.teacherLog = teacherLog || [];
  state.holidays   = holidays   || [];
}

// ══════════════════════════════════════════════════════════
//  الشعارات — تحميل وعرض في الواجهة
// ══════════════════════════════════════════════════════════
async function loadAndDisplayLogos() {
  try {
    const settings = await apiFetch('/settings');
    if (!settings) return;
    const logos = settings.logos || [];

    // اسم المنشأة في شاشة PIN
    const titleEl = document.getElementById('pinTitle');
    const subEl   = document.getElementById('pinSubtitle');
    if (titleEl && settings.schoolName) titleEl.textContent = settings.schoolName;
    if (subEl   && settings.subtitle)   subEl.textContent   = settings.subtitle;

    // شعارات شاشة PIN
    const pinLogosEl = document.getElementById('pinOrgLogos');
    const pinIconEl  = document.getElementById('pinLogoIcon');
    if (pinLogosEl && logos.length > 0) {
      pinLogosEl.innerHTML = logos.map(l =>
        `<img src="${l.url}" alt="${l.name}" class="pin-org-logo" onerror="this.style.display='none'" />`
      ).join('');
      if (pinIconEl) pinIconEl.style.display = 'none';
    }

    // شعارات الهيدر
    // Cache dateFormat in state so updateTodayBadge can use it without an extra fetch
    if (!state.settings) state.settings = {};
    state.settings.dateFormat      = settings.dateFormat      || dfDefaultFormat();
    state.settings.whatsappApiKey  = settings.whatsappApiKey  || '';
    updateTodayBadge(state.settings.dateFormat);

    const headerLogosEl = document.getElementById('headerLogos');
    if (headerLogosEl && logos.length > 0) {
      headerLogosEl.innerHTML = logos.slice(0,2).map(l =>
        `<img src="${l.url}" alt="${l.name}" class="header-logo" onerror="this.style.display='none'" />`
      ).join('');
      // Set first logo as browser-tab favicon
      _setFavicon(logos[0].url);
    }

    // شعارات السايدبار
    const sidebarLogosEl = document.getElementById('sidebarLogos');
    if (sidebarLogosEl && logos.length > 0) {
      sidebarLogosEl.innerHTML = `<img src="${logos[0].url}" alt="${logos[0].name}" class="sidebar-logo" onerror="this.style.display='none'" />`;
    }
  } catch(e) { console.warn('Logo load error:', e); }
}

async function apiFetch(path, opts={}) {
  try { const r = await fetch(`${API}${path}`, opts); return await r.json(); }
  catch(e) { console.error('API error:', path, e); return null; }
}

// Set browser-tab favicon from a URL (PNG/JPG/SVG/ICO all work)
function _setFavicon(url) {
  try {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url;
    // Also set apple touch icon for iOS home screen
    let apple = document.querySelector("link[rel='apple-touch-icon']");
    if (!apple) {
      apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      document.head.appendChild(apple);
    }
    apple.href = url;
  } catch(e) {}
}

// ══════════════════════════════════════════════════════════
//  التنقل
// ══════════════════════════════════════════════════════════
async function navigate(page) {
  state.currentPage = page; closeSidebar();
  // Hide attendance sticky bar when leaving that page
  if (page !== 'attendance') {
    document.getElementById('attMarkRow')?.classList.add('hidden');
    document.getElementById('attSaveBottom')?.classList.add('hidden');
  }
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  document.getElementById(`page-${page}`)?.classList.remove('hidden');
  const titles = {
    dashboard:'الرئيسية', attendance:'تسجيل الحضور', students:'الطلاب',
    quran:'تقدم القرآن الكريم', whatsapp:'واتساب',
    classes:'الحلقات', teachers:'المعلمون', checkin:'حضور المعلمين',
    holidays:'الإجازات', reports:'التقارير', sync:'مزامنة ونسخ احتياطي', settings:'الإعدادات',
    calendar:'التقويم',
  };
  document.getElementById('headerTitle').textContent = titles[page] || page;
  document.querySelectorAll('.nav-item, .bnav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page));
  await loadAll();
  switch(page) {
    case 'dashboard':  renderDashboard();   break;
    case 'attendance': initAttendance();    break;
    case 'whatsapp':   initWhatsappPage();  break;
    case 'students':   renderStudentList(); break;
    case 'quran':      initQuranPage();     break;
    case 'classes':    renderClassList();   break;
    case 'teachers':   renderTeacherList(); break;
    case 'checkin':    renderCheckinList(); loadTeacherSummary(); break;
    case 'holidays':   renderHolidayList(); break;
    case 'reports':    initReports();       break;
    case 'settings':   initSettings();      break;
    case 'sync':       initSyncPage();      break;
    case 'calendar':   initCalendarPage();  break;
  }
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}

// ══════════════════════════════════════════════════════════
//  NOTIFICATION PANEL
// ══════════════════════════════════════════════════════════

const NOTIF_DISMISS_KEY = 'halaqat_dismissed_notifs'; // localStorage key

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(NOTIF_DISMISS_KEY) || '[]'); }
  catch { return []; }
}
function addDismissed(id) {
  const list = getDismissed();
  if (!list.includes(id)) { list.push(id); localStorage.setItem(NOTIF_DISMISS_KEY, JSON.stringify(list)); }
}
function dismissAllNotifs() {
  const items = document.querySelectorAll('#notifPanelBody .notif-card[data-notif-id]');
  items.forEach(el => addDismissed(el.dataset.notifId));
  renderNotifPanel();
  updateNotifBadge(0);
}

function toggleNotifPanel() {
  const panel   = document.getElementById('notifPanel');
  const overlay = document.getElementById('notifOverlay');
  const isOpen  = !panel.classList.contains('hidden');
  if (isOpen) {
    closeNotifPanel();
  } else {
    panel.classList.remove('hidden');
    overlay.classList.remove('hidden');
    renderNotifPanel();
  }
}
function closeNotifPanel() {
  document.getElementById('notifPanel')?.classList.add('hidden');
  document.getElementById('notifOverlay')?.classList.add('hidden');
}

function updateNotifBadge(count) {
  const badge = document.getElementById('notifBadge');
  const bell  = document.getElementById('notifBellBtn');
  if (!badge || !bell) return;
  if (count > 0) {
    badge.textContent = count > 99 ? '99+' : count;
    badge.classList.remove('hidden');
    bell.classList.add('has-notifs');
  } else {
    badge.classList.add('hidden');
    bell.classList.remove('has-notifs');
  }
}

async function loadNotifData() {
  const today = todayISO();
  const dismissed = getDismissed();

  // 1 — Today's calendar events
  let events = [];
  try {
    const all = await apiFetch('/calendar');
    if (Array.isArray(all)) {
      events = all.filter(ev => {
        if (dismissed.includes('ev_' + ev.id)) return false;
        // Matches today exactly, or today is within a range event
        if (ev.date === today) return true;
        if (ev.endDate && ev.date <= today && ev.endDate >= today) return true;
        return false;
      });
    }
  } catch(e) {}

  return { events, waResult: _lastWaResult };
}

async function refreshNotifBadge() {
  const { events, waResult } = await loadNotifData();
  updateNotifBadge(events.length + (waResult ? 1 : 0));
}

async function renderNotifPanel() {
  const body = document.getElementById('notifPanelBody');
  if (!body) return;
  body.innerHTML = '<div class="notif-loading">⏳ جارٍ التحميل…</div>';

  const { events, waResult } = await loadNotifData();
  const total = events.length + (waResult ? 1 : 0);
  updateNotifBadge(total);

  if (total === 0) {
    body.innerHTML = `
      <div class="notif-empty">
        <div class="notif-empty-icon">🔕</div>
        <div class="notif-empty-text">لا توجد إشعارات اليوم</div>
        <div class="notif-empty-sub">ستظهر هنا أحداث اليوم ورسائل واتساب المُرسَلة</div>
      </div>`;
    return;
  }

  const TYPE_ICON  = { event:'📌', holiday:'🏖️', offday:'📴', reminder:'🔔', message:'📢', default:'📅' };
  const TYPE_LABEL = { event:'حدث', holiday:'إجازة رسمية', offday:'يوم إجازة', reminder:'تذكير', message:'رسالة مجدولة' };

  let html = '';

  // ── WA send result card ──
  if (waResult) {
    const time = waResult.time ? new Date(waResult.time).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'}) : '';
    let icon, title, sub, color;
    if (waResult.error) {
      icon='❌'; title='فشل إرسال رسائل واتساب'; sub=waResult.error; color='var(--error)';
    } else if (waResult.failed === 0) {
      icon='✅'; title=`تم إرسال جميع الرسائل (${waResult.sent})`; sub=`الساعة ${time}`; color='var(--success)';
    } else {
      icon='📬'; title='نتيجة إرسال واتساب';
      sub=`✅ ${waResult.sent} أُرسلت  |  ❌ ${waResult.failed} فشلت`; color='var(--warn)';
    }
    html += `
      <div class="notif-card" style="border-right:3px solid ${color}">
        <div class="notif-card-icon">${icon}</div>
        <div class="notif-card-body">
          <div class="notif-card-title">${title}</div>
          <div class="notif-card-sub">${sub}</div>
        </div>
        <button class="notif-card-dismiss" onclick="_lastWaResult=null;renderNotifPanel()" title="تجاهل">✕</button>
      </div>`;
  }

  // ── Calendar events section ──
  if (events.length > 0) {
    html += `<div class="notif-section-title">📅 أحداث اليوم</div>`;
    events.forEach(ev => {
      const icon  = TYPE_ICON[ev.type] || TYPE_ICON.default;
      const label = TYPE_LABEL[ev.type] || ev.type;
      const range = ev.endDate && ev.endDate !== ev.date
        ? ` — حتى ${ev.endDate}` : '';
      html += `
        <div class="notif-card type-${ev.type}" data-notif-id="ev_${ev.id}">
          <div class="notif-card-icon">${icon}</div>
          <div class="notif-card-body">
            <div class="notif-card-title">${ev.title || label}</div>
            <div class="notif-card-sub">${label}${range}</div>
            ${ev.note ? `<div class="notif-card-time">${ev.note}</div>` : ''}
          </div>
          <button class="notif-card-dismiss" onclick="dismissNotif('ev_${ev.id}')" title="تجاهل">✕</button>
        </div>`;
    });
  }



  body.innerHTML = html;
}

// Single summary notification after sending WA messages
let _lastWaResult = null; // {sent, failed, error, time}

function showWaSummaryNotif(sent, failed, error) {
  _lastWaResult = { sent, failed, error, time: new Date().toISOString() };
  refreshNotifBadge();

  const existing = document.getElementById('waSummaryNotif');
  if (existing) existing.remove();

  const notif = document.createElement('div');
  notif.id = 'waSummaryNotif';
  notif.style.cssText = `
    position:fixed; top:20px; left:50%; transform:translateX(-50%);
    background:#1e293b; color:#fff; border-radius:12px;
    padding:14px 22px; font-size:14px; font-weight:600;
    box-shadow:0 8px 32px rgba(0,0,0,0.25); z-index:9999;
    display:flex; align-items:center; gap:12px; min-width:260px;
    animation: slideDown 0.3s ease;
  `;

  if (error) {
    notif.innerHTML = `<span style="font-size:18px">❌</span><span>${error}</span>`;
    notif.style.background = '#7f1d1d';
  } else if (failed === 0) {
    notif.innerHTML = `<span style="font-size:18px">✅</span><span>تم إرسال جميع الرسائل بنجاح — ${sent} رسالة</span>`;
    notif.style.background = '#14532d';
  } else {
    notif.innerHTML = `
      <span style="font-size:18px">📬</span>
      <span>
        <span style="color:#86efac">✅ ${sent} رسالة أُرسلت</span>
        &nbsp;|&nbsp;
        <span style="color:#fca5a5">❌ ${failed} فشلت</span>
      </span>`;
  }

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px;margin-right:4px;padding:0 0 0 8px;';
  closeBtn.onclick = () => notif.remove();
  notif.appendChild(closeBtn);

  document.body.appendChild(notif);
  setTimeout(() => { if (notif.parentNode) notif.remove(); }, 6000);
}

function dismissNotif(id) {
  addDismissed(id);
  const card = document.querySelector(`[data-notif-id="${id}"]`);
  if (card) {
    card.style.transition = 'opacity 0.2s, transform 0.2s';
    card.style.opacity = '0';
    card.style.transform = 'translateX(20px)';
    setTimeout(() => { card.remove(); renderNotifPanel(); }, 220);
  }
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ══════════════════════════════════════════════════════════
//  الساعة والتاريخ
// ══════════════════════════════════════════════════════════
function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ══════════════════════════════════════════════════════════
//  QR Code — يتجدد عند كل تحميل للصفحة
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
//  QR Code — يُولَّد من جانب العميل (لا يحتاج إلى الخادم)
// ══════════════════════════════════════════════════════════
let _qrNetworkUrl = '';

async function loadPinQR() {
  try {
    const info = await apiFetch('/network-info');
    if (!info?.url) return;
    _qrNetworkUrl = info.url;
    const urlEl = document.getElementById('pinQrUrl');
    if (urlEl) urlEl.textContent = info.url;
    _renderQR('pinQrCanvas', info.url, 120);
  } catch(e) { console.warn('QR load error:', e); }
}

function buildAllQRCodes() {
  if (!_qrNetworkUrl) { loadPinQR(); return; }
  _renderQR('pinQrCanvas',  _qrNetworkUrl, 120);
  _renderQR('dashQrCanvas', _qrNetworkUrl, 180);
  _renderQR('settQrCanvas', _qrNetworkUrl, 150);
  const urlEl = document.getElementById('dashQrUrl');
  if (urlEl) urlEl.textContent = _qrNetworkUrl;
}

function _renderQR(containerId, text, size) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';   // مسح القديم
  if (typeof QRCode === 'undefined') {
    // Fallback نصي إذا لم تُحمَّل المكتبة
    el.innerHTML = `<div style="padding:10px;font-size:11px;color:#666;max-width:140px;word-break:break-all;direction:ltr">${text}</div>`;
    return;
  }
  try {
    new QRCode(el, { text, width: size, height: size, colorDark:'#1e3a5f', colorLight:'#ffffff', correctLevel: QRCode.CorrectLevel.M });
  } catch(e) {
    el.innerHTML = `<div style="padding:8px;font-size:10px;color:#999">${text}</div>`;
  }
}

// Shows Hijri equivalent under any date input
function updateHijriLabel(input, labelId) {
  const el = document.getElementById(labelId);
  if (!el) return;
  if (!input.value) { el.textContent = ''; return; }
  el.textContent = formatHijriFull(input.value);
}

// Initialize a date input with today's date and its Hijri label
function setDateToday(inputId, labelId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.value = todayISO();
  if (labelId) updateHijriLabel(input, labelId);
}

function buildHijriDateString(tokens, sep) {
  const h = toHijri(todayISO());
  const vals = { day: String(h.day), month: HIJRI_MONTHS[h.month], year: String(h.year) };
  return tokens
    .filter(t => t.on)
    .map(t => {
      if (t.key === 'year') return `<bdi>${vals.year}</bdi>هـ`;
      return `<bdi>${vals[t.key] || ''}</bdi>`;
    })
    .join(sep);
}

function updateTodayBadge(fmt) {
  const badge = document.getElementById('todayBadge');
  if (!badge) return;
  const f = fmt || (state.settings && state.settings.dateFormat) || dfDefaultFormat();
  badge.innerHTML = buildHijriDateString(f.tokens, f.sep);
}

function startClock() {
  function tick() {
    const now   = new Date();
    const clock = document.getElementById('liveClock');
    const date  = document.getElementById('liveDate');
    if (clock) {
      const hh = String(now.getHours()).padStart(2,'0');
      const mm = String(now.getMinutes()).padStart(2,'0');
      const ss = String(now.getSeconds()).padStart(2,'0');
      clock.textContent = `${hh}:${mm}:${ss}`;
    }
    if (date) date.textContent = formatHijriFull(now);
  }
  tick(); setInterval(tick, 1000);
}

// ══════════════════════════════════════════════════════════
//  الرئيسية
// ══════════════════════════════════════════════════════════
async function renderDashboard() {
  const stats = await apiFetch('/stats');
  if (!stats) return;
  document.getElementById('stat-students').textContent   = stats.totalStudents;
  document.getElementById('stat-present').textContent    = stats.presentToday;
  document.getElementById('stat-absent').textContent     = stats.absentToday;
  document.getElementById('stat-classes').textContent    = stats.totalClasses;
  document.getElementById('stat-teachers').textContent   = stats.totalTeachers;
  document.getElementById('stat-teachersin').textContent = stats.teachersIn;
  const banner = document.getElementById('dashHolidayBanner');
  if (stats.isHoliday) {
    banner.textContent = `🏖 إجازة اليوم: ${stats.holidayReason}`;
    banner.classList.remove('hidden');
  } else { banner.classList.add('hidden'); }

  // بناء QR في الرئيسية
  if (!_qrNetworkUrl) {
    const info = await apiFetch('/network-info');
    if (info?.url) {
      _qrNetworkUrl = info.url;
      const urlEl = document.getElementById('dashQrUrl');
      if (urlEl) urlEl.textContent = info.url;
    }
  }
  buildAllQRCodes();
}

// ══════════════════════════════════════════════════════════
//  تسجيل الحضور
// ══════════════════════════════════════════════════════════
function initAttendance() {
  setDateToday('attDate', 'attDateHijri');
  const sel = document.getElementById('attClass');
  sel.innerHTML = '<option value="">— اختر الحلقة —</option>';
  state.classes.forEach(cls => {
    const opt = document.createElement('option');
    opt.value = cls.id; opt.textContent = cls.name; sel.appendChild(opt);
  });
  document.getElementById('attStudentList').innerHTML = '';
  document.getElementById('attMarkRow')?.classList.add('hidden');
  document.getElementById('attStickyBar')?.classList.add('hidden');
}

async function loadAttendanceClass() {
  const date    = document.getElementById('attDate').value;
  const classId = document.getElementById('attClass').value;
  if (!classId) return;
  const holiday = await apiFetch(`/holidays/check/${date}`);
  const noteEl  = document.getElementById('attHolidayNote');
  if (holiday?.isHoliday) {
    noteEl.innerHTML = `⚠ هذا اليوم إجازة: <strong>${holiday.reason}</strong> — ${formatHijriFull(date)}`;
    noteEl.classList.remove('hidden');
  } else { noteEl.classList.add('hidden'); }
  await loadAttendanceStudents();
}

async function loadAttendanceStudents() {
  const date    = document.getElementById('attDate').value;
  const classId = document.getElementById('attClass').value;
  if (!classId || !date) return;
  updateHijriLabel(document.getElementById('attDate'), 'attDateHijri');
  const students   = state.students.filter(s => s.classId === classId);
  const attendance = await apiFetch(`/attendance?date=${date}&classId=${classId}`);
  const leaves     = await apiFetch(`/leaves?date=${date}&classId=${classId}`);
  const attMap     = {}; if (attendance) attendance.forEach(a => attMap[a.studentId] = a);
  const leaveMap   = {}; if (leaves)     leaves.forEach(l => leaveMap[l.studentId] = l);
  _currentLeaveMap = leaveMap;  // store for saveAttendance
  const holiday    = await apiFetch(`/holidays/check/${date}`);
  const container  = document.getElementById('attStudentList');
  const markRow    = document.getElementById('attMarkRow');
  container.innerHTML = '';

  // ── Once-a-day lock: check if attendance already saved today for this class ──
  const todayISO_ = todayISO();
  const isToday   = (date === todayISO_);
  const alreadySaved = !_attForceUnlocked && isToday && attendance && attendance.length > 0 &&
    students.every(s => attMap[s.id]);  // every student has a record
  _attAlreadySaved   = alreadySaved;
  _attForceUnlocked  = false; // reset after use

  // Reset leave tracking
  _leaveStudentIds = new Set();
  if (leaves) leaves.forEach(l => {
    // Only block if no override attendance record exists
    if (!attMap[l.studentId]) _leaveStudentIds.add(l.studentId);
  });

  if (students.length === 0) {
    container.innerHTML = '<div class="info-banner">لا يوجد طلاب في هذه الحلقة بعد.</div>';
    markRow?.classList.add('hidden');
    return;
  }



  const leaveTypeLabel = { Sick:'🤒 مرض', Permission:'📋 إذن', Travel:'✈️ سفر', Family:'🚨 طارئ', Other:'📝 أخرى' };

  students.forEach((s, idx) => {
    const rec    = attMap[s.id];
    const leave  = leaveMap[s.id];
    // A student is "leave-locked" if they have a leave and no override record
    const isLeaveLocked = !!leave && !rec;
    const status = holiday?.isHoliday ? 'Holiday' : (rec?.status || (isLeaveLocked ? 'Excused' : ''));
    const div    = document.createElement('div');
    div.id        = `att-row-${s.id}`;

    const firstLetter = s.name.trim().charAt(0);
    const rowNum      = String(idx + 1).padStart(2, '0');

    // Leave badge + cancel button (only if no record yet)
    const leaveBadge = leave
      ? `<span class="leave-badge">${leaveTypeLabel[leave.type]||'إذن'}</span>`
      : '';
    const cancelBtn = leave && !rec
      ? `<button class="att-btn-cancel-leave" onclick="cancelLeave('${leave.id}','${s.id}','${date}','${classId}')" title="إلغاء الإذن">✕</button>`
      : '';

    // Gray out: student has active leave (no override) OR attendance already saved (and not unlocked)
    const leaveClass = isLeaveLocked ? 'att-row-has-leave att-row-leave-locked' : '';
    const savedClass = (alreadySaved && !isLeaveLocked) ? 'att-row-saved' : '';

    div.className = `att-row ${status ? 'status-'+status : ''} ${leaveClass} ${savedClass}`.trim();

    // For leave-locked students: show grayed-out controls with hint
    const leaveLockedControls = isLeaveLocked ? `
      <div class="att-leave-locked-hint">
        <span>${leaveTypeLabel[leave.type]||'إذن'} — ${leave.reason||''}</span>
        <span class="att-leave-hint-txt">غير متاح للتعديل من هنا • عدّل من ملف الطالب</span>
      </div>` : '';

    // For already-saved (but not leave-locked): show status with lock icon
    const savedControls = (alreadySaved && !isLeaveLocked) ? `
      <div class="att-saved-row-hint">
        <span class="badge badge-${status?.toLowerCase()||'default'}">${{Present:'حاضر',Absent:'غائب',Late:'متأخر',Excused:'بعذر',Holiday:'إجازة'}[status]||status}</span>
        <span class="att-leave-hint-txt">مُسجَّل — اضغط "تعديل" أعلاه للتغيير</span>
      </div>` : '';

    div.innerHTML = `
      <div class="att-row-top">
        <div class="att-avatar">${firstLetter}</div>
        <div class="att-info">
          <span class="att-name">${s.name}</span>
          ${leaveBadge}
        </div>
        <span class="att-row-idx">${rowNum}</span>
        ${cancelBtn}
      </div>
      <div class="att-controls">
        ${holiday?.isHoliday
          ? `<div class="att-holiday-bar"><span class="badge badge-holiday">إجازة اليوم</span></div>`
          : isLeaveLocked
            ? leaveLockedControls
            : alreadySaved
              ? savedControls
              : `
                <button class="att-btn att-btn-present ${status==='Present'?'active':''}" onclick="setAttStatus('${s.id}','Present')">
                  <span class="att-btn-icon">✅</span><span>حاضر</span>
                </button>
                <button class="att-btn att-btn-absent ${status==='Absent'?'active':''}" onclick="setAttStatus('${s.id}','Absent')">
                  <span class="att-btn-icon">❌</span><span>غائب</span>
                </button>
                <button class="att-btn att-btn-late ${status==='Late'?'active':''}" onclick="setAttStatus('${s.id}','Late')">
                  <span class="att-btn-icon">⏱</span><span>متأخر</span>
                </button>
                <button class="att-btn att-btn-excused ${status==='Excused'?'active':''}" onclick="setAttStatus('${s.id}','Excused')" title="بعذر (ليس مرضاً أو طارئاً — استخدم إذن مسبق لذلك)">
                  <span class="att-btn-icon">🏥</span><span>بعذر</span>
                </button>
              `
        }
      </div>
      <input type="text" class="att-notes" placeholder="ملاحظات…" ${isLeaveLocked || alreadySaved ? 'disabled' : ''} value="${rec?.notes||(isLeaveLocked?`${leaveTypeLabel[leave.type]||''} — ${leave.reason||''}`:'')||''}" />
    `;
    container.appendChild(div);
  });

  if (!holiday?.isHoliday) {
    markRow?.classList.remove('hidden');
    document.getElementById('attSaveBottom')?.classList.remove('hidden');
    updateAttCounter();
  } else {
    markRow?.classList.add('hidden');
    document.getElementById('attSaveBottom')?.classList.add('hidden');
  }
}

function setAttStatus(studentId, status) {
  const row = document.getElementById(`att-row-${studentId}`);
  if (!row) return;
  // Block if student has an active leave (no override)
  if (_leaveStudentIds.has(studentId)) {
    toast('هذا الطالب لديه إذن غياب — عدّل حالته من ملف الطالب');
    return;
  }
  // Block if attendance already saved and not unlocked
  if (_attAlreadySaved) {
    toast('تم تسجيل الحضور مسبقاً لهذا اليوم');
    return;
  }
  row.className = `att-row status-${status}${row.classList.contains('att-row-has-leave') ? ' att-row-has-leave' : ''}`;
  row.querySelectorAll('.att-btn').forEach(b => b.classList.remove('active'));
  const map = { Present:'att-btn-present', Absent:'att-btn-absent', Late:'att-btn-late', Excused:'att-btn-excused' };
  row.querySelector(`.${map[status]}`)?.classList.add('active');
  updateAttCounter();
}

// Unlock the once-a-day lock so the user can re-edit attendance
function unlockAttendance() {
  _attAlreadySaved = false;
  _attForceUnlocked = true;
  loadAttendanceStudents();
}

function updateAttCounter() {
  const classId = document.getElementById('attClass')?.value;
  if (!classId) return;
  const cnt = { Present: 0, Absent: 0, Late: 0, Excused: 0 };
  state.students.filter(s => s.classId === classId).forEach(s => {
    const row = document.getElementById(`att-row-${s.id}`);
    if (!row) return;
    const sc = [...row.classList].find(c => c.startsWith('status-'));
    const st = sc ? sc.replace('status-', '') : '';
    if (cnt[st] !== undefined) cnt[st]++;
  });
  const el = (id) => document.getElementById(id);
  if (el('attCountPresent')) el('attCountPresent').textContent = cnt.Present;
  if (el('attCountAbsent'))  el('attCountAbsent').textContent  = cnt.Absent;
  if (el('attCountLate'))    el('attCountLate').textContent    = cnt.Late;
  if (el('attCountExcused')) el('attCountExcused').textContent = cnt.Excused;
}

function markAll(status) {
  state.students.filter(s => s.classId === document.getElementById('attClass').value)
    .forEach(s => setAttStatus(s.id, status));
}

// ── State for the saved-modal flow ────────────────────────
let _savedClassId   = '';
let _savedDate      = '';
let _savedAbsent    = [];  // [{id, name, phone, studentId}]
let _waSendingInModal = false;

async function saveAttendance() {
  const date    = document.getElementById('attDate').value;
  const classId = document.getElementById('attClass').value;
  if (!classId || !date) return toast('يرجى اختيار الحلقة والتاريخ');
  const students = state.students.filter(s => s.classId === classId);
  const records  = students.map(s => {
    const row        = document.getElementById(`att-row-${s.id}`);
    if (!row) return null;
    const statusClass = [...row.classList].find(c => c.startsWith('status-'));
    let   status     = statusClass ? statusClass.replace('status-','') : '';
    if (!status) return null; // no status selected — skip this student
    // If student has an active leave with no manual override, force Excused
    if (_currentLeaveMap[s.id] && status === 'Absent') status = 'Excused';
    const notes      = row.querySelector('.att-notes')?.value || '';
    return { studentId: s.id, status, notes };
  }).filter(Boolean);

  await apiFetch('/attendance/batch', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ date, classId, records }),
  });

  // ── حساب الملخص ──────────────────────────────────────
  const cnt = { Present:0, Absent:0, Late:0, Excused:0, Holiday:0 };
  records.forEach(r => { if (cnt[r.status] !== undefined) cnt[r.status]++; });
  const cls       = state.classes.find(c => c.id === classId);
  const dateHijri = formatHijriFull(date);

  // ── حفظ الحالة للنافذة ───────────────────────────────
  _savedClassId = classId;
  _savedDate    = date;
  _waSendingInModal = false;

  // ── الغائبون ─────────────────────────────────────────
  _savedAbsent = records
    .filter(r => r.status === 'Absent')
    .map(r => {
      const s = students.find(x => x.id === r.studentId);
      return s ? { id: s.id, name: s.name, phone: s.parentPhone || '', studentId: r.studentId } : null;
    }).filter(Boolean);

  // ── الحلقة التالية ───────────────────────────────────
  const classIds  = state.classes.map(c => c.id);
  const curIdx    = classIds.indexOf(classId);
  const nextClass = curIdx >= 0 && curIdx < classIds.length - 1
    ? state.classes[curIdx + 1] : null;

  // ── تعبئة النافذة ────────────────────────────────────
  document.getElementById('attSavedDate').textContent     = dateHijri;
  document.getElementById('attSavedClass').textContent    = cls?.name || '—';
  document.getElementById('attSavedPresent').textContent  = cnt.Present;
  document.getElementById('attSavedAbsent').textContent   = cnt.Absent;
  document.getElementById('attSavedLate').textContent     = cnt.Late;
  document.getElementById('attSavedExcused').textContent  = cnt.Excused;
  document.getElementById('attSavedTotal').textContent    = records.length;

  // بادج الحلقة التالية
  const nextBadge = document.getElementById('attSavedNextBadge');
  if (nextClass) {
    nextBadge.textContent = `التالية: ${nextClass.name}`;
    nextBadge.classList.remove('hidden');
  } else {
    nextBadge.classList.add('hidden');
  }

  // ── قسم واتساب ───────────────────────────────────────
  const waSection = document.getElementById('attSavedWaSection');
  if (_savedAbsent.length > 0) {
    waSection.classList.remove('hidden');
    _renderModalWaList();
  } else {
    waSection.classList.add('hidden');
  }
  document.getElementById('attSavedWaSendStatus')?.classList.add('hidden');

  // ── أزرار الإجراءات ──────────────────────────────────
  _renderSavedModalActions(nextClass);

  // إظهار النافذة
  document.getElementById('attSavedModal').classList.remove('hidden');

  // إخفاء لوحة واتساب القديمة تحت القائمة
  document.getElementById('waNotifyPanel')?.classList.add('hidden');
}

function _renderModalWaList() {
  const list = document.getElementById('attSavedWaList');
  if (!list) return;
  list.innerHTML = _savedAbsent.map((s, i) => `
    <div class="att-wa-row" id="att-wa-row-${i}">
      <div class="att-wa-name">${s.name}</div>
      <div class="att-wa-phone">
        ${s.phone
          ? `<span class="att-wa-num">${s.phone}</span>`
          : `<input type="tel" class="att-wa-input" placeholder="رقم الهاتف" data-widx="${i}" />`}
      </div>
      <div class="att-wa-status" id="att-wa-status-${i}">
        ${s.phone ? '⏳' : '⚠️'}
      </div>
    </div>
  `).join('');
}

function _renderSavedModalActions(nextClass) {
  const container = document.getElementById('attSavedActions');
  if (!container) return;
  const hasAbsent = _savedAbsent.length > 0;
  const hasNext   = !!nextClass;
  const nextName  = nextClass?.name || '';

  let html = `<div class="att-saved-actions-grid">`;

  // Always: close + home
  html += `<button class="att-action-btn att-action-close" onclick="closeModal('attSavedModal')">
    <span class="att-action-icon">✕</span>
    <span class="att-action-label">إغلاق</span>
  </button>`;

  html += `<button class="att-action-btn att-action-home" onclick="closeModal('attSavedModal');navigate('dashboard')">
    <span class="att-action-icon">🏠</span>
    <span class="att-action-label">الرئيسية</span>
  </button>`;

  // Next class button
  if (hasNext) {
    html += `<button class="att-action-btn att-action-next" onclick="goToNextClass()">
      <span class="att-action-icon">⏭</span>
      <span class="att-action-label">الحلقة التالية</span>
      <span class="att-action-sub">${nextName}</span>
    </button>`;
  }

  // WhatsApp button — always show if there are absent students
  if (hasAbsent) {
    if (hasNext) {
      html += `<button class="att-action-btn att-action-wa-next" id="attWaNextBtn" onclick="sendWaThenNextClass()">
        <span class="att-action-icon">💬</span>
        <span class="att-action-label">واتساب + التالية</span>
        <span class="att-action-sub">إرسال ثم ${nextName}</span>
      </button>`;
    } else {
      html += `<button class="att-action-btn att-action-wa-next" id="attWaNextBtn" onclick="sendWaFromModal()">
        <span class="att-action-icon">💬</span>
        <span class="att-action-label">إرسال واتساب</span>
        <span class="att-action-sub">إشعار أولياء ${_savedAbsent.length} غائب</span>
      </button>`;
    }
  }

  html += `</div>`;
  container.innerHTML = html;
}

function goToNextClass() {
  const classIds = state.classes.map(c => c.id);
  const curIdx   = classIds.indexOf(_savedClassId);
  if (curIdx < 0 || curIdx >= classIds.length - 1) return;
  const nextId = classIds[curIdx + 1];
  closeModal('attSavedModal');
  // تبديل الحلقة في قائمة الحضور
  const sel = document.getElementById('attClass');
  if (sel) { sel.value = nextId; loadAttendanceClass(); }
  // التأكد أن صفحة الحضور مفتوحة
  if (document.getElementById('page-attendance').classList.contains('hidden')) {
    navigate('attendance');
  }
  // تمرير للأعلى
  document.querySelector('.page-container')?.scrollTo({ top: 0, behavior: 'smooth' });
  toast(`✅ الحلقة التالية: ${state.classes[curIdx + 1]?.name}`);
}

async function sendWaThenNextClass() {
  if (_waSendingInModal) return;
  _waSendingInModal = true;
  const btn    = document.getElementById('attWaNextBtn');
  const status = document.getElementById('attSavedWaSendStatus');
  if (btn)    { btn.disabled = true; btn.querySelector('.att-action-label').textContent = '⏳ جارٍ الإرسال…'; }
  if (status) { status.textContent = '⏳ جارٍ إرسال إشعارات الغياب…'; status.classList.remove('hidden'); }

  await _doSendWaFromModal();

  // بعد الإرسال — انتقل للحلقة التالية
  setTimeout(() => { goToNextClass(); _waSendingInModal = false; }, 900);
}

async function sendWaFromModal() {
  if (_waSendingInModal) return;
  _waSendingInModal = true;
  const btn    = document.getElementById('attWaNextBtn');
  const status = document.getElementById('attSavedWaSendStatus');
  if (btn)    { btn.disabled = true; btn.querySelector('.att-action-label').textContent = '⏳ جارٍ الإرسال…'; }
  if (status) { status.textContent = '⏳ جارٍ إرسال إشعارات الغياب…'; status.classList.remove('hidden'); }

  const result = await _doSendWaFromModal();
  if (btn) btn.disabled = false;
  _waSendingInModal = false;
}

async function _doSendWaFromModal() {
  const cls     = state.classes.find(c => c.id === _savedClassId);
  const records = _savedAbsent.map((s, i) => ({
    studentId: s.id,
    name:      s.name,
    phone:     s.phone || document.querySelector(`[data-widx="${i}"]`)?.value?.trim() || '',
  }));

  // تحديث حالة كل صف
  records.forEach((_, i) => {
    const el = document.getElementById(`att-wa-status-${i}`);
    if (el) el.textContent = '⏳';
  });

  const res = await apiFetch('/whatsapp/send-bulk', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records, date: _savedDate, classId: _savedClassId }),
  });

  const status = document.getElementById('attSavedWaSendStatus');
  if (res?.results) {
    res.results.forEach((r, i) => {
      const el = document.getElementById(`att-wa-status-${i}`);
      if (el) el.textContent = r.ok ? '✅' : '❌';
    });
    const msg = res.failed === 0
      ? `✅ تم إرسال جميع الرسائل بنجاح (${res.sent})`
      : `📬 الإرسال: ✅ ${res.sent} نجح | ❌ ${res.failed} فشل`;
    if (status) { status.textContent = msg; status.classList.remove('hidden'); }
    showWaSummaryNotif(res.sent, res.failed);
  } else if (res?.error) {
    if (status) { status.textContent = `❌ ${res.error}`; status.classList.remove('hidden'); }
    showWaSummaryNotif(0, 0, res.error);
  }
  return res;
}



// ══════════════════════════════════════════════════════════
//  واتساب — إشعارات الغياب
// ══════════════════════════════════════════════════════════
let _waAbsent = [], _waDate = '', _waClassId = '';

function renderWhatsAppPanel(absentStudents, date, classId) {
  _waAbsent  = absentStudents;
  _waDate    = date;
  _waClassId = classId;
  const panel = document.getElementById('waNotifyPanel');
  const list  = document.getElementById('waAbsentList');
  if (!panel || !list) return;

  list.innerHTML = absentStudents.map((s, i) => `
    <div class="wa-absent-row" id="wa-row-${i}">
      <div class="wa-absent-name">${s.name}</div>
      <div class="wa-absent-phone">
        ${s.phone
          ? `<span class="wa-phone-num">${s.phone}</span>`
          : `<input type="tel" class="wa-phone-input" placeholder="أدخل رقم الهاتف" data-idx="${i}" value="" />`
        }
      </div>
      <div class="wa-absent-status" id="wa-status-${i}">
        ${s.phone ? '⏳ في الانتظار' : '⚠️ لا يوجد رقم'}
      </div>
    </div>
  `).join('');

  document.getElementById('waSendStatus').textContent = '';
  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function sendWhatsAppSingle(idx) {
  const s      = _waAbsent[idx];
  const phone  = s.phone || document.querySelector(`[data-idx="${idx}"]`)?.value?.trim();
  const status = document.getElementById(`wa-status-${idx}`);
  if (!phone) { if (status) status.textContent = '❌ أدخل الرقم أولاً'; return; }
  if (status) status.textContent = '⏳ جارٍ الإرسال…';
  const cls  = state.classes.find(c => c.id === _waClassId);
  const res  = await apiFetch('/whatsapp/send', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ phone, studentName: s.name, className: cls?.name||'', date: _waDate }),
  });
  if (status) status.textContent = res?.ok ? '✅ تم الإرسال' : `❌ ${res?.error||'فشل'}`;
}

async function sendWhatsAppBulk() {
  const btn    = document.getElementById('waSendAllBtn');
  const status = document.getElementById('waSendStatus');
  if (btn) btn.disabled = true;

  // تجميع الأرقام (بما فيها المدخلة يدوياً)
  const records = _waAbsent.map((s, i) => ({
    studentId: s.id,
    name:      s.name,
    phone:     s.phone || document.querySelector(`[data-idx="${i}"]`)?.value?.trim() || '',
  }));

  // تحديث حالة كل صف
  records.forEach((_, i) => {
    const el = document.getElementById(`wa-status-${i}`);
    if (el) el.textContent = '⏳ جارٍ…';
  });

  if (status) status.textContent = '⏳ جارٍ الإرسال — قد يستغرق بضع ثوانٍ…';

  const res = await apiFetch('/whatsapp/send-bulk', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ records, date: _waDate, classId: _waClassId }),
  });

  if (res?.results) {
    res.results.forEach((r, i) => {
      const el = document.getElementById(`wa-status-${i}`);
      if (el) el.textContent = r.ok ? '✅ تم الإرسال' : `❌ ${r.error||'فشل'}`;
    });
    if (status) status.textContent = res.failed === 0
      ? `✅ تم إرسال جميع الرسائل (${res.sent})`
      : `📬 ✅ ${res.sent} نجح | ❌ ${res.failed} فشل`;
    showWaSummaryNotif(res.sent, res.failed);
  } else if (res?.error) {
    if (status) { status.textContent = `❌ ${res.error}`; status.style.color = 'var(--error)'; }
    showWaSummaryNotif(0, 0, res.error);
  }
  if (btn) btn.disabled = false;
}

// ══════════════════════════════════════════════════════════
//  إعدادات واتساب
// ══════════════════════════════════════════════════════════
async function initSettings() {
  const s = await apiFetch('/settings');
  if (!s) return;
  document.getElementById('settSchoolName').value  = s.schoolName  || '';
  document.getElementById('settSubtitle').value    = s.subtitle    || '';
  document.getElementById('settWaApiKey').value    = s.whatsappApiKey    || '';
  document.getElementById('settWaTemplate').value  = s.whatsappTemplate  || '';
  const adminPhoneEl = document.getElementById('settAdminPhone');
  if (adminPhoneEl) adminPhoneEl.value = s.adminPhone || '';
  document.getElementById('networkInfo').textContent = `${window.location.origin}\nشارك هذا العنوان مع المشرفين على نفس شبكة WiFi`;
  renderLogoList(s.logos || []);
  updateBrandPreview(s);
  setupLogoDragDrop();
  if (!_qrNetworkUrl) { loadPinQR().then(buildAllQRCodes); } else { buildAllQRCodes(); }
  // Populate date format builder
  const fmt = s.dateFormat || dfDefaultFormat();
  if (!state.settings) state.settings = {};
  state.settings.dateFormat = fmt;
  dfRenderTokens(fmt);
  dfSetActiveSep(fmt.sep || ' ');
  dfUpdatePreview();
}

// ══════════════════════════════════════════════════════════════════
//  النسخ الاحتياطي والاستعادة والإعادة
// ══════════════════════════════════════════════════════════════════

// ── Download full backup ──────────────────────────────────────────
async function backupDownload() {
  const status = document.getElementById('backupStatus');
  status.textContent = '⏳ جارٍ التحضير…'; status.style.color = 'var(--text2)';
  try {
    const res = await fetch('/api/sync/export');
    if (!res.ok) throw new Error('فشل التنزيل');
    const blob = await res.blob();
    const date = new Date().toLocaleDateString('ar-SA-u-nu-latn').replace(/\//g,'-');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup-${date}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    status.textContent = '✅ تم تنزيل النسخة الاحتياطية'; status.style.color = 'var(--success)';
    setTimeout(() => status.textContent = '', 4000);
  } catch(e) {
    status.textContent = `❌ ${e.message}`; status.style.color = 'var(--error)';
  }
}

// ── Restore from file ─────────────────────────────────────────────
let _restoreData = null;
function backupRestoreSelected() {
  const file = document.getElementById('restoreFile').files[0];
  if (!file) return;
  document.getElementById('restoreFileName').textContent = file.name;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      _restoreData = JSON.parse(e.target.result);
      document.getElementById('restoreConfirmBtn').classList.remove('hidden');
      document.getElementById('restoreStatus').textContent = `✅ الملف صالح — اضغط "استعادة الآن" للمتابعة`;
      document.getElementById('restoreStatus').style.color = 'var(--success)';
    } catch {
      _restoreData = null;
      document.getElementById('restoreConfirmBtn').classList.add('hidden');
      document.getElementById('restoreStatus').textContent = '❌ الملف غير صالح — تأكد أنه ملف JSON صحيح';
      document.getElementById('restoreStatus').style.color = 'var(--error)';
    }
  };
  reader.readAsText(file);
}

async function backupRestore() {
  if (!_restoreData) return;
  if (!confirm('سيتم دمج البيانات من الملف مع البيانات الحالية.\n\nهل تريد المتابعة؟')) return;
  const status = document.getElementById('restoreStatus');
  status.textContent = '⏳ جارٍ الاستعادة…'; status.style.color = 'var(--text2)';
  const res = await apiFetch('/sync/import', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify(_restoreData),
  });
  if (res?.ok) {
    status.textContent = `✅ تمت الاستعادة — تم دمج ${res.merged} سجل جديد`;
    status.style.color = 'var(--success)';
    _restoreData = null;
    document.getElementById('restoreConfirmBtn').classList.add('hidden');
    document.getElementById('restoreFile').value = '';
    document.getElementById('restoreFileName').textContent = 'لم يُختر ملف';
    await loadAll();
  } else {
    status.textContent = `❌ فشلت الاستعادة: ${res?.error || 'خطأ غير معروف'}`;
    status.style.color = 'var(--error)';
  }
}

// ── Selective reset ───────────────────────────────────────────────
function backupToggleResetAll(checkbox) {
  const all = checkbox.checked;
  ['resetAttendance','resetTeacherLog','resetCalendar','resetWaLog','resetQuran'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.checked = all;
  });
}

async function backupResetSelected() {
  const targets = {
    attendance:  document.getElementById('resetAttendance')?.checked,
    teacherLog:  document.getElementById('resetTeacherLog')?.checked,
    calendar:    document.getElementById('resetCalendar')?.checked,
    waLog:       document.getElementById('resetWaLog')?.checked,
    quran:       document.getElementById('resetQuran')?.checked,
    everything:  document.getElementById('resetEverything')?.checked,
  };

  const selected = Object.entries(targets).filter(([,v]) => v).map(([k]) => k);
  if (!selected.length) { toast('⚠️ لم تختر أي شيء لإعادة تعيينه'); return; }

  const labels = {
    attendance: 'سجلات الحضور', teacherLog: 'حضور المعلمين',
    calendar: 'التقويم', waLog: 'سجل واتساب', quran: 'تقدم القرآن',
    everything: 'كل البيانات (بما فيها الطلاب والحلقات)',
  };
  const labelList = selected.map(k => `• ${labels[k]}`).join('\n');
  if (!confirm(`سيتم حذف البيانات التالية نهائياً:\n\n${labelList}\n\nهذه العملية لا يمكن التراجع عنها. هل أنت متأكد؟`)) return;
  if (targets.everything && !confirm('تأكيد أخير: سيتم حذف كل البيانات تماماً. هل تريد المتابعة؟')) return;

  const status = document.getElementById('resetStatus');
  status.textContent = '⏳ جارٍ إعادة التعيين…'; status.style.color = 'var(--text2)';

  const res = await apiFetch('/settings/reset', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify(targets),
  });

  if (res?.ok) {
    const cleared = res.cleared.map(k => labels[k]).join('، ');
    status.textContent = `✅ تمت إعادة التعيين: ${cleared}`;
    status.style.color = 'var(--success)';
    // Uncheck all
    ['resetAttendance','resetTeacherLog','resetCalendar','resetWaLog','resetQuran','resetEverything']
      .forEach(id => { const el=document.getElementById(id); if(el) el.checked=false; });
    await loadAll();
    toast('✅ تمت إعادة التعيين بنجاح');
  } else {
    status.textContent = `❌ فشل: ${res?.error || 'خطأ غير معروف'}`;
    status.style.color = 'var(--error)';
  }
}

async function saveWhatsAppSettings() {
  const whatsappApiKey   = document.getElementById('settWaApiKey').value.trim();
  const whatsappTemplate = document.getElementById('settWaTemplate').value.trim();
  const adminPhone       = (document.getElementById('settAdminPhone')?.value||'').trim();
  await apiFetch('/settings', {
    method:'PUT', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ whatsappApiKey, whatsappTemplate, adminPhone }),
  });
  const el = document.getElementById('waSettStatus');
  el.style.color = 'var(--success)';
  el.textContent = '✅ تم حفظ إعدادات واتساب!';
  setTimeout(() => el.textContent = '', 3000);
}

async function testWhatsApp() {
  const token  = document.getElementById('settWaApiKey').value.trim();
  const phone  = document.getElementById('settAdminPhone')?.value?.trim();
  const status = document.getElementById('waTestStatus');
  if (!token) { status.style.color='var(--error)'; status.textContent='أدخل Fonnte Token أولاً'; return; }
  if (!phone) { status.style.color='var(--error)'; status.textContent='أدخل رقم هاتف المدير للاختبار'; return; }
  // حفظ أولاً
  await apiFetch('/settings', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ whatsappApiKey: token, adminPhone: phone }) });
  status.style.color='var(--text2)'; status.textContent='⏳ جارٍ الإرسال…';
  const res = await apiFetch('/whatsapp/send', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ studentName:'اختبار', className:'حلقة الاختبار', date: todayISO() }),
  });
  if (res?.ok) {
    status.style.color='var(--success)'; status.textContent='✅ تم الإرسال! تحقق من واتساب';
  } else {
    status.style.color='var(--error)'; status.textContent=`❌ ${res?.error||'فشل — تأكد من صحة Token ورقم الهاتف'}`;
  }
}

// ══════════════════════════════════════════════════════════
//  استيراد الطلاب من Excel
// ══════════════════════════════════════════════════════════
let _importData = { headers:[], rows:[], mapping:{}, defaultClass:'' };

const FIELD_ALIASES = {
  name:        ['اسم الطالب','الاسم','الاسم الكامل','name','student name','student_name'],
  studentId:   ['رقم الطالب','الرقم','رقم','studentid','id','student id','رقم المتدرب'],
  parentPhone: ['هاتف ولي الأمر','هاتف','الهاتف','جوال','parentphone','phone','parent phone','رقم الجوال'],
  birthday:    ['تاريخ الميلاد','الميلاد','birthday','birth date','birthdate'],
};

function autoDetectMapping(headers) {
  const mapping = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const match = headers.find(h =>
      aliases.some(a => h.trim().toLowerCase() === a.toLowerCase())
    );
    if (match) mapping[field] = match;
  }
  return mapping;
}

function openBulkImportModal() {
  resetImport();
  // populate default class dropdown
  const sel = document.getElementById('importDefaultClass');
  if (sel) {
    sel.innerHTML = '<option value="">— لا تُعيَّن حلقة —</option>';
    state.classes.forEach(c => {
      const o = document.createElement('option'); o.value=c.id; o.textContent=c.name; sel.appendChild(o);
    });
  }
  setupImportDragDrop();
  document.getElementById('bulkImportModal').classList.remove('hidden');
}

function closeBulkImport() {
  document.getElementById('bulkImportModal').classList.add('hidden');
  resetImport();
}

function resetImport() {
  _importData = { headers:[], rows:[], mapping:{}, defaultClass:'' };
  document.getElementById('importStep1').classList.remove('hidden');
  document.getElementById('importStep2').classList.add('hidden');
  document.getElementById('importStep3').classList.add('hidden');
  document.getElementById('importConfirmBtn').classList.add('hidden');
  // Clone the file input to clear its value AND allow re-selecting the same file
  const inp = document.getElementById('importExcelFile');
  if (inp) {
    const fresh = inp.cloneNode(true);
    fresh.value = '';
    inp.parentNode.replaceChild(fresh, inp);
    fresh.addEventListener('change', handleImportFile);
  }
}

function setupImportDragDrop() {
  const zone = document.getElementById('importDropZone');
  if (!zone || zone._dd) return;
  zone._dd = true;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) processImportFile(file);
  });
}

async function handleImportFile() {
  const file = document.getElementById('importExcelFile').files[0];
  if (file) processImportFile(file);
}

async function processImportFile(file) {
  const info = document.getElementById('importFileInfo');
  if (info) info.textContent = `📄 ${file.name} (${(file.size/1024).toFixed(0)} KB) — جارٍ التحليل…`;
  document.getElementById('importStep1').classList.add('hidden');
  document.getElementById('importStep2').classList.remove('hidden');

  let data;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API}/students/import-preview`, { method:'POST', body:fd });
    if (!res.ok) throw new Error(`خطأ في الخادم (${res.status})`);
    data = await res.json();
  } catch(e) {
    toast('❌ ' + (e.message || 'تعذر الاتصال بالخادم'));
    resetImport(); return;
  }

  if (!data.ok) {
    toast('❌ ' + (data.error || 'فشل قراءة الملف'));
    resetImport(); return;
  }

  _importData.headers = data.headers;
  _importData.rows    = data.rows;
  _importData.mapping = autoDetectMapping(data.headers);

  if (info) info.textContent = `📄 ${file.name} — ${data.total} صف تم قراءتها`;
  renderMappingGrid();
  renderImportPreview();
  document.getElementById('importConfirmBtn').classList.remove('hidden');

  const note = document.getElementById('importMappingNote');
  if (!_importData.mapping.name) {
    if (note) note.textContent = '⚠️ لم يتم التعرف على عمود الاسم تلقائياً — يرجى تحديده يدوياً.';
  } else {
    if (note) note.textContent = '';
  }
}

function renderMappingGrid() {
  const grid = document.getElementById('importMappingGrid');
  if (!grid) return;
  const fieldLabels = { name:'اسم الطالب *', studentId:'رقم الطالب', parentPhone:'هاتف ولي الأمر', birthday:'تاريخ الميلاد' };
  grid.innerHTML = Object.entries(fieldLabels).map(([field, label]) => `
    <div class="import-map-row">
      <div class="import-map-field">${label}</div>
      <div class="import-map-arrow">←</div>
      <select class="import-map-select" data-field="${field}" onchange="updateMapping(this)">
        <option value="">— غير محدد —</option>
        ${_importData.headers.map(h =>
          `<option value="${h}" ${_importData.mapping[field]===h?'selected':''}>${h}</option>`
        ).join('')}
      </select>
    </div>
  `).join('');
}

function updateMapping(sel) {
  _importData.mapping[sel.dataset.field] = sel.value || undefined;
  renderImportPreview();
}

function renderImportPreview() {
  const tbl = document.getElementById('importPreviewTable');
  if (!tbl || _importData.rows.length === 0) return;
  const m     = _importData.mapping;
  const preview = _importData.rows.slice(0, 5);
  tbl.innerHTML = `
    <thead><tr>
      <th>الاسم</th><th>الرقم</th><th>هاتف ولي الأمر</th><th>تاريخ الميلاد</th>
    </tr></thead>
    <tbody>${preview.map(row => `<tr>
      <td>${m.name ? (row[m.name]||'—') : '<span style="color:var(--error)">غير محدد</span>'}</td>
      <td>${m.studentId ? (row[m.studentId]||'—') : '—'}</td>
      <td>${m.parentPhone ? (row[m.parentPhone]||'—') : '—'}</td>
      <td>${m.birthday ? (row[m.birthday]||'—') : '—'}</td>
    </tr>`).join('')}</tbody>
  `;
}

async function confirmBulkImport() {
  const m = _importData.mapping;
  if (!m.name) return toast('يرجى تحديد عمود اسم الطالب');
  const classId = document.getElementById('importDefaultClass')?.value || '';

  const students = _importData.rows.map(row => ({
    name:        m.name        ? row[m.name]        : '',
    studentId:   m.studentId   ? row[m.studentId]   : '',
    parentPhone: m.parentPhone ? row[m.parentPhone] : '',
    birthday:    m.birthday    ? row[m.birthday]    : '',
    classId,
  })).filter(s => s.name?.trim());

  if (students.length === 0) return toast('لا توجد بيانات صالحة للاستيراد');

  const btn = document.getElementById('importConfirmBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ جارٍ الاستيراد…'; }

  const res = await apiFetch('/students/import-confirm', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ students, classId }),
  });

  document.getElementById('importStep2').classList.add('hidden');
  document.getElementById('importStep3').classList.remove('hidden');

  const result = document.getElementById('importResult');
  if (res?.ok) {
    result.innerHTML = `
      <div class="import-success">
        <div class="import-success-icon">✅</div>
        <div class="import-success-title">تم الاستيراد بنجاح!</div>
        <div class="import-success-stats">
          <span class="import-stat green">تمت إضافة: <strong>${res.added}</strong> طالب</span>
          ${res.skipped > 0 ? `<span class="import-stat gray">تخطّى (مكرر أو فارغ): <strong>${res.skipped}</strong></span>` : ''}
        </div>
      </div>`;
    await loadAll(); renderStudentList();
    toast(`✅ تم استيراد ${res.added} طالب`);
  } else {
    result.innerHTML = `<div class="import-error">❌ فشل الاستيراد: ${res?.error||'خطأ غير معروف'}</div>`;
  }

  const footer = document.getElementById('importFooter');
  if (footer) footer.innerHTML = `<button class="btn-primary" onclick="closeBulkImport()">إغلاق</button>`;
}

// ══════════════════════════════════════════════════════════
//  الطلاب
// ══════════════════════════════════════════════════════════
function renderStudentList() {
  const search  = document.getElementById('studentSearch')?.value?.toLowerCase() || '';
  const classId = document.getElementById('studentClassFilter')?.value || '';
  const filter  = document.getElementById('studentClassFilter');
  if (filter) {
    const cur = filter.value;
    filter.innerHTML = '<option value="">كل الحلقات</option>';
    state.classes.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id; opt.textContent = c.name;
      if (c.id === cur) opt.selected = true;
      filter.appendChild(opt);
    });
  }
  let students = state.students;
  if (search)  students = students.filter(s => s.name.toLowerCase().includes(search) || (s.studentId||'').toLowerCase().includes(search));
  if (classId) students = students.filter(s => s.classId === classId);
  const list = document.getElementById('studentList');
  list.innerHTML = '';
  if (students.length === 0) {
    list.innerHTML = '<div class="info-banner">لا يوجد طلاب. أضف طالبًا بالضغط على زر +</div>'; return;
  }
  students.forEach(s => {
    const cls  = state.classes.find(c => c.id === s.classId);
    const card = document.createElement('div');
    const inBulk = _studentBulkMode;
    card.className = 'list-card' + (inBulk ? ' list-card-selectable' : '');
    card.dataset.studentId = s.id;
    if (inBulk) {
      const checked = _studentBulkSelected.has(s.id);
      card.classList.toggle('list-card-selected', checked);
      card.innerHTML = `
        <div class="bulk-checkbox">${checked ? '☑' : '☐'}</div>
        <div class="list-card-avatar">${s.photo?`<img src="${s.photo}" alt="${s.name}" onerror="this.style.display='none'" />`:'👤'}</div>
        <div class="list-card-body" style="cursor:default">
          <div class="list-card-name">${s.name}</div>
          <div class="list-card-sub">${s.studentId||'—'} · ${cls?.name||'بدون حلقة'}</div>
        </div>`;
      card.onclick = () => studentBulkToggle(s.id);
    } else {
      card.innerHTML = `
        <div class="list-card-avatar">${s.photo?`<img src="${s.photo}" alt="${s.name}" onerror="this.style.display='none'" />`:'👤'}</div>
        <div class="list-card-body" onclick="viewStudent('${s.id}')">
          <div class="list-card-name">${s.name}</div>
          <div class="list-card-sub">${s.studentId||'—'} · ${cls?.name||'بدون حلقة'}</div>
        </div>
        <div class="list-card-actions">
          <button class="btn-icon" onclick="openStudentModal('${s.id}')">✏️</button>
          <button class="btn-icon" onclick="deleteStudent('${s.id}')">🗑</button>
        </div>`;
    }
    list.appendChild(card);
  });
}

// ── Build the "change today's attendance" HTML for the profile ──
// Uses data attributes + delegated listener to avoid innerHTML onclick escaping issues
function _buildAttChangeSectionHTML(studentId, classId, history) {
  const todayRec  = history.find(h => h.date === todayISO());
  const curStatus = todayRec ? todayRec.status : null;
  const statusMap = { Present:'حاضر', Absent:'غائب', Late:'متأخر', Excused:'بعذر', Holiday:'إجازة' };
  const bc        = st => ({ Present:'present', Absent:'absent', Late:'late', Excused:'excused', Holiday:'holiday' }[st]||'default');

  const statusBadge = curStatus
    ? '<span class="badge badge-' + bc(curStatus) + '">' + (statusMap[curStatus]||curStatus) + '</span>'
    : '<span style="color:var(--text2);font-size:13px">لم يُسجَّل اليوم</span>';

  // Use data attributes — no escaping nightmares
  const mkBtn = (st, icon, label) => {
    const active = curStatus === st ? ' active' : '';
    return '<button class="sp-att-btn sp-att-' + st.toLowerCase() + active + '" '
         + 'data-student-id="' + studentId + '" data-class-id="' + classId + '" data-status="' + st + '">'
         + icon + ' ' + label + '</button>';
  };

  return '<div class="sp-att-today-status"><span>حالة اليوم: </span>' + statusBadge + '</div>'
       + '<div class="sp-att-change-btns">'
       + mkBtn('Present', '✅', 'حاضر')
       + mkBtn('Late',    '⏱', 'متأخر')
       + mkBtn('Absent',  '❌', 'غائب')
       + mkBtn('Excused', '🏥', 'بعذر')
       + '</div>'
       + '<div id="spAttChangeResult_' + studentId + '" class="sp-qa-result hidden"></div>';
}

// Delegated click handler — set once after modal opens
function _initAttChangeDelegation(studentId) {
  const box = document.getElementById('spAttChangeBox_' + studentId);
  if (!box) return;
  box.addEventListener('click', async function(e) {
    const btn = e.target.closest('.sp-att-btn[data-status]');
    if (!btn) return;
    const sid     = btn.dataset.studentId;
    const cid     = btn.dataset.classId;
    const status  = btn.dataset.status;
    await changeStudentAttStatus(sid, cid, status);
  });
}

async function viewStudent(id) {
  const s = await apiFetch(`/students/${id}`);
  if (!s) return;
  const cls     = state.classes.find(c => c.id === s.classId);
  const history = (s.history||[]).slice(0,30);
  const qpList  = await apiFetch(`/quran-progress?studentId=${id}`);
  const translateStatus = st => ({ Present:'حاضر', Absent:'غائب', Late:'متأخر', Excused:'بعذر', Holiday:'إجازة' }[st]||st);
  const badgeClass      = st => ({ Present:'present', Absent:'absent', Late:'late', Excused:'excused', Holiday:'holiday' }[st]||'default');

  const latestQP = qpList && qpList.length ? qpList[0] : null;
  const qpProgress = latestQP ? formatQPPosition(latestQP) : 'لم يُسجَّل بعد';

  // attendance stats
  const leaves     = s.leaves || [];
  const exitPerms  = leaves.filter(l => l.type === 'Permission');
  const exitCount  = exitPerms.length;
  const notices    = s.notices || [];
  const pledgeCnt  = notices.filter(n => n.type === 'تعهد').length;
  const warnCnt    = notices.filter(n => n.type === 'إنذار').length;
  const totalRecs  = history.length;
  const presentCnt = history.filter(h=>h.status==='Present').length;
  const absentCnt  = history.filter(h=>h.status==='Absent').length;
  const lateCnt    = history.filter(h=>h.status==='Late').length;
  const excusedCnt = history.filter(h=>h.status==='Excused').length;
  const attendRate = totalRecs ? Math.round((presentCnt + excusedCnt) / totalRecs * 100) : '—';

  // today's attendance record (if any)
  const todayRec = history.find(h => h.date === todayISO()) || null;
  const todayStatusLabel = {
    Present: '✅ حاضر', Absent: '❌ غائب', Late: '⏱ متأخر', Excused: '🏥 بعذر', Holiday: '🏖️ إجازة'
  };
  const todayStatusColor = {
    Present:'#16a34a', Absent:'#dc2626', Late:'#d97706', Excused:'#7c3aed', Holiday:'#0891b2'
  };
  const todayStatusBg = {
    Present:'#f0fdf4', Absent:'#fef2f2', Late:'#fffbeb', Excused:'#faf5ff', Holiday:'#ecfeff'
  };

  document.getElementById('studentDetailBody').innerHTML = `
    <!-- رأس الملف -->
    <div class="sp-hero">
      <div class="sp-avatar">${s.photo ? `<img src="${s.photo}" alt="${s.name}" />` : s.name.charAt(0)}</div>
      <div class="sp-hero-info">
        <div class="sp-name">${s.name}</div>
        <div class="sp-meta">
          ${cls ? `<span class="profile-class">${cls.name}</span>` : ''}
          ${s.studentId ? `<span class="sp-id-chip"># ${s.studentId}</span>` : ''}
        </div>
        ${s.parentPhone ? `<div class="sp-phone"><a href="tel:${s.parentPhone}">📞 ${s.parentPhone}</a></div>` : ''}
        ${s.birthday    ? `<div class="sp-dob">🎂 ${s.birthday}</div>` : ''}
        ${todayRec ? `<div class="sp-today-status" style="margin-top:6px;display:inline-flex;align-items:center;gap:6px;background:${todayStatusBg[todayRec.status]||'#f3f4f6'};color:${todayStatusColor[todayRec.status]||'#374151'};border:1.5px solid ${todayStatusColor[todayRec.status]||'#d1d5db'}33;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700">
          حضور اليوم: ${todayStatusLabel[todayRec.status] || todayRec.status}
        </div>` : '<div class="sp-today-status" style="margin-top:6px;display:inline-flex;align-items:center;gap:6px;background:#f8fafc;color:#94a3b8;border:1.5px solid #e2e8f0;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600">لم يُسجَّل حضور اليوم</div>'}
      </div>
      <button class="btn-secondary sp-edit-btn" onclick="closeModal('studentDetailModal');openStudentModal('${s.id}')">✏️ تعديل</button>
    </div>

    <!-- غياب بعذر — مرض / طارئ / سفر -->
    <div class="sp-quick-actions">
      <div class="sp-qa-title">🏥 تسجيل غياب بعذر</div>
      <div style="font-size:11px;color:#92400E;margin-bottom:10px;margin-top:-4px">✅ سيُسجَّل الغياب تلقائياً كـ <strong>بعذر</strong> — وليس غائباً</div>
      <div class="sp-qa-grid">
        <button class="sp-qa-btn sp-qa-sick"      onclick="quickLeave('${s.id}','${s.classId}','Sick')">
          <span class="sp-qa-icon">🤒</span><span class="sp-qa-label">مرض</span>
        </button>
        <button class="sp-qa-btn sp-qa-emergency" onclick="quickLeave('${s.id}','${s.classId}','Family')">
          <span class="sp-qa-icon">🚨</span><span class="sp-qa-label">طارئ</span>
        </button>
        <button class="sp-qa-btn sp-qa-travel"    onclick="quickLeave('${s.id}','${s.classId}','Travel')">
          <span class="sp-qa-icon">✈️</span><span class="sp-qa-label">سفر</span>
        </button>
        <button class="sp-qa-btn sp-qa-other"     onclick="quickLeave('${s.id}','${s.classId}','Other')">
          <span class="sp-qa-icon">📝</span><span class="sp-qa-label">أخرى</span>
        </button>
      </div>
      <div class="sp-qa-date-row">
        <label class="sp-qa-date-lbl">التاريخ:</label>
        <input type="date" id="spQuickDate" value="${todayISO()}" onchange="updateHijriLabel(this,'spQuickHijri')" />
        <span class="hijri-label" id="spQuickHijri" style="font-size:11px"></span>
      </div>
      <div id="spQuickResult" class="sp-qa-result hidden"></div>
    </div>

    <!-- إذن خروج — فقط للطلاب الحاضرين -->
    <div class="sp-exit-card">
      <div class="sp-exit-header">
        <span class="sp-exit-icon">📋</span>
        <div>
          <div class="sp-exit-title">إذن خروج
            ${exitCount > 0 ? `<span class="sp-exit-count-badge">${exitCount} سابق</span>` : ''}
          </div>
          <div class="sp-exit-subtitle">يُعطى فقط للطالب الحاضر الذي يغادر مبكراً — لا يُغيِّر حالة الحضور</div>
        </div>
      </div>
      ${todayRec?.status === 'Present' ? `
        <div class="sp-exit-form">
          <input type="text" id="spExitNote" placeholder="سبب الخروج (اختياري)…" class="sp-exit-note-input" />
          <button class="btn-primary sp-exit-btn" onclick="grantExitPermit('${s.id}','${s.classId}')">
            📋 منح إذن الخروج
          </button>
        </div>
        ${exitCount > 0 ? `
        <div class="sp-exit-history">
          ${exitPerms.slice(0,3).map(l => `<div class="sp-exit-hist-row"><span class="sp-exit-hist-date">${formatHijri(l.date)}</span><span class="sp-exit-hist-note">${l.reason || '—'}</span></div>`).join('')}
          ${exitCount > 3 ? `<div style="font-size:11px;color:var(--text2);margin-top:4px">+ ${exitCount - 3} أخرى</div>` : ''}
        </div>` : ''}
      ` : `
        <div class="sp-exit-locked">
          🔒 الطالب غير حاضر اليوم — إذن الخروج متاح فقط بعد تسجيل الحضور
        </div>
      `}
    </div>

    ${todayRec ? `
    <!-- تعديل حالة الحضور — يظهر فقط إذا سُجِّل الحضور اليوم -->
    <div class="sp-edit-att-card">
      <div class="sp-edit-att-header">
        <span class="sp-edit-att-icon">✏️</span>
        <span class="sp-edit-att-title">تعديل حالة الحضور</span>
      </div>
      <p class="sp-edit-att-desc">اختر التاريخ ثم اضغط «تعديل» لتغيير الحالة.</p>
      <div class="sp-edit-att-row">
        <input type="date" id="spEditAttDate" value="${todayISO()}" />
        <button class="btn-primary sp-edit-att-btn" onclick="openAttEditFromProfile('${s.id}')">✏️ تعديل الحالة</button>
      </div>
    </div>` : ''}

    <!-- إحصائيات الحضور -->
    <div class="sp-stats-grid">
      <div class="sp-stat sp-stat-present"><div class="sp-stat-num">${presentCnt}</div><div class="sp-stat-lbl">حاضر</div></div>
      <div class="sp-stat sp-stat-absent"><div class="sp-stat-num">${absentCnt}</div><div class="sp-stat-lbl">غائب</div></div>
      <div class="sp-stat sp-stat-late"><div class="sp-stat-num">${lateCnt}</div><div class="sp-stat-lbl">متأخر</div></div>
      <div class="sp-stat sp-stat-excused"><div class="sp-stat-num">${excusedCnt}</div><div class="sp-stat-lbl">بعذر</div></div>
      <div class="sp-stat sp-stat-exit"><div class="sp-stat-num">${exitCount}</div><div class="sp-stat-lbl">إذن خروج</div></div>
      ${warnCnt>0?`<div class="sp-stat" style="background:#fef2f2"><div class="sp-stat-num" style="color:#dc2626">${warnCnt}</div><div class="sp-stat-lbl">إنذار</div></div>`:''}
      <div class="sp-stat sp-stat-rate"><div class="sp-stat-num">${attendRate}${attendRate!=='—'?'%':''}</div><div class="sp-stat-lbl">نسبة الحضور</div></div>
    </div>

    <!-- تقدم القرآن -->
    <div class="section-title" style="margin-top:4px">📖 تقدم القرآن</div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px;flex-wrap:wrap">
      <div style="font-size:13px;color:var(--text2)">آخر موقع: <strong style="color:var(--primary)">${qpProgress}</strong></div>
      <div style="display:flex;gap:8px">
        <button class="btn-secondary" style="font-size:12px;padding:5px 12px" onclick="window.open('${API}/reports/attendance/student/${s.id}','_blank')">📊 سجل الحضور Excel</button>
        <button class="btn-secondary" style="font-size:12px;padding:5px 12px" onclick="window.open('${API}/reports/quran/student/${s.id}','_blank')">📖 تقرير القرآن Excel</button>
        <button class="btn-secondary" style="font-size:12px;padding:5px 12px" onclick="closeModal('studentDetailModal');openProgressModal('${s.id}')">+ تسجيل تقدم</button>
      </div>
    </div>
    ${qpList && qpList.length ? `
    <div style="overflow-x:auto;margin-bottom:16px">
      <table class="history-table">
        <thead><tr><th>التاريخ</th><th>النوع</th><th>الموقع</th><th>التقييم</th><th>ملاحظات</th><th></th></tr></thead>
        <tbody>${qpList.slice(0,10).map(p=>`
          <tr>
            <td style="font-size:12px;direction:rtl">${formatHijri(p.date)}</td>
            <td><span style="font-size:11px">${QURAN_TYPE_AR[p.type]||p.type}</span></td>
            <td style="font-size:12px">${formatQPPosition(p)}</td>
            <td>${p.grade?`<span class="qp-grade-badge" style="background:${QURAN_GRADE_BG[p.grade]||'#f3f4f6'};color:${QURAN_GRADE_COLOR[p.grade]||'#374151'}">${p.grade}</span>`:'—'}</td>
            <td style="font-size:12px;color:var(--text2)">${p.notes||'—'}</td>
            <td><button class="btn-icon" style="font-size:12px" onclick="deleteProgress('${p.id}','${s.id}')">🗑</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>` : '<p style="color:var(--text2);font-size:13px;margin-bottom:16px">لا توجد سجلات تقدم قرآني بعد.</p>'}

    <!-- سجل الحضور -->
    <div class="section-title">📅 سجل الحضور</div>
    ${history.length===0 ? '<p style="color:var(--text2);font-size:13px">لا توجد سجلات بعد.</p>' : `
    <div style="overflow-x:auto">
      <table class="history-table">
        <thead><tr><th>التاريخ الهجري</th><th>اليوم</th><th>الحالة</th><th>ملاحظات</th><th></th></tr></thead>
        <tbody>${history.map(h => `
          <tr>
            <td style="font-family:var(--mono);font-size:12px;direction:rtl">${formatHijri(h.date)}</td>
            <td>${ARABIC_DAYS[new Date(h.date+'T00:00:00').getDay()]}</td>
            <td><span class="badge badge-${badgeClass(h.status)}">${translateStatus(h.status)}</span></td>
            <td style="font-size:12px;color:var(--text2)">${h.notes||'—'}</td>
            <td><button class="btn-icon att-hist-edit-btn" title="تعديل الحضور"
              onclick="openAttEditModal('${s.id}','${s.classId}',${JSON.stringify(s.name)},'${s.parentPhone||''}','${h.date}','${h.status}','${(h.notes||'')}','${h.id||''}')">✏️</button>
            </td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`}
    <!-- تعهدات وإنذارات -->
    <div class="section-title" style="margin-top:4px">📋 تعهدات وإنذارات</div>
    <div class="sp-notices-toolbar">
      <button class="btn-secondary" style="font-size:12px" onclick="openNoticeModal('${s.id}','تعهد')">+ تعهد</button>
      <button class="btn-secondary" style="font-size:12px;color:#dc2626;border-color:#fca5a5" onclick="openNoticeModal('${s.id}','إنذار')">+ إنذار</button>
      <span class="sp-notice-counts">${pledgeCnt ? `<span class="sp-notice-chip sp-notice-pledge">${pledgeCnt} تعهد</span>` : ''}${warnCnt ? `<span class="sp-notice-chip sp-notice-warn">${warnCnt} إنذار</span>` : ''}</span>
    </div>
    ${notices.length ? `
    <div class="sp-notices-list">
      ${notices.map(n => `
      <div class="sp-notice-row">
        <span class="sp-notice-type-badge ${n.type==='إنذار'?'sp-notice-warn':'sp-notice-pledge'}">${n.type}</span>
        <span class="sp-notice-date">${formatHijri(n.date)}</span>
        <span class="sp-notice-reason">${n.reason||'—'}</span>
        <button class="btn-icon" style="font-size:11px;flex-shrink:0" onclick="deleteNotice('${n.id}','${s.id}')">🗑</button>
      </div>`).join('')}
    </div>` : '<p style="color:var(--text2);font-size:13px;margin-bottom:12px">لا توجد تعهدات أو إنذارات.</p>'}

    <!-- زر طباعة الملف -->
    <div style="display:flex;justify-content:flex-end;margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">
      <button class="btn-secondary" onclick="printStudentProfile('${s.id}')">🖨️ طباعة الملف</button>
    </div>
  `;
  // init hijri label for quick-leave date
  updateHijriLabel(document.getElementById('spQuickDate'), 'spQuickHijri');
  document.getElementById('studentDetailModal').classList.remove('hidden');
}

function openStudentModal(id=null) {
  const sel = document.getElementById('fStudentClass');
  sel.innerHTML = '<option value="">— اختر الحلقة —</option>';
  state.classes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id; opt.textContent = c.name; sel.appendChild(opt);
  });
  if (id) {
    const s = state.students.find(x => x.id === id); if (!s) return;
    document.getElementById('studentModalTitle').textContent = 'تعديل بيانات الطالب';
    document.getElementById('studentId').value     = s.id;
    document.getElementById('fStudentId').value    = s.studentId||'';
    document.getElementById('fStudentName').value  = s.name;
    document.getElementById('fStudentBday').value  = s.birthday||'';
    document.getElementById('fStudentPhone').value = s.parentPhone||'';
    document.getElementById('fStudentClass').value = s.classId||'';
    const prev = document.getElementById('fStudentPhotoPreview');
    if (s.photo) { prev.src = s.photo; prev.classList.remove('hidden'); }
    else prev.classList.add('hidden');
  } else {
    document.getElementById('studentModalTitle').textContent = 'إضافة طالب';
    ['studentId','fStudentId','fStudentName','fStudentBday','fStudentPhone'].forEach(i => document.getElementById(i).value='');
    document.getElementById('fStudentClass').value = '';
    document.getElementById('fStudentPhotoPreview').classList.add('hidden');
  }
  document.getElementById('studentModal').classList.remove('hidden');
}

function previewPhoto() {
  const file = document.getElementById('fStudentPhoto').files[0]; if (!file) return;
  const prev = document.getElementById('fStudentPhotoPreview');
  prev.src   = URL.createObjectURL(file); prev.classList.remove('hidden');
}

async function saveStudent() {
  const id   = document.getElementById('studentId').value;
  const data = {
    studentId: document.getElementById('fStudentId').value.trim(),
    name:      document.getElementById('fStudentName').value.trim(),
    birthday:  document.getElementById('fStudentBday').value,
    parentPhone: document.getElementById('fStudentPhone').value.trim(),
    classId:   document.getElementById('fStudentClass').value,
  };
  if (!data.name) return toast('الاسم مطلوب');
  let savedId = id;
  if (id) {
    await apiFetch(`/students/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
  } else {
    const res = await apiFetch('/students', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
    savedId   = res?.id;
  }
  const photoFile = document.getElementById('fStudentPhoto').files[0];
  if (photoFile && savedId) {
    const fd = new FormData(); fd.append('photo', photoFile);
    await fetch(`${API}/students/${savedId}/photo`, { method:'POST', body:fd });
  }
  closeModal('studentModal'); await loadAll(); renderStudentList();
  toast(id ? '✅ تم تحديث بيانات الطالب' : '✅ تمت إضافة الطالب');
}

async function deleteStudent(id) {
  if (!confirm('هل تريد حذف هذا الطالب؟')) return;
  await apiFetch(`/students/${id}`, { method:'DELETE' });
  await loadAll(); renderStudentList(); toast('🗑 تم حذف الطالب');
}

// ══════════════════════════════════════════════════════════
//  الحلقات
// ══════════════════════════════════════════════════════════
function renderClassList() {
  const list = document.getElementById('classList');
  list.innerHTML = '';
  if (state.classes.length === 0) {
    list.innerHTML = '<div class="info-banner">لا توجد حلقات بعد. أضف حلقة للبدء.</div>'; return;
  }
  state.classes.forEach(cls => {
    const count = state.students.filter(s => s.classId === cls.id).length;
    const card  = document.createElement('div');
    card.className = 'list-card';
    card.innerHTML = `
      <div class="list-card-avatar">🏫</div>
      <div class="list-card-body">
        <div class="list-card-name">${cls.name}</div>
        <div class="list-card-sub">${cls.grade||''} · قاعة ${cls.room||'—'} · ${count} طالب</div>
      </div>
      <div class="list-card-actions">
        <button class="btn-icon" title="تقرير القرآن Excel" onclick="downloadClassQuranReport('${cls.id}','${cls.name.replace(/'/g,'')}')">📥</button>
        <button class="btn-icon" onclick="openClassModal('${cls.id}')">✏️</button>
        <button class="btn-icon" onclick="deleteClass('${cls.id}')">🗑</button>
      </div>`;
    list.appendChild(card);
  });
}

function openClassModal(id=null) {
  if (id) {
    const cls = state.classes.find(c=>c.id===id); if (!cls) return;
    document.getElementById('classModalTitle').textContent = 'تعديل الحلقة';
    document.getElementById('classId').value    = cls.id;
    document.getElementById('fClassName').value = cls.name;
    document.getElementById('fClassGrade').value= cls.grade||'';
    document.getElementById('fClassRoom').value = cls.room||'';
  } else {
    document.getElementById('classModalTitle').textContent = 'إضافة حلقة';
    ['classId','fClassName','fClassGrade','fClassRoom'].forEach(i=>document.getElementById(i).value='');
  }
  document.getElementById('classModal').classList.remove('hidden');
}

async function saveClass() {
  const id   = document.getElementById('classId').value;
  const data = { name:document.getElementById('fClassName').value.trim(), grade:document.getElementById('fClassGrade').value.trim(), room:document.getElementById('fClassRoom').value.trim() };
  if (!data.name) return toast('اسم الحلقة مطلوب');
  if (id) await apiFetch(`/classes/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
  else    await apiFetch('/classes', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
  closeModal('classModal'); await loadAll(); renderClassList();
  toast(id ? '✅ تم تحديث الحلقة' : '✅ تمت إضافة الحلقة');
}

async function deleteClass(id) {
  if (!confirm('هل تريد حذف هذه الحلقة؟')) return;
  await apiFetch(`/classes/${id}`, { method:'DELETE' });
  await loadAll(); renderClassList(); toast('🗑 تم حذف الحلقة');
}

function downloadClassQuranReport(classId, className) {
  toast('⏳ جارٍ إنشاء تقرير القرآن…');
  window.open(`${API}/reports/quran/class/${classId}`, '_blank');
}

// ══════════════════════════════════════════════════════════
//  المعلمون
// ══════════════════════════════════════════════════════════
function renderTeacherList() {
  const list = document.getElementById('teacherList');
  list.innerHTML = '';
  if (state.teachers.length === 0) {
    list.innerHTML = '<div class="info-banner">لا يوجد معلمون بعد. أضف معلمًا للبدء.</div>'; return;
  }
  state.teachers.forEach(t => {
    const log         = state.teacherLog.find(l => l.teacherId === t.id);
    const mins        = log ? calcMinutes(log.checkIn, log.checkOut) : 0;
    const duration    = mins > 0 ? formatDuration(mins) : '';
    const statusClass = log ? (log.checkOut ? 'out' : 'in') : 'absent';
    const statusLabel = log ? (log.checkOut ? 'انصرف' : 'حاضر الآن') : 'غائب';
    const card        = document.createElement('div');
    card.className    = 'list-card teacher-list-card';
    card.onclick      = () => viewTeacher(t.id);
    const initials    = t.name.trim().split(' ').map(w=>w[0]).slice(0,2).join('');
    const avatarHtml  = t.photo
      ? `<div class="list-card-avatar"><img src="${t.photo}" alt="${t.name}" onerror="this.parentElement.innerHTML='<span>${initials}</span>'" /></div>`
      : `<div class="list-card-avatar teacher-avatar-initials">${initials}</div>`;
    card.innerHTML = `
      ${avatarHtml}
      <div class="list-card-body">
        <div class="list-card-name">${t.name}</div>
        <div class="list-card-sub">${t.subject||'معلم'} ${t.teacherId ? '· #'+t.teacherId : ''}</div>
        <div style="margin-top:4px">
          <span class="checkin-status ${statusClass}">${statusLabel}</span>
          ${log && log.checkIn ? `<span style="font-size:11px;color:var(--text2);margin-right:6px;font-family:var(--mono)">${log.checkIn}${log.checkOut?' — '+log.checkOut:''}</span>` : ''}
        </div>
      </div>
      <div class="list-card-actions" onclick="event.stopPropagation()">
        <button class="btn-icon" title="تعديل" onclick="openTeacherModal('${t.id}')">✏️</button>
        <button class="btn-icon" title="حذف"   onclick="deleteTeacher('${t.id}')">🗑</button>
      </div>`;
    list.appendChild(card);
  });
}

function openTeacherModal(id=null) {
  if (id) {
    const t = state.teachers.find(x=>x.id===id); if (!t) return;
    document.getElementById('teacherModalTitle').textContent = 'تعديل بيانات المعلم';
    document.getElementById('teacherId').value       = t.id;
    document.getElementById('fTeacherId').value      = t.teacherId||'';
    document.getElementById('fTeacherName').value    = t.name;
    document.getElementById('fTeacherSubject').value = t.subject||'';
    document.getElementById('fTeacherPhone').value   = t.phone||'';
    const prev = document.getElementById('fTeacherPhotoPreview');
    const placeholder = document.getElementById('fTeacherPhotoPlaceholder');
    if (t.photo) {
      prev.src = t.photo; prev.classList.remove('hidden');
      if (placeholder) placeholder.style.display = 'none';
    } else {
      prev.classList.add('hidden');
      if (placeholder) placeholder.style.display = '';
    }
  } else {
    document.getElementById('teacherModalTitle').textContent = 'إضافة معلم';
    ['teacherId','fTeacherId','fTeacherName','fTeacherSubject','fTeacherPhone'].forEach(i=>document.getElementById(i).value='');
    const prev = document.getElementById('fTeacherPhotoPreview');
    prev.classList.add('hidden');
    const placeholder = document.getElementById('fTeacherPhotoPlaceholder');
    if (placeholder) placeholder.style.display = '';
    document.getElementById('fTeacherPhoto').value = '';
  }
  document.getElementById('teacherModal').classList.remove('hidden');
}

function previewTeacherPhoto() {
  const file = document.getElementById('fTeacherPhoto').files[0]; if (!file) return;
  const prev = document.getElementById('fTeacherPhotoPreview');
  const placeholder = document.getElementById('fTeacherPhotoPlaceholder');
  prev.src = URL.createObjectURL(file); prev.classList.remove('hidden');
  if (placeholder) placeholder.style.display = 'none';
}

async function saveTeacher() {
  const id   = document.getElementById('teacherId').value;
  const data = { teacherId:document.getElementById('fTeacherId').value.trim(), name:document.getElementById('fTeacherName').value.trim(), subject:document.getElementById('fTeacherSubject').value.trim(), phone:document.getElementById('fTeacherPhone').value.trim() };
  if (!data.name) return toast('الاسم مطلوب');
  let savedId = id;
  if (id) {
    await apiFetch(`/teachers/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
  } else {
    const res = await apiFetch('/teachers', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) });
    savedId = res?.id;
  }
  const photoFile = document.getElementById('fTeacherPhoto').files[0];
  if (photoFile && savedId) {
    const fd = new FormData(); fd.append('photo', photoFile);
    await fetch(`${API}/teachers/${savedId}/photo`, { method:'POST', body:fd });
  }
  closeModal('teacherModal'); await loadAll(); renderTeacherList();
  toast(id ? '✅ تم تحديث بيانات المعلم' : '✅ تمت إضافة المعلم');
}

async function deleteTeacher(id) {
  if (!confirm('هل تريد حذف هذا المعلم؟')) return;
  await apiFetch(`/teachers/${id}`, { method:'DELETE' });
  await loadAll(); renderTeacherList(); toast('🗑 تم حذف المعلم');
}

// ══════════════════════════════════════════════════════════
//  حضور المعلمين (Check-In)
// ══════════════════════════════════════════════════════════
function renderCheckinList() {
  const search   = document.getElementById('checkinSearch')?.value?.toLowerCase() || '';
  let teachers   = state.teachers;
  if (search) teachers = teachers.filter(t => t.name.toLowerCase().includes(search));
  const list     = document.getElementById('checkinList');
  list.innerHTML = '';
  if (teachers.length === 0) {
    list.innerHTML = '<div class="info-banner">لا يوجد معلمون.</div>'; return;
  }
  teachers.forEach(t => {
    const log      = state.teacherLog.find(l => l.teacherId === t.id);
    const mins     = log ? calcMinutes(log.checkIn, log.checkOut) : 0;
    const duration = mins > 0 ? formatDuration(mins) : '';
    const statusClass = log ? (log.checkOut ? 'out' : 'in') : 'absent';
    const statusLabel = log ? (log.checkOut ? 'انصرف' : 'حاضر') : 'غائب';
    const row = document.createElement('div');
    row.className = 'checkin-row';
    row.innerHTML = `
      <div style="flex:1">
        <div style="font-weight:600;font-size:15px">${t.name}</div>
        <div style="font-size:12px;color:var(--text2)">${t.subject||t.teacherId||'—'}</div>
        ${log ? `
          <div class="checkin-times">
            حضور: ${log.checkIn}
            ${log.checkOut ? ' | انصراف: '+log.checkOut : ''}
            ${duration ? ' | <strong>'+duration+'</strong>' : ''}
          </div>` : ''}
      </div>
      <span class="checkin-status ${statusClass}">${statusLabel}</span>
      <div style="display:flex;flex-direction:column;gap:6px;margin-right:8px">
        ${!log ? `<button class="btn-primary" style="font-size:12px;padding:8px 12px" onclick="checkIn('${t.id}')">تسجيل حضور</button>` : ''}
        ${log && !log.checkOut ? `<button class="btn-secondary" style="font-size:12px;padding:8px 12px" onclick="checkOut('${t.id}')">تسجيل انصراف</button>` : ''}
      </div>`;
    list.appendChild(row);
  });
}

async function checkIn(teacherId) {
  const res = await apiFetch('/teacher-log/checkin', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({teacherId}) });
  if (res?.error) return toast('⚠ '+res.error);
  await loadAll(); renderCheckinList(); loadTeacherSummary(); toast('✅ تم تسجيل الحضور!');
}
async function checkOut(teacherId) {
  const res = await apiFetch('/teacher-log/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({teacherId}) });
  if (res?.error) return toast('⚠ '+res.error);
  await loadAll();
  // عرض مدة الحضور في الإشعار
  const duration = res.duration || '';
  renderCheckinList();
  loadTeacherSummary();
  toast(`✅ تم تسجيل الانصراف! ${duration ? '| المدة: '+duration : ''}`);
}

// ── ملخص ساعات المعلمين اليومية ──────────────────────
async function loadTeacherSummary() {
  const data = await apiFetch('/teacher-log/today-summary');
  const card  = document.getElementById('teacherSummaryCard');
  const body  = document.getElementById('teacherSummaryBody');
  const total = document.getElementById('teacherSummaryTotal');
  if (!card || !body || !data) return;
  if (!data.logs || data.logs.length === 0) { card.style.display='none'; return; }
  card.style.display = 'block';
  body.innerHTML = data.logs.map(l => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="font-weight:600">${l.name}</span>
      <span style="font-family:var(--mono);font-size:12px;color:var(--text2)">
        ${l.checkIn||'—'} → ${l.checkOut||'<span style=color:var(--warn)>لم ينصرف</span>'}
        ${l.mins ? `<strong style="color:var(--success);margin-right:8px">${l.duration}</strong>` : ''}
      </span>
    </div>`).join('');
  total.textContent = data.totalDuration;
}

// ══════════════════════════════════════════════════════════
//  الإجازات
// ══════════════════════════════════════════════════════════
function renderHolidayList() {
  const list   = document.getElementById('holidayList');
  list.innerHTML = '';
  const sorted = [...state.holidays].sort((a,b) => b.date.localeCompare(a.date));
  if (sorted.length === 0) {
    list.innerHTML = '<div class="info-banner">لا توجد إجازات يدوية. أيام الجمعة تُضاف تلقائيًا.</div>'; return;
  }
  sorted.forEach(h => {
    const card = document.createElement('div');
    card.className = 'list-card';
    card.innerHTML = `
      <div class="list-card-avatar">📅</div>
      <div class="list-card-body">
        <div class="list-card-name">${formatHijriFull(h.date)}</div>
        <div class="list-card-sub"><span class="badge badge-holiday">${h.type}</span> ${h.reason||''}</div>
      </div>
      <div class="list-card-actions">
        <button class="btn-danger" onclick="deleteHoliday('${h.date}')">حذف</button>
      </div>`;
    list.appendChild(card);
  });
}

function openHolidayModal() {
  setDateToday('fHolidayDate', 'holidayDateHijri');
  document.getElementById('fHolidayType').value   = 'Weather';
  document.getElementById('fHolidayReason').value = '';
  // Reset multi-day state
  _holidayDates = [];
  holidaySetMode('single');
  const btn = document.getElementById('holidaySaveBtn');
  if (btn) btn.textContent = 'حفظ';
  document.getElementById('holidayModal').classList.remove('hidden');
}
async function saveHoliday() {
  const type   = document.getElementById('fHolidayType').value;
  const reason = document.getElementById('fHolidayReason').value.trim();

  // ── Multi-day mode ──────────────────────────────────────
  const isMulti = document.getElementById('holidayModeMulti')?.classList.contains('active');
  if (isMulti) {
    if (!_holidayDates.length) return toast('يرجى اختيار يوم واحد على الأقل');
    let saved = 0;
    for (const date of _holidayDates) {
      await apiFetch('/holidays', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, type, reason }),
      });
      saved++;
    }
    closeModal('holidayModal');
    await loadAll();
    renderHolidayList();
    toast(`✅ تمت إضافة ${saved} إجازة`);
    return;
  }

  // ── Single-day mode ─────────────────────────────────────
  const date = document.getElementById('fHolidayDate').value;
  if (!date) return toast('يرجى اختيار تاريخ');
  await apiFetch('/holidays', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, type, reason }),
  });
  closeModal('holidayModal');
  await loadAll();
  renderHolidayList();
  toast('✅ تمت إضافة الإجازة');
}

// ── Holiday modal helpers ────────────────────────────────
function holidaySetMode(mode) {
  const isSingle = mode === 'single';
  document.getElementById('holidayModeSingle')?.classList.toggle('active', isSingle);
  document.getElementById('holidayModeMulti')?.classList.toggle('active', !isSingle);
  document.getElementById('holidaySingleSection')?.classList.toggle('hidden', !isSingle);
  document.getElementById('holidayMultiSection')?.classList.toggle('hidden', isSingle);
  const btn = document.getElementById('holidaySaveBtn');
  if (btn) btn.textContent = (!isSingle && _holidayDates.length > 1)
    ? `حفظ (${_holidayDates.length} أيام)` : 'حفظ';
}

function openHolidayDayPicker() {
  _dpMode = 'holiday';
  if (_holidayDates.length) {
    const h = toHijri(_holidayDates[0]);
    _dpHYear = h.year; _dpHMonth = h.month;
  } else {
    const h = toHijri(todayISO());
    _dpHYear = h.year; _dpHMonth = h.month;
  }
  _dpTempSelected = [..._holidayDates];
  _renderDpGrid();
  document.getElementById('dayPickerModal')?.classList.remove('hidden');
}

function _renderHolidayChips() {
  const el = document.getElementById('holidayDatesChips');
  if (!el) return;
  if (!_holidayDates.length) {
    el.innerHTML = '<span style="color:var(--text2);font-size:13px">لم يتم اختيار أيام بعد</span>';
    return;
  }
  el.innerHTML = _holidayDates.map(iso =>
    `<span class="cal-specific-chip">${formatHijri(iso)}
      <button onclick="_holidayDates=_holidayDates.filter(d=>d!=='${iso}');_renderHolidayChips();
        const b=document.getElementById('holidaySaveBtn');if(b)b.textContent=_holidayDates.length>1?'حفظ ('+_holidayDates.length+' أيام)':'حفظ';">✕</button>
    </span>`
  ).join('');
}

async function deleteHoliday(date) {
  if (!confirm(`هل تريد حذف إجازة يوم ${formatHijri(date)}؟`)) return;
  await apiFetch(`/holidays/${date}`, { method:'DELETE' });
  await loadAll(); renderHolidayList(); toast('🗑 تم حذف الإجازة');
}

// ══════════════════════════════════════════════════════════
//  التقارير
// ══════════════════════════════════════════════════════════
function initReports() {
  setDateToday('rptDailyDate', 'rptDateHijri');
  setDateToday('rptTeacherDailyDate', 'rptTeacherDateHijri');
  const todayH = toHijri(todayISO());
  document.getElementById('rptYear').value  = todayH.year;
  document.getElementById('rptMonth').value = todayH.month;
  const teacherYearEl = document.getElementById('rptTeacherYear');
  const teacherMonthEl = document.getElementById('rptTeacherMonth');
  if (teacherYearEl)  teacherYearEl.value  = todayH.year;
  if (teacherMonthEl) teacherMonthEl.value = todayH.month;
  // Populate class dropdowns
  const classOpts = '<option value="">جميع الحلقات</option>' +
    state.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  const dc = document.getElementById('rptDailyClass');
  const mc = document.getElementById('rptMonthlyClass');
  if (dc) dc.innerHTML = classOpts;
  if (mc) mc.innerHTML = classOpts;
}

function downloadReport(type) {
  let url;
  const dailyClass   = document.getElementById('rptDailyClass')?.value   || '';
  const monthlyClass = document.getElementById('rptMonthlyClass')?.value || '';

  if (type==='daily-attendance') {
    const date = document.getElementById('rptDailyDate').value;
    if (!date) return toast('اختر تاريخًا');
    url = `${API}/reports/daily-attendance/${date}` + (dailyClass ? `?classId=${dailyClass}` : '');
  } else if (type==='pdf-daily') {
    const date = document.getElementById('rptDailyDate').value;
    if (!date) return toast('اختر تاريخًا');
    url = `${API}/reports/pdf/daily/${date}` + (dailyClass ? `?classId=${dailyClass}` : '');
  } else if (type==='teacher-log') {
    const date = document.getElementById('rptTeacherDailyDate').value;
    if (!date) return toast('اختر تاريخًا');
    url = `${API}/reports/teacher-log/${date}`;
  } else if (type==='monthly') {
    const hYear  = document.getElementById('rptYear').value;
    const hMonth = document.getElementById('rptMonth').value;
    if (!hYear || !hMonth) return toast('اختر الشهر والسنة الهجرية');
    url = `${API}/reports/monthly/hijri/${hYear}/${hMonth}` + (monthlyClass ? `?classId=${monthlyClass}` : '');
  } else if (type==='pdf-teacher-monthly') {
    const hYear  = document.getElementById('rptTeacherYear').value;
    const hMonth = document.getElementById('rptTeacherMonth').value;
    if (!hYear || !hMonth) return toast('اختر الشهر والسنة الهجرية');
    url = `${API}/reports/pdf/teacher-monthly/hijri/${hYear}/${hMonth}`;
  } else if (type==='teacher-monthly-excel') {
    const hYear  = document.getElementById('rptTeacherYear').value;
    const hMonth = document.getElementById('rptTeacherMonth').value;
    if (!hYear || !hMonth) return toast('اختر الشهر والسنة الهجرية');
    url = `${API}/reports/teacher-monthly/hijri/${hYear}/${hMonth}`;
  } else if (type==='print-daily-attendance') {
    const date = document.getElementById('rptDailyDate').value;
    if (!date) return toast('اختر تاريخًا');
    url = `${API}/print/daily-attendance/${date}` + (dailyClass ? `?classId=${dailyClass}` : '');
  } else if (type==='print-teacher-log') {
    const date = document.getElementById('rptTeacherDailyDate').value;
    if (!date) return toast('اختر تاريخًا');
    url = `${API}/print/teacher-log/${date}`;
  } else if (type==='print-monthly') {
    const hYear  = document.getElementById('rptYear').value;
    const hMonth = document.getElementById('rptMonth').value;
    if (!hYear || !hMonth) return toast('اختر الشهر والسنة الهجرية');
    url = `${API}/print/monthly-attendance/${hYear}/${hMonth}` + (monthlyClass ? `?classId=${monthlyClass}` : '');
  } else if (type==='print-teacher-monthly') {
    const hYear  = document.getElementById('rptTeacherYear').value;
    const hMonth = document.getElementById('rptTeacherMonth').value;
    if (!hYear || !hMonth) return toast('اختر الشهر والسنة الهجرية');
    url = `${API}/print/teacher-monthly/${hYear}/${hMonth}`;
  } else if (type==='print-students-list') {
    const listClass = document.getElementById('rptDailyClass')?.value;
    url = `${API}/print/students-list` + (listClass ? `?classId=${listClass}` : '');
  } else if (type==='print-teachers-list') {
    url = `${API}/print/teachers-list`;
  }
  if (url) {
    if (type.startsWith('print-')) {
      // Fetch the HTML from the server, write into a blank window, trigger print
      // This avoids the "just shows HTML page" problem on all browsers/mobile
      toast('⏳ جارٍ تحميل الصفحة…');
      fetch(url)
        .then(r => {
          if (!r.ok) throw new Error(r.status);
          return r.text();
        })
        .then(html => {
          // Inject auto-print script before </body>
          const printHtml = html.replace(
            /<\/body>/i,
            `<script>window.onload=function(){window.focus();window.print();}<\/script></body>`
          );
          const win = window.open('', '_blank', 'width=900,height=700');
          if (!win) { toast('⚠️ السماح بالنوافذ المنبثقة مطلوب'); return; }
          win.document.open();
          win.document.write(printHtml);
          win.document.close();
        })
        .catch(err => {
          console.error('Print fetch error:', err);
          toast('❌ تعذّر تحميل صفحة الطباعة');
        });
    } else {
      window.open(url, '_blank');
      toast('⬇ جارٍ التنزيل…');
    }
  }
}

// نسخ رابط الشبكة إلى الحافظة
async function copyNetworkLink() {
  const url = _qrNetworkUrl || window.location.origin;
  try {
    await navigator.clipboard.writeText(url);
    toast('✅ تم نسخ الرابط: ' + url);
  } catch(e) {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast('✅ تم نسخ الرابط');
  }
}

// ══════════════════════════════════════════════════════════
//  مزامنة / نسخ احتياطي
// ══════════════════════════════════════════════════════════
function exportData() { window.open(`${API}/sync/export`,'_blank'); toast('⬇ جارٍ التصدير…'); }

async function initSyncPage() {
  await checkExeStatus();
}

async function checkExeStatus() {
  try {
    const s = await apiFetch('/launcher-status');
    if (!s) return;

    // بطاقة الحالة
    const card = document.getElementById('launcherStatusCard');
    if (card) {
      const ip = s.networkIP;
      card.innerHTML = `
        <div class="launcher-status-row">
          <span class="launcher-status-dot ${s.vbsExists ? 'dot-green' : 'dot-red'}"></span>
          <span>launch.vbs — ${s.vbsExists ? '✅ موجود' : '❌ غير موجود'}</span>
        </div>
        <div class="launcher-status-row">
          <span class="launcher-status-dot ${s.jsExists ? 'dot-green' : 'dot-red'}"></span>
          <span>launcher.js — ${s.jsExists ? '✅ موجود' : '❌ غير موجود'}</span>
        </div>
        <div class="launcher-status-row">
          <span class="launcher-status-dot ${s.exeBuilt ? 'dot-green' : 'dot-orange'}"></span>
          <span>ملف .exe — ${s.exeBuilt ? '✅ جاهز للتنزيل' : '⚠️ لم يُبنَ بعد (شغّل build-exe.bat)'}</span>
        </div>
        ${ip ? `<div class="launcher-status-row" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
          <span>📱 رابط الشبكة للجوال:</span>
          <code class="launcher-ip-code" onclick="copyNetworkLink('http://${ip}:${s.port}')">http://${ip}:${s.port} 📋</code>
        </div>` : ''}
      `;
    }

    // زر تنزيل exe
    const exeBtn = document.getElementById('exeBtnArea');
    const exeDesc = document.getElementById('exeCardDesc');
    if (exeBtn) {
      if (s.exeBuilt) {
        exeBtn.innerHTML = `<a class="btn-primary launcher-dl-btn" href="/api/download/exe" download>⬇ تنزيل .exe</a>`;
        if (exeDesc) exeDesc.textContent = 'ملف .exe جاهز — يعمل بنقرة واحدة بدون Node.js';
        document.getElementById('launcherExeCard')?.classList.add('launcher-card-ready');
      } else {
        exeBtn.innerHTML = `<a class="btn-secondary launcher-dl-btn" href="/api/download/build-bat" download="build-exe.bat">⬇ build-exe.bat</a>`;
      }
    }
  } catch(e) { console.warn('Launcher status error:', e); }
}

async function copyNetworkLink(url) {
  try {
    await navigator.clipboard.writeText(url);
    toast('📋 تم نسخ الرابط: ' + url);
  } catch(e) {
    toast('الرابط: ' + url);
  }
}

async function importData() {
  const file     = document.getElementById('importFile').files[0]; if (!file) return;
  const statusEl = document.getElementById('importStatus');
  statusEl.textContent = 'جارٍ الاستيراد…'; statusEl.style.color = 'var(--text2)';
  try {
    const bundle = JSON.parse(await file.text());
    const res    = await apiFetch('/sync/import', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(bundle) });
    if (res?.ok) {
      statusEl.textContent = '✅ تم الاستيراد بنجاح! تم دمج البيانات.';
      statusEl.style.color = 'var(--success)'; await loadAll();
    } else {
      statusEl.textContent = '❌ فشل الاستيراد. تحقق من صيغة الملف.';
      statusEl.style.color = 'var(--error)';
    }
  } catch(e) {
    statusEl.textContent = '❌ ملف غير صالح. تأكد من أنه ملف JSON صحيح.';
    statusEl.style.color = 'var(--error)';
  }
  document.getElementById('importFile').value = '';
}

// ══════════════════════════════════════════════════════════
//  الإعدادات والهوية البصرية
// ══════════════════════════════════════════════════════════
async function saveSettings() {
  const schoolName = document.getElementById('settSchoolName').value.trim();
  const subtitle   = document.getElementById('settSubtitle').value.trim();
  await apiFetch('/settings', {
    method:'PUT', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ schoolName, subtitle }),
  });
  const statusEl = document.getElementById('settStatus');
  statusEl.style.color = 'var(--success)';
  statusEl.textContent = '✅ تم حفظ البيانات!';
  setTimeout(() => statusEl.textContent = '', 3000);
  updateBrandPreview({ schoolName, subtitle });
  loadAndDisplayLogos();
}

async function changePin() {
  const oldPin  = document.getElementById('settOldPin').value;
  const newPin  = document.getElementById('settNewPin').value;
  const confPin = document.getElementById('settConfPin').value;
  const statusEl= document.getElementById('pinStatus');
  if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
    statusEl.style.color = 'var(--error)'; statusEl.textContent = 'يجب أن يتكون الرمز السري من 4 أرقام فقط.'; return;
  }
  if (newPin !== confPin) {
    statusEl.style.color = 'var(--error)'; statusEl.textContent = 'الرمز الجديد وتأكيده غير متطابقين.'; return;
  }
  const verify = await apiFetch('/auth/verify', {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pin: oldPin }),
  });
  if (!verify?.valid) {
    statusEl.style.color = 'var(--error)'; statusEl.textContent = 'الرمز الحالي غير صحيح.'; return;
  }
  await apiFetch('/settings', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pin: newPin }) });
  statusEl.style.color = 'var(--success)'; statusEl.textContent = '✅ تم تغيير الرمز السري!';
  ['settOldPin','settNewPin','settConfPin'].forEach(id => document.getElementById(id).value = '');
  setTimeout(() => statusEl.textContent = '', 3000);
}

// ─── الشعارات ────────────────────────────────────────────

function setupLogoDragDrop() {
  const area = document.getElementById('logoUploadArea');
  if (!area || area._ddSetup) return;
  area._ddSetup = true;
  area.addEventListener('dragover',  e => { e.preventDefault(); area.classList.add('drag-over'); });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', e => {
    e.preventDefault(); area.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) { document.getElementById('logoFile').files; showLogoPreview(file); }
  });
  area.addEventListener('click', () => document.getElementById('logoFile').click());
}

function handleLogoUpload() {
  const file = document.getElementById('logoFile').files[0];
  if (file) showLogoPreview(file);
}

function showLogoPreview(file) {
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('logoPreviewImg').src = e.target.result;
    document.getElementById('logoName').value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    document.getElementById('logoPreviewArea').classList.remove('hidden');
    document.getElementById('logoUploadArea').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

function cancelLogoPreview() {
  document.getElementById('logoPreviewArea').classList.add('hidden');
  document.getElementById('logoUploadArea').classList.remove('hidden');
  document.getElementById('logoFile').value = '';
}

async function uploadLogo() {
  const file = document.getElementById('logoFile').files[0];
  const name = document.getElementById('logoName').value.trim() || 'شعار';
  if (!file) return toast('اختر ملف شعار أولاً');

  const s = await apiFetch('/settings');
  if ((s?.logos||[]).length >= 4) return toast('الحد الأقصى 4 شعارات');

  const fd = new FormData();
  fd.append('logo', file);
  fd.append('name', name);

  try {
    const res = await fetch(`${API}/settings/logos`, { method:'POST', body: fd });
    if (!res.ok) throw new Error();
    cancelLogoPreview();
    const settings = await apiFetch('/settings');
    renderLogoList(settings.logos || []);
    updateBrandPreview(settings);
    toast('✅ تم رفع الشعار بنجاح!');
  } catch(e) {
    toast('❌ فشل رفع الشعار');
  }
}

async function deleteLogo(id) {
  if (!confirm('هل تريد حذف هذا الشعار؟')) return;
  await apiFetch(`/settings/logos/${id}`, { method:'DELETE' });
  const settings = await apiFetch('/settings');
  renderLogoList(settings.logos || []);
  updateBrandPreview(settings);
  toast('🗑 تم حذف الشعار');
}

function renderLogoList(logos) {
  const list = document.getElementById('logoList');
  list.innerHTML = '';
  if (logos.length === 0) {
    list.innerHTML = '<p style="color:var(--text2);font-size:13px;padding:8px 0">لا توجد شعارات بعد. أضف شعاراً لتظهر في جميع التقارير.</p>';
    return;
  }
  logos.forEach((logo, i) => {
    const item = document.createElement('div');
    item.className = 'logo-item';
    item.innerHTML = `
      <button class="logo-item-del" onclick="deleteLogo('${logo.id}')" title="حذف">✕</button>
      <img src="${logo.url}" alt="${logo.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'><text y=\\'.9em\\'font-size=\\'90\\'>>🖼</text></svg>'" />
      <span class="logo-item-name" title="${logo.name}">${logo.name}</span>
      <span class="logo-item-badge">شعار ${i+1}</span>
    `;
    list.appendChild(item);
  });
}

function updateBrandPreview(settings) {
  document.getElementById('previewName').textContent = settings.schoolName || 'اسم المنشأة';
  document.getElementById('previewSub').textContent  = settings.subtitle   || '';
  const logosEl = document.getElementById('previewLogos');
  const logos   = settings.logos || [];
  if (logos.length === 0) {
    logosEl.innerHTML = '<span class="no-logo">لا توجد شعارات — أضف شعاراً ليظهر هنا</span>';
  } else {
    logosEl.innerHTML = logos.map(l =>
      `<img src="${l.url}" alt="${l.name}" title="${l.name}" onerror="this.style.display='none'" />`
    ).join('');
  }
}

// ══════════════════════════════════════════════════════════
//  النوافذ المنبثقة والإشعارات
// ══════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════
//  الإذن المسبق / الإجازة المرضية
// ══════════════════════════════════════════════════════════
function openLeaveModal() {
  const classId = document.getElementById('attClass').value;
  const date    = document.getElementById('attDate').value;
  if (!classId) return toast('يرجى اختيار الحلقة أولاً');
  const sel = document.getElementById('fLeaveStudent');
  sel.innerHTML = '<option value="">— اختر الطالب —</option>';
  state.students.filter(s => s.classId === classId).forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id; opt.textContent = s.name; sel.appendChild(opt);
  });
  document.getElementById('fLeaveDate').value = date || todayISO();
  updateHijriLabel(document.getElementById('fLeaveDate'), 'leaveDateHijri');
  document.getElementById('fLeaveType').value   = 'Sick';
  document.getElementById('fLeaveReason').value = '';
  document.getElementById('leaveModal').classList.remove('hidden');
}

async function saveLeave() {
  const studentId = document.getElementById('fLeaveStudent').value;
  const date      = document.getElementById('fLeaveDate').value;
  const type      = document.getElementById('fLeaveType').value;
  const reason    = document.getElementById('fLeaveReason').value.trim();
  const classId   = document.getElementById('attClass').value;
  if (!studentId) return toast('يرجى اختيار الطالب');
  if (!date)      return toast('يرجى اختيار التاريخ');
  const leaveRes = await apiFetch('/leaves', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ studentId, classId, date, type, reason }),
  });
  // Auto-correct: if student was already marked Absent on that date, change to Excused
  if (leaveRes?.ok !== false && classId && date) {
    const existing = await apiFetch(`/attendance?date=${date}&classId=${classId}`);
    if (existing) {
      const absentRec = existing.find(a => a.studentId === studentId && a.status === 'Absent');
      if (absentRec) {
        const typeLabelsNote = { Sick:'🤒 مرض', Permission:'📋 إذن خروج', Travel:'✈️ سفر', Family:'🚨 ظرف عائلي', Other:'📝 أخرى' };
        await apiFetch('/attendance/batch', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, classId, records: [{ studentId, status: 'Excused', notes: typeLabelsNote[type]||type }] }),
        });
      }
    }
  }
  closeModal('leaveModal');
  await loadAttendanceStudents();
  const typeLabels = { Sick:'مرض', Permission:'إذن خروج', Travel:'سفر', Family:'ظرف عائلي', Other:'أخرى' };
  toast(`✅ تم تسجيل الإذن: ${typeLabels[type]||type} — وتحديث الحضور إلى بعذر`);
}

async function cancelLeave(leaveId, studentId, date, classId) {
  if (!confirm('هل تريد إلغاء هذا الإذن؟')) return;
  await apiFetch(`/leaves/${leaveId}`, { method:'DELETE' });
  await loadAttendanceStudents();
  toast('🗑 تم إلغاء الإذن');
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.querySelectorAll('.modal-overlay').forEach(overlay =>
  overlay.addEventListener('click', e => { if (e.target===overlay) overlay.classList.add('hidden'); })
);

let toastTimer;
function toast(msg, duration=3200) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('hidden', 'toast-success', 'toast-error', 'toast-warn');
  // Auto-detect type from message content
  if (msg.startsWith('✅') || msg.includes('تم') || msg.includes('نجاح'))
    el.classList.add('toast-success');
  else if (msg.startsWith('❌') || msg.includes('فشل') || msg.includes('تعذر') || msg.includes('خطأ'))
    el.classList.add('toast-error');
  else if (msg.startsWith('⚠') || msg.startsWith('⏳') || msg.includes('يرجى') || msg.includes('اختر'))
    el.classList.add('toast-warn');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
}

// ══════════════════════════════════════════════════════════
//  تقدم القرآن الكريم
// ══════════════════════════════════════════════════════════
let _quranSummary = [];
let _quranViewStudentId = null;

function formatQPPosition(p) {
  if (!p) return '—';
  const parts = [];
  if (p.juz) parts.push(`الجزء ${p.juz}`);
  if (p.surahFromName) {
    const pos = p.surahFromName + (p.ayahFrom ? ` آية ${p.ayahFrom}` : '');
    const posTo = (p.surahToName && p.surahToName !== p.surahFromName)
      ? ` ← ${p.surahToName}${p.ayahTo?' آية '+p.ayahTo:''}` : (p.ayahTo && p.ayahTo !== p.ayahFrom ? `–${p.ayahTo}` : '');
    parts.push(pos + posTo);
  }
  if (p.pageFrom) parts.push(`ص ${p.pageFrom}${p.pageTo && p.pageTo!==p.pageFrom?'–'+p.pageTo:''}`);
  return parts.join(' · ') || '—';
}

async function initQuranPage() {
  // populate class filter
  const filter = document.getElementById('quranClassFilter');
  if (filter) {
    const cur = filter.value;
    filter.innerHTML = '<option value="">كل الحلقات</option>';
    state.classes.forEach(c => {
      const o = document.createElement('option'); o.value=c.id; o.textContent=c.name;
      if (c.id===cur) o.selected=true;
      filter.appendChild(o);
    });
  }
  // show/hide class report button
  updateQuranClassReportBtn();
  await loadQuranSummary();
}

function updateQuranClassReportBtn() {
  const classId = document.getElementById('quranClassFilter')?.value || '';
  const btn = document.getElementById('quranClassReportBtn');
  if (!btn) return;
  if (classId) {
    btn.style.display = 'inline-flex';
    btn.onclick = () => { toast('⏳ جارٍ إنشاء تقرير الحلقة…'); window.open(`${API}/reports/quran/class/${classId}`, '_blank'); };
  } else {
    btn.style.display = 'none';
  }
}

async function loadQuranSummary() {
  const classId = document.getElementById('quranClassFilter')?.value || '';
  updateQuranClassReportBtn();
  const url = '/quran-progress/summary' + (classId ? `?classId=${classId}` : '');
  _quranSummary = await apiFetch(url) || [];
  renderQuranPage();
}

function renderQuranPage() {
  const search  = (document.getElementById('quranSearch')?.value||'').toLowerCase();
  const classId = document.getElementById('quranClassFilter')?.value || '';
  const grid    = document.getElementById('quranSummaryGrid');
  if (!grid) return;

  let list = _quranSummary;
  if (search)  list = list.filter(r => r.name.toLowerCase().includes(search));
  if (classId) list = list.filter(r => r.classId === classId);

  if (list.length === 0) {
    grid.innerHTML = '<div class="info-banner">لا يوجد طلاب لعرض تقدمهم.</div>'; return;
  }

  grid.innerHTML = '';
  list.forEach(r => {
    const cls   = state.classes.find(c => c.id === r.classId);
    const pos   = formatQPPosition(r.latest);
    const grade = r.latest?.grade || '';
    const gradeHtml = grade
      ? `<span class="qp-grade-badge" style="background:${QURAN_GRADE_BG[grade]||'#f3f4f6'};color:${QURAN_GRADE_COLOR[grade]||'#374151'}">${grade}</span>`
      : '';
    const typeHtml = r.latest
      ? `<span style="font-size:11px;color:var(--text2)">${QURAN_TYPE_AR[r.latest.type]||''}</span>` : '';
    const dateHtml = r.latest
      ? `<span style="font-size:11px;color:var(--text2)">${formatHijri(r.latest.date)}</span>` : '';
    const hasData = r.totalEntries > 0;

    const card = document.createElement('div');
    card.className = 'quran-student-card' + (hasData ? '' : ' quran-card-empty');
    card.innerHTML = `
      <div class="quran-card-top">
        <div class="quran-card-avatar">${r.name.charAt(0)}</div>
        <div class="quran-card-info">
          <div class="quran-card-name">${r.name}</div>
          <div class="quran-card-class">${cls?.name||'—'} · ${r.totalEntries} جلسة</div>
        </div>
        ${gradeHtml}
      </div>
      <div class="quran-card-pos">${hasData ? `📍 ${pos}` : '📍 لم يُسجَّل بعد'}</div>
      <div class="quran-card-meta">${typeHtml}${typeHtml&&dateHtml?' · ':''}${dateHtml}</div>
      <div class="quran-card-actions">
        <button class="btn-secondary" style="font-size:12px;flex:1" onclick="viewStudentQuranHistory('${r.studentId}','${r.name}')">📋 السجل</button>
        <button class="btn-secondary" style="font-size:12px;padding:6px 8px" title="تحميل Excel" onclick="window.open('${API}/reports/quran/student/${r.studentId}','_blank')">📥</button>
        <button class="btn-primary"   style="font-size:12px;flex:1" onclick="openProgressModal('${r.studentId}')">+ تسجيل</button>
      </div>`;
    grid.appendChild(card);
  });
}

async function viewStudentQuranHistory(studentId, name) {
  _quranViewStudentId = studentId;
  document.getElementById('quranStudentModalTitle').textContent = `📖 سجل تقدم القرآن — ${name}`;
  const body = document.getElementById('quranStudentModalBody');
  body.innerHTML = '<p style="color:var(--text2);font-size:13px">⏳ جارٍ التحميل…</p>';
  document.getElementById('quranStudentModal').classList.remove('hidden');

  const list = await apiFetch(`/quran-progress?studentId=${studentId}`) || [];
  if (list.length === 0) {
    body.innerHTML = '<p style="color:var(--text2);font-size:13px;padding:12px 0">لا توجد سجلات بعد.</p>'; return;
  }
  body.innerHTML = `
    <div style="overflow-x:auto">
      <table class="history-table">
        <thead><tr><th>التاريخ</th><th>النوع</th><th>الموقع</th><th>التقييم</th><th>ملاحظات</th><th></th></tr></thead>
        <tbody>${list.map(p=>`
          <tr>
            <td style="font-size:12px;white-space:nowrap">${formatHijri(p.date)}</td>
            <td style="font-size:11px">${QURAN_TYPE_AR[p.type]||p.type}</td>
            <td style="font-size:12px">${formatQPPosition(p)}</td>
            <td>${p.grade?`<span class="qp-grade-badge" style="background:${QURAN_GRADE_BG[p.grade]||'#f3f4f6'};color:${QURAN_GRADE_COLOR[p.grade]||'#374151'}">${p.grade}</span>`:'—'}</td>
            <td style="font-size:12px;color:var(--text2);max-width:140px">${p.notes||'—'}</td>
            <td><button class="btn-icon" onclick="deleteProgress('${p.id}','${studentId}','modal')">🗑</button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function deleteProgress(id, studentId, context) {
  if (!confirm('هل تريد حذف هذا السجل؟')) return;
  await apiFetch(`/quran-progress/${id}`, { method:'DELETE' });
  toast('🗑 تم حذف السجل');
  if (context === 'modal') {
    const s = state.students.find(x=>x.id===studentId);
    await viewStudentQuranHistory(studentId, s?.name||'');
  } else {
    await loadQuranSummary();
    viewStudent(studentId);
  }
}

let _qpDefaultStudentId = null;

function openProgressModal(studentId=null) {
  _qpDefaultStudentId = studentId || null;
  document.getElementById('qpId').value = '';
  document.getElementById('quranModalTitle').textContent = '📖 تسجيل تقدم القرآن';

  // populate student dropdown
  const sel = document.getElementById('qpStudentId');
  sel.innerHTML = '<option value="">— اختر الطالب —</option>';
  state.students.forEach(s => {
    const o = document.createElement('option'); o.value=s.id; o.textContent=s.name;
    if (s.id === studentId) o.selected = true;
    sel.appendChild(o);
  });

  // populate surah dropdowns
  ['qpSurahFrom','qpSurahTo'].forEach(id => {
    const s = document.getElementById(id);
    s.innerHTML = '<option value="">— اختر السورة —</option>';
    SURAHS.forEach(sr => {
      const o = document.createElement('option'); o.value=sr.n;
      o.textContent = `${sr.n}. ${sr.name} (الجزء ${sr.juz})`; s.appendChild(o);
    });
  });

  // defaults
  document.getElementById('qpDate').value = todayISO();
  updateHijriLabel(document.getElementById('qpDate'), 'qpDateHijri');
  document.getElementById('qpType').value     = 'memorization';
  document.getElementById('qpGrade').value    = '';
  document.getElementById('qpNotes').value    = '';
  document.getElementById('qpAyahFrom').value = '';
  document.getElementById('qpAyahTo').value   = '';
  document.getElementById('qpPageFrom').value = '';
  document.getElementById('qpPageTo').value   = '';
  document.getElementById('qpJuz').value      = '';
  document.getElementById('qpSurahFrom').value= '';
  document.getElementById('qpSurahTo').value  = '';

  // if student given, pre-fill juz from their last entry
  if (studentId) onQpStudentChange();

  document.getElementById('quranProgressModal').classList.remove('hidden');
}

async function onQpStudentChange() {
  const studentId = document.getElementById('qpStudentId').value;
  if (!studentId) return;
  const list = await apiFetch(`/quran-progress?studentId=${studentId}`) || [];
  if (list.length) {
    const last = list[0];
    if (last.juz)        document.getElementById('qpJuz').value       = last.juz;
    if (last.surahToNum) document.getElementById('qpSurahFrom').value = last.surahToNum;
    if (last.ayahTo)     document.getElementById('qpAyahFrom').value  = +last.ayahTo + 1;
    if (last.pageTo)     document.getElementById('qpPageFrom').value  = +last.pageTo + 1;
  }
}

async function saveProgress() {
  const studentId  = document.getElementById('qpStudentId').value;
  const date       = document.getElementById('qpDate').value;
  const type       = document.getElementById('qpType').value;
  const surahFromN = +document.getElementById('qpSurahFrom').value || null;
  const surahToN   = +document.getElementById('qpSurahTo').value   || null;
  const surahFromName = surahFromN ? SURAHS.find(s=>s.n===surahFromN)?.name : null;
  const surahToName   = surahToN   ? SURAHS.find(s=>s.n===surahToN)?.name   : null;

  if (!studentId) return toast('يرجى اختيار الطالب');
  if (!date)      return toast('يرجى تحديد التاريخ');
  if (!surahFromN && !document.getElementById('qpJuz').value && !document.getElementById('qpPageFrom').value)
    return toast('يرجى تحديد الموقع (سورة أو جزء أو صفحة)');

  const s = state.students.find(x=>x.id===studentId);
  const payload = {
    studentId, classId: s?.classId||'', date, type,
    surahFromNum:  surahFromN,  surahFromName,
    surahToNum:    surahToN || surahFromN, surahToName: surahToName||surahFromName,
    ayahFrom:  +document.getElementById('qpAyahFrom').value || null,
    ayahTo:    +document.getElementById('qpAyahTo').value   || null,
    juz:       +document.getElementById('qpJuz').value      || null,
    pageFrom:  +document.getElementById('qpPageFrom').value || null,
    pageTo:    +document.getElementById('qpPageTo').value   || null,
    grade:     document.getElementById('qpGrade').value     || '',
    notes:     document.getElementById('qpNotes').value.trim(),
  };

  const existingId = document.getElementById('qpId').value;
  if (existingId) {
    await apiFetch(`/quran-progress/${existingId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    toast('✅ تم تحديث السجل');
  } else {
    await apiFetch('/quran-progress', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    toast('✅ تم حفظ التقدم');
  }
  closeModal('quranProgressModal');
  if (state.currentPage === 'quran') await loadQuranSummary();
}
// ══════════════════════════════════════════════════════════════════
//  صفحة واتساب — WhatsApp Manager
// ══════════════════════════════════════════════════════════════════

let _waQueueData   = [];   // items from /api/whatsapp/queue
let _waLogData     = [];   // items from /api/whatsapp/log
let _waGroupsData  = [];   // [{id, name, members}]
let _editingGroupId = null;
let _waComposeRecipients = []; // [{name,phone}] for compose tab

// ── الدخول للصفحة ────────────────────────────────────────────────
async function initWhatsappPage() {
  await Promise.all([
    waLoadQueue(),
    waLoadGroups(),      // still needed for send-tab picker
    waLoadLog(),
    waLoadScheduled(),
    waLoadFonnteGroups(), // Fonnte WhatsApp groups tab
  ]);
  waShowTab('queue');
  waUpdateNavBadge();
}

// ── تحميل البيانات ───────────────────────────────────────────────
async function waLoadQueue() {
  const data = await apiFetch('/whatsapp/queue');
  _waQueueData = data || [];
  waRenderQueue();
}

async function waLoadGroups() {
  const data = await apiFetch('/whatsapp/groups');
  _waGroupsData = data || [];
  waRenderGroups();
  waPopulateGroupPicker();
}

async function waLoadLog() {
  const [logData, calData] = await Promise.all([
    apiFetch('/whatsapp/log'),
    apiFetch('/calendar'),
  ]);
  _waLogData   = logData || [];
  _waSchedData = (calData || []).filter(e => e.type === 'message');
  waRenderLog();
}

// ── شارة الانتظار في الناف ───────────────────────────────────────
async function waUpdateNavBadge() {
  const data  = await apiFetch('/whatsapp/queue');
  const count = (data||[]).length;
  const badge = document.getElementById('waQueueBadge');
  const tabCount = document.getElementById('waTabCount');
  if (badge) {
    badge.textContent = count > 0 ? count : '';
    badge.classList.toggle('hidden', count === 0);
  }
  if (tabCount) {
    tabCount.textContent = count;
    tabCount.classList.toggle('hidden', count === 0);
  }
}

// ── تبديل التبويبات ──────────────────────────────────────────────
function waShowTab(tab) {
  document.querySelectorAll('.wa-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.wa-tab-panel').forEach(p => p.classList.add('hidden'));
  document.getElementById(`waTab-${tab}`)?.classList.remove('hidden');
}

// ══════════════════════════════════════════════════════════════════
//  تبويب: قائمة الانتظار
// ══════════════════════════════════════════════════════════════════
function waRenderQueue() {
  const list = document.getElementById('waQueueList');
  const info = document.getElementById('waQueueInfo');
  const btn  = document.getElementById('waSendQueueBtn');
  if (!list) return;

  const q = _waQueueData;
  if (info) info.textContent = q.length === 0
    ? '✅ لا توجد رسائل معلقة' : `${q.length} رسالة غياب لم تُرسل بعد`;

  if (q.length === 0) {
    list.innerHTML = `
      <div class="wa-empty">
        <div class="wa-empty-icon">✅</div>
        <div class="wa-empty-title">كل الرسائل أُرسلت!</div>
        <div class="wa-empty-sub">لا توجد إشعارات غياب معلقة حتى الآن</div>
      </div>`;
    if (btn) btn.disabled = true;
    return;
  }

  // Group by date
  const byDate = {};
  q.forEach(item => {
    if (!byDate[item.date]) byDate[item.date] = [];
    byDate[item.date].push(item);
  });

  list.innerHTML = Object.entries(byDate)
    .sort(([a],[b]) => b.localeCompare(a))
    .map(([date, items]) => `
      <div class="wa-queue-group">
        <div class="wa-queue-date-header">
          <label class="wa-check-all-label">
            <input type="checkbox" class="wa-date-check" data-date="${date}"
              onchange="waToggleDateGroup('${date}', this.checked)" />
            <span class="wa-queue-date">${formatDateAr(date)}</span>
          </label>
          <span class="wa-queue-date-count">${items.length} طالب</span>
        </div>
        ${items.map(item => `
          <div class="wa-queue-item" id="wqi-${item.attendanceId}">
            <label class="wa-queue-item-label">
              <input type="checkbox" class="wa-queue-check" data-id="${item.attendanceId}"
                data-student="${item.studentId}" data-name="${item.studentName}"
                data-phone="${item.phone}" data-class="${item.className}"
                data-classid="${item.classId}" data-date="${item.date}"
                onchange="waUpdateSendBtn()" />
              <div class="wa-queue-avatar">${item.studentName.charAt(0)}</div>
              <div class="wa-queue-info">
                <div class="wa-queue-name">${item.studentName}</div>
                <div class="wa-queue-meta">${item.className} · ${item.date}</div>
              </div>
            </label>
            <div class="wa-queue-phone">
              ${item.phone
                ? `<span class="wa-phone-chip">${item.phone}</span>`
                : `<input type="tel" class="wa-phone-inline" placeholder="أدخل الرقم"
                    data-id="${item.attendanceId}" onchange="waPhoneInlineChange(this)" />`
              }
            </div>
            <div class="wa-queue-item-status" id="wqs-${item.attendanceId}"></div>
            <button class="wa-queue-dismiss" onclick="waDismissItem('${item.attendanceId}','${item.studentId}','${item.date}')" title="حذف من القائمة">🗑</button>
          </div>
        `).join('')}
      </div>
    `).join('');

  if (btn) btn.disabled = false;
}

function waToggleDateGroup(date, checked) {
  document.querySelectorAll(`.wa-queue-check[data-date="${date}"]`).forEach(cb => {
    cb.checked = checked;
  });
  waUpdateSendBtn();
}

function waSelectAllQueue() {
  const all = document.querySelectorAll('.wa-queue-check');
  const anyUnchecked = [...all].some(cb => !cb.checked);
  all.forEach(cb => cb.checked = anyUnchecked);
  document.querySelectorAll('.wa-date-check').forEach(cb => cb.checked = anyUnchecked);
  waUpdateSendBtn();
}

function waUpdateSendBtn() {
  const count = document.querySelectorAll('.wa-queue-check:checked').length;
  const btn   = document.getElementById('waSendQueueBtn');
  if (btn) {
    btn.disabled   = count === 0;
    btn.textContent = count > 0 ? `📤 إرسال ${count} رسالة` : '📤 إرسال المحدد';
  }
}

function waPhoneInlineChange(input) {
  const id = input.dataset.id;
  const item = _waQueueData.find(x => x.attendanceId === id);
  if (item) item.phone = input.value.trim();
}

async function waSendSelected() {
  const checked = [...document.querySelectorAll('.wa-queue-check:checked')];
  if (!checked.length) return;

  const btn = document.getElementById('waSendQueueBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ جارٍ الإرسال…'; }

  const items = checked.map(cb => ({
    attendanceId: cb.dataset.id,
    studentId:    cb.dataset.student,
    studentName:  cb.dataset.name,
    phone:        cb.dataset.phone || document.querySelector(`.wa-phone-inline[data-id="${cb.dataset.id}"]`)?.value?.trim() || '',
    className:    cb.dataset.class,
    classId:      cb.dataset.classid,
    date:         cb.dataset.date,
  }));

  // Show spinner on each row
  items.forEach(item => {
    const el = document.getElementById(`wqs-${item.attendanceId}`);
    if (el) el.innerHTML = `<span class="wa-status-spin">⏳</span>`;
  });

  const res = await apiFetch('/whatsapp/queue/send', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });

  if (res?.results) {
    res.results.forEach((r, i) => {
      const id = items[i]?.attendanceId;
      const el = document.getElementById(`wqs-${id}`);
      if (r.ok) {
        if (el) el.innerHTML = `<span class="wa-status-ok">✅ تم</span>`;
        // Remove from queue after success
        setTimeout(() => {
          document.getElementById(`wqi-${id}`)?.remove();
          _waQueueData = _waQueueData.filter(x => x.attendanceId !== id);
        }, 1200);
      } else {
        if (el) el.innerHTML = `<span class="wa-status-fail" title="${r.error}">❌ فشل</span>`;
      }
    });
    toast(`📬 الإرسال: ✅ ${res.sent} نجح | ❌ ${res.failed} فشل`);
    showWaSummaryNotif(res.sent, res.failed);
  } else if (res?.error) {
    toast(`❌ ${res.error}`);
  }

  await waLoadQueue();
  waUpdateNavBadge();
  if (btn) { btn.disabled = false; btn.textContent = '📤 إرسال المحدد'; }
  // Refresh log
  await waLoadLog();
}

// ══════════════════════════════════════════════════════════════════
//  تبويب: رسالة جديدة
// ══════════════════════════════════════════════════════════════════
function waPopulateGroupPicker() {
  const sel = document.getElementById('waGroupPicker');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">— اختر مجموعة —</option>' +
    _waGroupsData.map(g => `<option value="${g.id}">${g.name} (${g.members.length})</option>`).join('');
  sel.value = current;
}

function waPickGroup() {
  const id = document.getElementById('waGroupPicker')?.value;
  if (!id) return;
  const group = _waGroupsData.find(g => g.id === id);
  if (!group) return;
  group.members.forEach(m => {
    if (!_waComposeRecipients.find(r => r.phone === m.phone))
      _waComposeRecipients.push({...m});
  });
  waRenderComposeRecipients();
  document.getElementById('waGroupPicker').value = '';
}

function waAddRecipientRow() {
  _waComposeRecipients.push({ name: '', phone: '' });
  waRenderComposeRecipients();
}

function waRenderComposeRecipients() {
  const el = document.getElementById('waRecipientList');
  if (!el) return;
  if (_waComposeRecipients.length === 0) {
    el.innerHTML = `<div class="wa-recipients-empty">لا يوجد مستلمون — أضف مجموعة أو رقماً يدوياً</div>`;
    return;
  }
  el.innerHTML = _waComposeRecipients.map((r, i) => `
    <div class="wa-recipient-row" id="wcrr-${i}">
      <input type="text" class="wa-rec-name" placeholder="الاسم (اختياري)"
        value="${r.name}" onchange="_waComposeRecipients[${i}].name=this.value" />
      <input type="tel" class="wa-rec-phone" placeholder="رقم الواتساب"
        value="${r.phone}" onchange="_waComposeRecipients[${i}].phone=this.value"
        dir="ltr" />
      <button class="wa-rec-del" onclick="waRemoveRecipient(${i})">✕</button>
    </div>
  `).join('');
}

function waRemoveRecipient(i) {
  _waComposeRecipients.splice(i, 1);
  waRenderComposeRecipients();
}

async function waSendCustom() {
  const message = document.getElementById('waCustomMsg')?.value?.trim();
  const status  = document.getElementById('waCustomStatus');
  const btn     = document.getElementById('waSendCustomBtn');

  if (!message) { toast('⚠️ الرسالة فارغة'); return; }
  // collect latest values from inputs
  _waComposeRecipients = _waComposeRecipients.map((r, i) => ({
    name:  document.querySelector(`#wcrr-${i} .wa-rec-name`)?.value?.trim()  || r.name,
    phone: document.querySelector(`#wcrr-${i} .wa-rec-phone`)?.value?.trim() || r.phone,
  }));
  const targets = _waComposeRecipients.filter(r => r.phone);
  if (!targets.length) { toast('⚠️ أضف مستلماً واحداً على الأقل'); return; }

  btn.disabled = true;
  if (status) { status.textContent = '⏳ جارٍ الإرسال…'; status.className = 'wa-compose-status'; }

  const res = await apiFetch('/whatsapp/send-custom', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, targets }),
  });

  if (res?.results) {
    if (status) {
      status.textContent = `✅ تم الإرسال: ${res.sent} | ❌ فشل: ${res.failed}`;
      status.className = 'wa-compose-status ' + (res.failed > 0 ? 'wa-status-warn' : 'wa-status-ok-text');
    }
    toast(`✅ إرسال ${res.sent}/${targets.length}`);
    await waLoadLog();
    waShowTab('log');
  } else {
    if (status) { status.textContent = `❌ ${res?.error||'فشل الإرسال'}`; status.className = 'wa-compose-status wa-status-fail-text'; }
  }
  btn.disabled = false;
}

// ══════════════════════════════════════════════════════════════════
//  تبويب: المجموعات — Fonnte WhatsApp Groups
// ══════════════════════════════════════════════════════════════════
let _waFonnteGroups = [];   // [{id, name}] fetched from Fonnte

// Get the saved Fonnte token from state or settings
async function _getFonnteToken() {
  if (state.settings?.whatsappApiKey) return state.settings.whatsappApiKey;
  const s = await apiFetch('/settings');
  const tok = s?.whatsappApiKey || '';
  if (!state.settings) state.settings = {};
  state.settings.whatsappApiKey = tok;
  return tok;
}

// Load cached group list from Fonnte (fast, no WA interaction)
async function waLoadFonnteGroups() {
  const el = document.getElementById('waGroupsList');
  if (el) el.innerHTML = `<div class="wa-fg-loading"><span class="wa-fg-spinner"></span> جارٍ تحميل المجموعات…</div>`;

  const token = await _getFonnteToken();
  if (!token) {
    waRenderFonnteGroups(null, 'no-token');
    return;
  }
  try {
    const res  = await fetch('https://api.fonnte.com/get-whatsapp-group', {
      method: 'POST',
      headers: { 'Authorization': token },
    });
    const data = await res.json();
    if (data.status === false) {
      waRenderFonnteGroups(null, data.detail || 'error');
    } else {
      _waFonnteGroups = data.data || [];
      waRenderFonnteGroups(_waFonnteGroups, null);
    }
  } catch(e) {
    waRenderFonnteGroups(null, 'network');
  }
}

// Refresh: tell Fonnte to re-fetch from WhatsApp first, then load
async function waRefreshFonnteGroups() {
  const btn = document.getElementById('waFgRefreshBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ جارٍ التحديث…'; }

  const token = await _getFonnteToken();
  if (!token) { toast('⚠️ أدخل Fonnte Token في الإعدادات أولاً'); if (btn) { btn.disabled=false; btn.textContent='🔄 تحديث من WhatsApp'; } return; }

  try {
    toast('⏳ جارٍ جلب المجموعات من WhatsApp… قد يستغرق بضع ثوانٍ');
    await fetch('https://api.fonnte.com/fetch-group', {
      method: 'POST',
      headers: { 'Authorization': token },
    });
  } catch(e) { /* non-fatal */ }

  await waLoadFonnteGroups();
  if (btn) { btn.disabled = false; btn.textContent = '🔄 تحديث من WhatsApp'; }
  toast('✅ تم تحديث قائمة المجموعات');
}

function waRenderFonnteGroups(groups, errorType) {
  const el = document.getElementById('waGroupsList');
  if (!el) return;

  if (errorType === 'no-token') {
    el.innerHTML = `
      <div class="wa-fg-error">
        <div class="wa-fg-error-icon">🔑</div>
        <div class="wa-fg-error-title">لا يوجد Fonnte Token</div>
        <div class="wa-fg-error-sub">أضف الـ Token في صفحة الإعدادات (إعدادات واتساب) ثم حاول مجدداً.</div>
        <button class="btn-secondary" onclick="navigate('settings')">⚙️ الإعدادات</button>
      </div>`;
    return;
  }

  if (errorType === 'network') {
    el.innerHTML = `
      <div class="wa-fg-error">
        <div class="wa-fg-error-icon">📡</div>
        <div class="wa-fg-error-title">تعذّر الاتصال بـ Fonnte</div>
        <div class="wa-fg-error-sub">تأكد من الاتصال بالإنترنت وصحة الـ Token، ثم اضغط تحديث.</div>
      </div>`;
    return;
  }

  if (errorType) {
    // e.g. "cannot fetch with disconnected device"
    el.innerHTML = `
      <div class="wa-fg-error">
        <div class="wa-fg-error-icon">⚠️</div>
        <div class="wa-fg-error-title">خطأ من Fonnte</div>
        <div class="wa-fg-error-sub">${errorType}</div>
        <div class="wa-fg-error-hint">إذا لم تُحدِّث قائمة المجموعات من قبل، اضغط «تحديث من WhatsApp» أعلاه.</div>
      </div>`;
    return;
  }

  if (!groups || groups.length === 0) {
    el.innerHTML = `
      <div class="wa-empty">
        <div class="wa-empty-icon">👥</div>
        <div class="wa-empty-title">لا توجد مجموعات</div>
        <div class="wa-empty-sub">اضغط «تحديث من WhatsApp» لجلب المجموعات التي أنت فيها من Fonnte.</div>
      </div>`;
    return;
  }

  el.innerHTML = groups.map(g => `
    <div class="wa-fg-card">
      <div class="wa-fg-card-icon">👥</div>
      <div class="wa-fg-card-info">
        <div class="wa-fg-card-name">${g.name}</div>
        <div class="wa-fg-card-id" dir="ltr">${g.id}</div>
      </div>
      <div class="wa-fg-card-actions">
        <button class="wa-fg-btn wa-fg-send"     onclick="waFgSendNow('${g.id}', '${g.name.replace(/'/g,'\\\'')}')"    title="إرسال الآن">📤 إرسال</button>
        <button class="wa-fg-btn wa-fg-schedule" onclick="waFgSchedule('${g.id}', '${g.name.replace(/'/g,'\\\'')}')"  title="جدولة رسالة">📅 جدولة</button>
      </div>
    </div>
  `).join('');
}

// إرسال الآن: انتقل لتبويب الإرسال مع ملء معرّف المجموعة
function waFgSendNow(groupId, groupName) {
  waShowTab('send');
  const inp = document.getElementById('waGroupChatId');
  const lbl = document.getElementById('waGroupChatLabel');
  if (inp) {
    inp.value = groupId;
    // Highlight it briefly
    inp.style.transition = 'box-shadow 0.3s';
    inp.style.boxShadow  = '0 0 0 3px var(--primary-l)';
    setTimeout(() => { inp.style.boxShadow = ''; }, 1200);
  }
  if (lbl) lbl.textContent = `💬 إرسال لـ: ${groupName}`;
  document.getElementById('waGroupChatMsg')?.focus();
  toast(`📋 تم تحديد: ${groupName}`);
}

// جدولة: افتح نافذة حدث التقويم مع ملء المعلومات
function waFgSchedule(groupId, groupName) {
  openCalEventModal(null, null, null, true);
  setTimeout(() => {
    const titleEl = document.getElementById('calEventTitle');
    if (titleEl && !titleEl.value) titleEl.value = `رسالة لـ ${groupName}`;

    // Add the group directly into _calWaRows so validation passes
    if (!_calWaRows.find(r => r.phone === groupId)) {
      _calWaRows.push({ name: groupName, phone: groupId, isGroup: true });
      _renderCalWaRows();
    }

    _waFgPendingGroupId   = groupId;
    _waFgPendingGroupName = groupName;

    const body = document.querySelector('#calEventModal .modal-body');
    if (body && !document.getElementById('waFgGroupHint')) {
      const hint = document.createElement('div');
      hint.id        = 'waFgGroupHint';
      hint.className = 'wa-fg-modal-hint';
      hint.innerHTML = `📱 ستُرسَل هذه الرسالة لمجموعة: <strong>${groupName}</strong>`;
      body.insertBefore(hint, body.firstChild);
    }
  }, 120);
}

let _waFgPendingGroupId   = null;
let _waFgPendingGroupName = null;

// Keep old group functions for the contact-group picker in send tab
function waMemberRowHTML(i, name='', phone='') {
  return `<div class="wa-member-row" id="wmr-${i}">
    <input type="text" class="wm-name"  placeholder="الاسم" value="${name}"  />
    <input type="tel"  class="wm-phone" placeholder="رقم الواتساب" value="${phone}" dir="ltr" />
    <button class="wa-rec-del" onclick="this.parentElement.remove()">✕</button>
  </div>`;
}
function waAddMemberRow() {
  const list = document.getElementById('waGroupMembersList');
  const idx  = list.children.length;
  list.insertAdjacentHTML('beforeend', waMemberRowHTML(idx));
}
function waImportFromClass() {
  const sel = document.getElementById('waImportClassSel');
  sel.classList.toggle('hidden');
  if (!sel.classList.contains('hidden')) {
    sel.innerHTML = '<option value="">— اختر الحلقة —</option>' +
      state.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  }
}
function waDoImportClass() {
  const classId = document.getElementById('waImportClassSel').value;
  if (!classId) return;
  const students = state.students.filter(s => s.classId === classId && s.parentPhone);
  const list = document.getElementById('waGroupMembersList');
  students.forEach(s => {
    const idx = list.children.length;
    list.insertAdjacentHTML('beforeend', waMemberRowHTML(idx, s.name, s.parentPhone));
  });
  document.getElementById('waImportClassSel').classList.add('hidden');
  document.getElementById('waImportClassSel').value = '';
  toast(`✅ تم استيراد ${students.length} طالب`);
}
async function waSaveGroup() {
  const name = document.getElementById('waGroupName').value.trim();
  if (!name) { toast('⚠️ أدخل اسم المجموعة'); return; }
  const rows = document.querySelectorAll('#waGroupMembersList .wa-member-row');
  const members = [...rows].map(row => ({
    name:  row.querySelector('.wm-name')?.value?.trim()  || '',
    phone: row.querySelector('.wm-phone')?.value?.trim() || '',
  })).filter(m => m.phone);
  if (_editingGroupId) {
    await apiFetch(`/whatsapp/groups/${_editingGroupId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,members}) });
    toast('✅ تم تحديث المجموعة');
  } else {
    await apiFetch('/whatsapp/groups', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,members}) });
    toast('✅ تم إنشاء المجموعة');
  }
  closeModal('waGroupModal');
  await waLoadGroups();
}
async function waDeleteGroup(id) {
  const g = _waGroupsData.find(x => x.id === id);
  if (!confirm(`حذف مجموعة "${g?.name}"؟`)) return;
  await apiFetch(`/whatsapp/groups/${id}`, { method:'DELETE' });
  toast('🗑 تم الحذف');
  await waLoadGroups();
}
function waSendToGroup(id) {
  const g = _waGroupsData.find(x => x.id === id);
  if (!g) return;
  _waComposeRecipients = g.members.map(m => ({...m}));
  waRenderComposeRecipients();
  waShowTab('send');
  document.getElementById('waCustomMsg')?.focus();
}

// ══════════════════════════════════════════════════════════════════
//  تبويب: السجل
// ══════════════════════════════════════════════════════════════════
// ── Bulk select state ───────────────────────────────────────────────
let _waLogSelected = new Set();   // set of entry IDs

function _waLogUpdateBulkBar() {
  const bar = document.getElementById('waLogBulkBar');
  const cnt = document.getElementById('waLogBulkCount');
  const btn = document.getElementById('waLogBulkDeleteBtn');
  const anySelected = _waLogSelected.size > 0;
  if (bar) bar.classList.toggle('hidden', !anySelected);
  if (cnt) cnt.textContent = _waLogSelected.size + ' محدد';
  if (btn) btn.disabled = !anySelected;
}

function waLogToggleItem(id) {
  if (_waLogSelected.has(id)) _waLogSelected.delete(id);
  else _waLogSelected.add(id);
  const el = document.querySelector(`[data-log-id="${CSS.escape(id)}"]`);
  if (el) el.classList.toggle('wa-log-item-selected', _waLogSelected.has(id));
  const cb = el?.querySelector('.wa-log-cb');
  if (cb) cb.checked = _waLogSelected.has(id);
  _waLogUpdateBulkBar();
}

function waLogSelectAll() {
  const items = document.querySelectorAll('#waLogList .wa-log-item[data-log-id]');
  const allSelected = items.length > 0 && _waLogSelected.size === items.length;
  _waLogSelected.clear();
  if (!allSelected) items.forEach(el => _waLogSelected.add(el.dataset.logId));
  items.forEach(el => {
    const sel = _waLogSelected.has(el.dataset.logId);
    el.classList.toggle('wa-log-item-selected', sel);
    const cb = el.querySelector('.wa-log-cb');
    if (cb) cb.checked = sel;
  });
  _waLogUpdateBulkBar();
}

async function waLogDeleteSelected() {
  if (_waLogSelected.size === 0) return;
  if (!confirm(`حذف ${_waLogSelected.size} رسالة؟`)) return;
  const btn = document.getElementById('waLogBulkDeleteBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ جارٍ الحذف…'; }

  for (const id of [..._waLogSelected]) {
    if (id.startsWith('sched_')) {
      await apiFetch(`/calendar/${id.replace('sched_','')}`, { method: 'DELETE' });
      _waSchedData = _waSchedData.filter(e => 'sched_'+e.id !== id);
    } else {
      await apiFetch(`/whatsapp/log/${id}`, { method: 'DELETE' });
      _waLogData = _waLogData.filter(l => l.id !== id);
    }
  }
  const count = _waLogSelected.size;
  _waLogSelected.clear();
  if (btn) { btn.textContent = '🗑 حذف المحدد'; }
  waRenderLog();
  toast(`🗑 تم حذف ${count} رسالة`);
}

function waRenderLog() {
  const el          = document.getElementById('waLogList');
  const filter      = document.getElementById('waLogFilter')?.value || '';
  const hideCustom  = document.getElementById('waLogHideCustom')?.checked || false;
  if (!el) return;

  // ── Merge real log entries with scheduled messages ──────────────
  const today   = todayISO();
  const nowTime = new Date().toTimeString().slice(0, 5);

  // Scheduled messages from calendar (type==='message')
  const schedEntries = _waSchedData.map(ev => {
    const isPastDate = ev.date < today || (ev.date === today && ev.time && ev.time <= nowTime);
    const isFonnteScheduled = ev.fonnteScheduled?.length > 0;
    let status;
    if (isFonnteScheduled && isPastDate) status = 'sent';
    else if (isFonnteScheduled)          status = 'scheduled';
    else if (isPastDate)                 status = 'expired';
    else                                 status = 'pending';
    return {
      id:        'sched_' + ev.id,
      type:      'scheduled',
      status,
      studentName: ev.title || '—',
      phone:     (ev.waTargets || []).length + ' مستلم',
      sentAt:    ev.date + (ev.time ? 'T' + ev.time : 'T00:00'),
      className: '',
      error:     null,
      _isScheduled: true,
      _targets:  ev.waTargets || [],
      _msg:      ev.waMessage || '',
    };
  });

  // Combine, real log first (newest first), scheduled below
  let combined = [
    ...[...(_waLogData || [])].reverse(),
    ...schedEntries,
  ];

  // ── Apply filters ────────────────────────────────────────────────
  if (hideCustom)             combined = combined.filter(l => l.type !== 'custom');
  if (filter === 'absence')   combined = combined.filter(l => l.type === 'absence');
  if (filter === 'custom')    combined = combined.filter(l => l.type === 'custom');
  if (filter === 'scheduled') combined = combined.filter(l => l.type === 'scheduled');
  if (filter === 'sent')      combined = combined.filter(l => l.status === 'sent');
  if (filter === 'failed')    combined = combined.filter(l => l.status === 'failed');
  if (filter === 'pending')   combined = combined.filter(l => l.status === 'pending' || l.status === 'scheduled');

  if (combined.length === 0) {
    el.innerHTML = `
      <div class="wa-empty">
        <div class="wa-empty-icon">🕐</div>
        <div class="wa-empty-title">السجل فارغ</div>
        <div class="wa-empty-sub">ستظهر هنا كل الرسائل المرسلة والمجدولة</div>
      </div>`;
    return;
  }

  el.innerHTML = combined.map(entry => {
    const isAbsence   = entry.type === 'absence';
    const isScheduled = entry.type === 'scheduled';

    // Status styling
    let statusClass, dotClass, statusLabel;
    if (entry.status === 'sent') {
      statusClass = 'wa-log-sent';   dotClass = 'wa-dot-sent';    statusLabel = '✅ أُرسلت';
    } else if (entry.status === 'failed') {
      statusClass = 'wa-log-failed'; dotClass = 'wa-dot-failed';   statusLabel = '❌ فشلت';
    } else if (entry.status === 'scheduled') {
      statusClass = 'wa-log-sched';  dotClass = 'wa-dot-sched';    statusLabel = '🕐 مجدول';
    } else if (entry.status === 'expired') {
      statusClass = 'wa-log-expired';dotClass = 'wa-dot-expired';  statusLabel = '✅ انتهى وقتها';
    } else {
      statusClass = 'wa-log-pending';dotClass = 'wa-dot-pending';  statusLabel = '⏳ في الانتظار';
    }

    // Type badge
    let typeBadge;
    if      (isAbsence)   typeBadge = `<span class="wa-log-type-badge wa-badge-absence">غياب</span>`;
    else if (isScheduled) typeBadge = `<span class="wa-log-type-badge wa-badge-sched">مجدولة</span>`;
    else                  typeBadge = `<span class="wa-log-type-badge wa-badge-custom">مخصص</span>`;

    const timeStr = entry.sentAt
      ? new Date(entry.sentAt).toLocaleString('ar-SA', {hour:'2-digit', minute:'2-digit', day:'2-digit', month:'2-digit'})
      : '—';

    const deleteBtn = entry._isScheduled
      ? `<button class="wa-log-del" onclick="waDeleteScheduled('${entry.id.replace('sched_','')}'); waRenderLog();" title="حذف">🗑</button>`
      : `<button class="wa-log-del" onclick="waDeleteLogEntry('${entry.id}')" title="حذف">🗑</button>`;

    const isSelected = _waLogSelected.has(entry.id);
    const cbHtml = `<label class="wa-log-cb-wrap" onclick="event.stopPropagation()"><input type="checkbox" class="wa-log-cb" data-id="${entry.id}" ${isSelected?'checked':''} onchange="waLogToggleItem('${entry.id}')" /></label>`;

    return `
      <div class="wa-log-item ${statusClass}${isSelected?' wa-log-item-selected':''}" data-log-id="${entry.id}">
        ${cbHtml}
        <div class="wa-log-item-left">
          <div class="wa-log-status-dot ${dotClass}"></div>
          <div class="wa-log-content">
            <div class="wa-log-recipient">
              ${typeBadge}
              <span class="wa-log-status-pill">${statusLabel}</span>
              ${entry.studentName || entry.phone}
            </div>
            <div class="wa-log-meta">
              ${entry.phone}${entry.className ? ' · ' + entry.className : ''} · ${timeStr}
            </div>
            ${entry.status === 'failed' && entry.error ? `<div class="wa-log-error">${entry.error}</div>` : ''}
            ${isScheduled && entry._msg ? `<div class="wa-log-sched-preview">${entry._msg.slice(0,60)}${entry._msg.length>60?'…':''}</div>` : ''}
          </div>
        </div>
        ${deleteBtn}
      </div>
    `;
  }).join('');
}

async function waDeleteLogEntry(id) {
  await apiFetch(`/whatsapp/log/${id}`, { method: 'DELETE' });
  _waLogData = _waLogData.filter(l => l.id !== id);
  waRenderLog();
}

async function waClearLog() {
  if (!confirm('مسح كامل السجل؟')) return;
  await apiFetch('/whatsapp/log', { method: 'DELETE' });
  _waLogData = [];
  waRenderLog();
  toast('🗑 تم مسح السجل');
}

// ── مساعد تنسيق التاريخ ──────────────────────────────────────────
function formatDateAr(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ar-SA', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

// ══════════════════════════════════════════════════════════════════
//  ملف المعلم — Teacher Profile
// ══════════════════════════════════════════════════════════════════
async function viewTeacher(id) {
  const t = await apiFetch(`/teachers/${id}`);
  if (!t || t.error) return toast('تعذّر تحميل بيانات المعلم');

  const initials       = t.name.trim().split(' ').map(w => w[0]).slice(0, 2).join('');
  const todayLog       = (t.log||[]).find(l => l.date === todayISO());
  const todayStatus    = todayLog
    ? (todayLog.checkOut ? `انصرف ${todayLog.checkOut}` : `حاضر منذ ${todayLog.checkIn}`)
    : 'لم يسجّل الحضور اليوم';
  const todayClass     = todayLog ? (todayLog.checkOut ? 'out' : 'in') : 'absent';
  const totalMins      = t.totalMins      || 0;
  const monthlyMins    = t.monthlyMins    || 0;
  const todayMins      = t.todayMins      || 0;
  const todayLive      = !!t.todayLive;
  const days           = t.daysPresent    || 0;
  const monthlyHistory = t.monthlyHistory || [];

  function fmtHM(m) {
    if (!m) return '0<span class="tp-stat-unit">س</span>';
    const h = Math.floor(m/60), min = m%60;
    return h + '<span class="tp-stat-unit">س</span>' + (min ? min + '<span class="tp-stat-unit">د</span>' : '');
  }
  function fmtDur(m) {
    if (!m || m<=0) return '—';
    const h = Math.floor(m/60), min = m%60;
    return h>0 ? h+'س'+(min?' '+min+'د':'') : min+'د';
  }

  const DAY_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const currentHijri = toHijri(todayISO());

  function buildMonthBlocks() {
    if (!monthlyHistory.length) return '<div class="info-banner">لا توجد سجلات حضور بعد.</div>';
    return monthlyHistory.map(mon => {
      const isCurrent = mon.year===currentHijri.year && mon.month===currentHijri.month;
      const bid = 'tpMonth_'+t.id+'_'+mon.year+'_'+mon.month;
      const rows = mon.logs.map(l => {
        const d = new Date(l.date+'T00:00:00');
        const isFri = d.getDay()===5;
        const m = l.durationMins||0;
        const dur = m>0 ? fmtDur(m) : (l.checkIn&&!l.checkOut?'جارٍ':'—');
        return `<div class="tp-log-row${isFri?' tp-log-row-fri':''}">
          <div class="tp-log-day">
            <div class="tp-log-day-name">${DAY_AR[d.getDay()]}${isFri?' 🟡':''}</div>
            <div class="tp-log-date">${formatHijri(l.date)}</div>
          </div>
          <div class="tp-log-times">
            <span class="tp-log-in">▶ ${l.checkIn||'—'}</span>
            ${l.checkOut?`<span class="tp-log-arrow">←</span><span class="tp-log-out">⏹ ${l.checkOut}</span>`:'<span class="tp-log-arrow" style="opacity:.3">…</span>'}
          </div>
          <div class="tp-log-dur ${m>0?'tp-dur-ok':''}">${dur}</div>
          <span class="checkin-status ${l.checkOut?'out':'in'}">${l.checkOut?'اكتمل':'حاضر'}</span>
        </div>`;
      }).join('');
      const th=Math.floor(mon.totalMins/60), tm=mon.totalMins%60;
      const tot=mon.totalMins>0?(th>0?th+'س ':'')+( tm>0?tm+'د':(th>0?'':'—')):'—';
      return `<div class="tp-month-block ${isCurrent?'tp-month-current':''}">
        <div class="tp-month-header" onclick="tpToggleMonth('${bid}')">
          <div class="tp-month-header-right">
            <span class="tp-month-name">${mon.monthName} ${mon.year}هـ</span>
            ${isCurrent?'<span class="tp-month-badge-current">الشهر الحالي</span>':''}
          </div>
          <div class="tp-month-header-meta">
            <span class="tp-month-days">${mon.days} يوم</span>
            <span class="tp-month-hours">${tot}</span>
            <span class="tp-month-chevron" id="${bid}_chev">${isCurrent?'▲':'▼'}</span>
          </div>
        </div>
        <div class="tp-month-rows" id="${bid}" style="display:${isCurrent?'block':'none'}">
          <div class="tp-log-list">${rows}</div>
        </div>
      </div>`;
    }).join('');
  }

  document.getElementById('teacherProfileBody').innerHTML = `
    <div class="tp-hero">
      <div class="tp-avatar ${t.photo?'':'tp-avatar-initials'}">
        ${t.photo?`<img src="${t.photo}" alt="${t.name}" onerror="this.parentElement.innerHTML='${initials}';this.parentElement.classList.add('tp-avatar-initials')" />`:`<span>${initials}</span>`}
      </div>
      <div class="tp-hero-info">
        <div class="tp-name">${t.name}</div>
        <div class="tp-role">${t.subject||'معلم'}</div>
        <div class="tp-meta-row">
          ${t.teacherId?`<span class="tp-chip tp-chip-id"># ${t.teacherId}</span>`:''}
          ${t.phone?`<a href="tel:${t.phone}" class="tp-chip tp-chip-phone">📞 ${t.phone}</a>`:''}
        </div>
        <span class="checkin-status ${todayClass}" style="margin-top:6px;display:inline-block">${todayStatus}</span>
      </div>
      <button class="btn-secondary tp-edit-btn" onclick="closeModal('teacherProfileModal');openTeacherModal('${t.id}')">✏️ تعديل</button>
    </div>
    <div class="tp-stats">
      <div class="tp-stat tp-stat-blue"><div class="tp-stat-num">${days}</div><div class="tp-stat-lbl">أيام الحضور</div></div>
      <div class="tp-stat tp-stat-purple"><div class="tp-stat-num">${fmtHM(monthlyMins)}</div><div class="tp-stat-lbl">ساعات هذا الشهر</div></div>
      <div class="tp-stat ${todayLive?'tp-stat-live':'tp-stat-amber'}"><div class="tp-stat-num">${todayLive?'🔴 ':''}${fmtHM(todayMins)}</div><div class="tp-stat-lbl">${todayLive?'مباشر الآن':'ساعات اليوم'}</div></div>
      <div class="tp-stat tp-stat-green"><div class="tp-stat-num">${fmtHM(totalMins)}</div><div class="tp-stat-lbl">إجمالي كل الوقت</div></div>
    </div>
    <div class="tp-section-title">📅 السجل الشهري</div>
    <div class="tp-months-container">${buildMonthBlocks()}</div>
    <!-- زر طباعة الملف -->
    <div style="display:flex;justify-content:flex-end;margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">
      <button class="btn-secondary" onclick="printTeacherProfile('${t.id}')">🖨️ طباعة الملف</button>
    </div>
  `;
  document.getElementById('teacherProfileModal').classList.remove('hidden');
}

function tpToggleMonth(bid) {
  const el = document.getElementById(bid), ch = document.getElementById(bid+'_chev');
  if (!el) return;
  const open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if (ch) ch.textContent = open ? '▼' : '▲';
}

// ════════════════════════════════════════════════════════
//  طباعة ملف المعلم
// ════════════════════════════════════════════════════════
async function printTeacherProfile(teacherId) {
  const t = await apiFetch(`/teachers/${teacherId}`);
  if (!t) return;

  const school      = state.settings?.schoolName || 'حضور الحلقات';
  const initials    = t.name.trim().split(' ').map(w => w[0]).slice(0, 2).join('');
  const totalMins   = t.totalMins   || 0;
  const monthlyMins = t.monthlyMins || 0;
  const todayMins   = t.todayMins   || 0;
  const days        = t.daysPresent || 0;
  const monthlyHistory = t.monthlyHistory || [];

  function fmtDur(m) {
    if (!m || m <= 0) return '—';
    const h = Math.floor(m / 60), min = m % 60;
    return h > 0 ? h + 'س' + (min ? ' ' + min + 'د' : '') : min + 'د';
  }

  const DAY_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

  const logRows = monthlyHistory.flatMap(mon =>
    mon.logs.map(l => {
      const d   = new Date(l.date + 'T00:00:00');
      const dur = l.durationMins > 0 ? fmtDur(l.durationMins) : (l.checkIn && !l.checkOut ? 'جارٍ' : '—');
      const statusLabel = l.checkOut ? 'اكتمل' : 'حاضر';
      const statusColor = l.checkOut ? '#16a34a' : '#d97706';
      return `<tr>
        <td>${formatHijri(l.date)}</td>
        <td>${DAY_AR[d.getDay()] || ''}</td>
        <td>${l.checkIn || '—'}</td>
        <td>${l.checkOut || '—'}</td>
        <td style="font-weight:700">${dur}</td>
        <td style="color:${statusColor};font-weight:700">${statusLabel}</td>
      </tr>`;
    })
  ).join('');

  const photoHtml = t.photo
    ? `<img src="${t.photo}" class="profile-photo" alt="${t.name}" />`
    : `<div class="profile-photo-placeholder">${initials}</div>`;

  const todayLog    = (t.log || []).find(l => l.date === todayISO());
  const todayStatus = todayLog
    ? (todayLog.checkOut ? `انصرف ${todayLog.checkOut}` : `حاضر منذ ${todayLog.checkIn}`)
    : 'لم يسجّل الحضور اليوم';

  const html = `<!DOCTYPE html><html dir="rtl"><head>
  <meta charset="UTF-8"><title>ملف المعلم — ${t.name}</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;font-family:Arial,sans-serif}
    body{background:#fff;color:#111;padding:20px 24px;max-width:800px;margin:auto}
    .profile-header{border-bottom:3px solid #1D4ED8;padding-bottom:12px;margin-bottom:14px}
    .profile-header-top{display:flex;align-items:center;gap:16px}
    .profile-photo{width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid #1D4ED8;flex-shrink:0}
    .profile-photo-placeholder{width:72px;height:72px;border-radius:50%;background:#DBEAFE;color:#1D4ED8;font-size:28px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:3px solid #1D4ED8}
    .profile-school{font-size:12px;color:#64748B;font-weight:600;margin-bottom:4px}
    .profile-name{font-size:22px;font-weight:800;color:#1D4ED8;margin-bottom:6px}
    .profile-meta{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#374151;margin-bottom:4px}
    .today-status{display:inline-block;font-size:13px;font-weight:700;padding:4px 12px;border-radius:16px;background:#f0fdf4;color:#16a34a;border:1.5px solid #bbf7d0;margin-top:4px}
    .stats-row{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
    .stat-box{flex:1;min-width:80px;text-align:center;border-radius:8px;padding:8px 4px}
    .blue{background:#eff6ff}.purple{background:#faf5ff}.amber{background:#fffbeb}.green{background:#f0fdf4}
    .stat-n{font-size:20px;font-weight:800}
    .stat-l{font-size:10px;color:#64748B;margin-top:2px}
    .section-hdr{font-size:13px;font-weight:700;color:#1D4ED8;margin:14px 0 6px;border-right:3px solid #1D4ED8;padding-right:8px}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px}
    th{background:#1D4ED8;color:white;padding:6px 8px;text-align:right}
    td{padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:right}
    tr:nth-child(even) td{background:#f8fafc}
    .print-footer{font-size:10px;color:#94a3b8;text-align:center;margin-top:16px;border-top:1px solid #e2e8f0;padding-top:8px}
    @page{size:A4 portrait;margin:15mm}
  </style></head><body>
  <div class="profile-header">
    <div class="profile-header-top">
      ${photoHtml}
      <div>
        <div class="profile-school">${school}</div>
        <div class="profile-name">${t.name}</div>
        <div class="profile-meta">
          ${t.subject ? `<span>التخصص: ${t.subject}</span>` : ''}
          ${t.teacherId ? `<span>الرقم: ${t.teacherId}</span>` : ''}
          ${t.phone ? `<span>الهاتف: ${t.phone}</span>` : ''}
        </div>
        <span class="today-status">${todayStatus}</span>
      </div>
    </div>
  </div>
  <div class="stats-row">
    <div class="stat-box blue"><div class="stat-n">${days}</div><div class="stat-l">أيام الحضور</div></div>
    <div class="stat-box purple"><div class="stat-n">${fmtDur(monthlyMins)}</div><div class="stat-l">هذا الشهر</div></div>
    <div class="stat-box amber"><div class="stat-n">${fmtDur(todayMins)}</div><div class="stat-l">اليوم</div></div>
    <div class="stat-box green"><div class="stat-n">${fmtDur(totalMins)}</div><div class="stat-l">الإجمالي</div></div>
  </div>
  ${logRows ? `
  <div class="section-hdr">📅 سجل الحضور</div>
  <table>
    <thead><tr><th>التاريخ</th><th>اليوم</th><th>حضور</th><th>انصراف</th><th>المدة</th><th>الحالة</th></tr></thead>
    <tbody>${logRows}</tbody>
  </table>` : '<p style="color:#64748b;font-size:13px;margin-bottom:12px">لا توجد سجلات حضور بعد.</p>'}
  <div class="print-footer">تاريخ الطباعة: ${formatHijri(todayISO())} — ${school}</div>
  </body></html>`;

  const win = window.open('', '_blank', 'width=850,height=700');
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 700);
}

// ══════════════════════════════════════════════════════════════════
//  إجراء سريع من ملف الطالب — Quick Leave
// ══════════════════════════════════════════════════════════════════
async function quickLeave(studentId, classId, type, reason = '') {
  const dateEl   = document.getElementById('spQuickDate');
  const resultEl = document.getElementById('spQuickResult');
  const date     = dateEl?.value || todayISO();

  const typeLabels = {
    Sick:'🤒 مرض', Family:'🚨 ظرف طارئ', Travel:'✈️ سفر',
    Permission:'📋 إذن خروج', Other:'📝 أخرى',
  };
  const label = typeLabels[type] || type;

  if (!classId) { toast('⚠️ الطالب غير مرتبط بحلقة'); return; }

  // إذن خروج requires the student to already be marked Present
  if (type === 'Permission') {
    const todayAtt = await apiFetch(`/attendance?date=${date}&classId=${classId}`);
    const rec = todayAtt?.find(a => a.studentId === studentId);
    if (!rec || rec.status !== 'Present') {
      toast('⚠️ إذن الخروج يُعطى فقط للطلاب الحاضرين. سجّل الحضور أولاً.');
      return;
    }
  }

  // Highlight selected button briefly
  document.querySelectorAll('.sp-qa-btn').forEach(b => b.classList.remove('sp-qa-active'));
  event?.target?.closest('.sp-qa-btn')?.classList.add('sp-qa-active');

  const res = await apiFetch('/leaves', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, classId, date, type, reason }),
  });

  if (resultEl) {
    resultEl.className = 'sp-qa-result';
    resultEl.innerHTML = res?.ok !== false
      ? `✅ تم تسجيل <strong>${label}</strong> بتاريخ ${date}${reason ? ' — ' + reason : ''}`
      : `❌ تعذّر التسجيل`;
    resultEl.classList.add(res?.ok !== false ? 'sp-qa-success' : 'sp-qa-error');
    resultEl.classList.remove('hidden');
    setTimeout(() => {
      resultEl.classList.add('hidden');
      document.querySelectorAll('.sp-qa-btn').forEach(b => b.classList.remove('sp-qa-active'));
    }, 3500);
  }

  toast(res?.ok !== false ? `✅ ${label} — ${date}` : '❌ تعذّر التسجيل');

  // For non-Permission: if student already Absent → upgrade to Excused
  if (res?.ok !== false && classId && date && type !== 'Permission') {
    const existing = await apiFetch(`/attendance?date=${date}&classId=${classId}`);
    if (existing) {
      const absentRec = existing.find(a => a.studentId === studentId && a.status === 'Absent');
      if (absentRec) {
        await apiFetch('/attendance/batch', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, classId, records: [{ studentId, status: 'Excused', notes: label }] }),
        });
      }
    }
  }

  // Refresh profile if open
  if (res?.ok !== false) viewStudent(studentId);
}
function attEditSelectStatus(btn) {
  document.querySelectorAll('.att-edit-status-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ── Attendance Edit Modal (from student profile history) ──
let _attEditData = {};
function openAttEditModal(studentId, classId, studentName, parentPhone, date, currentStatus, notes, recId) {
  _attEditData = { studentId, classId, studentName, parentPhone, date, recId };
  document.getElementById('attEditStudentName').textContent = studentName + ' — ' + formatHijri(date);
  document.getElementById('attEditDate').textContent = formatHijriFull(date);
  // set active button
  document.querySelectorAll('.att-edit-status-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.status === currentStatus);
  });
  document.getElementById('attEditNotes').value = notes || '';
  document.getElementById('attEditResult').className = 'sp-qa-result hidden';
  document.getElementById('attEditResult').textContent = '';
  document.getElementById('attEditModal').classList.remove('hidden');
}
function closeAttEditModal() {
  document.getElementById('attEditModal').classList.add('hidden');
}

// ── Open edit modal from student profile date picker ──
async function openAttEditFromProfile(studentId) {
  // Look up student from state — avoids encoding names in onclick attributes
  const s = state.students.find(x => x.id === studentId);
  if (!s) return toast('لم يُعثر على بيانات الطالب');
  const classId    = s.classId    || '';
  const studentName= s.name       || '';
  const parentPhone= s.parentPhone|| '';

  const dateEl = document.getElementById('spEditAttDate');
  const date   = dateEl?.value || todayISO();
  if (!date) return toast('اختر التاريخ أولاً');

  // Fetch current attendance record for that date
  let currentStatus = 'Absent';
  let currentNotes  = '';
  let recId         = '';
  try {
    const recs = await apiFetch(`/attendance?date=${date}${classId ? '&classId=' + classId : ''}`);
    const rec  = recs?.find(a => a.studentId === studentId);
    if (rec) {
      currentStatus = rec.status || 'Absent';
      currentNotes  = rec.notes  || '';
      recId         = rec.id     || '';
    }
  } catch(e) { /* no record yet */ }

  openAttEditModal(studentId, classId, studentName, parentPhone, date, currentStatus, currentNotes, recId);
}
async function saveAttEdit() {
  const newStatus = document.querySelector('.att-edit-status-btn.active')?.dataset.status;
  if (!newStatus) return toast('اختر الحالة أولاً');
  const { studentId, classId, date, parentPhone, studentName } = _attEditData;
  const notes = document.getElementById('attEditNotes').value.trim();
  const res = await apiFetch('/attendance/batch', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, classId, records: [{ studentId, status: newStatus, notes }] }),
  });
  const ok = res && res.ok !== false;
  const resultEl = document.getElementById('attEditResult');
  const statusLabels = { Present:'حاضر', Absent:'غائب', Late:'متأخر', Excused:'بعذر' };
  if (ok) {
    resultEl.className = 'sp-qa-result sp-qa-success';
    resultEl.textContent = '✅ تم تغيير الحالة إلى ' + (statusLabels[newStatus] || newStatus);
    resultEl.classList.remove('hidden');
    toast('✅ تم تحديث حضور ' + studentName);
    // Send WA if changed to Absent
    if (newStatus === 'Absent' && parentPhone && date === todayISO()) {
      const s = state.students.find(x => x.id === studentId);
      if (s) {
        const cls = state.classes.find(c => c.id === classId);
        const records = [{ studentId, name: studentName, phone: parentPhone }];
        apiFetch('/whatsapp/send-bulk', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ records, date, classId }),
        }).then(r => {
          if (r?.sent > 0) toast('📱 تم إرسال إشعار الغياب لولي الأمر');
        });
      }
    }
    setTimeout(() => {
      closeAttEditModal();
      viewStudent(studentId); // refresh profile
    }, 1200);
  } else {
    resultEl.className = 'sp-qa-result sp-qa-error';
    resultEl.textContent = '❌ تعذّر التحديث';
    resultEl.classList.remove('hidden');
  }
}

// ── Edit attendance for a specific date from the history table ──
function openAttEditForDate(studentId, classId, studentName, date, parentPhone, btnEl) {
  const row    = btnEl.closest('tr');
  const panel  = row.querySelector('.att-hist-edit-panel');
  if (!panel) return;

  // Toggle: close if already open
  if (!panel.classList.contains('hidden')) {
    panel.classList.add('hidden');
    return;
  }
  // Close any other open panels first
  document.querySelectorAll('.att-hist-edit-panel').forEach(p => p.classList.add('hidden'));

  const mkBtn = (st, icon, label, color) =>
    `<button class="att-hist-status-btn" style="background:${color}" `
    + `onclick="changeStudentAttStatus('${studentId}','${classId}','${st}','${date}','${studentName}','${parentPhone}',this.closest('tr'))">`
    + `${icon} ${label}</button>`;

  panel.innerHTML = `<div class="att-hist-edit-row">
    ${mkBtn('Present','✅','حاضر','#dcfce7')}
    ${mkBtn('Late','⏱','متأخر','#fef3c7')}
    ${mkBtn('Absent','❌','غائب','#fee2e2')}
    ${mkBtn('Excused','📋','بعذر (إذن)','#ede9fe')}
    ${mkBtn('Sick','🤒','مريض','#fce7f3')}
    ${mkBtn('Emergency','🚨','طارئ','#fff1f2')}
  </div>`;
  panel.classList.remove('hidden');
}

async function changeStudentAttStatus(studentId, classId, newStatus, date, studentName, parentPhone, rowEl) {
  if (!date) date = todayISO();
  const statusLabels = { Present:'حاضر', Absent:'غائب', Late:'متأخر', Excused:'بعذر (إذن)', Sick:'مريض', Emergency:'طارئ' };
  const badgeMap     = { Present:'present', Absent:'absent', Late:'late', Excused:'excused', Sick:'excused', Emergency:'absent' };

  // Map Sick/Emergency → Excused in the DB (they're sub-types, visually distinct)
  const dbStatus = (newStatus === 'Sick' || newStatus === 'Emergency') ? 'Excused' : newStatus;
  const notes    = newStatus === 'Sick' ? 'مرض' : newStatus === 'Emergency' ? 'طارئ' : '';

  const existing = await apiFetch('/attendance?date=' + date + (classId ? '&classId=' + classId : ''));
  const existingRec = existing?.find(a => a.studentId === studentId);
  const finalNotes = notes || existingRec?.notes || '';

  const res = await apiFetch('/attendance/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date, classId, records: [{ studentId, status: dbStatus, notes: finalNotes }] }),
  });

  const ok = res && res.ok !== false;
  if (!ok) { toast('❌ تعذّر التغيير'); return; }

  // Update badge in the table row
  if (rowEl) {
    const badge = rowEl.querySelector('.badge');
    if (badge) {
      badge.className = 'badge badge-' + (badgeMap[newStatus] || 'default');
      badge.textContent = statusLabels[newStatus] || newStatus;
    }
    const panel = rowEl.querySelector('.att-hist-edit-panel');
    if (panel) panel.classList.add('hidden');
  }

  toast('✅ تم التغيير إلى: ' + (statusLabels[newStatus] || newStatus));

  // If changed to Absent → send WA to guardian
  if (newStatus === 'Absent' && parentPhone) {
    const cls = state.classes.find(c => c.id === classId);
    const waRes = await apiFetch('/whatsapp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: parentPhone, studentName, className: cls?.name || '', date }),
    });
    if (waRes?.ok) toast('📱 تم إرسال إشعار الغياب على واتساب');
    else           toast('⚠️ تغيّرت الحالة لكن تعذّر إرسال واتساب');
  }
}

async function waDismissItem(attendanceId, studentId, date) {
  const res = await apiFetch('/whatsapp/queue/dismiss', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, date }),
  });

  if (!res || res.ok === false) {
    toast('❌ تعذّر الحذف: ' + (res?.error || 'خطأ في الاتصال'));
    return;
  }

  // Server confirmed save — now remove from local state and DOM
  _waQueueData = _waQueueData.filter(x => x.attendanceId !== attendanceId);
  document.getElementById(`wqi-${attendanceId}`)?.remove();
  waUpdateSendBtn();
  waUpdateNavBadge();

  // Remove empty date groups
  document.querySelectorAll('.wa-queue-group').forEach(g => {
    if (g.querySelectorAll('.wa-queue-item').length === 0) g.remove();
  });

  const info = document.getElementById('waQueueInfo');
  if (info) info.textContent = _waQueueData.length === 0
    ? '✅ لا توجد رسائل معلقة' : `${_waQueueData.length} رسالة غياب لم تُرسل بعد`;
  if (_waQueueData.length === 0) waRenderQueue();
  toast('🗑 تم حذف الرسالة من القائمة');
}

// ══════════════════════════════════════════════════════════════════
//  WA Group Chat — Send ONE message to a WhatsApp group chat ID
// ══════════════════════════════════════════════════════════════════
async function waSendGroupChat() {
  const groupId = document.getElementById('waGroupChatId')?.value?.trim();
  const message = document.getElementById('waGroupChatMsg')?.value?.trim();
  const status  = document.getElementById('waGroupChatStatus');
  const btn     = document.getElementById('waGroupChatSendBtn');

  if (!groupId) { toast('⚠️ أدخل معرّف مجموعة واتساب'); return; }
  if (!message) { toast('⚠️ الرسالة فارغة'); return; }

  btn.disabled = true;
  if (status) { status.textContent = '⏳ جارٍ الإرسال…'; status.className = 'wa-compose-status'; }

  const res = await apiFetch('/whatsapp/send-group-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ groupId, message }),
  });

  if (res?.ok) {
    if (status) { status.textContent = '✅ تم الإرسال بنجاح'; status.className = 'wa-compose-status wa-status-ok-text'; }
    toast('✅ تم إرسال الرسالة للمجموعة');
    await waLoadLog();
  } else {
    if (status) { status.textContent = `❌ ${res?.error||'فشل الإرسال'}`; status.className = 'wa-compose-status wa-status-fail-text'; }
    toast(`❌ ${res?.error||'فشل'}`);
  }
  btn.disabled = false;
}
// ══════════════════════════════════════════════════════════════════
//  التقويم — Calendar Page  (v2 — practical rebuild)
// ══════════════════════════════════════════════════════════════════

/* ── State ──────────────────────────────────────────────────────── */
let _calYear   = 0;
let _calMonth  = 0;
let _calEvents = [];      // events for current month
let _calAllEvents = [];   // all saved events
let _calDayDate   = '';   // currently-selected day ISO
let _calWaRows    = [];
let _calSelColor  = '#2563EB';
let _calSelType   = 'event';
let _calView      = 'grid';   // 'grid' | 'agenda'
let _calFilter    = 'all';

const CAL_TYPE_COLOR = { event:'#2563EB', holiday:'#DC2626', offday:'#D97706', message:'#7C3AED', reminder:'#0D9488' };
const CAL_TYPE_BG    = { event:'#EFF6FF', holiday:'#FEF2F2', offday:'#FFFBEB', message:'#F5F3FF', reminder:'#CCFBF1' };
const CAL_TYPE_LABEL = { event:'📌 حدث', holiday:'🏖️ إجازة', offday:'📴 يوم إجازة', message:'💬 رسالة', reminder:'🔔 تذكير' };

/* ── Init / Nav ─────────────────────────────────────────────────── */
async function initCalendarPage() {
  const today = toHijri(todayISO());
  if (!_calYear)  _calYear  = today.year;
  if (!_calMonth) _calMonth = today.month;
  await renderCalendar();
}

function calChangeMonth(delta) {
  _calMonth += delta;
  if (_calMonth > 12) { _calMonth = 1;  _calYear++; }
  if (_calMonth < 1)  { _calMonth = 12; _calYear--; }
  renderCalendar();
}

function calGoToday() {
  const t = toHijri(todayISO());
  _calYear = t.year; _calMonth = t.month;
  renderCalendar();
}

function calSetView(v) {
  _calView = v;
  document.getElementById('calGridView')?.classList.toggle('hidden', v !== 'grid');
  document.getElementById('calAgendaView')?.classList.toggle('hidden', v !== 'agenda');
  document.getElementById('calViewGrid')?.classList.toggle('active', v === 'grid');
  document.getElementById('calViewAgenda')?.classList.toggle('active', v === 'agenda');
  if (v === 'agenda') _renderAgenda();
  else _renderCalGrid(_buildHijriMonthDates(_calYear, _calMonth), new Set((state.holidays||[]).map(h=>h.date)));
}

function calSetFilter(f) {
  _calFilter = f;
  document.querySelectorAll('.cal-filter').forEach(b => b.classList.toggle('active', b.dataset.filter === f));
  if (_calView === 'agenda') _renderAgenda();
  else _renderCalGrid(_buildHijriMonthDates(_calYear, _calMonth), new Set((state.holidays||[]).map(h=>h.date)));
}

/* ── Main Render ────────────────────────────────────────────────── */
async function renderCalendar() {
  // Header
  document.getElementById('calMonthLabel').textContent = `${HIJRI_MONTHS[_calMonth]} ${_calYear}هـ`;
  const dates = _buildHijriMonthDates(_calYear, _calMonth);
  if (dates.length) {
    const first = new Date(dates[0]+'T00:00:00'), last = new Date(dates[dates.length-1]+'T00:00:00');
    const fmt = d => d.toLocaleDateString('ar-SA', {month:'long', year:'numeric'});
    document.getElementById('calMonthLabelGreg').textContent =
      first.getMonth() !== last.getMonth() ? fmt(first)+' — '+fmt(last) : fmt(first);
  }
  // Today button: hide if already on current month
  const now = toHijri(todayISO());
  document.getElementById('calTodayBtn')?.classList.toggle('hidden', now.year===_calYear && now.month===_calMonth);

  // Fetch events
  _calEvents    = await apiFetch(`/calendar?year=${_calYear}&month=${_calMonth}`) || [];
  _calAllEvents = await apiFetch('/calendar') || [];

  const holidaySet = new Set((state.holidays||[]).map(h=>h.date));
  _renderSummaryBar(dates, holidaySet);
  if (_calView === 'grid') _renderCalGrid(dates, holidaySet);
  else _renderAgenda();

  // Close day panel if open month changed
  calCloseDayPanel();
}

/* ── Summary Bar ────────────────────────────────────────────────── */
function _renderSummaryBar(dates, holidaySet) {
  const el = document.getElementById('calSummaryBar');
  if (!el) return;
  const today = todayISO();
  let schoolDays=0, offDays=0, eventCount=0;
  dates.forEach(d => {
    const isFri = new Date(d+'T00:00:00').getDay()===5;
    const isHol = holidaySet.has(d);
    if (isFri||isHol) offDays++; else schoolDays++;
  });
  eventCount = _calEvents.filter(e=>!e.type||e.type==='event'||e.type==='reminder'||e.type==='message').length;
  const upcoming = _calAllEvents.filter(e=>e.date>today).length;
  el.innerHTML = `
    <div class="cal-sum-item">
      <span class="cal-sum-num">${dates.length}</span>
      <span class="cal-sum-lbl">يوم في الشهر</span>
    </div>
    <div class="cal-sum-divider"></div>
    <div class="cal-sum-item">
      <span class="cal-sum-num cal-sum-green">${schoolDays}</span>
      <span class="cal-sum-lbl">يوم دراسي</span>
    </div>
    <div class="cal-sum-divider"></div>
    <div class="cal-sum-item">
      <span class="cal-sum-num cal-sum-red">${offDays}</span>
      <span class="cal-sum-lbl">يوم إجازة</span>
    </div>
    <div class="cal-sum-divider"></div>
    <div class="cal-sum-item">
      <span class="cal-sum-num cal-sum-blue">${eventCount}</span>
      <span class="cal-sum-lbl">حدث هذا الشهر</span>
    </div>
    <div class="cal-sum-divider"></div>
    <div class="cal-sum-item">
      <span class="cal-sum-num cal-sum-purple">${upcoming}</span>
      <span class="cal-sum-lbl">حدث قادم</span>
    </div>`;
}

/* ── Hijri Helpers ──────────────────────────────────────────────── */
// Expand a repeating event into all matching dates within a given date range
function _expandRepeatEvent(ev, dates) {
  if (!ev.repeat) return [];
  const result = [];
  const origin = new Date(ev.date + 'T00:00:00');
  const originDow = origin.getDay(); // day-of-week for weekly

  dates.forEach(iso => {
    if (iso <= ev.date) return; // don't re-add the original date
    const d = new Date(iso + 'T00:00:00');
    if (ev.repeat === 'weekly' && d.getDay() === originDow) {
      result.push({ ...ev, id: ev.id + '_r_' + iso, date: iso, _isRepeat: true });
    } else if (ev.repeat === 'monthly') {
      // Same Hijri day, any future month
      const h = toHijri(iso);
      const hOrigin = toHijri(ev.date);
      if (h.day === hOrigin.day && iso > ev.date) {
        result.push({ ...ev, id: ev.id + '_r_' + iso, date: iso, _isRepeat: true });
      }
    } else if (ev.repeat === 'yearly') {
      const h = toHijri(iso);
      const hOrigin = toHijri(ev.date);
      if (h.day === hOrigin.day && h.month === hOrigin.month && iso > ev.date) {
        result.push({ ...ev, id: ev.id + '_r_' + iso, date: iso, _isRepeat: true });
      }
    }
  });
  return result;
}

function _buildHijriMonthDates(hy, hm) {
  const dates = [];
  for (let d=1;d<=30;d++) {
    const iso = _fromHijriClient(hy,hm,d);
    const back = toHijri(iso);
    if (back.year!==hy||back.month!==hm) break;
    dates.push(iso);
  }
  return dates;
}

function _fromHijriClient(hy,hm,hd) {
  const _HL=new Set([2,5,7,10,13,15,18,21,24,26,29]);
  const _HE=1948440,_HC=10631;
  const _yL=y=>_HL.has(y%30===0?30:y%30)?355:354;
  const _mL=(y,m)=>m%2===1?30:(m===12&&_HL.has(y%30===0?30:y%30)?30:29);
  const cyc=(hy-1)/30|0,yin=((hy-1)%30)+1;
  let jdn=_HE+cyc*_HC;
  for(let y=1;y<yin;y++) jdn+=_yL(y);
  for(let m=1;m<hm;m++) jdn+=_mL(hy,m);
  jdn+=hd-1;
  const L=jdn+68569,N=(4*L/146097)|0,L2=L-((146097*N+3)/4|0);
  const I=(4000*(L2+1)/1461001)|0,L3=L2-(1461*I/4|0)+31,J=(80*L3/2447)|0;
  const gd=L3-(2447*J/80|0),L4=(J/11)|0,gm=J+2-12*L4,gy=100*(N-49)+I+L4;
  return gy+'-'+String(gm).padStart(2,'0')+'-'+String(gd).padStart(2,'0');
}

/* ── Calendar Grid ──────────────────────────────────────────────── */
function _renderCalGrid(dates, holidaySet) {
  const grid = document.getElementById('calGrid');
  if (!grid) return;
  const today = todayISO();

  // Build event map (date → events), expand ranges and repeats
  const evMap = {};
  const filtered = _calFilter==='all' ? _calEvents : _calEvents.filter(e=>e.type===_calFilter);
  const allEventsForGrid = [];
  filtered.forEach(e => {
    allEventsForGrid.push(e);
    _expandRepeatEvent(e, dates).forEach(r => allEventsForGrid.push(r));
  });
  allEventsForGrid.forEach(e => {
    const addTo = iso => { if(!evMap[iso]) evMap[iso]=[]; evMap[iso].push(e); };
    // If event has specific non-contiguous dates, only show on those exact dates
    if (e.specificDates && e.specificDates.length > 0 && !e._isRepeat) {
      e.specificDates.forEach(iso => addTo(iso));
    } else {
      addTo(e.date);
      if (e.endDate && e.endDate!==e.date && !e._isRepeat) {
        let d=new Date(e.date+'T00:00:00'), end=new Date(e.endDate+'T00:00:00');
        d.setDate(d.getDate()+1);
        while(d<=end) { addTo(d.toISOString().split('T')[0]); d.setDate(d.getDate()+1); }
      }
    }
  });

  const firstDay = new Date(dates[0]+'T00:00:00').getDay();
  let html='';
  for(let i=0;i<firstDay;i++) html+='<div class="cal-cell cal-cell-empty"></div>';

  dates.forEach(iso => {
    const d=new Date(iso+'T00:00:00');
    const hijriD=toHijri(iso).day, isFri=d.getDay()===5, isToday=iso===today;
    const isHol=holidaySet.has(iso), dayEvs=evMap[iso]||[];
    const isSelected = iso===_calDayDate;

    const isPast = iso < today;
    let cls='cal-cell';
    if(isPast)     cls+=' cal-cell-past';
    if(isToday)    cls+=' cal-cell-today';
    if(isFri)      cls+=' cal-cell-fri';
    if(isHol&&!isFri) cls+=' cal-cell-hol';
    if(isSelected) cls+=' cal-cell-selected';

    // Holiday badge (only non-Friday)
    const holBadge = (!isFri && (isHol||dayEvs.some(e=>e.type==='holiday'||e.type==='offday')))
      ? `<div class="cal-hol-badge">${dayEvs.find(e=>e.type==='holiday'||e.type==='offday')?.title||'إجازة'}</div>` : '';

    // Event chips — show up to 3 with title
    const chips = dayEvs.slice(0,3).map(e => {
      const color = e.color||CAL_TYPE_COLOR[e.type]||'#2563EB';
      const bg    = CAL_TYPE_BG[e.type]||'#EFF6FF';
      const title = e.title.length>14 ? e.title.slice(0,13)+'…' : e.title;
      return `<div class="cal-chip" style="background:${bg};color:${color};border-color:${color}22">${title}</div>`;
    }).join('');
    const moreChip = dayEvs.length>3 ? `<div class="cal-chip cal-chip-more">+${dayEvs.length-3}</div>` : '';

    html+=`<div class="${cls}" onclick="calOpenDay('${iso}')">
      <div class="cal-cell-head">
        <span class="cal-cell-hijri">${hijriD}</span>
        <span class="cal-cell-greg">${d.getDate()}</span>
      </div>
      ${holBadge}
      <div class="cal-chips">${chips}${moreChip}</div>
    </div>`;
  });

  const trail=(firstDay+dates.length)%7===0?0:7-((firstDay+dates.length)%7);
  for(let i=0;i<trail;i++) html+='<div class="cal-cell cal-cell-empty"></div>';
  grid.innerHTML=html;
}

/* ── Agenda View ────────────────────────────────────────────────── */
function _renderAgenda() {
  const el=document.getElementById('calAgendaList');
  if(!el) return;
  const today=todayISO();
  const dates=_buildHijriMonthDates(_calYear,_calMonth);
  const startISO=dates[0], endISO=dates[dates.length-1];
  const holidaySet=new Set((state.holidays||[]).map(h=>h.date));

  // Collect all agenda items for the month
  const items=[];
  dates.forEach(iso=>{
    const d=new Date(iso+'T00:00:00');
    const isFri=d.getDay()===5, isHol=holidaySet.has(iso);
    if(!isFri && isHol) items.push({iso, type:'_system', label:'إجازة'});
  });
  const filtered = _calFilter==='all' ? _calAllEvents : _calAllEvents.filter(e=>e.type===_calFilter);
  filtered.forEach(e=>{
    if(new Date(e.date+'T00:00:00').getDay()===5) return;
    if(e.date>=startISO&&e.date<=endISO) items.push({...e,iso:e.date});
    else if(e.endDate&&e.endDate>=startISO&&e.date<=endISO) items.push({...e,iso:e.date});
    // Expand repeating events into this month
    _expandRepeatEvent(e, dates).forEach(r => {
      if(new Date(r.date+'T00:00:00').getDay()===5) return;
      items.push({...r,iso:r.date});
    });
  });
  items.sort((a,b)=>{
    const dc=a.iso.localeCompare(b.iso);
    if(dc!==0)return dc;
    return (a.time||'zz').localeCompare(b.time||'zz');
  });

  if(!items.length){el.innerHTML='<div class="info-banner">لا توجد أحداث هذا الشهر.</div>';return;}

  // Group by date
  let lastDate='', html='';
  items.forEach(item=>{
    if(item.iso!==lastDate){
      lastDate=item.iso;
      const d=new Date(item.iso+'T00:00:00');
      const DAY_AR=['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
      const isToday=item.iso===today;
      const days=Math.round((new Date(item.iso)-new Date(today))/(1000*86400));
      const countdown = isToday?'<span class="cal-agenda-today">اليوم</span>'
        : days===1?'<span class="cal-agenda-soon">غداً</span>'
        : days>0&&days<=7?`<span class="cal-agenda-soon">بعد ${days} أيام</span>`
        : days<0?`<span class="cal-agenda-past">منذ ${Math.abs(days)} يوم</span>`:'';
      html+=`<div class="cal-agenda-date-header ${isToday?'cal-agenda-today-header':''}">
        <span class="cal-agenda-dname">${DAY_AR[d.getDay()]}</span>
        <span class="cal-agenda-dnum">${toHijri(item.iso).day} ${HIJRI_MONTHS[toHijri(item.iso).month]}</span>
        <span class="cal-agenda-greg">${d.getDate()}/${d.getMonth()+1}</span>
        ${countdown}
      </div>`;
    }
    if(item.type==='_system'){
      html+=`<div class="cal-agenda-row cal-agenda-system">
        <div class="cal-agenda-stripe" style="background:#94A3B8"></div>
        <div class="cal-agenda-body"><span class="cal-agenda-title">${item.label}</span></div>
      </div>`;
    } else {
      const color=item.color||CAL_TYPE_COLOR[item.type]||'#2563EB';
      const bg=CAL_TYPE_BG[item.type]||'#EFF6FF';
      html+=`<div class="cal-agenda-row" style="background:${bg}" onclick="calOpenDay('${item.iso}')">
        <div class="cal-agenda-stripe" style="background:${color}"></div>
        <div class="cal-agenda-body">
          <div class="cal-agenda-title">${item.title}</div>
          <div class="cal-agenda-meta">${CAL_TYPE_LABEL[item.type]||''}${item.time?' · ⏰'+item.time:''}${item.endDate&&item.endDate!==item.date?' · حتى '+formatHijri(item.endDate):''}</div>
          ${item.note?`<div class="cal-agenda-note">${item.note}</div>`:''}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0;padding:6px">
          <button class="btn-icon" onclick="event.stopPropagation();openCalEventModal('${item.id}')" title="تعديل">✏️</button>
          <button class="btn-icon" onclick="event.stopPropagation();deleteCalEvent('${item.id}')" title="حذف">🗑</button>
        </div>
      </div>`;
    }
  });
  el.innerHTML=html;
}

/* ── Day Panel (inline, replaces modal) ─────────────────────────── */
function calOpenDay(iso) {
  _calDayDate = iso;
  // Re-render grid to highlight selected
  const holidaySet=new Set((state.holidays||[]).map(h=>h.date));
  _renderCalGrid(_buildHijriMonthDates(_calYear,_calMonth), holidaySet);

  const panel=document.getElementById('calDayPanel');
  const title=document.getElementById('calDayPanelTitle');
  const body=document.getElementById('calDayPanelBody');
  if(!panel) return;

  title.textContent = formatHijriFull(iso);

  const isFri=new Date(iso+'T00:00:00').getDay()===5;
  const isHol=(state.holidays||[]).some(h=>h.date===iso);
  const dayEvs=_calAllEvents.filter(e=>{
    if (e.specificDates && e.specificDates.length > 0) return e.specificDates.includes(iso);
    return e.date===iso||(e.endDate&&iso>=e.date&&iso<=e.endDate);
  });

  let html='';
  // System badges
  if(isFri) html+=`<div class="cal-day-sys">🕌 يوم الجمعة — إجازة أسبوعية</div>`;
  if(isHol&&!isFri){
    const h=(state.holidays||[]).find(h=>h.date===iso);
    html+=`<div class="cal-day-sys cal-day-sys-red">📅 ${h?.reason||'إجازة'}</div>`;
  }

  if(!dayEvs.length&&!isFri&&!isHol){
    html+=`<div class="cal-day-empty">لا توجد أحداث — <a href="#" onclick="calAddEventForDay();return false">إضافة حدث</a></div>`;
  } else {
    html+=dayEvs.map(e=>{
      const color=e.color||CAL_TYPE_COLOR[e.type]||'#2563EB';
      const bg=CAL_TYPE_BG[e.type]||'#EFF6FF';
      const days=Math.round((new Date(iso)-new Date(todayISO()))/(1000*86400));
      const countdown=days===0?'<span class="cal-ev-badge cal-ev-today">اليوم</span>'
        :days===1?'<span class="cal-ev-badge cal-ev-soon">غداً</span>'
        :days>0&&days<=7?`<span class="cal-ev-badge cal-ev-soon">بعد ${days} أيام</span>`:'';
      return `<div class="cal-day-ev" style="background:${bg}">
        <div class="cal-day-ev-stripe" style="background:${color}"></div>
        <div class="cal-day-ev-body">
          <div class="cal-day-ev-top">
            <span class="cal-day-ev-title">${e.title}</span>
            ${countdown}
          </div>
          <div class="cal-day-ev-meta">${CAL_TYPE_LABEL[e.type]||''}${e.time?' · ⏰ '+e.time:''}${e.endDate&&e.endDate!==e.date?' · حتى '+formatHijri(e.endDate):''}</div>
          ${e.note?`<div class="cal-day-ev-note">${e.note}</div>`:''}
          ${e.type==='message'&&e.waTargets?.length?`<div class="cal-day-ev-note">📱 ${e.waTargets.length} مستلم</div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;padding:6px 8px;flex-shrink:0">
          <button class="btn-icon" onclick="openCalEventModal('${e.id}')" title="تعديل">✏️</button>
          <button class="btn-icon" onclick="deleteCalEvent('${e.id}')" title="حذف">🗑</button>
        </div>
      </div>`;
    }).join('');
  }

  body.innerHTML=html;
  panel.classList.remove('hidden');
  // Scroll into view on mobile
  setTimeout(()=>panel.scrollIntoView({behavior:'smooth',block:'nearest'}),50);
}

function calCloseDayPanel() {
  _calDayDate='';
  document.getElementById('calDayPanel')?.classList.add('hidden');
  // Remove selection highlight
  document.querySelectorAll('.cal-cell-selected').forEach(c=>c.classList.remove('cal-cell-selected'));
}

function calAddEventForDay() {
  openCalEventModal(null, _calDayDate||todayISO());
}

/* ── Event Modal ────────────────────────────────────────────────── */
// _calWaMode = true when the modal is opened from the WA tab (locks to message type only)
let _calWaMode = false;

async function openCalEventModal(id=null, prefillDate=null, prefillType=null, waMode=false) {
  _calWaMode = waMode;
  _calWaRows=[]; _calSelType='event'; _calSelColor='#2563EB'; _eventDates=[];
  _specificDates = [];
  const fields=['calEventId','calEventTitle','calEventDate','calEventEndDate','calEventTime','calEventNote','calWaMessage'];
  fields.forEach(f=>{ const el=document.getElementById(f); if(el) el.value=''; });
  document.getElementById('calEventDate').value = prefillDate||todayISO();
  document.getElementById('calEventRepeat').value = '';
  const drCb = document.getElementById('calDailyRepeat'); if(drCb) drCb.checked=false;
  const sdCb = document.getElementById('calUseSpecificDays'); if(sdCb) sdCb.checked=false;
  document.getElementById('calDailyRepeatSection')?.classList.add('hidden');
  document.getElementById('calDailyPreview')?.classList.add('hidden');
  document.getElementById('calSpecificDaysSection')?.classList.add('hidden');
  document.getElementById('calSpecificDaysBody')?.classList.add('hidden');
  document.getElementById('calSpecificDaysChips').innerHTML='';
  document.getElementById('calEndDateSection')?.classList.add('hidden');
  document.getElementById('calEventDayPickerSection')?.classList.remove('hidden');
  const evChips = document.getElementById('calEvDpChips');
  if (evChips) evChips.innerHTML = '<span style="color:var(--text2);font-size:13px">لم يتم اختيار أيام بعد</span>';
  updateHijriLabel(document.getElementById('calEventDate'),'calEventHijri');
  document.getElementById('calEventEndHijri').textContent='';
  document.getElementById('calWaSection')?.classList.add('hidden');
  document.getElementById('calWaRecipients').innerHTML='';
  document.querySelectorAll('.cal-type-btn').forEach(b=>b.classList.toggle('active',b.dataset.type==='event'));
  document.querySelectorAll('.cal-color-btn').forEach(b=>b.classList.toggle('active',b.dataset.color==='#2563EB'));

  // WA mode: hide type selector, show banner, lock to message
  const typeSection = document.getElementById('calTypeSection');
  const waBanner    = document.getElementById('calWaModeBanner');
  if (waMode) {
    typeSection?.classList.add('hidden');
    waBanner?.classList.remove('hidden');
  } else {
    typeSection?.classList.remove('hidden');
    waBanner?.classList.add('hidden');
  }

  if(id){
    // Try local cache first, then fetch from server
    const ev = _calAllEvents.find(e=>e.id===id) || (await apiFetch('/calendar'))?.find(e=>e.id===id);
    if(ev){
      document.getElementById('calEventModalTitle').textContent = waMode ? 'تعديل الرسالة المجدولة' : 'تعديل الحدث';
      document.getElementById('calEventId').value    = ev.id;
      document.getElementById('calEventTitle').value = ev.title||'';
      document.getElementById('calEventDate').value  = ev.date||'';
      document.getElementById('calEventEndDate').value = ev.endDate||'';
      document.getElementById('calEventTime').value  = ev.time||'';
      document.getElementById('calEventNote').value  = ev.note||'';
      document.getElementById('calEventRepeat').value = ev.repeat||'';
      updateHijriLabel(document.getElementById('calEventDate'),'calEventHijri');
      if(ev.endDate) updateHijriLabel(document.getElementById('calEventEndDate'),'calEventEndHijri');
      calSelectType(ev.type||'event');
      if(ev.waMessage) document.getElementById('calWaMessage').value=ev.waMessage;
      if(ev.waTargets){ _calWaRows=ev.waTargets.map(r=>({...r})); _renderCalWaRows(); }
      // Restore multi-day selection for non-message events
      if(ev.specificDates?.length && ev.type !== 'message') {
        _eventDates = [...ev.specificDates];
      } else if(ev.type !== 'message' && ev.date) {
        _eventDates = [ev.date];
        if(ev.endDate && ev.endDate !== ev.date) _eventDates.push(ev.endDate);
      }
      _calSelColor=ev.color||CAL_TYPE_COLOR[ev.type]||'#2563EB';
      document.querySelectorAll('.cal-color-btn').forEach(b=>b.classList.toggle('active',b.dataset.color===_calSelColor));
    }
  } else {
    document.getElementById('calEventModalTitle').textContent = waMode ? 'رسالة واتساب جديدة' : 'إضافة حدث';
    if (waMode || prefillType) calSelectType(waMode ? 'message' : prefillType);
  }
  document.getElementById('calEventModal').classList.remove('hidden');
}

// ══════════════════════════════════════════════════════════
//  Specific Days Picker — Hijri Calendar
// ══════════════════════════════════════════════════════════
let _specificDates = [];
let _dpHYear = 0, _dpHMonth = 0;
let _dpTempSelected = [];
let _dpMode = 'specific'; // 'specific' | 'event' | 'holiday'
let _holidayDates = [];   // selected dates for multi-day holiday

function calToggleSpecificDays() {
  const checked = document.getElementById('calUseSpecificDays')?.checked;
  document.getElementById('calSpecificDaysBody')?.classList.toggle('hidden', !checked);
  if (!checked) { _specificDates = []; _renderSpecificChips(); }
}

function openDayPickerModal() {
  _dpMode = 'specific';
  if (_specificDates.length) {
    const h = toHijri(_specificDates[0]);
    _dpHYear = h.year; _dpHMonth = h.month;
  } else {
    const h = toHijri(todayISO());
    _dpHYear = h.year; _dpHMonth = h.month;
  }
  _dpTempSelected = [..._specificDates];
  _renderDpGrid();
  document.getElementById('dayPickerModal')?.classList.remove('hidden');
}

function closeDayPickerModal() {
  document.getElementById('dayPickerModal')?.classList.add('hidden');
}

function saveDayPicker() {
  if (_dpMode === 'event') {
    _eventDates = [..._dpTempSelected].sort();
    _renderEventDpChips();
    // Sync first date to start input
    if (_eventDates.length > 0) {
      const inp = document.getElementById('calEventDate');
      if (inp) { inp.value = _eventDates[0]; updateHijriLabel(inp, 'calEventHijri'); }
    }
    closeDayPickerModal();
    toast(`✅ تم اختيار ${_eventDates.length} يوم`);
  } else if (_dpMode === 'holiday') {
    _holidayDates = [..._dpTempSelected].sort();
    _renderHolidayChips();
    closeDayPickerModal();
    const btn = document.getElementById('holidaySaveBtn');
    if (btn) btn.textContent = _holidayDates.length > 1 ? `حفظ (${_holidayDates.length} أيام)` : 'حفظ';
    toast(`✅ تم اختيار ${_holidayDates.length} يوم`);
  } else {
    _specificDates = [..._dpTempSelected].sort();
    _renderSpecificChips();
    closeDayPickerModal();
    toast(`✅ تم اختيار ${_specificDates.length} يوم`);
  }
}

function dpPrevMonth() {
  _dpHMonth--;
  if (_dpHMonth < 1) { _dpHMonth = 12; _dpHYear--; }
  _renderDpGrid();
}
function dpNextMonth() {
  _dpHMonth++;
  if (_dpHMonth > 12) { _dpHMonth = 1; _dpHYear++; }
  _renderDpGrid();
}

function _renderDpGrid() {
  document.getElementById('dpMonthLabel').textContent = `${HIJRI_MONTHS[_dpHMonth]} ${_dpHYear}هـ`;
  const grid = document.getElementById('dpGrid');
  if (!grid) return;

  const dates   = _buildHijriMonthDates(_dpHYear, _dpHMonth);
  const today   = todayISO();
  const holidays = new Set((state.holidays||[]).map(h => h.date));

  // Build event map for this month
  const evMap = {};
  (_calAllEvents||[]).forEach(e => {
    if (e.date >= dates[0] && e.date <= dates[dates.length-1]) {
      if (!evMap[e.date]) evMap[e.date] = [];
      evMap[e.date].push(e);
    }
  });

  // First day of week (0=Sun) for the first Gregorian date in this Hijri month
  const firstDow = new Date(dates[0]+'T00:00:00').getDay();

  let html = '';
  for (let i = 0; i < firstDow; i++) html += '<div class="dp-cell dp-empty"></div>';

  dates.forEach(iso => {
    const h         = toHijri(iso);
    const isFri     = new Date(iso+'T00:00:00').getDay() === 5;
    const isPast    = iso < today;
    const isToday   = iso === today;
    const isHol     = holidays.has(iso);
    const isSelected = _dpTempSelected.includes(iso);
    const dayEvs    = evMap[iso] || [];
    const hasEvent  = dayEvs.length > 0;

    let cls = 'dp-cell';
    if (isFri)       cls += ' dp-fri';
    if (isHol)       cls += ' dp-hol';
    if (isPast)      cls += ' dp-past';
    if (isToday)     cls += ' dp-today';
    if (isSelected)  cls += ' dp-selected';

    // Event dots — up to 3 colored dots
    const CAL_TYPE_COLOR_DP = { event:'#2563EB', holiday:'#DC2626', offday:'#7C3AED', message:'#0D9488', reminder:'#D97706' };
    const dots = hasEvent ? dayEvs.slice(0,3).map(e =>
      `<span class="dp-dot" style="background:${isSelected?'#fff':(e.color||CAL_TYPE_COLOR_DP[e.type]||'#2563EB')}"></span>`
    ).join('') : '';

    const tooltip = hasEvent ? dayEvs.map(e=>e.title).join('، ') : iso;

    html += `<div class="${cls}" onclick="dpToggleDay('${iso}')" title="${tooltip}">
      <span class="dp-hijri-num">${h.day}</span>
      <span class="dp-greg-sub">${new Date(iso+'T00:00:00').getDate()}</span>
      ${dots ? `<div class="dp-dots">${dots}</div>` : '<div class="dp-dots"></div>'}
    </div>`;
  });

  grid.innerHTML = html;
  const cnt = document.getElementById('dpSelectedCount');
  if (cnt) cnt.textContent = _dpTempSelected.length
    ? `✅ ${_dpTempSelected.length} يوم مختار`
    : 'اضغط على الأيام لاختيارها';
}

function dpToggleDay(iso) {
  const idx = _dpTempSelected.indexOf(iso);
  if (idx >= 0) _dpTempSelected.splice(idx, 1);
  else _dpTempSelected.push(iso);
  _renderDpGrid();
}

function _renderSpecificChips() {
  const el = document.getElementById('calSpecificDaysChips');
  if (!el) return;
  if (!_specificDates.length) {
    el.innerHTML = '<span style="color:var(--text2);font-size:13px">لم يتم اختيار أيام بعد</span>';
  } else {
    el.innerHTML = _specificDates.map(iso =>
      `<span class="cal-specific-chip">${formatHijri(iso)} <button onclick="calRemoveSpecificDay('${iso}')">✕</button></span>`
    ).join('');
  }
  const saveBtn = document.getElementById('calSaveBtn');
  if (saveBtn && !_calSaving) saveBtn.textContent = _specificDates.length ? `حفظ (${_specificDates.length} رسالة)` : 'حفظ';
}

function calRemoveSpecificDay(iso) {
  _specificDates = _specificDates.filter(d => d !== iso);
  _renderSpecificChips();
}

// ── Event day picker — reuses the existing dayPickerModal ──────────
let _eventDates = [];  // selected dates for non-message events

function openEventDayPicker() {
  // Point the day picker save callback to the event chips container
  _dpMode = 'event';
  if (_eventDates.length) {
    const h = toHijri(_eventDates[0]);
    _dpHYear = h.year; _dpHMonth = h.month;
  } else {
    const v = document.getElementById('calEventDate')?.value;
    const h = toHijri(v || todayISO());
    _dpHYear = h.year; _dpHMonth = h.month;
  }
  _dpTempSelected = [..._eventDates];
  _renderDpGrid();
  document.getElementById('dayPickerModal')?.classList.remove('hidden');
}

function _renderEventDpChips() {
  const el = document.getElementById('calEvDpChips');
  if (!el) return;
  if (!_eventDates.length) {
    el.innerHTML = '<span style="color:var(--text2);font-size:13px">لم يتم اختيار أيام بعد</span>';
  } else {
    el.innerHTML = _eventDates.map(iso =>
      `<span class="cal-specific-chip">${formatHijri(iso)} <button type="button" onclick="_eventDates=_eventDates.filter(d=>d!=='${iso}');_renderEventDpChips()">✕</button></span>`
    ).join('');
  }
  // Sync first date to start input
  if (_eventDates.length > 0) {
    const inp = document.getElementById('calEventDate');
    if (inp && !inp.value) { inp.value = _eventDates[0]; updateHijriLabel(inp,'calEventHijri'); }
  }
}

function calSelectType(type){
  if (_calWaMode) type = 'message';
  _calSelType=type;
  document.querySelectorAll('.cal-type-btn').forEach(b=>b.classList.toggle('active',b.dataset.type===type));
  _calSelColor=CAL_TYPE_COLOR[type]||'#2563EB';
  document.querySelectorAll('.cal-color-btn').forEach(b=>b.classList.toggle('active',b.dataset.color===_calSelColor));

  const isMsg = type === 'message';
  document.getElementById('calWaSection')?.classList.toggle('hidden', !isMsg);
  document.getElementById('calSpecificDaysSection')?.classList.toggle('hidden', !isMsg);
  document.getElementById('calEndDateSection')?.classList.toggle('hidden', !isMsg);
  document.getElementById('calEventDayPickerSection')?.classList.toggle('hidden', isMsg);

  calUpdateDailyPreview();
  if (isMsg) _calWaPopulateGroupSelect();
}

function calSelectColor(btn){
  _calSelColor=btn.dataset.color;
  document.querySelectorAll('.cal-color-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
}

/* WhatsApp recipients — Fonnte group picker */

// Populate the group select dropdown whenever the WA section becomes visible
async function _calWaPopulateGroupSelect() {
  const sel = document.getElementById('calWaGroupSelect');
  if (!sel) return;

  // If we already have groups loaded, use them
  if (_waFonnteGroups && _waFonnteGroups.length > 0) {
    _calWaFillGroupSelect(sel, _waFonnteGroups);
    return;
  }

  // Otherwise fetch lazily
  sel.innerHTML = '<option value="">⏳ جارٍ تحميل المجموعات…</option>';
  const token = await _getFonnteToken();
  if (!token) {
    sel.innerHTML = '<option value="">⚠️ أدخل Fonnte Token في الإعدادات</option>';
    return;
  }
  try {
    const res  = await fetch('https://api.fonnte.com/get-whatsapp-group', {
      method: 'POST',
      headers: { 'Authorization': token },
    });
    const data = await res.json();
    if (data.status === false || !data.data?.length) {
      sel.innerHTML = '<option value="">لا توجد مجموعات — انتقل لتبويب المجموعات وحدّث</option>';
      return;
    }
    _waFonnteGroups = data.data;
    _calWaFillGroupSelect(sel, _waFonnteGroups);
  } catch(e) {
    sel.innerHTML = '<option value="">تعذّر الاتصال بـ Fonnte</option>';
  }
}

function _calWaFillGroupSelect(sel, groups) {
  sel.innerHTML =
    '<option value="">— اختر مجموعة —</option>' +
    groups.map(g => `<option value="${g.id}" data-name="${g.name}">${g.name}</option>`).join('');
}

function calWaAddSelectedGroup() {
  const sel = document.getElementById('calWaGroupSelect');
  if (!sel || !sel.value) { toast('⚠️ اختر مجموعة أولاً'); return; }
  const id   = sel.value;
  const name = sel.selectedOptions[0]?.dataset?.name || sel.selectedOptions[0]?.text || id;
  // Avoid duplicates
  if (_calWaRows.find(r => r.phone === id)) { toast('⚠️ هذه المجموعة مضافة بالفعل'); return; }
  _calWaRows.push({ name, phone: id, isGroup: true });
  _renderCalWaRows();
  sel.value = ''; // reset
  toast(`✅ تمت إضافة: ${name}`);
}

function calWaAddRow(){ _calWaRows.push({name:'',phone:''}); _renderCalWaRows(); }
function _renderCalWaRows(){
  const el=document.getElementById('calWaRecipients');
  if(!el)return;
  if(!_calWaRows.length){
    el.innerHTML='<div class="cal-wa-empty">لا يوجد مستلمون بعد</div>';
    return;
  }
  el.innerHTML=_calWaRows.map((r,i)=>{
    if(r.isGroup){
      // Group — show as a read-only chip
      return `
        <div class="cal-wa-row cal-wa-row-group">
          <span class="cal-wa-group-icon">👥</span>
          <div class="cal-wa-group-info">
            <span class="cal-wa-group-name">${r.name||'مجموعة'}</span>
            <span class="cal-wa-group-id" dir="ltr">${r.phone}</span>
          </div>
          <button class="wa-rec-del" onclick="_calWaRows.splice(${i},1);_renderCalWaRows()" title="إزالة">✕</button>
        </div>`;
    }
    return `
      <div class="cal-wa-row" data-row-idx="${i}">
        <input type="text" class="cal-wa-name"  placeholder="الاسم" value="${r.name||''}" onchange="_calWaRows[${i}].name=this.value" />
        <input type="text" class="cal-wa-phone" placeholder="رقم الواتساب" value="${r.phone||''}" dir="ltr" onchange="_calWaRows[${i}].phone=this.value" />
        <button class="wa-rec-del" onclick="_calWaRows.splice(${i},1);_renderCalWaRows()">✕</button>
      </div>`;
  }).join('');
}

/* Save / Delete */
let _calSaving = false;
async function saveCalEvent(){
  if (_calSaving) return;
  _calSaving = true;
  const saveBtn = document.getElementById('calSaveBtn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '⏳ جارٍ الحفظ…'; }
  try {
  const id=document.getElementById('calEventId').value;
  const title=document.getElementById('calEventTitle').value.trim();
  const date=document.getElementById('calEventDate').value;
  if(!title) { _calSaving=false; if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='حفظ';} return toast('يرجى إدخال عنوان الحدث'); }
  if(!date)  { _calSaving=false; if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='حفظ';} return toast('يرجى اختيار التاريخ'); }
  // Warn if message type but past date
  if(_calSelType==='message' && date < todayISO()) {
    if(!confirm(`تاريخ الرسالة (${date}) في الماضي — لن تُرسَل. هل تريد الحفظ فقط بدون إرسال؟`)) {
      _calSaving=false; if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='حفظ';} return;
    }
  }
  // Warn if message type but no recipients
  if(_calSelType==='message') {
    // Sync only manual rows (group rows already have their phone in _calWaRows)
    document.querySelectorAll('#calWaRecipients .cal-wa-row:not(.cal-wa-row-group)').forEach((row,i)=>{
      const idx = parseInt(row.dataset.rowIdx ?? i);
      if(!_calWaRows[idx]) _calWaRows[idx] = {};
      _calWaRows[idx].phone = row.querySelector('.cal-wa-phone')?.value?.trim() || '';
    });
    const validTargets = _calWaRows.filter(r=>r.phone);
    if(!validTargets.length) { _calSaving=false; if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='حفظ';} return toast('⚠️ أضف مستلماً واحداً على الأقل للرسالة'); }
    if(!document.getElementById('calWaMessage').value.trim()) { _calSaving=false; if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='حفظ';} return toast('⚠️ أدخل نص الرسالة'); }
  }
  // Final sync — only update manual rows, preserve group rows as-is
  document.querySelectorAll('#calWaRecipients .cal-wa-row:not(.cal-wa-row-group)').forEach((row,i)=>{
    const idx = parseInt(row.dataset.rowIdx ?? i);
    if(!_calWaRows[idx]) _calWaRows[idx] = {};
    _calWaRows[idx].name  = row.querySelector('.cal-wa-name')?.value?.trim()  || '';
    _calWaRows[idx].phone = row.querySelector('.cal-wa-phone')?.value?.trim() || '';
  });
  const useSpecific = _calSelType==='message' && !!(document.getElementById('calUseSpecificDays')?.checked) && _specificDates.length > 0;
  const dailyRepeat = _calSelType==='message' && !useSpecific && !!(document.getElementById('calDailyRepeat')?.checked);
  // For non-message types use the inline multi-day picker
  const useEventDates = _calSelType !== 'message' && _eventDates.length > 0;
  const endDate = _calSelType === 'message'
    ? (document.getElementById('calEventEndDate').value || null)
    : (useEventDates && _eventDates.length > 1 ? _eventDates[_eventDates.length-1] : null);
  // For non-message types: use inline picker dates; first date is the canonical `date`
  const finalDate = (useEventDates ? _eventDates[0] : null) || date;
  const payload={
    title,
    date:          finalDate,
    endDate,
    time:          document.getElementById('calEventTime').value||null,
    repeat:        document.getElementById('calEventRepeat').value||null,
    type:          _calSelType,
    note:          document.getElementById('calEventNote').value.trim(),
    color:         _calSelColor,
    dailyRepeat,
    specificDates: useEventDates ? _eventDates : (useSpecific ? _specificDates : null),
    waMessage:     _calSelType==='message' ? document.getElementById('calWaMessage').value.trim() : null,
    waTargets:     _calSelType==='message' ? _calWaRows.filter(r=>r.phone) : null,
  };
  if(id){
    const r = await apiFetch(`/calendar/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if (payload.type === 'message' && payload.waTargets?.length) {
      const sr = r?.scheduleResult;
      if (sr?.ok)    toast(`✅ تم تحديث الحدث وإعادة جدولة الرسالة على Fonnte`);
      else if (sr)   toast(`⚠️ تم تحديث الحدث لكن فشل إعادة الجدولة: ${sr.error||'تحقق من الـ Token'}`);
      else           toast('✅ تم تحديث الحدث');
    } else {
      toast('✅ تم تحديث الحدث');
    }
  } else {
    const r = await apiFetch('/calendar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if((dailyRepeat || useSpecific) && r?.ids?.length>1) {
      const scheduled = r.scheduleResults?.filter(s=>s.ok).length || 0;
      const failed    = r.scheduleResults?.filter(s=>!s.ok).length || 0;
      if(scheduled>0) toast(`✅ تم جدولة ${r.ids.length} رسالة على Fonnte (${scheduled} مجدول${failed>0?', ❌ '+failed+' فشل':''})`);
      else if(failed>0) toast(`⚠️ تم حفظ الأحداث لكن فشل الجدولة على Fonnte`);
      else toast(`✅ تم جدولة ${r.ids.length} رسالة`);
    } else if(_calSelType==='message') {
      const sr = r?.scheduleResults?.[0];
      if(sr?.ok)    toast(`✅ تم جدولة الرسالة على Fonnte — ستُرسَل يوم ${payload.date}`);
      else if(sr)   toast(`⚠️ تم حفظ الحدث لكن فشل الجدولة على Fonnte: ${sr.error||'تحقق من الـ Token'}`);
      else          toast('✅ تم حفظ الحدث');
    } else {
      toast('✅ تم حفظ الحدث');
    }
  }
  closeModal('calEventModal');
  await loadAll();
  renderCalendar();
  refreshNotifBadge();
  _waMaybeRefreshScheduled(); // refresh WA scheduled tab if open
  } finally {
    _calSaving = false;
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'حفظ'; }
  }
}

async function deleteCalEvent(id){
  const ev = _calAllEvents.find(e=>e.id===id);
  let deleteAll = false;
  if(ev?.groupId){
    const groupSize = _calAllEvents.filter(e=>e.groupId===ev.groupId).length;
    if(groupSize>1){
      const choice = confirm(`هذا الحدث جزء من سلسلة مكوّنة من ${groupSize} رسالة يومية.

• موافق = حذف السلسلة كاملة
• إلغاء = حذف هذا الحدث فقط`);
      if(choice===null) return;
      deleteAll = choice;
    } else if(!confirm('هل تريد حذف هذا الحدث؟')) return;
  } else if(!confirm('هل تريد حذف هذا الحدث؟')) return;

  const url = deleteAll ? `/calendar/${id}?all=1` : `/calendar/${id}`;
  await apiFetch(url,{method:'DELETE'});
  toast('🗑 تم حذف الحدث' + (deleteAll?' والسلسلة كاملة':''));
  await loadAll();
  calCloseDayPanel();
  renderCalendar();
}

// ══════════════════════════════════════════════════════════════════
//  التقويم — New practical features v3
// ══════════════════════════════════════════════════════════════════

/* ── Action menu ────────────────────────────────────────────────── */
function calToggleMenu() {
  const m = document.getElementById('calActionMenu');
  if (!m) return;
  m.classList.toggle('hidden');
  // Close on outside click
  if (!m.classList.contains('hidden')) {
    setTimeout(() => document.addEventListener('click', function _f(e) {
      if (!m.contains(e.target) && e.target.id !== 'calMenuBtn') { m.classList.add('hidden'); document.removeEventListener('click', _f); }
    }), 50);
  }
}

/* ── Search ─────────────────────────────────────────────────────── */
function calToggleSearch() {
  const bar = document.getElementById('calSearchBar');
  if (!bar) return;
  const hidden = bar.classList.toggle('hidden');
  if (!hidden) { document.getElementById('calSearchInput')?.focus(); }
  else { document.getElementById('calSearchResults').innerHTML = ''; document.getElementById('calSearchInput').value = ''; }
}

function calDoSearch(q) {
  const el = document.getElementById('calSearchResults');
  if (!el) return;
  if (!q || q.trim().length < 1) { el.innerHTML = ''; return; }
  const hits = _calAllEvents.filter(e =>
    (e.title||'').includes(q) || (e.note||'').includes(q) || (e.waMessage||'').includes(q)
  ).slice(0, 12);
  if (!hits.length) { el.innerHTML = '<div class="cal-search-empty">لا نتائج</div>'; return; }
  el.innerHTML = hits.map(e => {
    const color = e.color || CAL_TYPE_COLOR[e.type] || '#2563EB';
    const d = new Date(e.date+'T00:00:00');
    const dateStr = `${toHijri(e.date).day} ${HIJRI_MONTHS[toHijri(e.date).month]}`;
    return `<div class="cal-search-item" onclick="calGoToDate('${e.date}')">
      <span class="cal-search-dot" style="background:${color}"></span>
      <div class="cal-search-item-body">
        <div class="cal-search-item-title">${e.title}</div>
        <div class="cal-search-item-date">${dateStr} · ${CAL_TYPE_LABEL[e.type]||e.type}</div>
      </div>
    </div>`;
  }).join('');
}

function calGoToDate(iso) {
  const h = toHijri(iso);
  _calYear = h.year; _calMonth = h.month;
  document.getElementById('calSearchBar')?.classList.add('hidden');
  renderCalendar().then(() => calOpenDay(iso));
}

/* ── Export to Excel ────────────────────────────────────────────── */
async function calExportExcel() {
  const year = _calYear;
  toast('⏳ جارٍ إنشاء ملف Excel…');
  try {
    const res = await fetch(`/api/calendar/export?year=${year}`);
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `تقويم-${year}هـ.xlsx`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
    toast(`✅ تم تصدير تقويم ${year}هـ`);
  } catch(e) { toast('❌ فشل التصدير: ' + e.message); }
}

/* ── Print month ────────────────────────────────────────────────── */
function calPrint() {
  const label   = document.getElementById('calMonthLabel')?.textContent || '';
  const gridEl  = document.getElementById('calGrid');
  const dowEl   = document.querySelector('.cal-dow-header');
  if (!gridEl) return;
  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html><html dir="rtl"><head>
    <meta charset="UTF-8"><title>تقويم — ${label}</title>
    <style>
      * { box-sizing: border-box; margin:0; padding:0; font-family: Arial, sans-serif; }
      body { padding: 20px; background: white; }
      h1 { text-align: center; font-size: 22px; margin-bottom: 12px; color: #1D4ED8; }
      .dow { display: grid; grid-template-columns: repeat(7,1fr); background: #1D4ED8; border-radius: 8px 8px 0 0; }
      .dow div { text-align: center; padding: 8px; color: white; font-size: 11px; font-weight: 700; }
      .dow .fri { color: #FDE68A; }
      .grid { display: grid; grid-template-columns: repeat(7,1fr); border: 1px solid #E2E8F0; }
      .cell { min-height: 80px; border-right: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0; padding: 5px; font-size: 11px; }
      .cell:nth-child(7n) { border-right: none; }
      .cell-hijri { font-size: 15px; font-weight: 800; display: block; }
      .cell-greg  { font-size: 9px; color: #64748B; float: left; }
      .cell-fri { background: #FFFBEB; }
      .cell-hol { background: #FEF2F2; }
      .cell-today { background: #EFF6FF; box-shadow: inset 0 0 0 2px #2563EB; }
      .chip { display: block; font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 3px; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .empty { background: #F8FAFC; }
      @page { size: A4 landscape; margin: 15mm; }
    </style></head><body>
    <h1>📅 ${label}</h1>
    <div class="dow">${dowEl ? dowEl.innerHTML.replace(/cal-fri-hdr/g,'fri') : ''}</div>
    <div class="grid">${gridEl.innerHTML
      .replace(/cal-cell-today/g,'cell-today')
      .replace(/cal-cell-fri\b/g,'cell-fri')
      .replace(/cal-cell-hol\b/g,'cell-hol')
      .replace(/cal-cell-empty/g,'cell empty')
      .replace(/cal-cell\b/g,'cell')
      .replace(/cal-cell-hijri/g,'cell-hijri')
      .replace(/cal-cell-greg/g,'cell-greg')
      .replace(/cal-cell-head/g,'')
      .replace(/cal-chips|cal-chip-more|cal-hol-badge/g,'')
      .replace(/cal-chip/g,'chip')
    }</div>
  </body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 600);
}

/* ── Daily repeat preview ───────────────────────────────────────── */
function calUpdateDailyPreview() {
  const isMsg     = _calSelType === 'message';
  const startDate = document.getElementById('calEventDate')?.value;
  const endDate   = document.getElementById('calEventEndDate')?.value;
  const drSection = document.getElementById('calDailyRepeatSection');
  const preview   = document.getElementById('calDailyPreview');
  const checked   = document.getElementById('calDailyRepeat')?.checked;

  // Show daily repeat toggle only for messages with an end date
  const showToggle = isMsg && startDate && endDate && endDate > startDate;
  drSection?.classList.toggle('hidden', !showToggle);

  if (!showToggle || !checked || !preview) { preview?.classList.add('hidden'); return; }

  // Count days in range
  const s = new Date(startDate+'T00:00:00'), e = new Date(endDate+'T00:00:00');
  let days = 0;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate()+1)) days++;

  const saveBtn = document.getElementById('calSaveBtn');
  if (saveBtn) saveBtn.textContent = `حفظ (${days} رسالة)`;

  preview.classList.remove('hidden');
  preview.innerHTML = `
    <div class="cal-daily-info">
      <span class="cal-daily-count">${days}</span>
      <span>رسالة ستُجدول — واحدة لكل يوم من ${formatHijri(startDate)} حتى ${formatHijri(endDate)}</span>
    </div>
    <div class="cal-daily-note">💡 ستظهر كل رسالة في يومها على التقويم، ويمكن حذفها مجتمعةً أو فرادى لاحقاً</div>`;
}

// Reset save button text when modal closes
const _origCloseModal = typeof closeModal === 'function' ? closeModal : null;

/* ── Week-Off Wizard ────────────────────────────────────────────── */
let _woRows = [];

function openWeekOffWizard() {
  _woRows = [];
  document.getElementById('woStartDate').value  = '';
  document.getElementById('woEndDate').value    = '';
  document.getElementById('woTitle').value      = '';
  document.getElementById('woStartHijri').textContent = '';
  document.getElementById('woEndHijri').textContent   = '';
  document.getElementById('woDaysCount')?.classList.add('hidden');
  document.getElementById('woMsgSection')?.classList.add('hidden');
  document.getElementById('woSendMsg').checked  = false;
  document.getElementById('woMessage').value    = '';
  document.getElementById('woRecipients').innerHTML = '';
  document.getElementById('woRecCount').textContent = '';
  document.getElementById('weekOffModal').classList.remove('hidden');
}

function woCountDays() {
  const s = document.getElementById('woStartDate').value;
  const e = document.getElementById('woEndDate').value;
  const el = document.getElementById('woDaysCount');
  if (!el) return;
  if (!s || !e || e < s) { el.classList.add('hidden'); return; }
  let days = 0, schoolDays = 0;
  const d = new Date(s+'T00:00:00'), end = new Date(e+'T00:00:00');
  while (d <= end) {
    days++;
    if (d.getDay() !== 5) schoolDays++; // exclude Fridays
    d.setDate(d.getDate()+1);
  }
  el.classList.remove('hidden');
  el.innerHTML = `
    <span class="wo-days-num">${days}</span> يوم إجمالاً
    <span style="color:var(--text2)">|</span>
    <span class="wo-days-school">${schoolDays}</span> يوم دراسي سيُوقَف`;
}

function woToggleMsg() {
  const on = document.getElementById('woSendMsg').checked;
  document.getElementById('woMsgSection')?.classList.toggle('hidden', !on);
}

function woAddAllParents() {
  _woRows = (state.students||[])
    .filter(s => s.parentPhone)
    .map(s => ({name: s.name, phone: s.parentPhone}));
  _renderWoRecipients();
  toast(`✅ تم إضافة ${_woRows.length} ولي أمر`);
}

function woAddGroupChat() {
  _woRows.push({ name: 'مجموعة واتساب', phone: '', isGroup: true });
  _renderWoRecipients();
}

function _renderWoRecipients() {
  const el = document.getElementById('woRecipients');
  if (!el) return;
  const chips = _woRows.filter(r => !r.isGroup);
  const groupIdx = _woRows.reduce((acc, r, i) => { if (r.isGroup) acc.push(i); return acc; }, []);
  el.innerHTML =
    chips.slice(0,5).map(r => `<span class="cal-wa-chip">${r.name||r.phone}</span>`).join('') +
    (chips.length > 5 ? `<span class="cal-wa-chip cal-wa-chip-more">+${chips.length-5}</span>` : '') +
    groupIdx.map(i => `
      <div class="cal-wa-row" style="margin-top:6px">
        <input type="text" class="cal-wa-name"  placeholder="اسم المجموعة" value="${_woRows[i].name||''}" onchange="_woRows[${i}].name=this.value" />
        <input type="text" class="cal-wa-phone" placeholder="Group Chat ID (مثال: 120363...@g.us)" value="${_woRows[i].phone||''}" dir="ltr" onchange="_woRows[${i}].phone=this.value" />
        <button class="wa-rec-del" onclick="_woRows.splice(${i},1);_renderWoRecipients()">✕</button>
      </div>`).join('');
  const cnt = document.getElementById('woRecCount');
  if (cnt) cnt.textContent = _woRows.length ? `${_woRows.length} مستلم` : '';
}

async function saveWeekOff() {
  const startDate = document.getElementById('woStartDate').value;
  const endDate   = document.getElementById('woEndDate').value;
  const title     = document.getElementById('woTitle').value.trim();
  const sendMsg   = document.getElementById('woSendMsg').checked;
  const message   = document.getElementById('woMessage').value.trim();

  if (!startDate || !endDate) return toast('يرجى تحديد تاريخ البداية والنهاية');
  if (endDate < startDate)    return toast('تاريخ النهاية يجب أن يكون بعد البداية');
  if (!title)                 return toast('يرجى إدخال اسم الإجازة');
  if (sendMsg && !message)    return toast('يرجى كتابة نص الرسالة');
  if (sendMsg && !_woRows.length) return toast('يرجى إضافة مستلمين للرسالة');

  const btn = document.querySelector('#weekOffModal .btn-primary');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ جارٍ الحفظ…'; }

  try {
    // 1. Save the off-day range as a single block event
    await apiFetch('/calendar', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ title, date: startDate, endDate, type:'offday', color:'#D97706', note:'' })
    });

    // 2. If daily messages requested, save one per day
    if (sendMsg) {
      const res = await apiFetch('/calendar', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          title: `📢 ${title}`,
          date: startDate, endDate,
          type: 'message', color: '#7C3AED',
          dailyRepeat: true,
          waMessage: message,
          waTargets: _woRows,
          note: `رسالة يومية خلال: ${title}`
        })
      });
      const days = res?.ids?.length || 0;
      toast(`✅ تم جدولة الإجازة + ${days} رسالة يومية`);
    } else {
      toast(`✅ تم جدولة إجازة "${title}"`);
    }

    closeModal('weekOffModal');
    await loadAll();
    renderCalendar();
  } catch(e) {
    toast('❌ حدث خطأ: ' + (e.message||e));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '✅ جدولة الإجازة'; }
  }
}

// ════════════════════════════════════════════════════════
//  نسخ احتياطي وإعادة ضبط البيانات
// ════════════════════════════════════════════════════════

const RESET_LABELS = {
  attendance: '✅ سجل حضور الطلاب',
  teacherLog: '⏱ حضور المعلمين والإداريين',
  quran:      '📖 تقدم القرآن الكريم',
  waLog:      '💬 سجل رسائل واتساب',
  calendar:   '🗓️ أحداث التقويم',
  holidays:   '📅 الإجازات الرسمية',
  students:   '👥 الطلاب',
  teachers:   '👨‍🏫 المعلمون',
  classes:    '🏫 الحلقات',
};

function resetGetSelected() {
  return [...document.querySelectorAll('.reset-cb:checked')].map(cb => cb.dataset.key);
}

function resetUpdateCount() {
  const selected = resetGetSelected();
  const countEl  = document.getElementById('resetSelCount');
  const btn      = document.getElementById('resetConfirmBtn');
  if (countEl) countEl.textContent = selected.length ? `تم اختيار ${selected.length} عنصر` : '';
  if (btn)     btn.disabled = selected.length === 0;
}

function resetSelectAll() {
  document.querySelectorAll('.reset-cb').forEach(cb => { cb.checked = true; });
  resetUpdateCount();
}

function resetClearAll() {
  document.querySelectorAll('.reset-cb').forEach(cb => { cb.checked = false; });
  resetUpdateCount();
}

function openResetConfirmModal() {
  const selected = resetGetSelected();
  if (!selected.length) return;
  const listEl = document.getElementById('resetConfirmList');
  if (listEl) {
    listEl.innerHTML = selected.map(k => `<div>🔴 ${RESET_LABELS[k] || k}</div>`).join('');
  }
  document.getElementById('resetConfirmModal').classList.remove('hidden');
}

async function executeReset() {
  const selected = resetGetSelected();
  if (!selected.length) return;
  closeModal('resetConfirmModal');

  const body = {};
  selected.forEach(k => body[k] = true);

  const statusEl = document.getElementById('resetStatus');
  if (statusEl) { statusEl.textContent = '⏳ جارٍ الحذف…'; statusEl.className = 'status-msg'; }

  const res = await apiFetch('/settings/reset', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res?.ok) {
    const labels = (res.cleared || selected).map(k => RESET_LABELS[k] || k).join('، ');
    if (statusEl) { statusEl.textContent = `✅ تم الحذف بنجاح: ${labels}`; statusEl.className = 'status-msg status-success'; }
    toast('✅ تم الحذف بنجاح');
    resetClearAll();
    // Reload state
    await loadData();
    renderStudentList?.();
    renderCheckinList?.();
  } else {
    if (statusEl) { statusEl.textContent = '❌ تعذّر الحذف — حاول مرة أخرى'; statusEl.className = 'status-msg status-error'; }
    toast('❌ تعذّر الحذف');
  }
}

function openFullResetModal() {
  const inp = document.getElementById('fullResetConfirmInput');
  if (inp) inp.value = '';
  document.getElementById('fullResetModal').classList.remove('hidden');
}

async function executeFullReset() {
  const inp = document.getElementById('fullResetConfirmInput');
  if (!inp || inp.value.trim() !== 'حذف') {
    toast('⚠️ اكتب كلمة "حذف" للتأكيد');
    inp?.focus();
    return;
  }
  closeModal('fullResetModal');

  const statusEl = document.getElementById('resetStatus');
  if (statusEl) { statusEl.textContent = '⏳ جارٍ إعادة الضبط…'; statusEl.className = 'status-msg'; }

  const res = await apiFetch('/settings/reset', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ everything: true }),
  });

  if (res?.ok) {
    if (statusEl) { statusEl.textContent = '✅ تمت إعادة الضبط الكاملة بنجاح'; statusEl.className = 'status-msg status-success'; }
    toast('✅ تمت إعادة الضبط الكاملة');
    await loadData();
    renderStudentList?.();
    renderCheckinList?.();
    navigate('dashboard');
  } else {
    if (statusEl) { statusEl.textContent = '❌ تعذّرت إعادة الضبط'; statusEl.className = 'status-msg status-error'; }
    toast('❌ تعذّرت إعادة الضبط');
  }
}

// ════════════════════════════════════════════════════════
//  تنسيق التاريخ — بناء وحفظ
// ════════════════════════════════════════════════════════

// ── Date Format Builder ──────────────────────────────────

function dfDefaultFormat() {
  return {
    tokens: [
      { key: 'day',   label: 'اليوم',  on: true },
      { key: 'month', label: 'الشهر',  on: true },
      { key: 'year',  label: 'السنة',  on: true },
    ],
    sep: ' '
  };
}

function dfGetCurrentFormat() {
  const list = document.getElementById('dfTokenList');
  if (!list) return dfDefaultFormat();
  const tokens = [...list.querySelectorAll('.df-token')].map(el => ({
    key:   el.dataset.key,
    label: el.dataset.label,
    on:    el.classList.contains('df-token-on'),
  }));
  const activeBtn = document.querySelector('.df-sep-btn.active');
  const sep = activeBtn ? activeBtn.dataset.sep : ' ';
  return { tokens, sep };
}

function dfRenderTokens(fmt) {
  const list = document.getElementById('dfTokenList');
  if (!list) return;
  list.innerHTML = '';
  fmt.tokens.forEach((t, i) => {
    const total = fmt.tokens.length;
    const el = document.createElement('div');
    el.className = 'df-token' + (t.on ? ' df-token-on' : '');
    el.dataset.key   = t.key;
    el.dataset.label = t.label;
    el.innerHTML = `
      <div class="df-token-arrows">
        <button class="df-arrow-btn" onclick="dfMoveToken(this,-1)" ${i===0?'disabled':''}>▲</button>
        <button class="df-arrow-btn" onclick="dfMoveToken(this,1)"  ${i===total-1?'disabled':''}>▼</button>
      </div>
      <span class="df-token-label">${t.label}</span>
      <button class="df-token-toggle" onclick="dfToggleToken(this)">
        <span class="df-toggle-track"><span class="df-toggle-thumb"></span></span>
      </button>`;
    list.appendChild(el);
  });
  dfUpdatePreview();
}

function dfMoveToken(btn, dir) {
  const token = btn.closest('.df-token');
  const list  = document.getElementById('dfTokenList');
  const items = [...list.children];
  const idx   = items.indexOf(token);
  const swap  = items[idx + dir];
  if (!swap) return;
  if (dir === -1) list.insertBefore(token, swap);
  else            list.insertBefore(swap, token);
  // Re-render arrows to update disabled state
  const newItems = [...list.children];
  newItems.forEach((el, i) => {
    const btns = el.querySelectorAll('.df-arrow-btn');
    if (btns[0]) btns[0].disabled = i === 0;
    if (btns[1]) btns[1].disabled = i === newItems.length - 1;
  });
  dfUpdatePreview();
}

function dfToggleToken(btn) {
  const token = btn.closest('.df-token');
  token.classList.toggle('df-token-on');
  dfUpdatePreview();
}

function dfPickSep(btn) {
  document.querySelectorAll('.df-sep-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  dfUpdatePreview();
}

function dfSetActiveSep(sep) {
  document.querySelectorAll('.df-sep-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.sep === sep);
  });
}

function dfUpdatePreview() {
  const preview = document.getElementById('dfPreview');
  if (!preview) return;
  const fmt = dfGetCurrentFormat();
  preview.innerHTML = buildHijriDateString(fmt.tokens, fmt.sep);
}

function dfReset() {
  dfRenderTokens(dfDefaultFormat());
  dfSetActiveSep(' ');
}

async function saveDateFormat() {
  const fmt = dfGetCurrentFormat();
  const statusEl = document.getElementById('dfStatus');
  await apiFetch('/settings', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dateFormat: fmt }),
  });
  if (!state.settings) state.settings = {};
  state.settings.dateFormat = fmt;
  updateTodayBadge(fmt);
  if (statusEl) {
    statusEl.textContent = '✅ تم حفظ التنسيق';
    statusEl.style.color = 'var(--success)';
    setTimeout(() => statusEl.textContent = '', 2500);
  }
  toast('✅ تم حفظ تنسيق التاريخ');
}

// ════════════════════════════════════════════════════════
//  واتساب — تبويب الرسائل المجدولة
// ════════════════════════════════════════════════════════

let _waSchedData = [];

async function waLoadScheduled() {
  const data = await apiFetch('/calendar');
  _waSchedData = (data || []).filter(e => e.type === 'message');
  waRenderScheduled();
}

function waRenderScheduled() {
  const list = document.getElementById('waSchedList');
  if (!list) return;

  const today    = todayISO();
  const nowTime  = new Date().toTimeString().slice(0,5); // "HH:MM"
  const all      = [..._waSchedData].sort((a, b) => a.date.localeCompare(b.date));

  // "Past" = date before today, OR same day but time has already passed
  const isPast = ev => {
    if (ev.date < today) return true;
    if (ev.date === today && ev.time && ev.time <= nowTime) return true;
    return false;
  };

  const upcoming = all.filter(ev => !isPast(ev));
  const past     = all.filter(ev =>  isPast(ev));
  // Legacy "sent via Fonnte" stays labelled differently
  const sent     = past.filter(ev => ev.fonnteScheduled?.length);
  const expired  = past.filter(ev => !ev.fonnteScheduled?.length);

  // Render mini calendar of upcoming messages
  const miniCal = _buildWaSchedMiniCal(upcoming);

  const cardHTML = (ev, isSent, isExpired) => {
    let statusIcon;
    if (isSent)    statusIcon = '✅ أُرسلت';
    else if (isExpired) statusIcon = '✅ انتهى وقتها';
    else           statusIcon = ev.fonnteScheduled?.length ? '🕐 مجدول' : '⏳ في الانتظار';

    const isPastCard = isSent || isExpired;
    const targets = (ev.waTargets || []).length;
    return `
    <div class="wa-sched-card${isPastCard?' wa-sched-card-sent wa-sched-card-past':''}">
      <div class="wa-sched-card-top">
        <div class="wa-sched-info">
          <div class="wa-sched-title">${ev.title || '—'}</div>
          <div class="wa-sched-meta">
            📅 ${formatHijri(ev.date)}${ev.time ? ' · ⏰ ' + ev.time : ''} · 📱 ${targets} مستلم
          </div>
          <div class="wa-sched-msg">${(ev.waMessage||'').slice(0,80)}${ev.waMessage?.length>80?'…':''}</div>
        </div>
        <span class="wa-sched-badge${isPastCard?' wa-sched-badge-past':''}">${statusIcon}</span>
      </div>
      <div class="wa-sched-actions">
        ${isPastCard ? '' : `<button class="btn-secondary" style="font-size:12px" onclick="waEditScheduled('${ev.id}')">✏️ تعديل</button>`}
        <button class="btn-danger" style="font-size:12px;padding:6px 12px" onclick="waDeleteScheduled('${ev.id}')">🗑 حذف</button>
      </div>
    </div>`;
  };

  let html = miniCal;

  if (!upcoming.length && !past.length) {
    html += '<div class="info-banner">لا توجد رسائل مجدولة. اضغط «رسالة جديدة» للإضافة.</div>';
  } else {
    if (upcoming.length) {
      html += `<div class="wa-sched-section-title">📅 قادمة (${upcoming.length})</div>`;
      html += upcoming.map(ev => cardHTML(ev, false, false)).join('');
    }
    if (expired.length) {
      html += `<div class="wa-sched-section-title wa-sched-sent-hdr">✅ انتهى وقتها (${expired.length})</div>`;
      html += expired.map(ev => cardHTML(ev, false, true)).join('');
    }
    if (sent.length) {
      html += `<div class="wa-sched-section-title wa-sched-sent-hdr">✅ أُرسلت عبر Fonnte (${sent.length})</div>`;
      html += sent.map(ev => cardHTML(ev, true, false)).join('');
    }
  }
  list.innerHTML = html;
}

function _buildWaSchedMiniCal(events) {
  if (!events.length) return '';
  const today = todayISO();
  // Use current Gregorian month/year
  const now   = new Date();
  const year  = now.getFullYear(), month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = now.toLocaleDateString('ar-SA', { month: 'long', year: 'numeric' });

  // Build set of dates with events
  const evDates = new Set(events.map(e => e.date));

  let cells = '';
  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) cells += '<div class="wmc-cell wmc-empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const hasEv = evDates.has(iso);
    const isToday = iso === today;
    const cls = ['wmc-cell', hasEv?'wmc-has-ev':'', isToday?'wmc-today':''].filter(Boolean).join(' ');
    cells += `<div class="${cls}" title="${hasEv ? events.filter(e=>e.date===iso).map(e=>e.title).join('، ') : ''}">${d}${hasEv?'<span class="wmc-dot"></span>':''}</div>`;
  }
  const dayNames = ['أح','اث','ث','أر','خ','ج','س'];
  return `
  <div class="wmc-wrap">
    <div class="wmc-title">📅 ${monthName}</div>
    <div class="wmc-dow">${dayNames.map(d=>`<div>${d}</div>`).join('')}</div>
    <div class="wmc-grid">${cells}</div>
  </div>`;
}

function waOpenNewScheduled() {
  openCalEventModal(null, null, null, true);  // waMode=true locks to message type
}

function waEditScheduled(id) {
  openCalEventModal(id, null, null, true);    // waMode=true even when editing
}

async function waDeleteScheduled(id) {
  const ev = _waSchedData.find(e => e.id === id);
  if (!ev) return;
  const label = ev.groupId
    ? `هذه الرسالة جزء من سلسلة. حذف السلسلة كاملة؟`
    : `هل تريد حذف رسالة "${ev.title}"؟`;
  if (!confirm(label)) return;
  const url = ev.groupId ? `/calendar/${id}?all=1` : `/calendar/${id}`;
  await apiFetch(url, { method: 'DELETE' });
  toast('🗑 تم حذف الرسالة المجدولة');
  await waLoadScheduled();
}

// Refresh scheduled list after saving a calendar event (called from saveCalEvent)
async function _waMaybeRefreshScheduled() {
  if (document.getElementById('waTab-scheduled') &&
      !document.getElementById('waTab-scheduled').classList.contains('hidden')) {
    await waLoadScheduled();
  }
}

// ════════════════════════════════════════════════════════
//  الطلاب — الحذف الجماعي
// ════════════════════════════════════════════════════════

let _studentBulkMode     = false;
let _studentBulkSelected = new Set();

function studentToggleBulkMode() {
  _studentBulkMode = !_studentBulkMode;
  _studentBulkSelected.clear();
  const btn     = document.getElementById('studentBulkToggleBtn');
  const bar     = document.getElementById('studentBulkBar');
  if (btn) btn.textContent = _studentBulkMode ? '✕ إلغاء التحديد' : '☑ تحديد';
  bar?.classList.toggle('hidden', !_studentBulkMode);
  renderStudentList();
}

function studentBulkToggle(id) {
  if (_studentBulkSelected.has(id)) _studentBulkSelected.delete(id);
  else _studentBulkSelected.add(id);
  _studentBulkUpdateCount();
  // Re-render just the card state to avoid full re-render flicker
  const card = document.querySelector(`.list-card[data-student-id="${id}"]`);
  if (card) {
    card.classList.toggle('list-card-selected', _studentBulkSelected.has(id));
    const cb = card.querySelector('.bulk-checkbox');
    if (cb) cb.textContent = _studentBulkSelected.has(id) ? '☑' : '☐';
  }
}

function studentBulkSelectAll() {
  const search  = document.getElementById('studentSearch')?.value?.toLowerCase() || '';
  const classId = document.getElementById('studentClassFilter')?.value || '';
  let students  = state.students;
  if (search)  students = students.filter(s => s.name.toLowerCase().includes(search) || (s.studentId||'').toLowerCase().includes(search));
  if (classId) students = students.filter(s => s.classId === classId);
  students.forEach(s => _studentBulkSelected.add(s.id));
  _studentBulkUpdateCount();
  renderStudentList();
}

function studentBulkClearAll() {
  _studentBulkSelected.clear();
  _studentBulkUpdateCount();
  renderStudentList();
}

function _studentBulkUpdateCount() {
  const n = _studentBulkSelected.size;
  const countEl = document.getElementById('studentBulkCount');
  const delBtn  = document.getElementById('studentBulkDeleteBtn');
  if (countEl) countEl.textContent = `${n} محدد`;
  if (delBtn)  delBtn.disabled = n === 0;
}

async function studentBulkDelete() {
  const ids = [..._studentBulkSelected];
  if (!ids.length) return;
  const names = ids.map(id => state.students.find(s => s.id === id)?.name || id).join('، ');
  if (!confirm(`سيتم حذف ${ids.length} طالب نهائياً:\n${names.slice(0,200)}${names.length>200?'…':''}\n\nهل أنت متأكد؟`)) return;

  // Delete sequentially
  let done = 0;
  for (const id of ids) {
    await apiFetch(`/students/${id}`, { method: 'DELETE' });
    done++;
  }
  toast(`🗑 تم حذف ${done} طالب`);
  _studentBulkSelected.clear();
  _studentBulkMode = false;
  const btn = document.getElementById('studentBulkToggleBtn');
  const bar = document.getElementById('studentBulkBar');
  if (btn) btn.textContent = '☑ تحديد';
  bar?.classList.add('hidden');
  await loadAll();
  renderStudentList();
}

// ════════════════════════════════════════════════════════
//  إذن الخروج — منح الإذن من ملف الطالب
// ════════════════════════════════════════════════════════
async function grantExitPermit(studentId, classId) {
  const noteEl = document.getElementById('spExitNote');
  const reason = noteEl?.value?.trim() || '';
  const date   = document.getElementById('spQuickDate')?.value || todayISO();

  // Double-check student is Present
  const att = await apiFetch(`/attendance?date=${date}&classId=${classId}`);
  const rec = att?.find(a => a.studentId === studentId);
  if (!rec || rec.status !== 'Present') {
    toast('⚠️ الطالب غير حاضر — لا يمكن منح إذن الخروج');
    return;
  }

  const now  = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  const res = await apiFetch('/leaves', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, classId, date, type: 'Permission', reason, time }),
  });

  if (res?.ok !== false) {
    toast(`✅ تم منح إذن الخروج — ${time}${reason ? ' | ' + reason : ''}`);
    if (noteEl) noteEl.value = '';
    viewStudent(studentId); // refresh profile to show updated count
  } else {
    toast('❌ تعذّر تسجيل إذن الخروج');
  }
}

// ════════════════════════════════════════════════════════
//  تعهدات وإنذارات
// ════════════════════════════════════════════════════════

let _noticeStudentId = null;

function openNoticeModal(studentId, type) {
  _noticeStudentId = studentId;
  document.getElementById('noticeType').value   = type;
  document.getElementById('noticeDate').value   = todayISO();
  document.getElementById('noticeReason').value = '';
  updateHijriLabel(document.getElementById('noticeDate'), 'noticeHijri');
  document.getElementById('noticeModal').classList.remove('hidden');
}

async function saveNotice() {
  const type   = document.getElementById('noticeType').value;
  const date   = document.getElementById('noticeDate').value;
  const reason = document.getElementById('noticeReason').value.trim();
  if (!_noticeStudentId || !date) return;
  await apiFetch('/notices', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId: _noticeStudentId, type, date, reason }),
  });
  closeModal('noticeModal');
  toast(`✅ تم تسجيل ${type}`);
  viewStudent(_noticeStudentId);
}

async function deleteNotice(noticeId, studentId) {
  if (!confirm('هل تريد حذف هذا السجل؟')) return;
  await apiFetch(`/notices/${noticeId}`, { method: 'DELETE' });
  toast('🗑 تم الحذف');
  viewStudent(studentId);
}

// ════════════════════════════════════════════════════════
//  طباعة ملف الطالب
// ════════════════════════════════════════════════════════

async function printStudentProfile(studentId) {
  const s = await apiFetch(`/students/${studentId}`);
  if (!s) return;
  _printStudentProfiles([s]);
}

async function studentBulkPrint() {
  const ids = [..._studentBulkSelected];
  if (!ids.length) return;
  toast('⏳ جارٍ تحضير الملفات…');
  const profiles = await Promise.all(ids.map(id => apiFetch(`/students/${id}`)));
  _printStudentProfiles(profiles.filter(Boolean));
}

function _printStudentProfiles(students) {
  const school = state.settings?.schoolName || 'حضور الحلقات';
  const translateStatus = st => ({ Present:'حاضر', Absent:'غائب', Late:'متأخر', Excused:'بعذر', Holiday:'إجازة' }[st] || st);
  const statusColor = st => ({ Present:'#16a34a', Absent:'#dc2626', Late:'#d97706', Excused:'#7c3aed', Holiday:'#0891b2' }[st] || '#374151');

  const profileHTML = students.map(s => {
    const cls      = state.classes.find(c => c.id === s.classId);
    const history  = (s.history || []).slice(0, 30);
    const leaves   = s.leaves || [];
    const notices  = s.notices || [];
    const exitCnt  = leaves.filter(l => l.type === 'Permission').length;
    const present  = history.filter(h => h.status === 'Present').length;
    const absent   = history.filter(h => h.status === 'Absent').length;
    const late     = history.filter(h => h.status === 'Late').length;
    const excused  = history.filter(h => h.status === 'Excused').length;
    const rate     = history.length ? Math.round((present + excused) / history.length * 100) : '—';

    const histRows = history.slice(0, 20).map(h => `
      <tr>
        <td>${formatHijri(h.date)}</td>
        <td>${ARABIC_DAYS[new Date(h.date+'T00:00:00').getDay()] || ''}</td>
        <td style="color:${statusColor(h.status)};font-weight:700">${translateStatus(h.status)}</td>
        <td>${h.notes || ''}</td>
      </tr>`).join('');

    const noticeRows = notices.map(n => `
      <tr>
        <td style="font-weight:700;color:${n.type==='إنذار'?'#dc2626':'#1d4ed8'}">${n.type}</td>
        <td>${formatHijri(n.date)}</td>
        <td>${n.reason || '—'}</td>
      </tr>`).join('');

    return `
    <div class="profile-page">
      <div class="profile-header">
        <div class="profile-header-top">
          ${s.photo ? `<img src="${s.photo}" class="profile-photo" alt="${s.name}" />` : `<div class="profile-photo-placeholder">${s.name.charAt(0)}</div>`}
          <div>
            <div class="profile-school">${school}</div>
            <div class="profile-name">${s.name}</div>
            <div class="profile-meta">
              ${cls ? `<span>الحلقة: ${cls.name}</span>` : ''}
              ${s.studentId ? `<span>الرقم: ${s.studentId}</span>` : ''}
              ${s.parentPhone ? `<span>ولي الأمر: ${s.parentPhone}</span>` : ''}
              ${s.birthday ? `<span>تاريخ الميلاد: ${s.birthday}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
      <div class="stats-row">
        <div class="stat-box green"><div class="stat-n">${present}</div><div class="stat-l">حاضر</div></div>
        <div class="stat-box red"><div class="stat-n">${absent}</div><div class="stat-l">غائب</div></div>
        <div class="stat-box amber"><div class="stat-n">${late}</div><div class="stat-l">متأخر</div></div>
        <div class="stat-box blue"><div class="stat-n">${excused}</div><div class="stat-l">بعذر</div></div>
        <div class="stat-box sky"><div class="stat-n">${exitCnt}</div><div class="stat-l">إذن خروج</div></div>
        <div class="stat-box purple"><div class="stat-n">${rate}${rate!=='—'?'%':''}</div><div class="stat-l">نسبة</div></div>
      </div>
      ${history.length ? `
      <div class="section-hdr">📅 سجل الحضور (آخر ${history.slice(0,20).length} يوم)</div>
      <table><thead><tr><th>التاريخ</th><th>اليوم</th><th>الحالة</th><th>ملاحظات</th></tr></thead>
      <tbody>${histRows}</tbody></table>` : ''}
      ${notices.length ? `
      <div class="section-hdr">📋 تعهدات وإنذارات</div>
      <table><thead><tr><th>النوع</th><th>التاريخ</th><th>السبب</th></tr></thead>
      <tbody>${noticeRows}</tbody></table>` : ''}
      <div class="print-footer">تاريخ الطباعة: ${formatHijri(todayISO())} — ${school}</div>
    </div>`;
  }).join('');

  const win = window.open('', '_blank', 'width=850,height=700');
  win.document.write(`<!DOCTYPE html><html dir="rtl"><head>
  <meta charset="UTF-8"><title>ملفات الطلاب</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0;font-family:Arial,sans-serif}
    body{background:#fff;color:#111}
    .profile-page{padding:20px 24px;page-break-after:always;max-width:800px;margin:auto}
    .profile-page:last-child{page-break-after:auto}
    .profile-header{border-bottom:3px solid #1D4ED8;padding-bottom:12px;margin-bottom:14px}
    .profile-header-top{display:flex;align-items:center;gap:16px}
    .profile-photo{width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid #1D4ED8;flex-shrink:0}
    .profile-photo-placeholder{width:72px;height:72px;border-radius:50%;background:#DBEAFE;color:#1D4ED8;font-size:28px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;border:3px solid #1D4ED8}
    .profile-school{font-size:12px;color:#64748B;font-weight:600;margin-bottom:4px}
    .profile-name{font-size:22px;font-weight:800;color:#1D4ED8;margin-bottom:6px}
    .profile-meta{display:flex;gap:16px;flex-wrap:wrap;font-size:12px;color:#374151}
    .stats-row{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
    .stat-box{flex:1;min-width:60px;text-align:center;border-radius:8px;padding:8px 4px}
    .green{background:#f0fdf4}.red{background:#fef2f2}.amber{background:#fffbeb}
    .blue{background:#eff6ff}.sky{background:#f0f9ff}.purple{background:#faf5ff}
    .stat-n{font-size:20px;font-weight:800}
    .stat-l{font-size:10px;color:#64748B;margin-top:2px}
    .section-hdr{font-size:13px;font-weight:700;color:#1D4ED8;margin:14px 0 6px;border-right:3px solid #1D4ED8;padding-right:8px}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:10px}
    th{background:#1D4ED8;color:white;padding:6px 8px;text-align:right}
    td{padding:5px 8px;border-bottom:1px solid #e2e8f0;text-align:right}
    tr:nth-child(even) td{background:#f8fafc}
    .print-footer{font-size:10px;color:#94a3b8;text-align:center;margin-top:16px;border-top:1px solid #e2e8f0;padding-top:8px}
    @page{size:A4 portrait;margin:15mm}
  </style></head><body>${profileHTML}</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 700);
}

// ════════════════════════════════════════════════════════
//  Update bulk count to enable/disable print button too
// ════════════════════════════════════════════════════════
const _origBulkUpdateCount = _studentBulkUpdateCount;
// Override to also toggle print btn
function _studentBulkUpdateCount() {
  const n = _studentBulkSelected.size;
  const countEl = document.getElementById('studentBulkCount');
  const delBtn  = document.getElementById('studentBulkDeleteBtn');
  const prtBtn  = document.getElementById('studentBulkPrintBtn');
  if (countEl) countEl.textContent = `${n} محدد`;
  if (delBtn)  delBtn.disabled = n === 0;
  if (prtBtn)  prtBtn.disabled = n === 0;
}