//  الإعدادات والهوية البصرية
// ══════════════════════════════════════════════════════════
async function initSettings() {
  const s = await apiFetch('/settings');
  if (!s) return;

  // Brand
  const schoolName = document.getElementById('settSchoolName');
  const subtitle   = document.getElementById('settSubtitle');
  if (schoolName) schoolName.value = s.schoolName || '';
  if (subtitle)   subtitle.value   = s.subtitle   || '';

  // Telegram (now on sync page — skipped here)

  // WhatsApp
  const waKey      = document.getElementById('settWaApiKey');
  const waPhone    = document.getElementById('settAdminPhone');
  const waTemplate = document.getElementById('settWaTemplate');
  if (waKey)      waKey.value      = s.whatsappApiKey   || '';
  if (waPhone)    waPhone.value    = s.adminPhone        || '';
  if (waTemplate) waTemplate.value = s.whatsappTemplate || '';

  // Logos & brand preview
  renderLogoList(s.logos || []);
  updateBrandPreview(s);
}

async function saveSettings() {
  const schoolName = document.getElementById('settSchoolName').value.trim();
  const subtitle   = document.getElementById('settSubtitle').value.trim();
  await apiFetch('/settings', {
    method:'PUT', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ schoolName, subtitle }),
  });
  const statusEl = document.getElementById('settStatus');
  statusEl.style.color = 'var(--success)';
  statusEl.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم حفظ البيانات!';
  setTimeout(() => statusEl.textContent = '', 3000);
  updateBrandPreview({ schoolName, subtitle });
  loadAndDisplayLogos();
}

async function changePin() {
  const oldPin  = document.getElementById('settOldPin').value;
  const newPin  = document.getElementById('settNewPin').value;
  const confPin = document.getElementById('settConfPin').value;
  const statusEl= document.getElementById('pinStatus');
  if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
    statusEl.style.color = 'var(--error)'; statusEl.textContent = 'يجب أن يتكون الرمز السري من 4 أرقام فقط.'; return;
  }
  if (newPin !== confPin) {
    statusEl.style.color = 'var(--error)'; statusEl.textContent = 'الرمز الجديد وتأكيده غير متطابقين.'; return;
  }
  const verify = await apiFetch('/auth/verify', {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pin: oldPin }),
  });
  if (!verify?.valid) {
    statusEl.style.color = 'var(--error)'; statusEl.textContent = 'الرمز الحالي غير صحيح.'; return;
  }
  await apiFetch('/settings', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ pin: newPin }) });
  statusEl.style.color = 'var(--success)'; statusEl.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم تغيير الرمز السري!';
  ['settOldPin','settNewPin','settConfPin'].forEach(id => document.getElementById(id).value = '');
  setTimeout(() => statusEl.textContent = '', 3000);
}

// ─── الشعارات ────────────────────────────────────────────

function setupLogoDragDrop() {
  const area = document.getElementById('logoUploadArea');
  if (!area || area._ddSetup) return;
  area._ddSetup = true;
  area.addEventListener('dragover',  e => { e.preventDefault(); area.classList.add('drag-over'); });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', e => {
    e.preventDefault(); area.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) { document.getElementById('logoFile').files; showLogoPreview(file); }
  });
  area.addEventListener('click', () => document.getElementById('logoFile').click());
}

function handleLogoUpload() {
  const file = document.getElementById('logoFile').files[0];
  if (file) showLogoPreview(file);
}

function showLogoPreview(file) {
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('logoPreviewImg').src = e.target.result;
    document.getElementById('logoName').value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    document.getElementById('logoPreviewArea').classList.remove('hidden');
    document.getElementById('logoUploadArea').classList.add('hidden');
  };
  reader.readAsDataURL(file);
}

function cancelLogoPreview() {
  document.getElementById('logoPreviewArea').classList.add('hidden');
  document.getElementById('logoUploadArea').classList.remove('hidden');
  document.getElementById('logoFile').value = '';
}

async function uploadLogo() {
  const file = document.getElementById('logoFile').files[0];
  const name = document.getElementById('logoName').value.trim() || 'شعار';
  if (!file) return toast('اختر ملف شعار أولاً');

  const s = await apiFetch('/settings');
  if ((s?.logos||[]).length >= 4) return toast('الحد الأقصى 4 شعارات');

  const fd = new FormData();
  fd.append('logo', file);
  fd.append('name', name);

  try {
    const res = await fetch(`${API}/settings/logos`, { method:'POST', body: fd });
    if (!res.ok) throw new Error();
    cancelLogoPreview();
    const settings = await apiFetch('/settings');
    renderLogoList(settings.logos || []);
    updateBrandPreview(settings);
    toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> تم رفع الشعار بنجاح!');
  } catch(e) {
    toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> فشل رفع الشعار');
  }
}

async function deleteLogo(id) {
  if (!confirm('هل تريد حذف هذا الشعار؟')) return;
  await apiFetch(`/settings/logos/${id}`, { method:'DELETE' });
  const settings = await apiFetch('/settings');
  renderLogoList(settings.logos || []);
  updateBrandPreview(settings);
  toast('<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-left:3px;flex-shrink:0"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg> تم حذف الشعار');
}

function renderLogoList(logos) {
  const list = document.getElementById('logoList');
  list.innerHTML = '';
  if (logos.length === 0) {
    list.innerHTML = '<p style="color:var(--text2);font-size:13px;padding:8px 0">لا توجد شعارات بعد. أضف شعاراً لتظهر في جميع التقارير.</p>';
    return;
  }
  logos.forEach((logo, i) => {
    const item = document.createElement('div');
    item.className = 'logo-item';
    item.innerHTML = `
      <button class="logo-item-del" onclick="deleteLogo('${logo.id}')" title="حذف"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      <img src="${logo.url}" alt="${logo.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 100 100\\'><text y=\\'.9em\\'font-size=\\'90\\'>>🖼</text></svg>'" />
      <span class="logo-item-name" title="${logo.name}">${logo.name}</span>
      <span class="logo-item-badge">شعار ${i+1}</span>
    `;
    list.appendChild(item);
  });
}

function updateBrandPreview(settings) {
  document.getElementById('previewName').textContent = settings.schoolName || 'اسم المنشأة';
  document.getElementById('previewSub').textContent  = settings.subtitle   || '';
  const logosEl = document.getElementById('previewLogos');
  const logos   = settings.logos || [];
  if (logos.length === 0) {
    logosEl.innerHTML = '<span class="no-logo">لا توجد شعارات — أضف شعاراً ليظهر هنا</span>';
  } else {
    logosEl.innerHTML = logos.map(l =>
      `<img src="${l.url}" alt="${l.name}" title="${l.name}" onerror="this.style.display='none'" />`
    ).join('');
  }
}

// ══════════════════════════════════════════════════════════
