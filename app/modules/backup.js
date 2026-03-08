//  النسخ الاحتياطي والاستعادة والإعادة
// ══════════════════════════════════════════════════════════════════

// ── Download full backup ──────────────────────────────────────────
async function backupDownload() {
  const status = document.getElementById('backupStatus');
  status.innerHTML = '<span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span> جارٍ التحضير…'; status.style.color = 'var(--text2)';
  try {
    const res = await fetch('/api/sync/export');
    if (!res.ok) throw new Error('فشل التنزيل');
    const blob = await res.blob();
    const date = new Date().toLocaleDateString('ar-SA-u-nu-latn').replace(/\//g,'-');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `backup-${date}.json`;
    a.click(); URL.revokeObjectURL(a.href);
    // Record timestamp so backup reminder knows last backup date
    localStorage.setItem('last_backup_ts', Date.now().toString());
    status.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم تنزيل النسخة الاحتياطية'; status.style.color = 'var(--success)';
    setTimeout(() => status.textContent = '', 4000);
    refreshNotifBadge(); // dismiss backup reminder if showing
  } catch(e) {
    status.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${e.message}`; status.style.color = 'var(--error)';
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
      document.getElementById('restoreStatus').innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> الملف صالح — اضغط "استعادة الآن" للمتابعة`;
      document.getElementById('restoreStatus').style.color = 'var(--success)';
    } catch {
      _restoreData = null;
      document.getElementById('restoreConfirmBtn').classList.add('hidden');
      document.getElementById('restoreStatus').innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> الملف غير صالح — تأكد أنه ملف JSON صحيح';
      document.getElementById('restoreStatus').style.color = 'var(--error)';
    }
  };
  reader.readAsText(file);
}

async function backupRestore() {
  if (!_restoreData) return;
  if (!confirm('سيتم دمج البيانات من الملف مع البيانات الحالية.\n\nهل تريد المتابعة؟')) return;
  const status = document.getElementById('restoreStatus');
  status.innerHTML = '<span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span> جارٍ الاستعادة…'; status.style.color = 'var(--text2)';
  const res = await apiFetch('/sync/import', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify(_restoreData),
  });
  if (res?.ok) {
    status.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تمت الاستعادة — تم دمج ${res.merged} سجل جديد`;
    status.style.color = 'var(--success)';
    _restoreData = null;
    document.getElementById('restoreConfirmBtn').classList.add('hidden');
    document.getElementById('restoreFile').value = '';
    document.getElementById('restoreFileName').textContent = 'لم يُختر ملف';
    await loadAll();
  } else {
    status.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> فشلت الاستعادة: ${res?.error || 'خطأ غير معروف'}`;
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
  if (!selected.length) { toast('<span data-toast="warn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> لم تختر أي شيء لإعادة تعيينه'); return; }

  const labels = {
    attendance: 'سجلات الحضور', teacherLog: 'حضور المعلمين',
    calendar: 'التقويم', waLog: 'سجل واتساب', quran: 'تقدم القرآن',
    everything: 'كل البيانات (بما فيها الطلاب والحلقات)',
  };
  const labelList = selected.map(k => `• ${labels[k]}`).join('\n');
  if (!confirm(`سيتم حذف البيانات التالية نهائياً:\n\n${labelList}\n\nهذه العملية لا يمكن التراجع عنها. هل أنت متأكد؟`)) return;
  if (targets.everything && !confirm('تأكيد أخير: سيتم حذف كل البيانات تماماً. هل تريد المتابعة؟')) return;

  const status = document.getElementById('resetStatus');
  status.innerHTML = '<span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span> جارٍ إعادة التعيين…'; status.style.color = 'var(--text2)';

  const res = await apiFetch('/settings/reset', {
    method: 'POST', headers: {'Content-Type':'application/json'},
    body: JSON.stringify(targets),
  });

  if (res?.ok) {
    const cleared = res.cleared.map(k => labels[k]).join('، ');
    status.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تمت إعادة التعيين: ${cleared}`;
    status.style.color = 'var(--success)';
    // Uncheck all
    ['resetAttendance','resetTeacherLog','resetCalendar','resetWaLog','resetQuran','resetEverything']
      .forEach(id => { const el=document.getElementById(id); if(el) el.checked=false; });
    await loadAll();
    toast('<span data-toast="ok"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span> تمت إعادة التعيين بنجاح');
  } else {
    status.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> فشل: ${res?.error || 'خطأ غير معروف'}`;
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
  el.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم حفظ إعدادات واتساب!';
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
  status.style.color='var(--text2)'; status.innerHTML='<span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span> جارٍ الإرسال…';
  const res = await apiFetch('/whatsapp/send', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ studentName:'اختبار', className:'حلقة الاختبار', date: todayISO() }),
  });
  if (res?.ok) {
    status.style.color='var(--success)'; status.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم الإرسال! تحقق من واتساب';
  } else {
    status.style.color='var(--error)'; status.innerHTML=`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${res?.error||'فشل — تأكد من صحة Token ورقم الهاتف'}`;
  }
}

// ══════════════════════════════════════════════════════════

//  مزامنة / نسخ احتياطي
// ══════════════════════════════════════════════════════════
function exportData() {
  window.open(`${API}/sync/export`,'_blank');
  toast('⬇ جارٍ التصدير…');
  localStorage.setItem('last_backup_ts', Date.now().toString());
  setTimeout(refreshNotifBadge, 500);
}

