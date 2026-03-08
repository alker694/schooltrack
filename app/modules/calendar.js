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
const CAL_TYPE_LABEL = { event: '<span class="ui-ic ic-amber" style="display:inline-flex;align-items:center;gap:4px;vertical-align:middle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg></span> حدث', holiday: '<span class="ui-ic ic-sky" style="display:inline-flex;align-items:center;gap:4px;vertical-align:middle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7"/></svg></span> إجازة', offday: '<span class="ui-ic ic-gray" style="display:inline-flex;align-items:center;gap:4px;vertical-align:middle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12 12 0 0 0 2.54.72 2 2 0 0 1 1.64 2l.12 2a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 2 2 0 0 1-.37-.3"/><path d="M6.14 6.14A19.79 19.79 0 0 0 3.07 14.77a2 2 0 0 1-2.18 2l-2-.12a2 2 0 0 1-1.64-2 12 12 0 0 0 .72-2.54 2 2 0 0 1-.45-2.11l1.27-1.27a16 16 0 0 0 2.6-3.41"/><line x1="1" y1="1" x2="23" y2="23"/></svg></span> يوم إجازة', message:'💬 رسالة', reminder:'🔔 تذكير' };

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
          <button class="btn-icon" onclick="event.stopPropagation();openCalEventModal('${item.id}')" title="تعديل"><span class="ui-ic ic-blue"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span></button>
          <button class="btn-icon" onclick="event.stopPropagation();deleteCalEvent('${item.id}')" title="حذف"><span class="ui-ic ic-red"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></span></button>
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
  if(isFri) html+=`<div class="cal-day-sys"><span class="ui-ic ic-teal" style="display:inline-flex;align-items:center;gap:4px;vertical-align:middle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 20H2"/><path d="M4 20V10a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v10"/><path d="M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/><path d="M9 20v-4a3 3 0 0 1 6 0v4"/></svg></span> يوم الجمعة — إجازة أسبوعية</div>`;
  if(isHol&&!isFri){
    const h=(state.holidays||[]).find(h=>h.date===iso);
    html+=`<div class="cal-day-sys cal-day-sys-red"><span class="ui-ic ic-sky" style="display:inline-flex;align-items:center;gap:4px;vertical-align:middle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 12a11.05 11.05 0 0 0-22 0zm-5 7a3 3 0 0 1-6 0v-7"/></svg></span> ${h?.reason||'إجازة'}</div>`;
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
          ${e.type==='message'&&e.waTargets?.length?`<div class="cal-day-ev-note"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> ${e.waTargets.length} مستلم</div>`:''}
        </div>
        <div style="display:flex;flex-direction:column;gap:3px;padding:6px 8px;flex-shrink:0">
          <button class="btn-icon" onclick="openCalEventModal('${e.id}')" title="تعديل"><span class="ui-ic ic-blue"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></span></button>
          <button class="btn-icon" onclick="deleteCalEvent('${e.id}')" title="حذف"><span class="ui-ic ic-red"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></span></button>
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
    toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم اختيار ${_eventDates.length} يوم`);
  } else if (_dpMode === 'holiday') {
    _holidayDates = [..._dpTempSelected].sort();
    _renderHolidayChips();
    closeDayPickerModal();
    const btn = document.getElementById('holidaySaveBtn');
    if (btn) btn.textContent = _holidayDates.length > 1 ? `حفظ (${_holidayDates.length} أيام)` : 'حفظ';
    toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم اختيار ${_holidayDates.length} يوم`);
  } else {
    _specificDates = [..._dpTempSelected].sort();
    _renderSpecificChips();
    closeDayPickerModal();
    toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم اختيار ${_specificDates.length} يوم`);
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
  if (cnt) cnt.innerHTML = _dpTempSelected.length
    ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> ${_dpTempSelected.length} يوم مختار`
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
      `<span class="cal-specific-chip">${formatHijri(iso)} <button onclick="calRemoveSpecificDay('${iso}')"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></span>`
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
      `<span class="cal-specific-chip">${formatHijri(iso)} <button type="button" onclick="_eventDates=_eventDates.filter(d=>d!=='${iso}');_renderEventDpChips()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></span>`
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
  sel.innerHTML = '<option value="">جارٍ تحميل المجموعات…</option>';
  const token = await _getFonnteToken();
  if (!token) {
    sel.innerHTML = '<option value=""><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> أدخل Fonnte Token في الإعدادات</option>';
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
  if (!sel || !sel.value) { toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> اختر مجموعة أولاً'); return; }
  const id   = sel.value;
  const name = sel.selectedOptions[0]?.dataset?.name || sel.selectedOptions[0]?.text || id;
  // Avoid duplicates
  if (_calWaRows.find(r => r.phone === id)) { toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> هذه المجموعة مضافة بالفعل'); return; }
  _calWaRows.push({ name, phone: id, isGroup: true });
  _renderCalWaRows();
  sel.value = ''; // reset
  toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تمت إضافة: ${name}`);
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
          <span class="cal-wa-group-icon ui-ic ic-blue"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
          <div class="cal-wa-group-info">
            <span class="cal-wa-group-name">${r.name||'مجموعة'}</span>
            <span class="cal-wa-group-id" dir="ltr">${r.phone}</span>
          </div>
          <button class="wa-rec-del" onclick="_calWaRows.splice(${i},1);_renderCalWaRows()" title="إزالة"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>`;
    }
    return `
      <div class="cal-wa-row" data-row-idx="${i}">
        <input type="text" class="cal-wa-name"  placeholder="الاسم" value="${r.name||''}" onchange="_calWaRows[${i}].name=this.value" />
        <input type="text" class="cal-wa-phone" placeholder="رقم الواتساب" value="${r.phone||''}" dir="ltr" onchange="_calWaRows[${i}].phone=this.value" />
        <button class="wa-rec-del" onclick="_calWaRows.splice(${i},1);_renderCalWaRows()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>`;
  }).join('');
}

