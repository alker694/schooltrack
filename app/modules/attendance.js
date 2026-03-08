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
    noteEl.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> هذا اليوم إجازة: <strong>${holiday.reason}</strong> — ${formatHijriFull(date)}`;
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



  const leaveTypeLabel = { Sick: ic('thermometer','ic-red')+' مرض', Permission: ic('clipboard','ic-blue')+' إذن خروج', Travel: ic('plane','ic-sky')+' سفر', Family: ic('alert-circle','ic-amber')+' طارئ', Other: ic('file-text','ic-gray')+' أخرى' };

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
      ? `<button class="att-btn-cancel-leave" onclick="cancelLeave('${leave.id}','${s.id}','${date}','${classId}')" title="إلغاء الإذن"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`
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
                  <span class="att-btn-icon ui-ic ic-green"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span><span>حاضر</span>
                </button>
                <button class="att-btn att-btn-absent ${status==='Absent'?'active':''}" onclick="setAttStatus('${s.id}','Absent')">
                  <span class="att-btn-icon ui-ic ic-red"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span><span>غائب</span>
                </button>
                <button class="att-btn att-btn-late ${status==='Late'?'active':''}" onclick="setAttStatus('${s.id}','Late')">
                  <span class="att-btn-icon ui-ic ic-amber"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span><span>متأخر</span>
                </button>
                <button class="att-btn att-btn-excused ${status==='Excused'?'active':''}" onclick="setAttStatus('${s.id}','Excused')" title="بعذر (ليس مرضاً أو طارئاً — استخدم إذن مسبق لذلك)">
                  <span class="att-btn-icon ui-ic ic-purple"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l1.5-3 2 4.5 1.5-3 1.5 3h5.27"/></svg></span><span>بعذر</span>
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
        ${s.phone ? '<span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span>' : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'}
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
    <span class="att-action-icon ui-ic ic-red"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span>
    <span class="att-action-label">إغلاق</span>
  </button>`;

  html += `<button class="att-action-btn att-action-home" onclick="closeModal('attSavedModal');navigate('dashboard')">
    <span class="att-action-icon ui-ic ic-sky"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></span>
    <span class="att-action-label">الرئيسية</span>
  </button>`;

  // Next class button
  if (hasNext) {
    html += `<button class="att-action-btn att-action-next" onclick="goToNextClass()">
      <span class="att-action-icon ui-ic ic-blue"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg></span>
      <span class="att-action-label">الحلقة التالية</span>
      <span class="att-action-sub">${nextName}</span>
    </button>`;
  }

  // WhatsApp button — always show if there are absent students
  if (hasAbsent) {
    if (hasNext) {
      html += `<button class="att-action-btn att-action-wa-next" id="attWaNextBtn" onclick="sendWaThenNextClass()">
        <span class="att-action-icon ui-ic ic-teal"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
        <span class="att-action-label">واتساب + التالية</span>
        <span class="att-action-sub">إرسال ثم ${nextName}</span>
      </button>`;
    } else {
      html += `<button class="att-action-btn att-action-wa-next" id="attWaNextBtn" onclick="sendWaFromModal()">
        <span class="att-action-icon ui-ic ic-teal"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg></span>
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
  toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> الحلقة التالية: ${state.classes[curIdx + 1]?.name}`);
}

async function sendWaThenNextClass() {
  if (_waSendingInModal) return;
  _waSendingInModal = true;
  const btn    = document.getElementById('attWaNextBtn');
  const status = document.getElementById('attSavedWaSendStatus');
  if (btn)    { btn.disabled = true; btn.querySelector('.att-action-label').innerHTML = '<span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span> جارٍ الإرسال…'; }
  if (status) { status.innerHTML = '<span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span> جارٍ إرسال إشعارات الغياب…'; status.classList.remove('hidden'); }

  await _doSendWaFromModal();

  // بعد الإرسال — انتقل للحلقة التالية
  setTimeout(() => { goToNextClass(); _waSendingInModal = false; }, 900);
}

async function sendWaFromModal() {
  if (_waSendingInModal) return;
  _waSendingInModal = true;
  const btn    = document.getElementById('attWaNextBtn');
  const status = document.getElementById('attSavedWaSendStatus');
  if (btn)    { btn.disabled = true; btn.querySelector('.att-action-label').innerHTML = '<span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span> جارٍ الإرسال…'; }
  if (status) { status.innerHTML = '<span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span> جارٍ إرسال إشعارات الغياب…'; status.classList.remove('hidden'); }

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
    if (el) el.innerHTML = '<span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span>';
  });

  const res = await apiFetch('/whatsapp/send-bulk', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records, date: _savedDate, classId: _savedClassId }),
  });

  const status = document.getElementById('attSavedWaSendStatus');
  if (res?.results) {
    res.results.forEach((r, i) => {
      const el = document.getElementById(`att-wa-status-${i}`);
      if (el) el.innerHTML = r.ok ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>' : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    });
    const msg = res.failed === 0
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم إرسال جميع الرسائل بنجاح (${res.sent})`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> ${res.sent} نجح&nbsp; <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${res.failed} فشل`;
    if (status) { status.textContent = msg; status.classList.remove('hidden'); }
    showWaSummaryNotif(res.sent, res.failed);
    if (res.failed > 0) showWaFailNotif('رسائل الغياب', res.failed, null);
  } else if (res?.error) {
    if (status) { status.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> ${res.error}`; status.classList.remove('hidden'); }
    showWaSummaryNotif(0, 0, res.error);
    showWaFailNotif('رسائل الغياب', 0, res.error);
  }
  return res;
}



// ══════════════════════════════════════════════════════════
