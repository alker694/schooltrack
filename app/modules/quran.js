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
    btn.onclick = () => { toast('<span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span> جارٍ إنشاء تقرير الحلقة…'); window.open(`${API}/reports/quran/class/${classId}`, '_blank'); };
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
        <button class="btn-secondary" style="font-size:12px;flex:1" onclick="viewStudentQuranHistory('${r.studentId}','${r.name}')"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg> السجل</button>
        <button class="btn-secondary" style="font-size:12px;padding:6px 8px" title="تحميل Excel" onclick="window.open('${API}/reports/quran/student/${r.studentId}','_blank')">📥</button>
        <button class="btn-primary"   style="font-size:12px;flex:1" onclick="openProgressModal('${r.studentId}')">+ تسجيل</button>
      </div>`;
    grid.appendChild(card);
  });
}

async function viewStudentQuranHistory(studentId, name) {
  _quranViewStudentId = studentId;
  document.getElementById('quranStudentModalTitle').innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> سجل تقدم القرآن — ${name}`;
  const body = document.getElementById('quranStudentModalBody');
  body.innerHTML = '<p style="color:var(--text2);font-size:13px"><span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span> جارٍ التحميل…</p>';
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
            <td><button class="btn-icon" onclick="deleteProgress('${p.id}','${studentId}','modal')"><span class="ui-ic ic-red"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></span></button></td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>`;
}

async function deleteProgress(id, studentId, context) {
  if (!confirm('هل تريد حذف هذا السجل؟')) return;
  await apiFetch(`/quran-progress/${id}`, { method:'DELETE' });
  toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> تم حذف السجل');
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
  document.getElementById('quranModalTitle').innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> تسجيل تقدم القرآن';

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
    toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم تحديث السجل');
  } else {
    await apiFetch('/quran-progress', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم حفظ التقدم');
  }
  closeModal('quranProgressModal');
  if (state.currentPage === 'quran') await loadQuranSummary();
}
// ══════════════════════════════════════════════════════════════════