/* Save / Delete */
let _calSaving = false;
async function saveCalEvent(){
  if (_calSaving) return;
  _calSaving = true;
  const saveBtn = document.getElementById('calSaveBtn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span> جارٍ الحفظ…'; }
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
    if(!validTargets.length) { _calSaving=false; if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='حفظ';} return toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> أضف مستلماً واحداً على الأقل للرسالة'); }
    if(!document.getElementById('calWaMessage').value.trim()) { _calSaving=false; if(saveBtn){saveBtn.disabled=false;saveBtn.textContent='حفظ';} return toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> أدخل نص الرسالة'); }
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
      if (sr?.ok)    toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم تحديث الحدث وإعادة جدولة الرسالة على Fonnte`);
      else if (sr)   { toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> تم تحديث الحدث لكن فشل إعادة الجدولة: ${sr.error||'تحقق من الـ Token'}`); showWaFailNotif('رسالة مجدولة', 1, sr.error || 'تحقق من الـ Token'); }
      else           toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم تحديث الحدث');
    } else {
      toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم تحديث الحدث');
    }
  } else {
    const r = await apiFetch('/calendar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if((dailyRepeat || useSpecific) && r?.ids?.length>1) {
      const scheduled = r.scheduleResults?.filter(s=>s.ok).length || 0;
      const failed    = r.scheduleResults?.filter(s=>!s.ok).length || 0;
      if(scheduled>0) toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم جدولة ${r.ids.length} رسالة على Fonnte (${scheduled} مجدول${failed>0?', <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> '+failed+' فشل':''})`);
      else if(failed>0) { toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> تم حفظ الأحداث لكن فشل الجدولة على Fonnte`); showWaFailNotif('رسائل مجدولة', failed, 'فشل الجدولة على Fonnte'); }
      else toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم جدولة ${r.ids.length} رسالة`);
    } else if(_calSelType==='message') {
      const sr = r?.scheduleResults?.[0];
      if(sr?.ok)    toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم جدولة الرسالة على Fonnte — ستُرسَل يوم ${payload.date}`);
      else if(sr)   { toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> تم حفظ الحدث لكن فشل الجدولة على Fonnte: ${sr.error||'تحقق من الـ Token'}`); showWaFailNotif('رسالة مجدولة', 1, sr.error || 'تحقق من الـ Token'); }
      else          toast('<span data-toast="ok"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span> تم حفظ الحدث');
    } else {
      toast('<span data-toast="ok"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></span> تم حفظ الحدث');
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
  toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> تم حذف الحدث' + (deleteAll?' والسلسلة كاملة':''));
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
  toast('<span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span> جارٍ إنشاء ملف Excel…');
  try {
    const res = await fetch(`/api/calendar/export?year=${year}`);
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `تقويم-${year}هـ.xlsx`;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 1000);
    toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم تصدير تقويم ${year}هـ`);
  } catch(e) { toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> فشل التصدير: ' + e.message); }
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
    <h1><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${label}</h1>
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
    <div class="cal-daily-note"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg> ستظهر كل رسالة في يومها على التقويم، ويمكن حذفها مجتمعةً أو فرادى لاحقاً</div>`;
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
  toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم إضافة ${_woRows.length} ولي أمر`);
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
        <button class="wa-rec-del" onclick="_woRows.splice(${i},1);_renderWoRecipients()"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
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
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span> جارٍ الحفظ…'; }

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
      toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم جدولة الإجازة + ${days} رسالة يومية`);
    } else {
      toast(`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم جدولة إجازة "${title}"`);
    }

    closeModal('weekOffModal');
    await loadAll();
    renderCalendar();
  } catch(e) {
    toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> حدث خطأ: ' + (e.message||e));
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> جدولة الإجازة'; }
  }
}

// ════════════════════════════════════════════════════════