async function initSyncPage() {
  await checkExeStatus();
  // Load Telegram settings
  const s = await apiFetch('/settings');
  if (s) {
    const tgBot  = document.getElementById('settTgBotToken');
    const tgChat = document.getElementById('settTgChatId');
    if (tgBot)  tgBot.value  = s.telegramBotToken || '';
    if (tgChat) tgChat.value = s.telegramChatId   || '';
  }
  syncShowTab('network');
}

function syncShowTab(tab) {
  document.querySelectorAll('.wa-page-tabs .wa-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('#page-sync .wa-tab-panel').forEach(p => p.classList.add('hidden'));
  const el = document.getElementById('syncTab-' + tab);
  if (el) el.classList.remove('hidden');
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
          <span>launch.vbs — ${s.vbsExists ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> موجود' : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> غير موجود'}</span>
        </div>
        <div class="launcher-status-row">
          <span class="launcher-status-dot ${s.jsExists ? 'dot-green' : 'dot-red'}"></span>
          <span>launcher.js — ${s.jsExists ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> موجود' : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> غير موجود'}</span>
        </div>
        <div class="launcher-status-row">
          <span class="launcher-status-dot ${s.exeBuilt ? 'dot-green' : 'dot-orange'}"></span>
          <span>ملف .exe — ${s.exeBuilt ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> جاهز للتنزيل' : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> لم يُبنَ بعد (شغّل build-exe.bat)'}</span>
        </div>
        ${ip ? `<div class="launcher-status-row" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border)">
          <span><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> رابط الشبكة للجوال:</span>
          <code class="launcher-ip-code" onclick="copyNetworkLink('http://${ip}:${s.port}')">http://${ip}:${s.port} <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg></code>
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
    toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> تم نسخ الرابط: ' + url);
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
      statusEl.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم الاستيراد بنجاح! تم دمج البيانات.';
      statusEl.style.color = 'var(--success)'; await loadAll();
    } else {
      statusEl.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> فشل الاستيراد. تحقق من صيغة الملف.';
      statusEl.style.color = 'var(--error)';
    }
  } catch(e) {
    statusEl.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ملف غير صالح. تأكد من أنه ملف JSON صحيح.';
    statusEl.style.color = 'var(--error)';
  }
  document.getElementById('importFile').value = '';
}

// ══════════════════════════════════════════════════════════

//  نسخ احتياطي وإعادة ضبط البيانات
// ════════════════════════════════════════════════════════

const RESET_LABELS = {
  attendance:  'سجل حضور الطلاب',
  teacherLog:  '⏱ حضور المعلمين والإداريين',
  quran:       'تقدم القرآن الكريم',
  waLog:       'سجل رسائل واتساب',
  calendar:    'أحداث التقويم',
  holidays:    'الإجازات الرسمية',
  students:    'الطلاب',
  teachers:    'المعلمون',
  classes:     'الحلقات',
  notices:     'التعهدات والإنذارات',
  waGroups:    'مجموعات واتساب',
  waDismissed: 'الرسائل المتجاهَلة',
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
    listEl.innerHTML = selected.map(k => `<div><span class="ui-ic ic-red" style="vertical-align:middle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span> ${RESET_LABELS[k] || k}</div>`).join('');
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
  if (statusEl) { statusEl.innerHTML = '<span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span> جارٍ الحذف…'; statusEl.className = 'status-msg'; }

  const res = await apiFetch('/settings/reset', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (res?.ok) {
    const labels = (res.cleared || selected).map(k => RESET_LABELS[k] || k).join('، ');
    if (statusEl) { statusEl.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم الحذف بنجاح: ${labels}`; statusEl.className = 'status-msg status-success'; }
    toast('<span data-toast="ok"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span> تم الحذف بنجاح');
    resetClearAll();
    // Reload state
    await loadData();
    renderStudentList?.();
    renderCheckinList?.();
  } else {
    if (statusEl) { statusEl.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> تعذّر الحذف — حاول مرة أخرى'; statusEl.className = 'status-msg status-error'; }
    toast('<span data-toast="err"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></span> تعذّر الحذف');
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
    toast('<span data-toast="warn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></span> اكتب كلمة "حذف" للتأكيد');
    inp?.focus();
    return;
  }
  closeModal('fullResetModal');

  const statusEl = document.getElementById('resetStatus');
  if (statusEl) { statusEl.innerHTML = '<span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span> جارٍ إعادة الضبط…'; statusEl.className = 'status-msg'; }

  const res = await apiFetch('/settings/reset', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ everything: true }),
  });

  if (res?.ok) {
    if (statusEl) { statusEl.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تمت إعادة الضبط الكاملة بنجاح'; statusEl.className = 'status-msg status-success'; }
    toast('<span data-toast="ok"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span> تمت إعادة الضبط الكاملة');
    await loadData();
    renderStudentList?.();
    renderCheckinList?.();
    navigate('dashboard');
  } else {
    if (statusEl) { statusEl.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> تعذّرت إعادة الضبط'; statusEl.className = 'status-msg status-error'; }
    toast('<span data-toast="err"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></span> تعذّرت إعادة الضبط');
  }
}

// ════════════════════════════════════════════════════════
