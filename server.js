/**
 * ══════════════════════════════════════════════════════════
 *  حضور الحلقات — server.js  (إصدار مُصلَح كامل)
 *  جميع نقاط API تحت /api/
 *  قاعدة البيانات: data/db.json
 * ══════════════════════════════════════════════════════════
 */

const express    = require('express');
const path       = require('path');
const fs         = require('fs');
let XLSX; try { XLSX = require('xlsx-js-style'); } catch(e) { XLSX = require('xlsx'); }
const ExcelJS = require('exceljs');
const PDFDocument= require('pdfkit');
const multer     = require('multer');
const https      = require('https');
const os         = require('os');

// اختياري: مكتبة QR
let QRCode;
try { QRCode = require('qrcode'); } catch(e) { /* سيستخدم API خارجي */ }

const app  = express();
const PORT = process.env.PORT || 3000;

// ── المسارات ─────────────────────────────────────────────
const ROOT_DIR   = __dirname;
const DATA_DIR   = path.join(ROOT_DIR, 'data');
const DB_FILE    = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR= path.join(DATA_DIR, 'uploads');
const APP_DIR    = path.join(ROOT_DIR, 'app');   // للملفات الثابتة (index.html, app.js, styles.css)

[DATA_DIR, UPLOADS_DIR].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// ── قاعدة البيانات الافتراضية ────────────────────────────
const DEFAULT_DB = {
  students: [], classes: [], teachers: [],
  teacherLog: [], attendance: [], leaves: [], holidays: [], quranProgress: [],
  calendarEvents: [], // [{id, date, endDate?, title, type, note, color, sendWa, waMessage, waTargets}]
  waGroups:    [],   // [{id, name, members:[{name,phone}]}]
  waLog:       [],   // [{id, date, type, studentId, studentName, phone, className, message, status, sentAt, error}]
  waDismissed: [],   // [{studentId, date}] — separate from waLog so log-clear never touches it
  settings: {
    pin: '1234',
    schoolName: 'حضور الحلقات',
    subtitle: '',
    whatsappApiKey: '',
    adminPhone: '',          // رقم المدير للاختبار
    whatsappTemplate: '',
    logos: []
  }
};

// ── دوال قاعدة البيانات ──────────────────────────────────
function readDB() {
  try {
    if (!fs.existsSync(DB_FILE)) { fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2)); return JSON.parse(JSON.stringify(DEFAULT_DB)); }
    const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    // دمج المفاتيح الناقصة
    Object.keys(DEFAULT_DB).forEach(k => { if (db[k] === undefined) db[k] = DEFAULT_DB[k]; });
    Object.keys(DEFAULT_DB.settings).forEach(k => { if (db.settings[k] === undefined) db.settings[k] = DEFAULT_DB.settings[k]; });
    if (!db.settings.pin) db.settings.pin = '1234';
    return db;
  } catch(e) { return JSON.parse(JSON.stringify(DEFAULT_DB)); }
}
function writeDB(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function saveDB(fn) { const db = readDB(); fn(db); writeDB(db); }
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ── IP الشبكة المحلية ────────────────────────────────────
function getLocalIP() {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const i of ifaces) {
      if (i.family === 'IPv4' && !i.internal) return i.address;
    }
  }
  return '127.0.0.1';
}

// ── تحويل التاريخ الميلادي → هجري ───────────────────────
// Shared Hijri calendar constants (tabular Islamic, 30-year cycle)
const _HL = new Set([2,5,7,10,13,15,18,21,24,26,29]);
const _HE = 1948440, _HC = 10631;
const _yL = y => _HL.has(y%30===0?30:y%30) ? 355 : 354;
const _mL = (y,m) => m%2===1 ? 30 : (m===12 && _HL.has(y%30===0?30:y%30) ? 30 : 29);

