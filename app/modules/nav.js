//  التنقل
// ══════════════════════════════════════════════════════════
// ── Browser History Navigation (pushState / popState) ──────────
let _navByHistory = false;

window.addEventListener('popstate', function(e) {
  const page = e.state && e.state.page ? e.state.page : 'dashboard';
  _navByHistory = true;
  navigate(page);
});

// ── Skeleton helpers ───────────────────────────────────

async function navigate(page) {
  // Push to browser history (skip when triggered by popstate)
  if (!_navByHistory) {
    const currentState = history.state && history.state.page;
    if (currentState !== page) {
      history.pushState({ page }, '', `?page=${page}`);
    }
  }
  _navByHistory = false;

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

// ── Backup reminder helpers ──────────────────────────
const BACKUP_REMINDER_DAYS = 7;
const BACKUP_TS_KEY = 'last_backup_ts';
function _backupDaysAgo() {
  const ts = parseInt(localStorage.getItem(BACKUP_TS_KEY) || '0', 10);
  if (!ts) return 999; // never backed up
  return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
}
function _needsBackupReminder() {
  return _backupDaysAgo() >= BACKUP_REMINDER_DAYS;
}

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
  const badgeMobile = document.getElementById('notifBadgeMobile');
  const bellMobile  = document.getElementById('notifBellBtnMobile');
  if (!badge || !bell) return;
  if (count > 0) {
    const label = count > 99 ? '99+' : count;
    badge.textContent = label;
    badge.classList.remove('hidden');
    bell.classList.add('has-notifs');
    if (badgeMobile) { badgeMobile.textContent = label; badgeMobile.classList.remove('hidden'); }
    if (bellMobile)  { bellMobile.classList.add('has-notifs'); }
  } else {
    badge.classList.add('hidden');
    bell.classList.remove('has-notifs');
    if (badgeMobile) { badgeMobile.classList.add('hidden'); }
    if (bellMobile)  { bellMobile.classList.remove('has-notifs'); }
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

  return { events, waResult: _lastWaResult, queueCount: _waQueueNotifCount, needsBackup: _needsBackupReminder() };
}

async function refreshNotifBadge() {
  const { events, waResult } = await loadNotifData();
  updateNotifBadge(events.length + (waResult ? 1 : 0));
}

async function renderNotifPanel() {
  const body = document.getElementById('notifPanelBody');
  if (!body) return;
  body.innerHTML = '<div class="notif-loading"><span class="ui-ic ic-gray" style="display:inline-flex;align-items:center;vertical-align:middle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg></span> جارٍ التحميل…</div>';

  const { events, waResult, queueCount, needsBackup } = await loadNotifData();
  const failedCount = (window._waLogData || []).filter(l => l.status === 'failed').length;
  const total = events.length + (waResult ? 1 : 0) + (queueCount > 0 ? 1 : 0) + (failedCount > 0 ? 1 : 0) + (needsBackup ? 1 : 0);
  updateNotifBadge(total);

  if (total === 0) {
    body.innerHTML = `
      <div class="notif-empty">
        <div class="notif-empty-icon ui-ic ic-gray"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13.73 21a2 2 0 0 1-3.46 0"/><path d="M18.63 13A17.89 17.89 0 0 1 18 8"/><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"/><path d="M18 8a6 6 0 0 0-9.33-5"/><line x1="1" y1="1" x2="23" y2="23"/></svg></div>
        <div class="notif-empty-text">لا توجد إشعارات اليوم</div>
        <div class="notif-empty-sub">ستظهر هنا أحداث اليوم ورسائل واتساب المُرسَلة</div>
      </div>`;
    return;
  }

  const TYPE_ICON  = { event: '<span class="ui-ic ic-amber" style="display:inline-flex;align-items:center;vertical-align:middle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg></span>', holiday: '<span class="ui-ic ic-sky" style="display:inline-flex;align-items:center;vertical-align:middle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7"/></svg></span>', offday: '<span class="ui-ic ic-gray" style="display:inline-flex;align-items:center;vertical-align:middle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 5a10.94 10.94 0 0 0-1.956 2.428"/><path d="m10.68 5.545.053-.001"/></svg></span>', reminder: '<span class="ui-ic ic-purple" style="display:inline-flex;align-items:center;vertical-align:middle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></span>', message: '<span class="ui-ic ic-teal" style="display:inline-flex;align-items:center;vertical-align:middle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 19-9-9 19-2-8-8-2z"/></svg></span>', default:'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' };
  const TYPE_LABEL = { event:'حدث', holiday:'إجازة رسمية', offday:'يوم إجازة', reminder:'تذكير', message:'رسالة مجدولة' };

  let html = '';

  // ── Backup reminder card ──
  if (needsBackup) {
    const days = _backupDaysAgo();
    const daysLabel = days >= 999 ? 'لم تقم بنسخة احتياطية من قبل' : `آخر نسخة احتياطية منذ ${days} يوم`;
    html += `
      <div class="notif-card" style="border-right:3px solid var(--primary);cursor:pointer" onclick="closeNotifPanel();navigate('settings')">
        <div class="notif-card-icon ui-ic ic-blue"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg></div>
        <div class="notif-card-body">
          <div class="notif-card-title">حان وقت النسخة الاحتياطية</div>
          <div class="notif-card-sub">${daysLabel} — اضغط للذهاب إلى الإعدادات</div>
        </div>
      </div>`;
  }

  // ── Failed WA messages card ──
  const failedLogs = (window._waLogData || []).filter(l => l.status === 'failed');
  if (failedLogs.length > 0) {
    const notified = _getNotifiedFailedIds ? _getNotifiedFailedIds() : [];
    // Show count of ALL failed (not just unnotified) so inbox always reflects reality
    const sample = failedLogs[0];
    const sampleName = sample.studentName || sample.phone || '';
    html += `
      <div class="notif-card" style="border-right:3px solid var(--error);cursor:pointer" onclick="closeNotifPanel();navigate('whatsapp')">
        <div class="notif-card-icon ui-ic ic-red"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
        <div class="notif-card-body">
          <div class="notif-card-title">فشل إرسال ${failedLogs.length} رسالة</div>
          <div class="notif-card-sub">${failedLogs.length === 1 ? sampleName + (sample.error ? ' — ' + sample.error : '') : 'اضغط لعرض السجل والتفاصيل'}</div>
        </div>
      </div>`;
  }

  // ── WA queue pending card ──
  if (queueCount > 0) {
    html += `
      <div class="notif-card" style="border-right:3px solid var(--warn);cursor:pointer" onclick="closeNotifPanel();navigate('whatsapp')">
        <div class="notif-card-icon ui-ic ic-teal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></div>
        <div class="notif-card-body">
          <div class="notif-card-title">لديك ${queueCount} رسالة في قائمة الانتظار</div>
          <div class="notif-card-sub">اضغط للذهاب إلى صفحة واتساب وإرسالها</div>
        </div>
      </div>`;
  }

  // ── WA send result card ──
  if (waResult) {
    const time = waResult.time ? new Date(waResult.time).toLocaleTimeString('ar-SA', {hour:'2-digit', minute:'2-digit'}) : '';
    let icon, title, sub, color;
    if (waResult.error) {
      icon='x-circle'; title='فشل إرسال رسائل واتساب'; sub=waResult.error; color='var(--error)';
    } else if (waResult.failed === 0) {
      icon='check-circle'; title=`تم إرسال جميع الرسائل (${waResult.sent})`; sub=`الساعة ${time}`; color='var(--success)';
    } else {
      icon='message'; title='نتيجة إرسال واتساب';
      sub=`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> ${waResult.sent} أُرسلت  |  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${waResult.failed} فشلت`; color='var(--warn)';
    }
    html += `
      <div class="notif-card" style="border-right:3px solid ${color}">
        <div class="notif-card-icon">${icon}</div>
        <div class="notif-card-body">
          <div class="notif-card-title">${title}</div>
          <div class="notif-card-sub">${sub}</div>
        </div>
        <button class="notif-card-dismiss" onclick="_lastWaResult=null;renderNotifPanel()" title="تجاهل"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>`;
  }

  // ── Calendar events section ──
  if (events.length > 0) {
    html += `<div class="notif-section-title"><span class="ui-ic ic-blue" style="display:inline-flex;align-items:center;vertical-align:middle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span> أحداث اليوم</div>`;
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
          <button class="notif-card-dismiss" onclick="dismissNotif('ev_${ev.id}')" title="تجاهل"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>`;
    });
  }



  body.innerHTML = html;
}

// ── Failed message notification ──────────────────────────
function showWaFailNotif(context, failCount, errorMsg) {
  var existing = document.getElementById('waFailNotif');
  if (existing) existing.remove();

  var notif = document.createElement('div');
  notif.id = 'waFailNotif';
  notif.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
    'background:#7f1d1d;color:#fff;border-radius:12px;padding:14px 20px;font-size:14px;font-weight:600;' +
    'box-shadow:0 8px 32px rgba(0,0,0,0.3);z-index:9999;display:flex;align-items:center;' +
    'gap:12px;min-width:280px;animation:slideDown 0.3s ease;border-right:4px solid #ef4444;cursor:pointer;';
  notif.onclick = function() { notif.remove(); closeNotifPanel(); navigate('whatsapp'); };

  var title = failCount > 0
    ? 'فشل إرسال ' + failCount + ' رسالة' + (context ? ' — ' + context : '')
    : 'فشل الإرسال' + (context ? ' — ' + context : '');
  var sub = errorMsg || 'تحقق من اتصال واتساب وسجل الرسائل';

  notif.innerHTML = '<span class="ui-ic ic-red" style="font-size:16px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>' +
    '<div style="flex:1"><div>' + title + '</div>' +
    '<div style="font-size:11px;opacity:0.75;margin-top:2px;font-weight:400">' + sub + '</div></div>';

  var closeBtn = document.createElement('button');
  closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  closeBtn.style.cssText = 'background:none;border:none;color:rgba(255,255,255,0.6);cursor:pointer;font-size:14px;padding:0 0 0 8px;';
  closeBtn.onclick = function(e) { e.stopPropagation(); notif.remove(); };
  notif.appendChild(closeBtn);
  document.body.appendChild(notif);
  setTimeout(function() { if (notif.parentNode) notif.remove(); }, 8000);
}

// Single summary notification after sending WA messages
let _lastWaResult = null; // {sent, failed, error, time}
let _waQueueNotifCount = 0; // live queue count for notif panel

function showQueueNotif(count) {
  // Remove any existing queue notif
  var existing = document.getElementById('waQueueNotifPopup');
  if (existing) existing.remove();

  var notif = document.createElement('div');
  notif.id = 'waQueueNotifPopup';
  notif.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);' +
    'background:#1e293b;color:#fff;border-radius:12px;padding:14px 20px;font-size:14px;font-weight:600;' +
    'box-shadow:0 8px 32px rgba(0,0,0,0.3);z-index:9999;display:flex;align-items:center;gap:12px;' +
    'min-width:280px;cursor:pointer;animation:slideDown 0.3s ease;border-right:4px solid #f59e0b;';
  notif.title = 'انتقل إلى واتساب';
  notif.onclick = function() { notif.remove(); closeNotifPanel(); navigate('whatsapp'); };
  notif.innerHTML = '<span class="ui-ic ic-teal" style="font-size:16px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>' +
    '<div style="flex:1"><div>لديك ' + count + ' رسالة في قائمة الانتظار</div>' +
    '<div style="font-size:11px;color:#94a3b8;margin-top:2px;font-weight:400">اضغط للانتقال إلى واتساب</div></div>';

  var closeBtn = document.createElement('button');
  closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  closeBtn.style.cssText = 'background:none;border:none;color:#94a3b8;cursor:pointer;font-size:14px;padding:0 0 0 8px;';
  closeBtn.onclick = function(e) { e.stopPropagation(); notif.remove(); };
  notif.appendChild(closeBtn);

  document.body.appendChild(notif);
  setTimeout(function() { if (notif.parentNode) notif.remove(); }, 7000);
}

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
    notif.innerHTML = `<span class="ui-ic ic-red" style="font-size:16px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span><span>${error}</span>`;
    notif.style.background = '#7f1d1d';
  } else if (failed === 0) {
    notif.innerHTML = `<span class="ui-ic ic-green" style="font-size:16px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span>تم إرسال جميع الرسائل بنجاح — ${sent} رسالة</span>`;
    notif.style.background = '#14532d';
  } else {
    notif.innerHTML = `
      <span class="ui-ic ic-blue" style="font-size:16px"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
      <span>
        <span style="color:#86efac"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> ${sent} رسالة أُرسلت</span>
        &nbsp;|&nbsp;
        <span style="color:#fca5a5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${failed} فشلت</span>
      </span>`;
  }

  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
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


// ── Date Format Builder (required by updateTodayBadge) ──
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
    statusEl.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم حفظ التنسيق';
    statusEl.style.color = 'var(--success)';
    setTimeout(() => statusEl.textContent = '', 2500);
  }
  toast('<span data-toast="ok"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span> تم حفظ تنسيق التاريخ');
}

// ════════════════════════════════════════════════════════
//  واتساب — تبويب الرسائل المجدولة