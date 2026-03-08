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
        <button class="btn-icon" title="تعديل" onclick="openTeacherModal('${t.id}')"><span class="ui-ic ic-blue"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span></button>
        <button class="btn-icon" title="حذف"   onclick="deleteTeacher('${t.id}')"><span class="ui-ic ic-red"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></span></button>
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
  toast(id ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم تحديث بيانات المعلم' : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تمت إضافة المعلم');
}

async function deleteTeacher(id) {
  if (!confirm('هل تريد حذف هذا المعلم؟')) return;
  await apiFetch(`/teachers/${id}`, { method:'DELETE' });
  await loadAll(); renderTeacherList(); toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> تم حذف المعلم');
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
  if (res?.error) return toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> '+res.error);
  await loadAll(); renderCheckinList(); loadTeacherSummary(); toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم تسجيل الحضور!');
}
async function checkOut(teacherId) {
  const res = await apiFetch('/teacher-log/checkout', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({teacherId}) });
  if (res?.error) return toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> '+res.error);
  await loadAll();
  // عرض مدة الحضور في الإشعار
  const duration = res.duration || '';
  renderCheckinList();
  loadTeacherSummary();
  toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم تسجيل الانصراف! ${duration ? '| المدة: '+duration : ''}`);
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
          ${t.phone?`<a href="tel:${t.phone}" class="tp-chip tp-chip-phone"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> ${t.phone}</a>`:''}
        </div>
        <span class="checkin-status ${todayClass}" style="margin-top:6px;display:inline-block">${todayStatus}</span>
      </div>
      <button class="btn-secondary tp-edit-btn" onclick="closeModal('teacherProfileModal');openTeacherModal('${t.id}')"><span class="ui-ic ic-blue"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span> تعديل</button>
    </div>
    <div class="tp-stats">
      <div class="tp-stat tp-stat-blue"><div class="tp-stat-num">${days}</div><div class="tp-stat-lbl">أيام الحضور</div></div>
      <div class="tp-stat tp-stat-purple"><div class="tp-stat-num">${fmtHM(monthlyMins)}</div><div class="tp-stat-lbl">ساعات هذا الشهر</div></div>
      <div class="tp-stat ${todayLive?'tp-stat-live':'tp-stat-amber'}"><div class="tp-stat-num">${todayLive?'<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#ef4444;margin-left:4px;vertical-align:middle"></span> ':''}${fmtHM(todayMins)}</div><div class="tp-stat-lbl">${todayLive?'مباشر الآن':'ساعات اليوم'}</div></div>
      <div class="tp-stat tp-stat-green"><div class="tp-stat-num">${fmtHM(totalMins)}</div><div class="tp-stat-lbl">إجمالي كل الوقت</div></div>
    </div>
    <div class="tp-section-title"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> السجل الشهري</div>
    <div class="tp-months-container">${buildMonthBlocks()}</div>
    <!-- زر طباعة الملف -->
    <div style="display:flex;justify-content:flex-end;margin-top:16px;padding-top:12px;border-top:1px solid var(--border)">
      <button class="btn-secondary" onclick="printTeacherProfile('${t.id}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg> طباعة الملف</button>
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