function toHijri(dateStr) {
  // Parse string directly — new Date("YYYY-MM-DD") shifts by timezone offset
  const p = (typeof dateStr==='string' ? dateStr : dateStr.toISOString().slice(0,10)).split('-');
  const gy=+p[0], gm=+p[1], gd=+p[2];
  const a=Math.floor((14-gm)/12), yy=gy+4800-a, mm=gm+12*a-3;
  const jdn=gd+Math.floor((153*mm+2)/5)+365*yy+Math.floor(yy/4)-Math.floor(yy/100)+Math.floor(yy/400)-32045;
  let n=jdn-_HE; const cyc=Math.floor(n/_HC); n-=cyc*_HC;
  let yin=1; while(n>=_yL(yin)){n-=_yL(yin);yin++;if(yin>30)break;}
  const hYear=cyc*30+yin; let hMonth=1;
  while(n>=_mL(hYear,hMonth)){n-=_mL(hYear,hMonth);hMonth++;if(hMonth>12)break;}
  return {year:hYear, month:hMonth, day:n+1};
}
const HM = ['','محرم','صفر','ربيع الأول','ربيع الثاني','جمادى الأولى','جمادى الآخرة','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];
const HD = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
function formatHijri(dateStr) { const h=toHijri(dateStr); return `${h.day} ${HM[h.month]} ${h.year}هـ`; }
function formatHijriShort(dateStr) { const h=toHijri(dateStr); return `${h.day}\n${HD[new Date(dateStr).getDay()]}`; }
function dayNameAr(dateStr) { return HD[new Date(dateStr).getDay()]; }
function inHijriMonth(dateStr, y, m) { const h=toHijri(dateStr); return h.year==y && h.month==m; }

// Convert Hijri date → Gregorian ISO string  (exact inverse of toHijri above)
function fromHijri(hy, hm, hd) {
  const cyc=Math.floor((hy-1)/30), yin=((hy-1)%30)+1;
  let jdn=_HE+cyc*_HC;
  for(let y=1;y<yin;y++) jdn+=_yL(y);
  for(let m=1;m<hm;m++) jdn+=_mL(hy,m);
  jdn+=hd-1;
  const L=jdn+68569, N=Math.floor(4*L/146097), L2=L-Math.floor((146097*N+3)/4);
  const I=Math.floor(4000*(L2+1)/1461001), L3=L2-Math.floor(1461*I/4)+31, J=Math.floor(80*L3/2447);
  const gd=L3-Math.floor(2447*J/80), L4=Math.floor(J/11), gm=J+2-12*L4, gy=100*(N-49)+I+L4;
  return gy+'-'+String(gm).padStart(2,'0')+'-'+String(gd).padStart(2,'0');
}

// Get all ISO date strings for a full Hijri month (29 or 30 days)
function getAllHijriMonthDates(hy, hm) {
  const dates = [];
  for (let d = 1; d <= 30; d++) {
    const iso = fromHijri(hy, hm, d);
    const check = toHijri(iso);
    // Stop when converting back gives a different month (month was only 29 days)
    if (check.year !== hy || check.month !== hm) break;
    dates.push(iso);
  }
  return dates;
}
// Calculate session minutes. Handles midnight-crossing sessions (e.g. 16:00 -> 02:00 next day).
function calcSessionMins(checkIn, checkOut) {
  if (!checkIn || typeof checkIn !== 'string') return 0;
  const p1 = checkIn.split(':').map(Number);
  const h1 = p1[0], m1 = p1[1] || 0;
  if (isNaN(h1) || isNaN(m1)) return 0;
  const startMins = h1 * 60 + m1;
  let endStr = (checkOut && typeof checkOut === 'string' && checkOut !== 'null') ? checkOut : null;
  if (!endStr) {
    const tot = Math.min(startMins + 240, 1439);
    endStr = String(Math.floor(tot/60)).padStart(2,'0')+':'+String(tot%60).padStart(2,'0');
  }
  const p2 = endStr.split(':').map(Number);
  const h2 = p2[0], m2 = p2[1] || 0;
  if (isNaN(h2) || isNaN(m2)) return 0;
  let endMins = h2 * 60 + m2;
  if (endMins < startMins) endMins += 24 * 60; // midnight crossing
  return Math.max(0, endMins - startMins);
}
const STATUS_AR = { Present:'حاضر', Absent:'غائب', Late:'متأخر', Excused:'بعذر', Holiday:'إجازة' };
const STATUS_SH = { Present:'ح', Absent:'غ', Late:'م', Excused:'ع', Holiday:'ج' }; // رمز مختصر
const STATUS_CLR = { Present:'DCFCE7', Absent:'FEE2E2', Late:'FEF3C7', Excused:'DBEAFE', Holiday:'F3F4F6' };
const STATUS_FNT = { Present:'166534', Absent:'991B1B', Late:'92400E', Excused:'1E40AF', Holiday:'6B7280' };
function minsToStr(mins) {
  if (!mins) return '—';
  const h=Math.floor(mins/60), m=mins%60;
  return m ? `${h}س ${m}د` : `${h}س`;
}
// ══════════════════════════════════════════════════════════
//  Excel helpers — ExcelJS (proper colors, borders, images)
// ══════════════════════════════════════════════════════════
const C = {
  navy:    '1E3A5F', slate:   '3B5280',
  headBg:  'D9E2F0', headFg:  '1E3A5F',
  rowA:    'FFFFFF', rowB:    'EEF2FA',
  greenBg: 'D6EAD8', greenFg: '1A4D2E',
  redBg:   'F0D8D8', redFg:   '6B1F1F',
  amberBg: 'F5EDCE', amberFg: '6B4B0F',
  blueBg:  'D9E2F0', blueFg:  '1E3A5F',
  border:  '9AABB8', totalBg: 'D9E2F0',
  white:   'FFFFFF', emptyBg: 'F4F4F4',
};
const STATUS_BG = { Present:C.greenBg, Absent:C.redBg, Late:C.amberBg, Excused:C.blueBg, Holiday:'E8E8E8' };
const STATUS_FG = { Present:C.greenFg, Absent:C.redFg, Late:C.amberFg, Excused:C.blueFg, Holiday:'555555' };

function xBorder(color) { const s={style:'thin',color:{argb:'FF'+(color||C.border)}}; return {top:s,left:s,bottom:s,right:s}; }
function xFill(hex)  { return {type:'pattern',pattern:'solid',fgColor:{argb:'FF'+hex}}; }
function xFont(o)    { return {name:'Arial',size:o.sz||10,bold:!!o.bold,color:{argb:'FF'+(o.color||'000000')}}; }
function xAlign(h,v,wrap) { return {horizontal:h||'right',vertical:v||'middle',wrapText:!!wrap,readingOrder:2}; }

function sc(cell, value, fillHex, fontOpts, alignH, wrap, border) {
  cell.value = value;
  if (fillHex)          cell.fill      = xFill(fillHex);
  cell.font             = xFont(fontOpts);
  cell.alignment        = xAlign(alignH||'center', 'middle', wrap);
  if (border !== false) cell.border    = xBorder();
}

function titleRow(ws, rowNum, text, fillHex, fontOpts, totalCols, height) {
  ws.getRow(rowNum).height = height||36;
  ws.mergeCells(rowNum, 1, rowNum, totalCols);
  const cell = ws.getCell(rowNum, 1);
  cell.value = text;
  cell.fill  = xFill(fillHex);
  cell.font  = xFont(fontOpts);
  cell.alignment = xAlign('center','middle',false);
}

function dataCell(cell, value, isEven, alignH, isBold, fillOverride) {
  cell.value     = value;
  cell.fill      = xFill(fillOverride || (isEven ? C.rowA : C.rowB));
  cell.font      = xFont({sz:10, bold:!!isBold});
  cell.alignment = xAlign(alignH||'right', 'middle');
  cell.border    = xBorder();
}

async function addLogoImage(wb, ws, totalCols, db) {
  const logoMeta = (db.settings?.logos||[])[0];
  if (!logoMeta?.url) return 3;
  const logoPath = path.join(UPLOADS_DIR, path.basename(logoMeta.url));
  if (!fs.existsSync(logoPath)) return 3;
  try {
    const ext = path.extname(logoPath).replace('.','').toLowerCase();
    const imgType = ext==='jpg'?'jpeg':(ext==='png'?'png':null);
    if (!imgType) return 3;
    const imgId = wb.addImage({base64:fs.readFileSync(logoPath).toString('base64'), extension:imgType});
    ws.addImage(imgId, {tl:{col:0,row:0}, br:{col:2,row:2}, editAs:'oneCell'});
    ws.getRow(1).height = 35; ws.getRow(2).height = 35;
    return 2;
  } catch(e) { return 3; }
}

// ══════════════════════════════════════════════════════════
//  Sheet builders
// ══════════════════════════════════════════════════════════

async function buildDailySheet(db, date, classId) {
  const wb  = new ExcelJS.Workbook();
  const ws  = wb.addWorksheet('الحضور', {views:[{rightToLeft:true}]});
  const school = db.settings.schoolName||'حضور الحلقات';
  const att    = db.attendance.filter(a=>a.date===date&&(!classId||a.classId===classId));
  const cols   = 6;
  ws.columns = [{width:6},{width:28},{width:14},{width:20},{width:12},{width:24}];

  const logoEnd = await addLogoImage(wb, ws, cols, db);
  const r1 = logoEnd+1;
  titleRow(ws, r1, school, C.navy, {sz:14,bold:true,color:C.white}, cols, 36);
  const r2 = r1+1;
  titleRow(ws, r2, `كشف الحضور اليومي — يوم ${dayNameAr(date)} ${formatHijri(date)}`, C.slate, {sz:11,bold:true,color:C.white}, cols, 28);
  const r3 = r2+1;
  ws.getRow(r3).height = 26;
  ['م','اسم الطالب','رقم الطالب','الحلقة','الحالة','ملاحظات'].forEach((h,i) =>
    sc(ws.getCell(r3,i+1), h, C.headBg, {sz:10,bold:true,color:C.headFg}, 'center', true));

  let dr = r3+1, idx=1;
  const cnt = {Present:0,Absent:0,Late:0,Excused:0,Holiday:0};
  att.forEach(a => {
    const s=db.students.find(x=>x.id===a.studentId), cls=db.classes.find(c=>c.id===a.classId), st=a.status||'';
    if (cnt[st]!==undefined) cnt[st]++;
    const even = dr%2===0;
    ws.getRow(dr).height = 22;
    dataCell(ws.getCell(dr,1), idx++,             even,'center');
    dataCell(ws.getCell(dr,2), s?.name||'—',      even,'right');
    dataCell(ws.getCell(dr,3), s?.studentId||'—', even,'center');
    dataCell(ws.getCell(dr,4), cls?.name||'—',    even,'right');
    const sc2=ws.getCell(dr,5);
    sc2.value=STATUS_AR[st]||st; sc2.fill=xFill(STATUS_BG[st]||C.rowA);
    sc2.font=xFont({sz:10,bold:true,color:STATUS_FG[st]||'000000'}); sc2.alignment=xAlign('center'); sc2.border=xBorder();
    dataCell(ws.getCell(dr,6), a.notes||'', even,'right');
    dr++;
  });
  ws.getRow(dr).height=6; for(let c=1;c<=cols;c++) ws.getCell(dr,c).fill=xFill(C.headBg); dr++;
  ws.getRow(dr).height=24; ws.mergeCells(dr,1,dr,2);
  sc(ws.getCell(dr,1),'الملخص:',      C.totalBg,{sz:10,bold:true,color:C.headFg},'right');
  sc(ws.getCell(dr,3),`حاضر: ${cnt.Present}`,  C.greenBg,{sz:10,bold:true,color:C.greenFg},'center');
  sc(ws.getCell(dr,4),`غائب: ${cnt.Absent}`,   C.redBg,  {sz:10,bold:true,color:C.redFg},  'center');
  sc(ws.getCell(dr,5),`متأخر: ${cnt.Late}`,    C.amberBg,{sz:10,bold:true,color:C.amberFg},'center');
  sc(ws.getCell(dr,6),`بعذر: ${cnt.Excused}`,  C.blueBg, {sz:10,bold:true,color:C.blueFg}, 'center');
  return wb;
}

async function buildMonthlySheet(db, year, month, classId) {
  const wb  = new ExcelJS.Workbook();
  const ws  = wb.addWorksheet('الشهري', {views:[{rightToLeft:true}]});
  const school = db.settings.schoolName||'حضور الحلقات';
  const att    = db.attendance.filter(a=>inHijriMonth(a.date,+year,+month)&&(!classId||a.classId===classId));
  // ALL days in the Hijri month (29 or 30 days)
  const dates  = getAllHijriMonthDates(+year, +month);
  const studs  = classId ? db.students.filter(s=>s.classId===classId) : db.students;
  const holidays = new Set((db.holidays||[]).filter(h=>inHijriMonth(h.date,+year,+month)).map(h=>h.date));

  const totalDayCols = dates.length;
  const summaryStart = 4+totalDayCols;
  const totalCols    = summaryStart+3;

  ws.columns = [{width:5},{width:26},{width:18},...Array(totalDayCols).fill({width:6}),{width:8},{width:8},{width:8},{width:8}];

  const logoEnd = await addLogoImage(wb, ws, totalCols, db);
  const r1=logoEnd+1; titleRow(ws,r1,school,C.navy,{sz:14,bold:true,color:C.white},totalCols,36);
  const r2=r1+1;
  const sub=`كشف الحضور الشهري — ${HM[+month]} ${year}هـ`+(classId?` — ${db.classes.find(c=>c.id===classId)?.name||''}`:'');
  titleRow(ws,r2,sub,C.slate,{sz:11,bold:true,color:C.white},totalCols,28);
  const r3=r2+1; ws.getRow(r3).height=34;
  ['م','اسم الطالب','الحلقة'].forEach((h,i)=>sc(ws.getCell(r3,i+1),h,C.headBg,{sz:10,bold:true,color:C.headFg},'center',true));

  // Day-column headers — grey out Fridays
  dates.forEach((d,i)=>{
    const h=toHijri(d), dow=new Date(d).getDay();
    const isFri=(dow===5), isHol=holidays.has(d);
    const bg = isFri||isHol ? C.emptyBg : C.headBg;
    sc(ws.getCell(r3,4+i), `${h.day}\n${dayNameAr(d)}`, bg, {sz:8,bold:true,color:isFri||isHol?'888888':C.headFg},'center',true);
  });
  sc(ws.getCell(r3,summaryStart),  'الحضور\nإجمالي', C.greenBg,{sz:9,bold:true,color:C.greenFg},'center',true);
  sc(ws.getCell(r3,summaryStart+1),'الغياب\nإجمالي', C.redBg,  {sz:9,bold:true,color:C.redFg},  'center',true);
  sc(ws.getCell(r3,summaryStart+2),'التأخير\nإجمالي',C.amberBg,{sz:9,bold:true,color:C.amberFg},'center',true);
  sc(ws.getCell(r3,summaryStart+3),'الاعذار\nإجمالي', C.blueBg, {sz:9,bold:true,color:C.blueFg}, 'center',true);

  let dr=r3+1;
  studs.forEach((s,si)=>{
    let present=0,absent=0,late=0,excused=0;
    const even=si%2===0;
    ws.getRow(dr).height=22;
    dataCell(ws.getCell(dr,1),si+1,       even,'center');
    dataCell(ws.getCell(dr,2),s.name||'—',even,'right');
    const cls=db.classes.find(c=>c.id===s.classId);
    dataCell(ws.getCell(dr,3),cls?.name||'—',even,'right');

    dates.forEach((d,i)=>{
      const cell=ws.getCell(dr,4+i);
      const isFri=new Date(d).getDay()===5, isHol=holidays.has(d);
      if (isFri||isHol) {
        // Weekend/holiday — dimmed empty cell
        cell.value=''; cell.fill=xFill(C.emptyBg);
        cell.font=xFont({sz:9,color:'AAAAAA'}); cell.alignment=xAlign('center'); cell.border=xBorder();
        return;
      }
      const a=att.find(x=>x.studentId===s.id&&x.date===d), st=a?.status||'';
      if (!st) {
        // No record yet — plain alternating cell with dash
        dataCell(cell,'—',even,'center'); return;
      }
      const sym=STATUS_SH[st]||'—';
      cell.value=sym; cell.fill=xFill(STATUS_BG[st]||C.rowA);
      cell.font=xFont({sz:9,bold:true,color:STATUS_FG[st]||'000000'});
      cell.alignment=xAlign('center'); cell.border=xBorder();
      if (st==='Present') present++;
      else if (st==='Absent') absent++;
      else if (st==='Late') late++;
      else if (st==='Excused') excused++;
    });

    dataCell(ws.getCell(dr,summaryStart),  present, even,'center',true,C.greenBg);
    dataCell(ws.getCell(dr,summaryStart+1),absent,  even,'center',true,C.redBg);
    dataCell(ws.getCell(dr,summaryStart+2),late,    even,'center',true,C.amberBg);
    dataCell(ws.getCell(dr,summaryStart+3),excused, even,'center',true,C.blueBg);
    dr++;
  });
  return wb;
}

async function buildTeacherDailySheet(db, date) {
  const wb  = new ExcelJS.Workbook();
  const ws  = wb.addWorksheet('المعلمون', {views:[{rightToLeft:true}]});
  const school = db.settings.schoolName||'حضور الحلقات';
  const logs   = db.teacherLog.filter(l=>l.date===date);
  const cols=6;
  ws.columns = [{width:6},{width:26},{width:13},{width:15},{width:15},{width:24}];

  const logoEnd=await addLogoImage(wb,ws,cols,db);
  const r1=logoEnd+1; titleRow(ws,r1,school,C.navy,{sz:14,bold:true,color:C.white},cols,36);
  const r2=r1+1; titleRow(ws,r2,`سجل حضور المعلمين — يوم ${dayNameAr(date)} ${formatHijri(date)}`,C.slate,{sz:11,bold:true,color:C.white},cols,28);
  const r3=r2+1; ws.getRow(r3).height=26;
  ['م','اسم المعلم','وقت الحضور','وقت الانصراف','مدة الحضور','ملاحظات'].forEach((h,i)=>
    sc(ws.getCell(r3,i+1),h,C.headBg,{sz:10,bold:true,color:C.headFg},'center',true));

  let dr=r3+1, totalMins=0;
  logs.forEach((l,i)=>{
    const t=db.teachers.find(x=>x.id===l.teacherId);
    const mins=calcSessionMins(l.checkIn, l.checkOut);
    totalMins+=mins; const even=i%2===0;
    ws.getRow(dr).height=22;
    dataCell(ws.getCell(dr,1),i+1,           even,'center');
    dataCell(ws.getCell(dr,2),t?.name||'—',  even,'right');
    dataCell(ws.getCell(dr,3),l.checkIn||'—',even,'center');
    dataCell(ws.getCell(dr,4),l.checkOut||'—',even,'center');
    dataCell(ws.getCell(dr,5),minsToStr(mins),even,'center',!!mins,mins?C.greenBg:null);
    dataCell(ws.getCell(dr,6),l.notes||'',   even,'right');
    dr++;
  });
  ws.getRow(dr).height=6; for(let c=1;c<=cols;c++) ws.getCell(dr,c).fill=xFill(C.headBg); dr++;
  ws.getRow(dr).height=26; ws.mergeCells(dr,1,dr,3);
  sc(ws.getCell(dr,1),'الإجمالي:',      C.totalBg,{sz:10,bold:true,color:C.headFg},'right');
  sc(ws.getCell(dr,4),`${logs.length} معلم`,C.totalBg,{sz:10,bold:true,color:C.headFg},'center');
  sc(ws.getCell(dr,5),minsToStr(totalMins), C.greenBg,{sz:10,bold:true,color:C.greenFg},'center');
  sc(ws.getCell(dr,6),'',                   C.totalBg,{sz:10},'center');
  return wb;
}

async function buildTeacherMonthlySheet(db, year, month) {
  const wb  = new ExcelJS.Workbook();
  const ws  = wb.addWorksheet('ساعات المعلمين', {views:[{rightToLeft:true}]});
  const school = db.settings.schoolName||'حضور الحلقات';
  const logs   = db.teacherLog.filter(l=>inHijriMonth(l.date,+year,+month));
  // ALL days in the Hijri month
  const dates  = getAllHijriMonthDates(+year, +month);
  const holidays = new Set((db.holidays||[]).filter(h=>inHijriMonth(h.date,+year,+month)).map(h=>h.date));
  const totalDayCols=dates.length, summaryStart=3+totalDayCols, totalCols=summaryStart+2;

  ws.columns=[{width:24},{width:16},...Array(totalDayCols).fill({width:10}),{width:10},{width:12},{width:10}];

  const logoEnd=await addLogoImage(wb,ws,totalCols,db);
  const r1=logoEnd+1; titleRow(ws,r1,school,C.navy,{sz:14,bold:true,color:C.white},totalCols,36);
  const r2=r1+1; titleRow(ws,r2,`تقرير ساعات المعلمين — ${HM[+month]} ${year}هـ`,C.slate,{sz:11,bold:true,color:C.white},totalCols,28);
  const r3=r2+1; ws.getRow(r3).height=34;
  sc(ws.getCell(r3,1),'اسم المعلم',C.headBg,{sz:10,bold:true,color:C.headFg},'center',true);
  sc(ws.getCell(r3,2),'التخصص',   C.headBg,{sz:10,bold:true,color:C.headFg},'center',true);
  dates.forEach((d,i)=>{
    const h=toHijri(d), isFri=new Date(d).getDay()===5, isHol=holidays.has(d);
    const bg=isFri||isHol?C.emptyBg:C.headBg;
    sc(ws.getCell(r3,3+i),`${h.day}\n${dayNameAr(d)}`,bg,{sz:8,bold:true,color:isFri||isHol?'888888':C.headFg},'center',true);
  });
  sc(ws.getCell(r3,summaryStart),  'أيام\nالحضور',   C.headBg, {sz:9,bold:true,color:C.headFg}, 'center',true);
  sc(ws.getCell(r3,summaryStart+1),'إجمالي\nالساعات', C.greenBg,{sz:9,bold:true,color:C.greenFg},'center',true);
  sc(ws.getCell(r3,summaryStart+2),'إجمالي\nالدقائق', C.headBg, {sz:9,bold:true,color:C.headFg}, 'center',true);

  let dr=r3+1, grandTotal=0;
  db.teachers.forEach((t,ti)=>{
    const tLogs=logs.filter(l=>l.teacherId===t.id);
    let totalMins=0; const even=ti%2===0;
    ws.getRow(dr).height=26;
    dataCell(ws.getCell(dr,1),t.name||'—',   even,'right');
    dataCell(ws.getCell(dr,2),t.subject||'—',even,'right');
    dates.forEach((d,i)=>{
      const cell=ws.getCell(dr,3+i);
      const isFri=new Date(d).getDay()===5, isHol=holidays.has(d);
      const l=tLogs.find(x=>x.date===d);
      if (isFri||isHol) {
        if (l && l.checkIn) {
          const mins=calcSessionMins(l.checkIn, l.checkOut);
          totalMins+=mins;
          cell.value=l.checkIn+(l.checkOut?'\n'+l.checkOut:' *');
          cell.fill=xFill('FEF3C7');
          cell.font=xFont({sz:8,color:'92400E'});
          cell.alignment=xAlign('center','middle',true); cell.border=xBorder();
        } else {
          cell.value=''; cell.fill=xFill(C.emptyBg);
          cell.font=xFont({sz:9,color:'AAAAAA'}); cell.alignment=xAlign('center'); cell.border=xBorder();
        }
        return;
      }
      if (!l) { dataCell(cell,'—',even,'center'); return; }
      const mins=calcSessionMins(l.checkIn, l.checkOut);
      totalMins+=mins;
      cell.value=l.checkIn+(l.checkOut?'\n'+l.checkOut:' *');
      cell.fill=xFill(mins?C.greenBg:(even?C.rowA:C.rowB));
      cell.font=xFont({sz:8,color:mins?C.greenFg:'444444'});
      cell.alignment=xAlign('center','middle',true); cell.border=xBorder();
    });
    grandTotal+=totalMins;
    dataCell(ws.getCell(dr,summaryStart),  tLogs.filter(l=>l.checkIn).length,even,'center',true);
    dataCell(ws.getCell(dr,summaryStart+1),Math.floor(totalMins/60),          even,'center',true,C.greenBg);
    dataCell(ws.getCell(dr,summaryStart+2),totalMins%60,                      even,'center');
    dr++;
  });
  ws.getRow(dr).height=6; for(let c=1;c<=totalCols;c++) ws.getCell(dr,c).fill=xFill(C.headBg); dr++;
  ws.getRow(dr).height=26; ws.mergeCells(dr,1,dr,summaryStart);
  sc(ws.getCell(dr,1),'الإجمالي الكلي:',        C.totalBg,{sz:10,bold:true,color:C.headFg},'right');
  sc(ws.getCell(dr,summaryStart+1),Math.floor(grandTotal/60),C.greenBg,{sz:10,bold:true,color:C.greenFg},'center');
  sc(ws.getCell(dr,summaryStart+2),grandTotal%60,            C.totalBg,{sz:10,bold:true,color:C.headFg}, 'center');
  return wb;
}// ── Multer ───────────────────────────────────────────────
const upload = multer({
  storage: multer.diskStorage({
    destination: (_, __, cb) => cb(null, UPLOADS_DIR),
    filename: (_, f, cb) => cb(null, `${newId()}_${f.originalname.replace(/[^\w.\-]/g,'_')}`)
  }),
  limits: { fileSize: 10*1024*1024 }
});

// ── Middleware ───────────────────────────────────────────
app.use(express.json({ limit:'10mb' }));
app.use(express.urlencoded({ extended:true }));
app.use('/uploads', express.static(UPLOADS_DIR));

// خدمة الملفات الثابتة: أولاً app/ ثم المجلد الجذر
if (fs.existsSync(APP_DIR)) app.use(express.static(APP_DIR));
app.use(express.static(ROOT_DIR));


// ════════════════════════════════════════════════════════
//  1. المصادقة
// ════════════════════════════════════════════════════════
app.post('/api/auth/verify', (req, res) => {
  const { pin } = req.body;
  const { settings } = readDB();
  res.json({ valid: String(pin) === String(settings.pin || '1234') });
});


// ════════════════════════════════════════════════════════
//  2. الطلاب
// ════════════════════════════════════════════════════════
app.get('/api/students', (_, res) => res.json(readDB().students));

app.post('/api/students', (req, res) => {
  const id = newId();
  saveDB(db => db.students.push({ ...req.body, id }));
  res.json({ id });
});

app.put('/api/students/:id', (req, res) => {
  saveDB(db => {
    const i = db.students.findIndex(s => s.id === req.params.id);
    if (i>=0) db.students[i] = { ...db.students[i], ...req.body, id:req.params.id };
  });
  res.json({ ok:true });
});

app.delete('/api/students/:id', (req, res) => {
  saveDB(db => { db.students = db.students.filter(s => s.id !== req.params.id); });
  res.json({ ok:true });
});

// ════════════════════════════════════════════════════════
//  2b. تقدم القرآن
// ════════════════════════════════════════════════════════
app.get('/api/quran-progress', (req, res) => {
  const { studentId, classId } = req.query;
  const db = readDB();
  let list = db.quranProgress || [];
  if (studentId) list = list.filter(p => p.studentId === studentId);
  if (classId)   list = list.filter(p => p.classId   === classId);
  list = list.sort((a,b) => b.date.localeCompare(a.date));
  res.json(list);
});

app.post('/api/quran-progress', (req, res) => {
  const id = newId();
  saveDB(db => {
    if (!db.quranProgress) db.quranProgress = [];
    db.quranProgress.push({ ...req.body, id });
  });
  res.json({ id });
});

app.put('/api/quran-progress/:id', (req, res) => {
  saveDB(db => {
    const i = (db.quranProgress||[]).findIndex(p => p.id === req.params.id);
    if (i>=0) db.quranProgress[i] = { ...db.quranProgress[i], ...req.body, id:req.params.id };
  });
  res.json({ ok:true });
});

app.delete('/api/quran-progress/:id', (req, res) => {
  saveDB(db => { db.quranProgress = (db.quranProgress||[]).filter(p => p.id !== req.params.id); });
  res.json({ ok:true });
});

// Summary: latest position per student (for class overview)
app.get('/api/quran-progress/summary', (req, res) => {
  const { classId } = req.query;
  const db = readDB();
  let students = db.students;
  if (classId) students = students.filter(s => s.classId === classId);
  const progress = db.quranProgress || [];
  const summary = students.map(s => {
    const entries = progress.filter(p => p.studentId === s.id).sort((a,b) => b.date.localeCompare(a.date));
    const latest  = entries[0] || null;
    const totalMemorized = entries.filter(e=>e.type==='memorization').reduce((acc,e)=>{
      const from = e.ayahFrom||0, to = e.ayahTo||0;
      return acc + Math.max(0, to - from + 1);
    }, 0);
    return { studentId:s.id, name:s.name, classId:s.classId, latest, totalEntries:entries.length, totalMemorized };
  });
  res.json(summary);
});

// يجب أن يأتي قبل /:id
app.post('/api/students/import-preview', upload.single('file'), (req, res) => {
  if (!req.file) return res.json({ ok:false, error:'لم يتم استلام الملف — تأكد من اختيار ملف Excel أو CSV' });
  try {
    const ext = path.extname(req.file.originalname || '').toLowerCase();
    let wb;
    if (ext === '.csv') {
      const content = fs.readFileSync(req.file.path, 'utf8');
      wb = XLSX.read(content, { type:'string' });
    } else {
      wb = XLSX.readFile(req.file.path);
    }
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval:'' });
    try { fs.unlinkSync(req.file.path); } catch(e){}
    if (!rows.length) return res.json({ ok:false, error:'الملف فارغ أو لا يحتوي على بيانات' });
    res.json({ ok:true, headers:Object.keys(rows[0]), rows:rows.slice(0,100), total:rows.length });
  } catch(e) {
    try { if (req.file && req.file.path) fs.unlinkSync(req.file.path); } catch(_){}
    res.json({ ok:false, error:'خطأ في قراءة الملف: ' + e.message });
  }
});

