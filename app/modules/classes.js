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
      <div class="list-card-avatar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg></div>
      <div class="list-card-body">
        <div class="list-card-name">${cls.name}</div>
        <div class="list-card-sub">${cls.grade||''} · قاعة ${cls.room||'—'} · ${count} طالب</div>
      </div>
      <div class="list-card-actions">
        <button class="btn-icon" title="تقرير القرآن Excel" onclick="downloadClassQuranReport('${cls.id}','${cls.name.replace(/'/g,'')}')">📥</button>
        <button class="btn-icon" onclick="openClassModal('${cls.id}')"><span class="ui-ic ic-blue"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span></button>
        <button class="btn-icon" onclick="deleteClass('${cls.id}')"><span class="ui-ic ic-red"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></span></button>
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
  toast(id ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم تحديث الحلقة' : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تمت إضافة الحلقة');
}

async function deleteClass(id) {
  if (!confirm('هل تريد حذف هذه الحلقة؟')) return;
  await apiFetch(`/classes/${id}`, { method:'DELETE' });
  await loadAll(); renderClassList(); toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> تم حذف الحلقة');
}

function downloadClassQuranReport(classId, className) {
  toast('<span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span> جارٍ إنشاء تقرير القرآن…');
  window.open(`${API}/reports/quran/class/${classId}`, '_blank');
}

// ══════════════════════════════════════════════════════════
