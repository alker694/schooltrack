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
      <div class="list-card-avatar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
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
    toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تمت إضافة ${saved} إجازة`);
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
  toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تمت إضافة الإجازة');
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
        const b=document.getElementById('holidaySaveBtn');if(b)b.textContent=_holidayDates.length>1?'حفظ ('+_holidayDates.length+' أيام)':'حفظ';"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </span>`
  ).join('');
}

async function deleteHoliday(date) {
  if (!confirm(`هل تريد حذف إجازة يوم ${formatHijri(date)}؟`)) return;
  await apiFetch(`/holidays/${date}`, { method:'DELETE' });
  await loadAll(); renderHolidayList(); toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> تم حذف الإجازة');
}

// ══════════════════════════════════════════════════════════