app.post('/api/students/import-confirm', (req, res) => {
  const { students:incoming=[], classId='' } = req.body;
  const db = readDB();
  let added=0, skipped=0;
  for (const s of incoming) {
    if (!s.name?.trim()) { skipped++; continue; }
    const dup = db.students.find(x => x.name===s.name.trim() && x.classId===(classId||s.classId||''));
    if (dup) { skipped++; continue; }
    db.students.push({ ...s, name:s.name.trim(), id:newId(), classId:classId||s.classId||'' });
    added++;
  }
  writeDB(db);
  res.json({ ok:true, added, skipped });
});

app.get('/api/students/:id', (req, res) => {
  const db = readDB();
  const s  = db.students.find(x => x.id===req.params.id);
  if (!s) return res.json({ success:false });
  const history = db.attendance.filter(a=>a.studentId===s.id).sort((a,b)=>b.date.localeCompare(a.date));
  res.json({ ...s, history });
});

app.post('/api/students/:id/photo', upload.single('photo'), (req, res) => {
  if (!req.file) return res.json({ ok:false });
  const url = `/uploads/${req.file.filename}`;
  saveDB(db => { const i=db.students.findIndex(s=>s.id===req.params.id); if(i>=0) db.students[i].photo=url; });
  res.json({ ok:true, url });
});


// ════════════════════════════════════════════════════════
//  3. الحلقات
// ════════════════════════════════════════════════════════
app.get('/api/classes', (_, res) => res.json(readDB().classes));
app.post('/api/classes', (req, res) => {
  const id=newId(); saveDB(db=>db.classes.push({...req.body,id})); res.json({id});
});
app.put('/api/classes/:id', (req, res) => {
  saveDB(db=>{ const i=db.classes.findIndex(c=>c.id===req.params.id); if(i>=0) db.classes[i]={...db.classes[i],...req.body,id:req.params.id}; });
  res.json({ok:true});
});
app.delete('/api/classes/:id', (req, res) => {
  saveDB(db=>{ db.classes=db.classes.filter(c=>c.id!==req.params.id); }); res.json({ok:true});
});


// ════════════════════════════════════════════════════════
//  4. المعلمون
// ════════════════════════════════════════════════════════
app.get('/api/teachers', (_, res) => res.json(readDB().teachers));

app.get('/api/teachers/:id', (req, res) => {
  const db = readDB();
  const t  = db.teachers.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'المعلم غير موجود' });
  const log = db.teacherLog
    .filter(l => l.teacherId === t.id)
    .sort((a, b) => b.date.localeCompare(a.date));

  const today   = new Date().toISOString().split('T')[0];
  const nowTime = new Date().toTimeString().slice(0,5);

  // Duration per entry:
  //  • checkOut exists → actual duration
  //  • no checkOut + today → live (current time)
  //  • no checkOut + past → fallback: checkIn + 4 h (calcSessionMins)
  const logWithDuration = log.map(l => {
    let mins = 0;
    if (l.checkIn) {
      if (l.checkOut) {
        mins = calcSessionMins(l.checkIn, l.checkOut);
      } else if (l.date === today) {
        const [h1,m1] = l.checkIn.split(':').map(Number);
        const [h2,m2] = nowTime.split(':').map(Number);
        mins = Math.max(0,(h2*60+m2)-(h1*60+m1));
      } else {
        mins = calcSessionMins(l.checkIn, null); // 4-hour fallback
      }
    }
    return { ...l, durationMins: mins };
  });

  const totalMins   = logWithDuration.reduce((s, l) => s + l.durationMins, 0);
  const daysPresent = logWithDuration.filter(l => l.checkIn).length;

  // Monthly hours: use Hijri month (matches Excel reports & frontend)
  const _th = toHijri(today);
  const monthlyMins = logWithDuration
    .filter(l => { if(!l.date) return false; const h=toHijri(l.date); return h.year===_th.year && h.month===_th.month; })
    .reduce((s, l) => s + l.durationMins, 0);

  // Today's hours
  const todayEntry  = logWithDuration.find(l => l.date === today);
  const todayMins   = todayEntry ? todayEntry.durationMins : 0;
  const todayLive   = !!(todayEntry && todayEntry.checkIn && !todayEntry.checkOut);

  const monthMap = {};
  logWithDuration.forEach(l => {
    if (!l.date) return;
    const h = toHijri(l.date);
    const key = `${h.year}-${String(h.month).padStart(2,'0')}`;
    if (!monthMap[key]) monthMap[key] = { year: h.year, month: h.month, logs: [] };
    monthMap[key].logs.push(l);
  });
  const monthlyHistory = Object.values(monthMap)
    .sort((a, b) => a.year !== b.year ? b.year - a.year : b.month - a.month)
    .map(m => ({
      year: m.year, month: m.month, monthName: HM[m.month],
      days: m.logs.filter(l => l.checkIn).length,
      totalMins: m.logs.reduce((s, l) => s + (l.durationMins || 0), 0),
      logs: m.logs.sort((a, b) => b.date.localeCompare(a.date)),
    }));
  res.json({ ...t, log: logWithDuration, totalMins, daysPresent, monthlyMins, todayMins, todayLive, monthlyHistory });
});
app.post('/api/teachers', (req, res) => {
  const id=newId(); saveDB(db=>db.teachers.push({...req.body,id})); res.json({id});
});
app.put('/api/teachers/:id', (req, res) => {
  saveDB(db=>{ const i=db.teachers.findIndex(t=>t.id===req.params.id); if(i>=0) db.teachers[i]={...db.teachers[i],...req.body,id:req.params.id}; });
  res.json({ok:true});
});
app.delete('/api/teachers/:id', (req, res) => {
  saveDB(db=>{ db.teachers=db.teachers.filter(t=>t.id!==req.params.id); }); res.json({ok:true});
});


// ════════════════════════════════════════════════════════
//  5. سجل حضور المعلمين
// ════════════════════════════════════════════════════════
app.get('/api/teacher-log', (req, res) => {
  const {date} = req.query;
  const {teacherLog} = readDB();
  res.json(date ? teacherLog.filter(l=>l.date===date) : teacherLog);
});

app.post('/api/teacher-log/checkin', (req, res) => {
  const {teacherId} = req.body;
  const today = new Date().toISOString().split('T')[0];
  const time  = new Date().toTimeString().slice(0,5);
  const db    = readDB();
  // Auto-close any open sessions from previous days (teacher forgot to checkout)
  db.teacherLog.forEach(l => {
    if (l.teacherId===teacherId && l.date<today && l.checkIn && !l.checkOut) {
      const [hIn,mIn]=l.checkIn.split(':').map(Number);
      const tot=Math.min(hIn*60+mIn+240,1439);
      l.checkOut=String(Math.floor(tot/60)).padStart(2,'0')+':'+String(tot%60).padStart(2,'0');
    }
  });
  if (db.teacherLog.find(l=>l.teacherId===teacherId && l.date===today))
    return res.json({error:'تم تسجيل الحضور مسبقاً لهذا اليوم'});
  db.teacherLog.push({id:newId(), teacherId, date:today, checkIn:time, checkOut:null});
  writeDB(db);
  res.json({ok:true, time});
});

