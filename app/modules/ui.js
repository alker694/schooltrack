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
        const typeLabelsNote = { Sick: ic('thermometer','ic-red')+' مرض', Permission: ic('clipboard','ic-blue')+' إذن خروج', Travel: ic('plane','ic-sky')+' سفر', Family: ic('alert-circle','ic-amber')+' ظرف عائلي', Other: ic('file-text','ic-gray')+' أخرى' };
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
  toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم تسجيل الإذن: ${typeLabels[type]||type} — وتحديث الحضور إلى بعذر`);
}

async function cancelLeave(leaveId, studentId, date, classId) {
  if (!confirm('هل تريد إلغاء هذا الإذن؟')) return;
  await apiFetch(`/leaves/${leaveId}`, { method:'DELETE' });
  await loadAttendanceStudents();
  toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> تم إلغاء الإذن');
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.querySelectorAll('.modal-overlay').forEach(overlay =>
  overlay.addEventListener('click', e => { if (e.target===overlay) overlay.classList.add('hidden'); })
);

let toastTimer;
function toast(msg, duration=3200) {
  const el = document.getElementById('toast');
  el.innerHTML = msg;
  el.classList.remove('hidden', 'toast-success', 'toast-error', 'toast-warn');
  const plain = el.textContent || '';
  if (msg.includes('data-toast="ok"') || plain.includes('تم') || plain.includes('نجاح'))
    el.classList.add('toast-success');
  else if (msg.includes('data-toast="err"') || plain.includes('فشل') || plain.includes('تعذر') || plain.includes('خطأ'))
    el.classList.add('toast-error');
  else if (msg.includes('data-toast="warn"') || plain.includes('يرجى') || plain.includes('اختر'))
    el.classList.add('toast-warn');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), duration);
}

// ══════════════════════════════════════════════════════════
