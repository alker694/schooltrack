//  الرئيسية
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
//  مودالات الحضور — الغائبون / الحاضرون
// ══════════════════════════════════════════════════════════

// Shared: fetch today attendance + render for a given status
async function _showAttModal(modalId, status) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('hidden');
  const bodyEl  = document.getElementById(modalId + 'Body');
  const countEl = document.getElementById(modalId + 'Count');
  const subEl   = document.getElementById(modalId + 'Sub');
  const isAbsent = status === 'Absent';

  bodyEl.innerHTML = `<div class="aom-loading"><span class="ic-spin ic-inline"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span></div>`;

  try {
    const today  = todayISO();
    const allAtt = await apiFetch('/attendance?date=' + today);
    const attMap = {};
    if (allAtt) allAtt.forEach(a => attMap[a.studentId] = a);

    const matched = state.students.filter(s => attMap[s.id]?.status === status);

    // Update header
    const hijriToday = formatHijri(today);
    countEl.textContent = matched.length;
    subEl.textContent   = hijriToday;

    if (matched.length === 0) {
      const emptyIcon  = isAbsent
        ? `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
        : `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
      const emptyMsg = isAbsent ? 'لا يوجد غائبون اليوم 🎉' : 'لا يوجد حضور مسجّل بعد';
      const emptySubMsg = isAbsent ? 'جميع الطلاب المسجلون حاضرون' : 'سجّل الحضور أولاً من صفحة تسجيل الحضور';
      bodyEl.innerHTML = `<div class="aom-empty">${emptyIcon}<div class="aom-empty-title">${emptyMsg}</div><div class="aom-empty-sub">${emptySubMsg}</div></div>`;
      return;
    }

    // Group by class
    const byClass = {};
    matched.forEach(s => {
      const cls = state.classes.find(c => c.id === s.classId);
      const key = s.classId || '__none__';
      const lbl = cls?.name || 'بدون حلقة';
      if (!byClass[key]) byClass[key] = { label: lbl, students: [] };
      byClass[key].students.push(s);
    });

    let html = '';
    Object.values(byClass).forEach((group, gi) => {
      html += `<div class="aom-group${gi > 0 ? ' aom-group--spaced' : ''}">
        <div class="aom-group-label">
          <span>${group.label}</span>
          <span class="aom-group-count">${group.students.length}</span>
        </div>
        <div class="aom-cards">`;
      group.students.forEach(s => {
        const initials = s.name.trim().split(' ').slice(0,2).map(w=>w[0]||'').join('');
        const avatarInner = s.photo
          ? `<img src="${s.photo}" alt="${s.name}" onerror="this.style.display='none'" />`
          : `<span class="aom-initials">${initials}</span>`;
        const phone = s.parentPhone
          ? `<span class="aom-card-phone"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg> ${s.parentPhone}</span>`
          : '';
        const statusClass = isAbsent ? 'aom-card--absent' : 'aom-card--present';
        const indicator = isAbsent
          ? `<div class="aom-card-indicator aom-ind--absent"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>`
          : `<div class="aom-card-indicator aom-ind--present"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>`;
        html += `
          <div class="aom-card ${statusClass}" onclick="closeModal('${modalId}');viewStudent('${s.id}')">
            <div class="aom-avatar ${isAbsent ? 'aom-avatar--absent' : 'aom-avatar--present'}">${avatarInner}</div>
            <div class="aom-card-body">
              <div class="aom-card-name">${s.name}</div>
              <div class="aom-card-meta">${s.studentId||''}${phone ? ' · ' : ''}${phone}</div>
            </div>
            ${indicator}
          </div>`;
      });
      html += `</div></div>`;
    });

    bodyEl.innerHTML = html;
  } catch(e) {
    bodyEl.innerHTML = `<div class="aom-error">تعذّر تحميل البيانات</div>`;
  }
}

async function showAbsentModal()  { await _showAttModal('absentModal',  'Absent');  }
async function showPresentModal() { await _showAttModal('presentModal', 'Present'); }


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
    banner.innerHTML = `<span style="display:inline-flex;align-items:center;gap:6px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7"/></svg> إجازة اليوم: ${stats.holidayReason}</span>`;
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