app.post('/api/teacher-log/checkout', (req, res) => {
  const {teacherId} = req.body;
  const today = new Date().toISOString().split('T')[0];
  const time  = new Date().toTimeString().slice(0,5);
  const db    = readDB();
  const entry = db.teacherLog.find(l=>l.teacherId===teacherId && l.date===today);
  if (!entry)          return res.json({error:'لم يتم تسجيل الحضور بعد'});
  if (entry.checkOut)  return res.json({error:'تم تسجيل الانصراف مسبقاً'});
  entry.checkOut = time;
  const mins = calcSessionMins(entry.checkIn, time);
  const duration = `${Math.floor(mins/60)} ساعة ${mins%60} دقيقة`;
  writeDB(db);
  res.json({ok:true, duration});
});


// ════════════════════════════════════════════════════════
//  6. الإجازات
// ════════════════════════════════════════════════════════
app.get('/api/holidays', (_, res) => res.json(readDB().holidays));

app.get('/api/holidays/check/:date', (req, res) => {
  const {date} = req.params;
  if (new Date(date).getDay()===5) return res.json({isHoliday:true, reason:'يوم الجمعة'});
  const h = readDB().holidays.find(x=>x.date===date);
  res.json(h ? {isHoliday:true, reason:h.reason||h.type||'إجازة'} : {isHoliday:false});
});

app.post('/api/holidays', (req, res) => {
  const id=newId();
  saveDB(db=>{ db.holidays=db.holidays.filter(h=>h.date!==req.body.date); db.holidays.push({...req.body,id}); });
  res.json({ok:true,id});
});

app.delete('/api/holidays/:date', (req, res) => {
  saveDB(db=>{ db.holidays=db.holidays.filter(h=>h.date!==req.params.date); }); res.json({ok:true});
});


// ════════════════════════════════════════════════════════
//  7. الحضور
// ════════════════════════════════════════════════════════
app.get('/api/attendance', (req, res) => {
  const {date,classId} = req.query;
  let r = readDB().attendance;
  if (date)    r = r.filter(a=>a.date===date);
  if (classId) r = r.filter(a=>a.classId===classId);
  res.json(r);
});

app.post('/api/attendance/batch', (req, res) => {
  const {date, classId, records} = req.body;
  const db = readDB();
  for (const r of records) {
    const i = db.attendance.findIndex(a=>a.studentId===r.studentId && a.date===date);
    if (i>=0) { db.attendance[i] = {...db.attendance[i], status:r.status, notes:r.notes||''}; }
    else      { db.attendance.push({id:newId(), date, classId, studentId:r.studentId, status:r.status, notes:r.notes||''}); }
  }
  writeDB(db);
  res.json({ok:true});
});


// ════════════════════════════════════════════════════════
//  8. الإذن المسبق / الإجازة المرضية
// ════════════════════════════════════════════════════════
app.get('/api/leaves', (req, res) => {
  const {date,classId} = req.query;
  let r = readDB().leaves;
  if (date)    r = r.filter(l=>l.date===date);
  if (classId) r = r.filter(l=>l.classId===classId);
  res.json(r);
});

app.post('/api/leaves', (req, res) => {
  const id = newId();
  const { studentId, classId, date, type } = req.body;
  saveDB(db => {
    // Upsert leave record
    db.leaves = db.leaves.filter(l => !(l.studentId === studentId && l.date === date));
    db.leaves.push({ ...req.body, id });
    // Auto-correct: if student already has Absent attendance today, upgrade to Excused
    if (studentId && date) {
      const i = db.attendance.findIndex(a => a.studentId === studentId && a.date === date && a.status === 'Absent');
      if (i >= 0) {
        db.attendance[i] = { ...db.attendance[i], status: 'Excused', notes: type || 'إذن' };
      }
    }
  });
  res.json({ ok: true, id });
});

app.delete('/api/leaves/:id', (req, res) => {
  saveDB(db=>{ db.leaves=db.leaves.filter(l=>l.id!==req.params.id); }); res.json({ok:true});
});


// ════════════════════════════════════════════════════════
//  9. الإحصائيات
// ════════════════════════════════════════════════════════
app.get('/api/stats', (_, res) => {
  const db    = readDB();
  const today = new Date().toISOString().split('T')[0];
  const todayAtt = db.attendance.filter(a=>a.date===today);
  const holiday  = db.holidays.find(h=>h.date===today);
  const isHoliday = !!holiday || new Date().getDay()===5;
  const teachersIn = db.teacherLog.filter(l=>l.date===today && l.checkIn && !l.checkOut).length;
  // Deduplicate by studentId AND only count existing students (eliminates phantom/deleted student records)
  const existingStudentIds = new Set(db.students.map(s => s.id));
  const attByStudent = {};
  todayAtt.forEach(a => { if (existingStudentIds.has(a.studentId)) attByStudent[a.studentId] = a; });
  const uniqueAtt = Object.values(attByStudent);
  res.json({
    totalStudents: db.students.length,
    totalClasses:  db.classes.length,
    totalTeachers: db.teachers.length,
    presentToday:  uniqueAtt.filter(a=>a.status==='Present').length,
    absentToday:   uniqueAtt.filter(a=>a.status==='Absent').length,
    teachersIn,
    isHoliday,
    holidayReason: holiday?.reason || (isHoliday ? 'يوم الجمعة' : ''),
  });
});


// ════════════════════════════════════════════════════════
//  10. الإعدادات
// ════════════════════════════════════════════════════════
app.get('/api/settings', (_, res) => {
  const {settings} = readDB();
  const {pin, ...safe} = settings;   // لا نُرسل الـ PIN للواجهة
  res.json(safe);
});

app.put('/api/settings', (req, res) => {
  saveDB(db => {
    const {pin, ...rest} = req.body;
    if (pin) db.settings.pin = String(pin);
    Object.assign(db.settings, rest);
  });
  res.json({ok:true});
});

// رفع شعار
app.post('/api/settings/logos', upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ok:false, error:'لم يتم رفع ملف'});
  const url  = `/uploads/${req.file.filename}`;
  const name = req.body.name || req.file.originalname;
  const id   = newId();
  saveDB(db => { if (!db.settings.logos) db.settings.logos=[]; db.settings.logos.push({id,url,name}); });
  res.json({ok:true, id, url});
});

// حذف شعار
app.delete('/api/settings/logos/:id', (req, res) => {
  saveDB(db => {
    if (!db.settings.logos) return;
    const logo = db.settings.logos.find(l=>l.id===req.params.id);
    if (logo?.url) { try { fs.unlinkSync(path.join(UPLOADS_DIR, path.basename(logo.url))); } catch(e){} }
    db.settings.logos = db.settings.logos.filter(l=>l.id!==req.params.id);
  });
  res.json({ok:true});
});


// ════════════════════════════════════════════════════════
//  11. واتساب — Fonnte API (مجاني، وصل رقمك وأرسل لأي رقم)
//  https://md.fonnte.com  — سجّل وربط رقم واتساب خاصتك
// ════════════════════════════════════════════════════════
function buildMsg(settings, studentName, className, date) {
  const tmpl = settings.whatsappTemplate;
  if (tmpl) return tmpl
    .replace(/{اسم_الطالب}/g, studentName)
    .replace(/{الحلقة}/g, className)
    .replace(/{التاريخ}/g, formatHijri(date))
    .replace(/{اليوم}/g,   dayNameAr(date))
    .replace(/{المنشأة}/g, settings.schoolName||'');
  return `السلام عليكم،\n\nنُعلمكم بغياب الطالب *${studentName}* عن حلقة *${className}* يوم *${dayNameAr(date)}* بتاريخ ${formatHijri(date)}.\n\nرجاء التواصل مع الإدارة إن كان هناك عذر.\n\n— ${settings.schoolName||'إدارة الحلقات'}`;
}

