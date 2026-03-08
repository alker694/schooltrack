//  التقارير
// ══════════════════════════════════════════════════════════
function initReports() {
  setDateToday('rptDailyDate', 'rptDateHijri');
  setDateToday('rptTeacherDailyDate', 'rptTeacherDateHijri');
  const todayH = toHijri(todayISO());
  document.getElementById('rptYear').value  = todayH.year;
  document.getElementById('rptMonth').value = todayH.month;
  const teacherYearEl = document.getElementById('rptTeacherYear');
  const teacherMonthEl = document.getElementById('rptTeacherMonth');
  if (teacherYearEl)  teacherYearEl.value  = todayH.year;
  if (teacherMonthEl) teacherMonthEl.value = todayH.month;
  // Populate class dropdowns
  const classOpts = '<option value="">جميع الحلقات</option>' +
    state.classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  const dc = document.getElementById('rptDailyClass');
  const mc = document.getElementById('rptMonthlyClass');
  if (dc) dc.innerHTML = classOpts;
  if (mc) mc.innerHTML = classOpts;
}

function downloadReport(type) {
  let url;
  const dailyClass   = document.getElementById('rptDailyClass')?.value   || '';
  const monthlyClass = document.getElementById('rptMonthlyClass')?.value || '';

  if (type==='daily-attendance') {
    const date = document.getElementById('rptDailyDate').value;
    if (!date) return toast('اختر تاريخًا');
    url = `${API}/reports/daily-attendance/${date}` + (dailyClass ? `?classId=${dailyClass}` : '');
  } else if (type==='pdf-daily') {
    const date = document.getElementById('rptDailyDate').value;
    if (!date) return toast('اختر تاريخًا');
    url = `${API}/reports/pdf/daily/${date}` + (dailyClass ? `?classId=${dailyClass}` : '');
  } else if (type==='teacher-log') {
    const date = document.getElementById('rptTeacherDailyDate').value;
    if (!date) return toast('اختر تاريخًا');
    url = `${API}/reports/teacher-log/${date}`;
  } else if (type==='monthly') {
    const hYear  = document.getElementById('rptYear').value;
    const hMonth = document.getElementById('rptMonth').value;
    if (!hYear || !hMonth) return toast('اختر الشهر والسنة الهجرية');
    url = `${API}/reports/monthly/hijri/${hYear}/${hMonth}` + (monthlyClass ? `?classId=${monthlyClass}` : '');
  } else if (type==='pdf-teacher-monthly') {
    const hYear  = document.getElementById('rptTeacherYear').value;
    const hMonth = document.getElementById('rptTeacherMonth').value;
    if (!hYear || !hMonth) return toast('اختر الشهر والسنة الهجرية');
    url = `${API}/reports/pdf/teacher-monthly/hijri/${hYear}/${hMonth}`;
  } else if (type==='teacher-monthly-excel') {
    const hYear  = document.getElementById('rptTeacherYear').value;
    const hMonth = document.getElementById('rptTeacherMonth').value;
    if (!hYear || !hMonth) return toast('اختر الشهر والسنة الهجرية');
    url = `${API}/reports/teacher-monthly/hijri/${hYear}/${hMonth}`;
  } else if (type==='print-daily-attendance') {
    const date = document.getElementById('rptDailyDate').value;
    if (!date) return toast('اختر تاريخًا');
    url = `${API}/print/daily-attendance/${date}` + (dailyClass ? `?classId=${dailyClass}` : '');
  } else if (type==='print-teacher-log') {
    const date = document.getElementById('rptTeacherDailyDate').value;
    if (!date) return toast('اختر تاريخًا');
    url = `${API}/print/teacher-log/${date}`;
  } else if (type==='print-monthly') {
    const hYear  = document.getElementById('rptYear').value;
    const hMonth = document.getElementById('rptMonth').value;
    if (!hYear || !hMonth) return toast('اختر الشهر والسنة الهجرية');
    url = `${API}/print/monthly-attendance/${hYear}/${hMonth}` + (monthlyClass ? `?classId=${monthlyClass}` : '');
  } else if (type==='print-teacher-monthly') {
    const hYear  = document.getElementById('rptTeacherYear').value;
    const hMonth = document.getElementById('rptTeacherMonth').value;
    if (!hYear || !hMonth) return toast('اختر الشهر والسنة الهجرية');
    url = `${API}/print/teacher-monthly/${hYear}/${hMonth}`;
  } else if (type==='print-students-list') {
    const listClass = document.getElementById('rptDailyClass')?.value;
    url = `${API}/print/students-list` + (listClass ? `?classId=${listClass}` : '');
  } else if (type==='print-teachers-list') {
    url = `${API}/print/teachers-list`;
  }
  if (url) {
    if (type.startsWith('print-')) {
      // Fetch the HTML from the server, write into a blank window, trigger print
      // This avoids the "just shows HTML page" problem on all browsers/mobile
      toast('<span class="ic-spin ic-inline"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M12 2v4"/><path d="m16.24 7.76 2.83-2.83"/><path d="M18 12h4"/><path d="m16.24 16.24 2.83 2.83"/><path d="M12 18v4"/><path d="m4.93 19.07 2.83-2.83"/><path d="M2 12h4"/><path d="m4.93 4.93 2.83 2.83"/></svg></span> جارٍ تحميل الصفحة…');
      fetch(url)
        .then(r => {
          if (!r.ok) throw new Error(r.status);
          return r.text();
        })
        .then(html => {
          // Inject auto-print script before </body>
          const printHtml = html.replace(
            /<\/body>/i,
            `<script>window.onload=function(){window.focus();window.print();}<\/script></body>`
          );
          const win = window.open('', '_blank', 'width=900,height=700');
          if (!win) { toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> السماح بالنوافذ المنبثقة مطلوب'); return; }
          win.document.open();
          win.document.write(printHtml);
          win.document.close();
        })
        .catch(err => {
          console.error('Print fetch error:', err);
          toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> تعذّر تحميل صفحة الطباعة');
        });
    } else {
      window.open(url, '_blank');
      toast('⬇ جارٍ التنزيل…');
    }
  }
}

// نسخ رابط الشبكة إلى الحافظة
async function copyNetworkLink() {
  const url = _qrNetworkUrl || window.location.origin;
  try {
    await navigator.clipboard.writeText(url);
    toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم نسخ الرابط: ' + url);
  } catch(e) {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم نسخ الرابط');
  }
}

// ══════════════════════════════════════════════════════════
