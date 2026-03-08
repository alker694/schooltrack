//  تحميل البيانات
// ══════════════════════════════════════════════════════════
async function loadAll() {
  const [students, classes, teachers, teacherLog, holidays, settings2] = await Promise.all([
    apiFetch('/students'), apiFetch('/classes'), apiFetch('/teachers'),
    apiFetch('/teacher-log?date='+todayISO()), apiFetch('/holidays'),
    apiFetch('/settings'),
  ]);
  state.students   = students   || [];
  state.classes    = classes    || [];
  state.teachers   = teachers   || [];
  state.teacherLog = teacherLog || [];
  state.waTemplates = settings2?.waTemplates || [];
  state.holidays   = holidays   || [];
}

// ══════════════════════════════════════════════════════════
//  الشعارات — تحميل وعرض في الواجهة
// ══════════════════════════════════════════════════════════
async function loadAndDisplayLogos() {
  try {
    const settings = await apiFetch('/settings');
    if (!settings) return;
    const logos = settings.logos || [];

    // اسم المنشأة في شاشة PIN
    const titleEl = document.getElementById('pinTitle');
    const subEl   = document.getElementById('pinSubtitle');
    if (titleEl && settings.schoolName) titleEl.textContent = settings.schoolName;
    if (subEl   && settings.subtitle)   subEl.textContent   = settings.subtitle;

    // شعارات شاشة PIN
    const pinLogosEl = document.getElementById('pinOrgLogos');
    const pinIconEl  = document.getElementById('pinLogoIcon');
    if (pinLogosEl && logos.length > 0) {
      pinLogosEl.innerHTML = logos.map(l =>
        `<img src="${l.url}" alt="${l.name}" class="pin-org-logo" onerror="this.style.display='none'" />`
      ).join('');
      if (pinIconEl) pinIconEl.style.display = 'none';
    }

    // شعارات الهيدر
    // Cache dateFormat in state so updateTodayBadge can use it without an extra fetch
    if (!state.settings) state.settings = {};
    state.settings.dateFormat      = settings.dateFormat      || dfDefaultFormat();
    state.settings.whatsappApiKey  = settings.whatsappApiKey  || '';
    updateTodayBadge(state.settings.dateFormat);

    const headerLogosEl = document.getElementById('headerLogos');
    if (headerLogosEl && logos.length > 0) {
      headerLogosEl.innerHTML = logos.slice(0,2).map(l =>
        `<img src="${l.url}" alt="${l.name}" class="header-logo" onerror="this.style.display='none'" />`
      ).join('');
      // Set first logo as browser-tab favicon
      _setFavicon(logos[0].url);
    }

    // شعارات السايدبار
    const sidebarLogosEl = document.getElementById('sidebarLogos');
    if (sidebarLogosEl && logos.length > 0) {
      sidebarLogosEl.innerHTML = `<img src="${logos[0].url}" alt="${logos[0].name}" class="sidebar-logo" onerror="this.style.display='none'" />`;
    }
  } catch(e) { console.warn('Logo load error:', e); }
}

async function apiFetch(path, opts={}) {
  try { const r = await fetch(`${API}${path}`, opts); return await r.json(); }
  catch(e) { console.error('API error:', path, e); return null; }
}

// Set browser-tab favicon from a URL (PNG/JPG/SVG/ICO all work)
function _setFavicon(url) {
  try {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = url;
    // Also set apple touch icon for iOS home screen
    let apple = document.querySelector("link[rel='apple-touch-icon']");
    if (!apple) {
      apple = document.createElement('link');
      apple.rel = 'apple-touch-icon';
      document.head.appendChild(apple);
    }
    apple.href = url;
  } catch(e) {}
}

// ══════════════════════════════════════════════════════════