function fonnteRequest(token, target, message, scheduleTs = 0) {
  return new Promise(resolve => {
    const raw = String(target||'').trim();
    const cleanTarget = raw.endsWith('@g.us') ? raw : raw.replace(/\D/g,'');
    if (!cleanTarget) return resolve({ ok: false, error: 'رقم الهاتف فارغ أو غير صالح' });
    const payload = { target: cleanTarget, message, delay:'2', countryCode:'966' };
    if (scheduleTs) payload.schedule = scheduleTs; // unix timestamp — Fonnte holds & sends it
    const body = JSON.stringify(payload);
    const opts = {
      hostname: 'api.fonnte.com',
      path:     '/send',
      method:   'POST',
      headers:  { 'Authorization': token, 'Content-Type':'application/json', 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(opts, resp => {
      let data = '';
      resp.on('data', c => data += c);
      resp.on('end', () => {
        try {
          const j = JSON.parse(data);
          // Fonnte returns { status: true, id: ["12345"], ... } on success
          resolve({ ok: j.status === true, fonnteIds: j.id || [], error: j.reason || j.message || '', raw: data.slice(0,200) });
        } catch(e) {
          resolve({ ok: false, fonnteIds: [], error: 'استجابة غير متوقعة من الخادم', raw: data.slice(0,200) });
        }
      });
    });
    req.on('error', e => resolve({ ok:false, fonnteIds:[], error: e.message }));
    req.write(body);
    req.end();
  });
}

// Delete a previously scheduled Fonnte message by its Fonnte ID
function fonnteDeleteMessage(token, fonnteId) {
  return new Promise(resolve => {
    // Fonnte requires multipart/form-data (same as PHP curl with array postfields)
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="id"\r\n\r\n${fonnteId}\r\n--${boundary}--`;
    const opts = {
      hostname: 'api.fonnte.com',
      path:     '/delete-message',
      method:   'POST',
      headers:  {
        'Authorization': token,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(opts, resp => {
      let data = '';
      resp.on('data', c => data += c);
      resp.on('end', () => {
        console.log('[fonnte-delete] raw response:', data.slice(0,300));
        try { resolve(JSON.parse(data)); }
        catch(e) { resolve({ status: false, error: 'parse error', raw: data.slice(0,200) }); }
      });
    });
    req.on('error', e => resolve({ status: false, error: e.message }));
    req.write(body);
    req.end();
  });
}

// Schedule a calendar message event on Fonnte for each waTarget.
// Uses the existing fonnteRequest (same as absence messages — already proven to work).
async function scheduleEventOnFonnte(token, ev, schoolName) {
  if (!token || !ev.waTargets?.length || !ev.waMessage) return [];

  // Build schedule timestamp from user-set time in Saudi timezone (UTC+3)
  const timeStr = (ev.time && /^\d{1,2}:\d{2}$/.test(ev.time)) ? ev.time : '12:00';
  const scheduledMoment = new Date(`${ev.date}T${timeStr}:00+03:00`).getTime();
  const nowMs           = Date.now();
  // If already past or <2 min away, schedule 2 min from now
  const sendAt     = scheduledMoment > nowMs + 120000 ? scheduledMoment : nowMs + 120000;
  const scheduleTs = Math.floor(sendAt / 1000);

  console.log(`[fonnte-schedule] "${ev.title}" on ${ev.date} at ${timeStr} → ts=${scheduleTs} (${new Date(sendAt).toISOString()})`);

  const storedIds = [];

  for (const target of ev.waTargets) {
    if (!target.phone) continue;

    const msg = (ev.waMessage || '')
      .replace(/{اسم}/g,      target.name || '')
      .replace(/{الاسم}/g,    target.name || '')
      .replace(/{التاريخ}/g,  formatHijri(ev.date))
      .replace(/{اليوم}/g,    dayNameAr(ev.date))
      .replace(/{العنوان}/g,  ev.title || '')
      .replace(/{المنشأة}/g,  schoolName || '');

    // Use the SAME fonnteRequest used for absence messages — it works
    const result = await fonnteRequest(token, target.phone, msg, scheduleTs);

    console.log(`[fonnte-schedule] ${target.phone}: ${result.ok ? '✅ scheduled IDs=' + result.fonnteIds.join(',') : '❌ ' + result.error}`);

    if (result.fonnteIds?.length) {
      result.fonnteIds.forEach(fid => storedIds.push({ phone: target.phone, fonnteId: String(fid) }));
    }

    // Log to waLog — appears in notification panel and WA history
    saveDB(db3 => {
      db3.waLog = db3.waLog || [];
      db3.waLog.push({
        id:           newId(),
        type:         'scheduled',
        eventId:      ev.id,
        date:         ev.date,
        studentName:  target.name || target.phone,
        phone:        target.phone,
        className:    ev.title || '',
        message:      msg,
        status:       result.ok ? 'scheduled' : 'failed',
        fonnteIds:    result.fonnteIds || [],
        sentAt:       new Date().toISOString(),
        scheduledFor: new Date(sendAt).toISOString(),
        error:        result.ok ? '' : result.error,
      });
    });

    await new Promise(r => setTimeout(r, 700));
  }

  return storedIds;
}

app.post('/api/whatsapp/send', async (req, res) => {
  const { phone, studentName, className, date } = req.body;
  const { settings } = readDB();
  const token = settings.whatsappApiKey;

  if (!token) return res.json({ ok:false, error:'لم يتم إعداد Fonnte Token بعد — ادخل إلى الإعدادات' });

  const isTest      = !phone || phone === token;
  const actualPhone = isTest ? (settings.adminPhone||'') : phone;

  if (!actualPhone) return res.json({ ok:false, error: isTest
    ? 'أدخل رقم هاتف المدير في الإعدادات لاستخدام الاختبار'
    : 'رقم الهاتف غير موجود في بيانات الطالب'
  });

  const msg    = buildMsg(settings, studentName||'اختبار', className||'حلقة', date || new Date().toISOString().split('T')[0]);
  const result = await fonnteRequest(token, actualPhone, msg);
  res.json(result);
});

app.post('/api/whatsapp/send-bulk', async (req, res) => {
  const { records=[], date, classId } = req.body;
  const db           = readDB();
  const { settings } = db;
  const token        = settings.whatsappApiKey;
  const cls          = db.classes.find(c => c.id === classId);

  if (!token) return res.json({ ok:false, error:'Fonnte Token غير مُعيَّن في الإعدادات' });

  const results = []; let sent=0, failed=0;
  for (const r of records) {
    if (!r.phone) { results.push({ ok:false, error:'لا يوجد رقم هاتف' }); failed++; continue; }
    const msg    = buildMsg(settings, r.name, cls?.name||'', date);
    const result = await fonnteRequest(token, r.phone, msg);
    results.push(result);

    // تسجيل في السجل
    const db2 = readDB();
    db2.waLog = db2.waLog || [];
    db2.waLog.push({
      id: newId(), type:'absence', date,
      studentId: r.studentId||'', studentName: r.name,
      phone: r.phone, className: cls?.name||'', classId: classId||'',
      message: msg, status: result.ok ? 'sent' : 'failed',
      sentAt: new Date().toISOString(), error: result.error||''
    });
    writeDB(db2);

    if (result.ok) sent++; else failed++;
    await new Promise(ok => setTimeout(ok, 800));
  }
  res.json({ results, sent, failed });
});


// ════════════════════════════════════════════════════════
//  12-B. واتساب — Queue / Groups / Log / Custom Send
// ════════════════════════════════════════════════════════

// GET queue: all Absent records with no sent or dismissed waLog entry
app.get('/api/whatsapp/queue', (req, res) => {
  const db = readDB();

  // Keys already sent (from waLog where status=sent)
  const sentKeys = new Set(
    (db.waLog||[])
      .filter(l => l.status === 'sent' && l.studentId && l.date)
      .map(l => `${l.studentId}__${l.date}`)
  );

  // Keys dismissed by user (stored in separate waDismissed table, never wiped by log-clear)
  const dismissedKeys = new Set(
    (db.waDismissed||[])
      .filter(d => d.studentId && d.date)
      .map(d => `${d.studentId}__${d.date}`)
  );

  const cutoff = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0];

  const queue = db.attendance
    .filter(a => a.status === 'Absent' && a.date >= cutoff)
    .filter(a => {
      const key = `${a.studentId}__${a.date}`;
      return !sentKeys.has(key) && !dismissedKeys.has(key);
    })
    .map(a => {
      const s   = db.students.find(x=>x.id===a.studentId);
      const cls = db.classes.find(c=>c.id===a.classId);
      return {
        attendanceId: a.id,
        studentId:    a.studentId,
        studentName:  s?.name || '—',
        phone:        s?.parentPhone || '',
        className:    cls?.name || '—',
        classId:      a.classId,
        date:         a.date,
      };
    })
    .sort((a,b) => b.date.localeCompare(a.date));

  res.json(queue);
});

// POST send from queue (single or bulk)
app.post('/api/whatsapp/queue/send', async (req, res) => {
  const { items=[] } = req.body;   // [{studentId, studentName, phone, className, classId, date, attendanceId}]
  const db = readDB();
  const token = db.settings.whatsappApiKey;
  if (!token) return res.json({ ok:false, error:'Fonnte Token غير مُعيَّن في الإعدادات' });

  const results=[]; let sent=0, failed=0;
  for (const item of items) {
    if (!item.phone) { results.push({...item, ok:false, error:'لا يوجد رقم'}); failed++; continue; }
    const msg = buildMsg(db.settings, item.studentName, item.className, item.date);
    const r   = await fonnteRequest(token, item.phone, msg);
    results.push({...item, ok:r.ok, error:r.error||''});
    const db2 = readDB();
    db2.waLog = db2.waLog||[];
    db2.waLog.push({
      id:newId(), type:'absence', date:item.date,
      studentId:item.studentId, studentName:item.studentName,
      phone:item.phone, className:item.className, classId:item.classId,
      message:msg, status:r.ok?'sent':'failed',
      sentAt:new Date().toISOString(), error:r.error||''
    });
    writeDB(db2);
    if (r.ok) sent++; else failed++;
    await new Promise(ok=>setTimeout(ok,800));
  }
  res.json({ results, sent, failed });
});

// GET waLog history
app.get('/api/whatsapp/log', (req, res) => {
  const db = readDB();
  const log = (db.waLog||[]).sort((a,b)=>b.sentAt.localeCompare(a.sentAt));
  res.json(log);
});

// DELETE waLog entry
app.delete('/api/whatsapp/log/:id', (req, res) => {
  saveDB(db => { db.waLog = (db.waLog||[]).filter(l=>l.id!==req.params.id); });
  res.json({ok:true});
});

// DELETE all waLog
app.delete('/api/whatsapp/log', (req, res) => {
  saveDB(db => { db.waLog = []; });
  res.json({ok:true});
});

// GET groups
app.get('/api/whatsapp/groups', (req, res) => {
  const db = readDB();
  res.json(db.waGroups||[]);
});

// POST create group
app.post('/api/whatsapp/groups', (req, res) => {
  const {name, members=[]} = req.body;
  if (!name) return res.status(400).json({ok:false,error:'اسم المجموعة مطلوب'});
  const group = {id:newId(), name, members, createdAt:new Date().toISOString()};
  saveDB(db=>{ (db.waGroups=db.waGroups||[]).push(group); });
  res.json(group);
});

// PUT update group
app.put('/api/whatsapp/groups/:id', (req, res) => {
  const {name, members} = req.body;
  saveDB(db=>{
    const g = (db.waGroups||[]).find(x=>x.id===req.params.id);
    if (!g) return;
    if (name    !== undefined) g.name    = name;
    if (members !== undefined) g.members = members;
  });
  res.json({ok:true});
});

// DELETE group
app.delete('/api/whatsapp/groups/:id', (req, res) => {
  saveDB(db=>{ db.waGroups = (db.waGroups||[]).filter(g=>g.id!==req.params.id); });
  res.json({ok:true});
});

// POST dismiss a queue item — stored in waDismissed (separate from waLog, never wiped by log-clear)
app.post('/api/whatsapp/queue/dismiss', (req, res) => {
  const { studentId, date } = req.body;
  if (!studentId || !date) return res.json({ ok: false, error: 'بيانات ناقصة: studentId و date مطلوبان' });
  saveDB(db => {
    db.waDismissed = db.waDismissed || [];
    const already = db.waDismissed.find(d => d.studentId === studentId && d.date === date);
    if (!already) {
      db.waDismissed.push({ studentId, date, dismissedAt: new Date().toISOString() });
    }
  });
  res.json({ ok: true });
});

// POST send ONE message to a WhatsApp group chat by its group ID
app.post('/api/whatsapp/send-group-chat', async (req, res) => {
  const { groupId, message } = req.body;
  const db    = readDB();
  const token = db.settings.whatsappApiKey;
  if (!token)   return res.json({ ok:false, error:'Fonnte Token غير مُعيَّن في الإعدادات' });
  if (!groupId) return res.json({ ok:false, error:'معرّف المجموعة مطلوب' });
  if (!message) return res.json({ ok:false, error:'الرسالة فارغة' });

  const result = await fonnteRequest(token, groupId, message);

  saveDB(db2 => {
    db2.waLog = db2.waLog || [];
    db2.waLog.push({
      id: newId(), type: 'group-chat', date: new Date().toISOString().split('T')[0],
      studentName: `مجموعة: ${groupId}`, phone: groupId,
      message, status: result.ok ? 'sent' : 'failed',
      sentAt: new Date().toISOString(), error: result.error || '',
    });
  });

  res.json(result);
});
app.post('/api/whatsapp/send-custom', async (req, res) => {
  const { message='', targets=[], groupId='' } = req.body;
  const db    = readDB();
  const token = db.settings.whatsappApiKey;
  if (!token)   return res.json({ok:false, error:'Fonnte Token غير مُعيَّن في الإعدادات'});
  if (!message) return res.json({ok:false, error:'الرسالة فارغة'});

  let recipients = targets; // [{name, phone}]
  if (groupId) {
    const g = (db.waGroups||[]).find(x=>x.id===groupId);
    if (g) recipients = [...recipients, ...g.members];
  }
  if (!recipients.length) return res.json({ok:false, error:'لا يوجد مستلمون'});

  const results=[]; let sent=0, failed=0;
  for (const t of recipients) {
    if (!t.phone) { results.push({...t, ok:false, error:'لا يوجد رقم'}); failed++; continue; }
    const r = await fonnteRequest(token, t.phone, message);
    results.push({...t, ok:r.ok, error:r.error||''});
    const db2 = readDB();
    db2.waLog = db2.waLog||[];
    db2.waLog.push({
      id:newId(), type:'custom', date:new Date().toISOString().split('T')[0],
      studentName:t.name||t.phone, phone:t.phone,
      message, status:r.ok?'sent':'failed',
      sentAt:new Date().toISOString(), error:r.error||''
    });
    writeDB(db2);
    if (r.ok) sent++; else failed++;
    await new Promise(ok=>setTimeout(ok,800));
  }
  res.json({results, sent, failed});
});


// ════════════════════════════════════════════════════════
//  12. معلومات الشبكة (QR يُولَّد من جانب العميل)
// ════════════════════════════════════════════════════════
app.get('/api/network-info', (_, res) => {
  const ip = getLocalIP();
  res.json({ ip, port:PORT, url:`http://${ip}:${PORT}` });
});


// ════════════════════════════════════════════════════════
//  13. التقارير
// ════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
//  تقرير تقدم القرآن — طالب واحد
// ══════════════════════════════════════════════════════════
async function buildStudentQuranSheet(db, studentId) {
  const wb  = new ExcelJS.Workbook();
  const ws  = wb.addWorksheet('تقدم القرآن', {views:[{rightToLeft:true}]});
  const school = db.settings.schoolName || 'حضور الحلقات';
  const s    = db.students.find(x => x.id === studentId);
  if (!s) throw new Error('الطالب غير موجود');
  const cls  = db.classes.find(c => c.id === s.classId);
  const entries = (db.quranProgress || [])
    .filter(p => p.studentId === studentId)
    .sort((a,b) => b.date.localeCompare(a.date));

  const TYPE_AR  = { memorization:'حفظ جديد', revision:'مراجعة', recitation:'تلاوة وتجويد' };
  const GRADE_BG = { 'ممتاز':C.greenBg,'جيد جداً':C.blueBg,'جيد':C.amberBg,'مقبول':'EEEEEE','ضعيف':C.redBg };
  const GRADE_FG = { 'ممتاز':C.greenFg,'جيد جداً':C.blueFg,'جيد':C.amberFg,'مقبول':'444444','ضعيف':C.redFg };

  const cols = 8;
  ws.columns = [{width:16},{width:14},{width:18},{width:18},{width:8},{width:12},{width:12},{width:28}];

  const logoEnd = await addLogoImage(wb, ws, cols, db);
  const r1 = logoEnd + 1;
  titleRow(ws, r1, school, C.navy, {sz:14,bold:true,color:C.white}, cols, 36);

  const r2 = r1 + 1;
  titleRow(ws, r2, `تقرير تقدم القرآن الكريم — ${s.name}${cls ? ' — ' + cls.name : ''}`, C.slate, {sz:11,bold:true,color:C.white}, cols, 28);

  const r3 = r2 + 1;
  ws.getRow(r3).height = 26;
  ['التاريخ','نوع الجلسة','من (سورة/آية)','إلى (سورة/آية)','الجزء','الصفحات','التقييم','ملاحظات المعلم'].forEach((h,i) =>
    sc(ws.getCell(r3, i+1), h, C.headBg, {sz:10,bold:true,color:C.headFg}, 'center', true));

  let dr = r3 + 1;
  const cnt = { memorization:0, revision:0, recitation:0 };
  entries.forEach((p, idx) => {
    const even = idx % 2 === 0;
    ws.getRow(dr).height = 22;
    if (cnt[p.type] !== undefined) cnt[p.type]++;

    const fromPos = [p.surahFromName, p.ayahFrom ? `آية ${p.ayahFrom}` : ''].filter(Boolean).join(' ');
    const toPos   = [p.surahToName,   p.ayahTo   ? `آية ${p.ayahTo}`   : ''].filter(Boolean).join(' ');
    const pages   = p.pageFrom ? (p.pageTo && p.pageTo !== p.pageFrom ? `${p.pageFrom}–${p.pageTo}` : `${p.pageFrom}`) : '—';

    dataCell(ws.getCell(dr,1), formatHijri(p.date), even, 'center');
    dataCell(ws.getCell(dr,2), TYPE_AR[p.type] || p.type, even, 'center');
    dataCell(ws.getCell(dr,3), fromPos || '—', even, 'right');
    dataCell(ws.getCell(dr,4), toPos   || '—', even, 'right');
    dataCell(ws.getCell(dr,5), p.juz   ? String(p.juz) : '—', even, 'center');
    dataCell(ws.getCell(dr,6), pages, even, 'center');

    const gc  = ws.getCell(dr,7);
    const gbg = p.grade ? (GRADE_BG[p.grade]||C.rowA) : (even?C.rowA:C.rowB);
    const gfg = p.grade ? (GRADE_FG[p.grade]||'000000') : '666666';
    gc.value = p.grade || '—';
    gc.fill  = xFill(gbg); gc.font = xFont({sz:10, bold:!!p.grade, color:gfg});
    gc.alignment = xAlign('center','middle'); gc.border = xBorder();

    dataCell(ws.getCell(dr,8), p.notes || '—', even, 'right');
    dr++;
  });

  if (entries.length === 0) {
    ws.getRow(dr).height = 28;
    ws.mergeCells(dr,1,dr,cols);
    sc(ws.getCell(dr,1), 'لا توجد سجلات تقدم قرآني لهذا الطالب بعد.', C.emptyBg, {sz:11,color:'888888'}, 'center');
    dr++;
  }

  ws.getRow(dr).height = 6;
  for (let c=1;c<=cols;c++) ws.getCell(dr,c).fill = xFill(C.headBg);
  dr++;

  ws.getRow(dr).height = 26;
  ws.mergeCells(dr,1,dr,2);
  sc(ws.getCell(dr,1), 'الملخص:', C.totalBg, {sz:10,bold:true,color:C.headFg}, 'right');
  sc(ws.getCell(dr,3), `${entries.length} جلسة`, C.totalBg, {sz:10,bold:true,color:C.headFg}, 'center');
  sc(ws.getCell(dr,4), `حفظ: ${cnt.memorization}`, C.greenBg, {sz:10,bold:true,color:C.greenFg}, 'center');
  sc(ws.getCell(dr,5), `مراجعة: ${cnt.revision}`, C.blueBg, {sz:10,bold:true,color:C.blueFg}, 'center');
  sc(ws.getCell(dr,6), `تلاوة: ${cnt.recitation}`, C.amberBg, {sz:10,bold:true,color:C.amberFg}, 'center');
  sc(ws.getCell(dr,7), '', C.totalBg, {sz:10}, 'center');
  sc(ws.getCell(dr,8), '', C.totalBg, {sz:10}, 'center');

  return wb;
}

// ══════════════════════════════════════════════════════════
//  تقرير تقدم القرآن — حلقة كاملة
// ══════════════════════════════════════════════════════════
async function buildClassQuranSheet(db, classId) {
  const wb      = new ExcelJS.Workbook();
  const school  = db.settings.schoolName || 'حضور الحلقات';
  const cls     = db.classes.find(c => c.id === classId);
  if (!cls) throw new Error('الحلقة غير موجودة');
  const students = db.students.filter(s => s.classId === classId);
  const allProg  = db.quranProgress || [];

  const TYPE_AR  = { memorization:'حفظ جديد', revision:'مراجعة', recitation:'تلاوة وتجويد' };
  const GRADE_BG = { 'ممتاز':C.greenBg,'جيد جداً':C.blueBg,'جيد':C.amberBg,'مقبول':'EEEEEE','ضعيف':C.redBg };
  const GRADE_FG = { 'ممتاز':C.greenFg,'جيد جداً':C.blueFg,'جيد':C.amberFg,'مقبول':'444444','ضعيف':C.redFg };

  // helper: format a position label from a progress entry (from-side or to-side)
  function posFrom(p) {
    if (!p) return '—';
    return [p.surahFromName, p.ayahFrom ? `آية ${p.ayahFrom}` : ''].filter(Boolean).join(' ') || '—';
  }
  function posTo(p) {
    if (!p) return '—';
    const surah = p.surahToName || p.surahFromName;
    const ayah  = p.ayahTo   ? `آية ${p.ayahTo}`   :
                  p.ayahFrom ? `آية ${p.ayahFrom}`  : '';
    return [surah, ayah].filter(Boolean).join(' ') || '—';
  }
  function pageRange(p) {
    if (!p || !p.pageFrom) return '—';
    return p.pageTo && p.pageTo !== p.pageFrom ? `${p.pageFrom}–${p.pageTo}` : String(p.pageFrom);
  }

  // ─── الورقة 1: ملخص الحلقة ───────────────────────────
  const ws   = wb.addWorksheet('ملخص الحلقة', {views:[{rightToLeft:true}]});
  //  1:م  2:اسم  3:بداية الرحلة  4:آخر موقع  5:المسافة  6:جلسات  7:حفظ  8:مراجعة  9:تلاوة  10:آخر تقييم
  const cols = 10;
  ws.columns = [
    {width:5},{width:26},{width:22},{width:22},{width:18},
    {width:8},{width:8},{width:8},{width:8},{width:14}
  ];

  const logoEnd = await addLogoImage(wb, ws, cols, db);
  const r1 = logoEnd+1;
  titleRow(ws, r1, school, C.navy, {sz:14,bold:true,color:C.white}, cols, 36);
  const r2 = r1+1;
  titleRow(ws, r2, `تقرير تقدم القرآن الكريم — حلقة: ${cls.name}`, C.slate, {sz:11,bold:true,color:C.white}, cols, 28);

  const r3 = r2+1; ws.getRow(r3).height = 30;
  [
    'م','اسم الطالب',
    'بداية الرحلة\n(أول جلسة)',
    'آخر موقع\n(آخر جلسة)',
    'المسيرة',
    'الجلسات','حفظ','مراجعة','تلاوة',
    'آخر تقييم'
  ].forEach((h,i) =>
    sc(ws.getCell(r3,i+1), h, C.headBg, {sz:9,bold:true,color:C.headFg}, 'center', true));

  let dr = r3+1;
  students.forEach((s, si) => {
    // Sort oldest→newest for "first", newest first for "latest"
    const sEntries = allProg
      .filter(p => p.studentId === s.id)
      .sort((a,b) => a.date.localeCompare(b.date));   // oldest first
    const first    = sEntries[0]  || null;
    const latest   = sEntries[sEntries.length-1] || null;
    const memCount = sEntries.filter(e=>e.type==='memorization').length;
    const revCount = sEntries.filter(e=>e.type==='revision').length;
    const recCount = sEntries.filter(e=>e.type==='recitation').length;
    const even = si % 2 === 0;
    ws.getRow(dr).height = 26;

    // "بداية الرحلة" = first session's starting point
    const startPos = posFrom(first);

    // "آخر موقع" = latest session's ending point
    const endPos   = posTo(latest);

    // "المسيرة" = a readable range like "الفاتحة آية 1 ← البقرة آية 286"
    let journey = '—';
    if (first && latest) {
      if (startPos === endPos) {
        journey = startPos;
      } else {
        journey = `${startPos}  ←  ${endPos}`;
      }
    }

    const lastJuz  = latest?.juz ? String(latest.juz) : (first?.juz ? String(first.juz) : '—');

    dataCell(ws.getCell(dr,1), si+1, even, 'center');
    dataCell(ws.getCell(dr,2), s.name||'—', even, 'right');

    // بداية الرحلة — green tint if has data
    const sc3 = ws.getCell(dr,3);
    sc3.value     = startPos;
    sc3.fill      = xFill(first ? C.greenBg : (even?C.rowA:C.rowB));
    sc3.font      = xFont({sz:10, bold:!!first, color: first?C.greenFg:'888888'});
    sc3.alignment = xAlign('right','middle',true); sc3.border = xBorder();

    // آخر موقع — navy tint
    const sc4 = ws.getCell(dr,4);
    sc4.value     = endPos;
    sc4.fill      = xFill(latest ? C.blueBg : (even?C.rowA:C.rowB));
    sc4.font      = xFont({sz:10, bold:!!latest, color: latest?C.blueFg:'888888'});
    sc4.alignment = xAlign('right','middle',true); sc4.border = xBorder();

    // المسيرة — amber tint, shows the full arc
    const sc5 = ws.getCell(dr,5);
    sc5.value     = journey;
    sc5.fill      = xFill((first && latest && startPos!==endPos) ? C.amberBg : (even?C.rowA:C.rowB));
    sc5.font      = xFont({sz:9, bold:false, color:(first&&latest)?C.amberFg:'888888'});
    sc5.alignment = xAlign('right','middle',true); sc5.border = xBorder();

    dataCell(ws.getCell(dr,6), sEntries.length||'—', even, 'center', true);
    dataCell(ws.getCell(dr,7), memCount||'—', even, 'center', true, memCount?C.greenBg:null);
    dataCell(ws.getCell(dr,8), revCount||'—', even, 'center', true, revCount?C.blueBg:null);
    dataCell(ws.getCell(dr,9), recCount||'—', even, 'center', true, recCount?C.amberBg:null);

    const gc    = ws.getCell(dr,10);
    const grade = latest?.grade || '';
    gc.value    = grade || (latest ? '—' : 'لم يُسجَّل');
    gc.fill     = xFill(grade ? (GRADE_BG[grade]||C.rowA) : (even?C.rowA:C.rowB));
    gc.font     = xFont({sz:10, bold:!!grade, color: grade?(GRADE_FG[grade]||'000000'):'999999'});
    gc.alignment= xAlign('center','middle'); gc.border=xBorder();
    dr++;
  });

  if (students.length === 0) {
    ws.getRow(dr).height = 28; ws.mergeCells(dr,1,dr,cols);
    sc(ws.getCell(dr,1),'لا يوجد طلاب في هذه الحلقة.',C.emptyBg,{sz:11,color:'888888'},'center'); dr++;
  }

  // separator
  ws.getRow(dr).height = 6;
  for (let c=1;c<=cols;c++) ws.getCell(dr,c).fill = xFill(C.headBg); dr++;

  // totals
  ws.getRow(dr).height = 26;
  ws.mergeCells(dr,1,dr,2);
  const totalSessions = allProg.filter(p => students.some(s=>s.id===p.studentId)).length;
  sc(ws.getCell(dr,1), 'الإجمالي:', C.totalBg, {sz:10,bold:true,color:C.headFg}, 'right');
  sc(ws.getCell(dr,3), `${students.length} طالب`, C.totalBg, {sz:10,bold:true,color:C.headFg}, 'center');
  sc(ws.getCell(dr,4), `${totalSessions} جلسة مسجَّلة`, C.greenBg, {sz:10,bold:true,color:C.greenFg}, 'center');
  for (let c=5;c<=cols;c++) sc(ws.getCell(dr,c),'',C.totalBg,{sz:10},'center');

  // ─── ورقة تفصيلية لكل طالب (مرتبة من الأقدم للأحدث) ──
  students.forEach(s => {
    // oldest → newest so the journey reads top-to-bottom
    const sEntries = allProg
      .filter(p=>p.studentId===s.id)
      .sort((a,b)=>a.date.localeCompare(b.date));
    if (sEntries.length === 0) return;

    const sheetName = s.name.length > 25 ? s.name.slice(0,25) : s.name;
    const ws2 = wb.addWorksheet(sheetName, {views:[{rightToLeft:true}]});
    const c2  = 8;
    ws2.columns = [{width:16},{width:14},{width:20},{width:20},{width:8},{width:12},{width:12},{width:28}];

    titleRow(ws2,1,school,C.navy,{sz:13,bold:true,color:C.white},c2,30);
    titleRow(ws2,2,`${s.name} — ${cls.name}`,C.slate,{sz:10,bold:true,color:C.white},c2,24);

    // Journey summary bar
    ws2.getRow(3).height = 22;
    ws2.mergeCells(3,1,3,c2);
    const first2  = sEntries[0];
    const latest2 = sEntries[sEntries.length-1];
    const journeyTxt = `المسيرة: ${posFrom(first2)}  ←  ${posTo(latest2)}  (${sEntries.length} جلسة)`;
    sc(ws2.getCell(3,1), journeyTxt, C.amberBg, {sz:10,bold:true,color:C.amberFg}, 'center', false);

    ws2.getRow(4).height = 24;
    ['التاريخ','نوع الجلسة','من (سورة/آية)','إلى (سورة/آية)','الجزء','الصفحات','التقييم','ملاحظات'].forEach((h,i)=>
      sc(ws2.getCell(4,i+1),h,C.headBg,{sz:9,bold:true,color:C.headFg},'center',true));

    sEntries.forEach((p,idx)=>{
      const even=idx%2===0, dr2=5+idx;
      ws2.getRow(dr2).height=22;
      dataCell(ws2.getCell(dr2,1),formatHijri(p.date),even,'center');
      dataCell(ws2.getCell(dr2,2),TYPE_AR[p.type]||p.type,even,'center');

      // from — highlight first row green (starting point)
      const fromCell = ws2.getCell(dr2,3);
      fromCell.value     = posFrom(p);
      fromCell.fill      = xFill(idx===0 ? C.greenBg : (even?C.rowA:C.rowB));
      fromCell.font      = xFont({sz:10, bold:idx===0, color:idx===0?C.greenFg:'000000'});
      fromCell.alignment = xAlign('right','middle'); fromCell.border=xBorder();

      // to — highlight last row blue (end point)
      const isLast = idx===sEntries.length-1;
      const toCell   = ws2.getCell(dr2,4);
      toCell.value     = posTo(p);
      toCell.fill      = xFill(isLast ? C.blueBg : (even?C.rowA:C.rowB));
      toCell.font      = xFont({sz:10, bold:isLast, color:isLast?C.blueFg:'000000'});
      toCell.alignment = xAlign('right','middle'); toCell.border=xBorder();

      dataCell(ws2.getCell(dr2,5),p.juz?String(p.juz):'—',even,'center');
      dataCell(ws2.getCell(dr2,6),pageRange(p),even,'center');

      const gc2=ws2.getCell(dr2,7);
      gc2.value=p.grade||'—'; gc2.fill=xFill(p.grade?(GRADE_BG[p.grade]||C.rowA):(even?C.rowA:C.rowB));
      gc2.font=xFont({sz:9,bold:!!p.grade,color:p.grade?(GRADE_FG[p.grade]||'000000'):'666666'});
      gc2.alignment=xAlign('center','middle'); gc2.border=xBorder();

      dataCell(ws2.getCell(dr2,8),p.notes||'—',even,'right');
    });
  });

  return wb;
}


function arabicFilename(base) {
  return `attachment; filename="${encodeURIComponent(base)}.xlsx"; filename*=UTF-8''${encodeURIComponent(base)}.xlsx`;
}
// ── Endpoints التقارير ────────────────────────────────

// Excel — كشف حضور يومي
app.get('/api/reports/daily-attendance/:date', async (req, res) => {
  try {
    const {date}=req.params, {classId}=req.query, db=readDB();
    const wb  = await buildDailySheet(db, date, classId||'');
    const cls = classId ? db.classes.find(c=>c.id===classId) : null;
    const h   = toHijri(date);
    const name = cls ? `حضور-${cls.name}-${h.day}-${HM[h.month]}-${h.year}هـ` : `حضور-يومي-${h.day}-${HM[h.month]}-${h.year}هـ`;
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', arabicFilename(name));
    await wb.xlsx.write(res);
  } catch(e) { console.error(e); res.status(500).json({error:e.message}); }
});

// PDF — كشف حضور يومي
app.get('/api/reports/pdf/daily/:date', (req, res) => {
  const { date } = req.params;
  const { classId } = req.query;
  const db   = readDB();
  const att  = db.attendance.filter(a=>a.date===date && (!classId||a.classId===classId));
  const doc  = new PDFDocument({margin:40, size:'A4'});
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition',`attachment; filename="daily_${date}.pdf"`);
  doc.pipe(res);
  doc.fontSize(16).text(db.settings.schoolName||'حضور الحلقات',{align:'center'});
  doc.fontSize(11).text(`كشف الحضور اليومي — يوم ${dayNameAr(date)} ${formatHijri(date)}`,{align:'center'});
  doc.moveDown(0.5);
  if (!att.length) { doc.text('لا توجد سجلات لهذا اليوم.'); }
  att.forEach((a,i)=>{
    const s   = db.students.find(x=>x.id===a.studentId);
    const cls = db.classes.find(c=>c.id===a.classId);
    doc.fontSize(10).text(`${i+1}. ${s?.name||'—'}   |   ${cls?.name||'—'}   |   ${STATUS_AR[a.status]||a.status}   |   ${a.notes||''}`);
  });
  doc.end();
});

// Excel — سجل المعلمين اليومي
app.get('/api/reports/teacher-log/:date', async (req, res) => {
  try {
    const {date}=req.params, db=readDB();
    const wb  = await buildTeacherDailySheet(db, date);
    const h   = toHijri(date);
    const name = `سجل-المعلمين-${h.day}-${HM[h.month]}-${h.year}هـ`;
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', arabicFilename(name));
    await wb.xlsx.write(res);
  } catch(e) { console.error(e); res.status(500).json({error:e.message}); }
});

// Excel — كشف شهري للطلاب (هجري)
app.get('/api/reports/monthly/hijri/:year/:month', async (req, res) => {
  try {
    const {year,month}=req.params, {classId}=req.query, db=readDB();
    const wb  = await buildMonthlySheet(db, year, month, classId||'');
    const cls = classId ? db.classes.find(c=>c.id===classId) : null;
    const name = cls ? `حضور-شهري-${cls.name}-${HM[+month]}-${year}هـ` : `حضور-شهري-${HM[+month]}-${year}هـ`;
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', arabicFilename(name));
    await wb.xlsx.write(res);
  } catch(e) { console.error(e); res.status(500).json({error:e.message}); }
});

// Excel — ساعات المعلمين الشهرية
app.get('/api/reports/teacher-monthly/hijri/:year/:month', async (req, res) => {
  try {
    const {year,month}=req.params, db=readDB();
    const wb  = await buildTeacherMonthlySheet(db, year, month);
    const name = `ساعات-المعلمين-${HM[+month]}-${year}هـ`;
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', arabicFilename(name));
    await wb.xlsx.write(res);
  } catch(e) { console.error(e); res.status(500).json({error:e.message}); }
});

// Excel — تقرير تقدم القرآن لطالب
app.get('/api/reports/quran/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const db  = readDB();
    const s   = db.students.find(x => x.id === studentId);
    if (!s) return res.status(404).json({ error: 'الطالب غير موجود' });
    const wb  = await buildStudentQuranSheet(db, studentId);
    const name = `تقدم-القرآن-${s.name}`;
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', arabicFilename(name));
    await wb.xlsx.write(res);
  } catch(e) { console.error(e); res.status(500).json({error:e.message}); }
});

// Excel — تقرير تقدم القرآن لحلقة كاملة
app.get('/api/reports/quran/class/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const db  = readDB();
    const cls = db.classes.find(c => c.id === classId);
    if (!cls) return res.status(404).json({ error: 'الحلقة غير موجودة' });
    const wb  = await buildClassQuranSheet(db, classId);
    const name = `تقدم-القرآن-${cls.name}`;
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', arabicFilename(name));
    await wb.xlsx.write(res);
  } catch(e) { console.error(e); res.status(500).json({error:e.message}); }
});

// PDF — ملخص شهري للمعلمين (هجري)
app.get('/api/reports/pdf/teacher-monthly/hijri/:year/:month', (req, res) => {
  const { year, month } = req.params;
  const db   = readDB();
  const logs = db.teacherLog.filter(l=>inHijriMonth(l.date,+year,+month));
  const doc  = new PDFDocument({margin:40});
  res.setHeader('Content-Type','application/pdf');
  res.setHeader('Content-Disposition',`attachment; filename="teacher_monthly_${year}_${month}.pdf"`);
  doc.pipe(res);
  doc.fontSize(16).text(db.settings.schoolName||'حضور الحلقات',{align:'center'});
  doc.fontSize(11).text(`تقرير حضور المعلمين — ${HM[+month]||month} ${year}هـ`,{align:'center'});
  doc.moveDown();
  let grandTotal = 0;
  db.teachers.forEach(t => {
    const tLogs = logs.filter(l=>l.teacherId===t.id);
    const mins  = tLogs.reduce((acc,l) => {
      return acc+calcSessionMins(l.checkIn, l.checkOut);
    },0);
    grandTotal += mins;
    doc.fontSize(10).text(`${t.name} — حضر: ${tLogs.filter(l=>l.checkIn).length} يوم | ${minsToStr(mins)}`);
  });
  if (!db.teachers.length) doc.text('لا توجد بيانات للمعلمين.');
  doc.moveDown().fontSize(11).text(`الإجمالي الكلي: ${minsToStr(grandTotal)}`, {underline:true});
  doc.end();
});

// ── Teacher log API endpoint with hours (للعرض في التطبيق)
app.get('/api/teacher-log/today-summary', (_, res) => {
  const db   = readDB();
  const date = new Date().toISOString().split('T')[0];
  const logs = db.teacherLog.filter(l=>l.date===date);
  const summary = logs.map(l => {
    const t = db.teachers.find(x=>x.id===l.teacherId);
    const mins = l.checkOut ? calcSessionMins(l.checkIn, l.checkOut) : null;
    return { name:t?.name||'—', checkIn:l.checkIn, checkOut:l.checkOut, duration:minsToStr(mins||0), mins };
  });
  const totalMins = summary.reduce((a,s)=>a+(s.mins||0),0);
  res.json({ logs:summary, totalDuration:minsToStr(totalMins), count:summary.length });
});

// ════════════════════════════════════════════════════════
//  14. مزامنة / نسخ احتياطي
// ════════════════════════════════════════════════════════
app.get('/api/sync/export', (_, res) => {
  const db = readDB();
  res.setHeader('Content-Type','application/json');
  res.setHeader('Content-Disposition',`attachment; filename="backup_${new Date().toISOString().split('T')[0]}.json"`);
  res.json({...db, exportedAt:new Date().toISOString(), version:3});
});

app.post('/api/sync/import', (req, res) => {
  const bundle = req.body;
  const db     = readDB();
  let merged=0;
  function mergeArr(arr1, arr2, key) {
    const map={}; arr1.forEach(x=>map[x[key]]=true);
    arr2.forEach(x=>{ if(x[key]&&!map[x[key]]) { arr1.push(x); merged++; } });
  }
  mergeArr(db.students,       bundle.students||[],       'id');
  mergeArr(db.classes,        bundle.classes||[],        'id');
  mergeArr(db.teachers,       bundle.teachers||[],       'id');
  mergeArr(db.teacherLog,     bundle.teacherLog||[],     'id');
  mergeArr(db.attendance,     bundle.attendance||[],     'id');
  mergeArr(db.leaves,         bundle.leaves||[],         'id');
  mergeArr(db.holidays,       bundle.holidays||[],       'date');
  mergeArr(db.quranProgress,  bundle.quranProgress||[],  'id');
  writeDB(db);
  res.json({ok:true, merged});
});

// Selective data reset
app.post('/api/settings/reset', (req, res) => {
  const { attendance, teacherLog, calendar, waLog, quran, everything } = req.body;
  const cleared = [];

  saveDB(db => {
    if (everything) {
      // Full factory reset — preserve only settings (PIN, school name, logos, WA token)
      const savedSettings = { ...db.settings };
      Object.assign(db, JSON.parse(JSON.stringify(DEFAULT_DB)));
      db.settings = savedSettings;
      cleared.push('everything');
      return;
    }
    if (attendance) {
      db.attendance  = [];
      db.leaves      = [];
      db.waDismissed = [];
      db.waLog       = (db.waLog || []).filter(l => l.type !== 'absence' && l.type !== 'bulk');
      cleared.push('attendance');
    }
    if (teacherLog) {
      db.teacherLog = [];
      cleared.push('teacherLog');
    }
    if (calendar) {
      db.calendarEvents = [];
      // Remove auto-generated holidays (keep manually-added holidays that aren't from calendar events)
      db.holidays = (db.holidays || []).filter(h => !h.id || !h.id.includes('_h_'));
      cleared.push('calendar');
    }
    if (waLog) {
      db.waLog = [];
      cleared.push('waLog');
    }
    if (quran) {
      db.quranProgress = [];
      cleared.push('quran');
    }
  });

  res.json({ ok: true, cleared });
});


// ════════════════════════════════════════════════════════
//  15. ملفات المُشغِّل
// ════════════════════════════════════════════════════════
app.get('/api/launcher-status', (_, res) => {
  res.json({
    vbsExists: fs.existsSync(path.join(ROOT_DIR,'launch.vbs')),
    jsExists:  fs.existsSync(path.join(ROOT_DIR,'launcher.js')),
    exeBuilt:  fs.existsSync(path.join(ROOT_DIR,'حضور-الحلقات.exe')) || fs.existsSync(path.join(ROOT_DIR,'attendance.exe')),
    networkIP: getLocalIP(),
    port: PORT
  });
});

app.get('/api/download/launcher-vbs', (_, res) => {
  const ip  = getLocalIP();
  const vbs = `Set sh = CreateObject("WScript.Shell")\nDim p\np = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)\nsh.Run "cmd /c cd /d """ & p & """ && node server.js", 0, False\nWScript.Sleep 2500\nsh.Run "http://${ip}:${PORT}"`;
  res.setHeader('Content-Type','text/plain'); res.setHeader('Content-Disposition','attachment; filename="launch.vbs"'); res.send(vbs);
});

app.get('/api/download/launcher-js', (_, res) => {
  const js = `// launcher.js\nconst {spawn}=require('child_process'),{exec}=require('child_process');\nconst s=spawn('node',['server.js'],{cwd:__dirname,detached:true,stdio:'ignore'});\ns.unref();\nsetTimeout(()=>exec('start http://localhost:${PORT}'),2500);`;
  res.setHeader('Content-Type','text/plain'); res.setHeader('Content-Disposition','attachment; filename="launcher.js"'); res.send(js);
});

app.get('/api/download/build-bat', (_, res) => {
  const bat = `@echo off\nnpm install -g pkg\npkg server.js --target node18-win-x64 --output "حضور-الحلقات.exe"\necho تم! الملف جاهز.\npause`;
  res.setHeader('Content-Type','text/plain'); res.setHeader('Content-Disposition','attachment; filename="build-exe.bat"'); res.send(bat);
});


// ════════════════════════════════════════════════════════
//  معالج أخطاء Multer
// ════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
  if (err && err.code === 'LIMIT_FILE_SIZE')
    return res.status(400).json({ ok:false, error:'حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)' });
  if (err) return res.status(500).json({ ok:false, error: err.message || 'خطأ في الخادم' });
  next();
});

// ════════════════════════════════════════════════════════
//  Fallback: index.html
// ════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════
//  التقويم — Calendar Events
// ════════════════════════════════════════════════════════

// ── Calendar Excel Export ─────────────────────────────────────────────
app.get('/api/calendar/export', async (req, res) => {
  const year = +req.query.year || toHijri(new Date().toISOString().split('T')[0]).year;
  const db   = readDB();
  const evs  = (db.calendarEvents || []).filter(e => {
    const h = toHijri(e.date);
    return h.year === year;
  });
  const holSet = new Set((db.holidays||[]).map(h=>h.date));
  const TYPE_COLOR = { event:'2563EB', holiday:'DC2626', offday:'D97706', message:'7C3AED', reminder:'0D9488' };
  const TYPE_AR    = { event:'حدث', holiday:'إجازة رسمية', offday:'يوم إجازة', message:'رسالة مجدولة', reminder:'تذكير' };

  const wb = new ExcelJS.Workbook();
  wb.creator = 'حضور الحلقات'; wb.created = new Date();

  for (let hm = 1; hm <= 12; hm++) {
    // Build dates for this Hijri month
    const dates = [];
    for (let hd = 1; hd <= 30; hd++) {
      const iso = fromHijri(year, hm, hd);
      const back = toHijri(iso);
      if (back.year !== year || back.month !== hm) break;
      dates.push(iso);
    }
    if (!dates.length) continue;

    const ws = wb.addWorksheet(HM[hm], { views:[{rightToLeft:true}], pageSetup:{orientation:'landscape'} });

    // Title
    ws.mergeCells('A1:I1');
    const t = ws.getCell('A1');
    t.value = `${HM[hm]} ${year}هـ`;
    t.font = xFont({sz:14,bold:true,color:'FFFFFF'}); t.fill = xFill('1D4ED8');
    t.alignment = xAlign('center','middle'); ws.getRow(1).height = 30;

    // Stats row
    ws.mergeCells('A2:I2');
    const schoolDays = dates.filter(d=>new Date(d+'T00:00:00').getDay()!==5&&!holSet.has(d)).length;
    const offDays    = dates.length - schoolDays;
    const monthEvs   = evs.filter(e => { const h=toHijri(e.date); return h.month===hm; });
    const s = ws.getCell('A2');
    s.value = `أيام الشهر: ${dates.length}  |  أيام دراسية: ${schoolDays}  |  أيام إجازة: ${offDays}  |  أحداث: ${monthEvs.length}`;
    s.font = xFont({sz:10,bold:false,color:'374151'}); s.fill = xFill('F3F4F6');
    s.alignment = xAlign('center','middle'); ws.getRow(2).height = 20;

    // Day-of-week header row
    const DOW_AR = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    const COL_W  = [18,9,9,9,9,9,9,9,9];
    COL_W.forEach((w,i) => ws.getColumn(i+1).width = w);
    ws.getRow(3).height = 22;
    const HEADERS = ['اليوم / الحدث','أحد','اثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'];
    HEADERS.forEach((h,i) => {
      const c = ws.getCell(3, i+1);
      c.value = h; c.fill = xFill('1D4ED8'); c.font = xFont({sz:9,bold:true,color:'FFFFFF'});
      c.alignment = xAlign('center','middle'); c.border = xBorder();
    });

    // Build week rows
    const firstDow = new Date(dates[0]+'T00:00:00').getDay(); // 0=Sun
    const weeks = [];
    let week = new Array(7).fill(null);
    dates.forEach(iso => {
      const dow = new Date(iso+'T00:00:00').getDay();
      week[dow] = iso;
      if (dow === 6 || iso === dates[dates.length-1]) { weeks.push(week); week = new Array(7).fill(null); }
    });

    let dr = 4;
    weeks.forEach(wk => {
      ws.getRow(dr).height = 28;
      // Row label: Hijri day range
      const filled = wk.filter(Boolean);
      const label  = filled.length
        ? toHijri(filled[0]).day + (filled.length>1 ? '–'+toHijri(filled[filled.length-1]).day : '')
        : '';
      const lc = ws.getCell(dr,1);
      lc.value=label; lc.fill=xFill('F9FAFB'); lc.font=xFont({sz:9,bold:true});
      lc.alignment=xAlign('center','middle'); lc.border=xBorder();

      wk.forEach((iso,col) => {
        const cell = ws.getCell(dr, col+2);
        if (!iso) { cell.fill=xFill('F4F4F4'); cell.border=xBorder(); return; }
        const d     = new Date(iso+'T00:00:00');
        const isFri = d.getDay()===5, isHol=holSet.has(iso);
        const dayEvs= evs.filter(e => e.date===iso || (e.endDate&&iso>=e.date&&iso<=e.endDate));
        const gDay  = d.getDate()+'/'+String(d.getMonth()+1).padStart(2,'0');
        const hDay  = toHijri(iso).day;

        if (isFri||isHol) {
          cell.fill = xFill(isFri?'FFFBEB':'FEF2F2');
          cell.font = xFont({sz:8,color:isFri?'92400E':'991B1B'});
        } else if (dayEvs.length) {
          const ev1 = dayEvs[0];
          cell.fill = xFill( (TYPE_COLOR[ev1.type]||'2563EB').replace('#','')+'22' );
          cell.font = xFont({sz:8,color:TYPE_COLOR[ev1.type]||'2563EB'});
        } else {
          cell.fill = xFill('FFFFFF'); cell.font = xFont({sz:8});
        }
        const label = [hDay+'  ('+gDay+')']
          .concat(isFri?['جمعة']:isHol?['إجازة']:[], dayEvs.slice(0,2).map(e=>e.title))
          .join('\n');
        cell.value = label;
        cell.alignment = xAlign('center','middle',true);
        cell.border = xBorder();
      });
      dr++;
    });

    // Events table for this month
    if (monthEvs.length) {
      dr++;
      ws.mergeCells(dr,1,dr,9);
      const eh = ws.getCell(dr,1);
      eh.value='الأحداث والملاحظات'; eh.fill=xFill('1E3A5F');
      eh.font=xFont({sz:10,bold:true,color:'FFFFFF'}); eh.alignment=xAlign('center','middle');
      ws.getRow(dr).height=20; dr++;

      const EH=['التاريخ الهجري','التاريخ الميلادي','النوع','العنوان','الوقت','ملاحظات'];
      EH.forEach((h,i)=>{
        const c=ws.getCell(dr,i+1); c.value=h;
        c.fill=xFill('3B82F6'); c.font=xFont({sz:9,bold:true,color:'FFFFFF'});
        c.alignment=xAlign('center','middle'); c.border=xBorder();
      });
      ws.getRow(dr).height=18; dr++;
      const EW=[14,14,14,24,10,30];
      EW.forEach((w,i)=>{ if(i<6) ws.getColumn(i+1).width=Math.max(ws.getColumn(i+1).width||0,w); });

      monthEvs.sort((a,b)=>a.date.localeCompare(b.date)).forEach((ev,ei)=>{
        const even=ei%2===0;
        const hd=toHijri(ev.date), gd=new Date(ev.date+'T00:00:00');
        const gStr=gd.getDate()+'/'+(gd.getMonth()+1)+'/'+gd.getFullYear();
        const color=TYPE_COLOR[ev.type]||'2563EB';
        [
          `${hd.day} ${HM[hd.month]} ${hd.year}هـ`,
          gStr,
          TYPE_AR[ev.type]||ev.type,
          ev.title,
          ev.time||'—',
          ev.note||''
        ].forEach((v,ci)=>{
          const c=ws.getCell(dr,ci+1); c.value=v;
          c.fill=xFill(even?'EFF6FF':'DBEAFE');
          c.font=xFont({sz:9,color:ci===2?color:'000000',bold:ci===3});
          c.alignment=xAlign(ci===3||ci===5?'right':'center','middle',ci===5);
          c.border=xBorder();
        });
        ws.getRow(dr).height=20; dr++;
      });
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  const filename = encodeURIComponent(`تقويم-${year}هـ.xlsx`);
  res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition',`attachment; filename*=UTF-8''${filename}`);
  res.send(buf);
});

app.get('/api/calendar', (req, res) => {
  const { month, year } = req.query; // Hijri year/month filter (optional)
  const db = readDB();
  let events = db.calendarEvents || [];
  if (year && month) {
    events = events.filter(e => {
      const h = toHijri(e.date);
      return h.year == +year && h.month == +month;
    });
  }
  // Also inject holidays and auto-Fridays for the requested month as read-only events
  const enriched = [...events];
  res.json(enriched);
});

app.post('/api/calendar', async (req, res) => {
  const body   = req.body;
  const createdAt = new Date().toISOString();
  const ids = [];
  const newEvents = []; // collect message-type events to schedule on Fonnte

  saveDB(db => {
    if (!db.calendarEvents) db.calendarEvents = [];

    // Helper: sync holidays for an event
    const syncHol = ev => {
      if (ev.type !== 'holiday' && ev.type !== 'offday') return;
      const hType = ev.type === 'holiday' ? 'Holiday' : 'OffDay';
      const start = new Date(ev.date), end = ev.endDate ? new Date(ev.endDate) : new Date(ev.date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
        const iso = d.toISOString().split('T')[0];
        db.holidays = db.holidays.filter(h => h.date !== iso);
        db.holidays.push({ id: ev.id+'_h_'+iso, date: iso, type: hType, reason: ev.title });
      }
    };

    // Specific dates: create one event per hand-picked date
    if (body.type === 'message' && Array.isArray(body.specificDates) && body.specificDates.length > 0) {
      const groupId = newId();
      body.specificDates.forEach(iso => {
        const id  = newId();
        const ev  = { ...body, id, date: iso, endDate: iso, dailyRepeat: false, specificDates: null, groupId, createdAt, fonnteScheduled: [] };
        db.calendarEvents.push(ev);
        ids.push(id);
        if (ev.waTargets?.length && ev.waMessage) newEvents.push(ev);
      });
    // Daily message expansion: if message + endDate + dailyRepeat=true, create one event per day
    } else if (body.type === 'message' && body.endDate && body.endDate !== body.date && body.dailyRepeat) {
      const groupId = newId(); // shared group id so they can all be deleted together
      const start = new Date(body.date), end = new Date(body.endDate);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
        const iso = d.toISOString().split('T')[0];
        const id  = newId();
        const ev  = { ...body, id, date: iso, endDate: iso, dailyRepeat: false, groupId, createdAt, fonnteScheduled: [] };
        db.calendarEvents.push(ev);
        ids.push(id);
        if (ev.waTargets?.length && ev.waMessage) newEvents.push(ev);
      }
    } else {
      const id = newId();
      const ev = { id, ...body, createdAt, fonnteScheduled: [] };
      db.calendarEvents.push(ev);
      syncHol(ev);
      ids.push(id);
      if (ev.type === 'message' && ev.waTargets?.length && ev.waMessage) newEvents.push(ev);
    }
  });

  // Schedule each message event on Fonnte immediately (server-independent delivery)
  const scheduleResults = []; // [{eventId, ok, count, errors}]
  if (newEvents.length) {
    const db = readDB();
    const token      = db.settings?.whatsappApiKey;
    const schoolName = db.settings?.schoolName || '';

    if (token) {
      for (const ev of newEvents) {
        try {
          const scheduled = await scheduleEventOnFonnte(token, ev, schoolName);
          const ok = scheduled.length > 0;
          scheduleResults.push({ eventId: ev.id, date: ev.date, ok, count: scheduled.length });
          if (scheduled.length) {
            saveDB(db2 => {
              const stored = db2.calendarEvents.find(e => e.id === ev.id);
              if (stored) stored.fonnteScheduled = scheduled;
            });
          }
        } catch(e) {
          console.error('[fonnte-schedule] error for event', ev.id, e.message);
          scheduleResults.push({ eventId: ev.id, date: ev.date, ok: false, error: e.message });
        }
      }
    } else {
      console.warn('[fonnte-schedule] Fonnte token not set — messages saved but NOT scheduled on Fonnte');
      scheduleResults.push({ ok: false, error: 'Fonnte token not configured' });
    }
  }

  res.json({ ok: true, ids, scheduleResults });
});

app.put('/api/calendar/:id', (req, res) => {
  saveDB(db => {
    if (!db.calendarEvents) db.calendarEvents = [];
    const idx = db.calendarEvents.findIndex(e => e.id === req.params.id);
    if (idx >= 0) db.calendarEvents[idx] = { ...db.calendarEvents[idx], ...req.body };
    // Sync holidays if type changed
    const ev = db.calendarEvents[idx];
    if (ev && (ev.type === 'holiday' || ev.type === 'offday')) {
      db.holidays = db.holidays.filter(h => !h.id.startsWith(req.params.id + '_h'));
      db.holidays.push({ id: ev.id + '_h', date: ev.date, type: ev.type === 'holiday' ? 'Holiday' : 'OffDay', reason: ev.title });
    }
  });
  res.json({ ok: true });
});

app.delete('/api/calendar/:id', async (req, res) => {
  const { all } = req.query; // ?all=1 deletes entire group
  const db = readDB();
  const token = db.settings?.whatsappApiKey;

  if (!db.calendarEvents) db.calendarEvents = [];
  const ev = db.calendarEvents.find(e => e.id === req.params.id);

  // Collect all events to delete (single or whole group)
  let toDelete = [];
  if (all && ev?.groupId) {
    toDelete = db.calendarEvents.filter(e => e.groupId === ev.groupId);
  } else if (ev) {
    toDelete = [ev];
  }

  // Cancel on Fonnte first (fire and forget — don't block UI on Fonnte errors)
  if (token && toDelete.length) {
    for (const delEv of toDelete) {
      const scheduled = delEv.fonnteScheduled || [];
      console.log(`[fonnte-delete] event "${delEv.title}" has ${scheduled.length} scheduled IDs:`, JSON.stringify(scheduled));
      if (!scheduled.length) {
        console.warn(`[fonnte-delete] No fonnteScheduled IDs found for event "${delEv.title}" — cannot cancel on Fonnte`);
      }
      for (const entry of scheduled) {
        try {
          console.log(`[fonnte-delete] attempting to cancel fonnteId=${entry.fonnteId}`);
          const r = await fonnteDeleteMessage(token, entry.fonnteId);
          console.log(`[fonnte-delete] response:`, JSON.stringify(r));
          console.log(`[fonnte-delete] ID ${entry.fonnteId}: ${r.status ? '✅ حُذف' : '⚠️ ' + (r.reason||r.error||'unknown')}`);
        } catch(e) {
          console.warn(`[fonnte-delete] error for ${entry.fonnteId}:`, e.message);
        }
      }
    }
  }

  // Now remove from DB
  saveDB(db2 => {
    if (!db2.calendarEvents) db2.calendarEvents = [];
    if (all && ev?.groupId) {
      const groupEvs = db2.calendarEvents.filter(e => e.groupId === ev.groupId);
      groupEvs.forEach(ge => {
        db2.holidays = db2.holidays.filter(h => !h.id.startsWith(ge.id+'_h'));
      });
      db2.calendarEvents = db2.calendarEvents.filter(e => e.groupId !== ev.groupId);
    } else {
      db2.calendarEvents = db2.calendarEvents.filter(e => e.id !== req.params.id);
      if (ev && (ev.type === 'holiday' || ev.type === 'offday')) {
        db2.holidays = db2.holidays.filter(h => !h.id.startsWith(req.params.id + '_h'));
      }
    }
  });

  res.json({ ok: true });
});

app.get('*', (_, res) => {
  const fromApp  = path.join(APP_DIR, 'index.html');
  const fromRoot = path.join(ROOT_DIR, 'index.html');
  if (fs.existsSync(fromApp))  return res.sendFile(fromApp);
  if (fs.existsSync(fromRoot)) return res.sendFile(fromRoot);
  res.status(404).send('index.html not found');
});


// ════════════════════════════════════════════════════════
//  تشغيل الخادم
// ════════════════════════════════════════════════════════
app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  ✅ حضور الحلقات — جاهز للعمل            ║`);
  console.log(`║  http://localhost:${PORT}                    ║`);
  console.log(`║  📱 شبكة محلية: http://${ip}:${PORT}  ║`);
  console.log(`╚══════════════════════════════════════════╝\n`);
});