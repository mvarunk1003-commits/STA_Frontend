const API_BASE = `${window.location.origin}/api`;

// ==========================================
// TRANSLATION ENGINE (i18n)
// ==========================================
let currentLanguage = localStorage.getItem('preferredLanguage') || 'en';

function getLanguageName(lang) {
  const names = {
    en: 'English',
    kn: 'ಕನ್ನಡ',
    sa: 'संस्कृतम्'
  };
  return names[lang] || 'English';
}

function changeLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('preferredLanguage', lang);

  const langBtn = document.getElementById('lang-selector-btn');
  if (langBtn) {
    langBtn.innerHTML = `🌐 ${getLanguageName(lang)}`;
  }
  const portalSelect = document.getElementById('portal-lang-select');
  if (portalSelect && portalSelect.value !== lang) {
    portalSelect.value = lang;
  }

  translateDOM(document.body, lang);
  if (lang !== 'en') {
    startTranslationObserver();
  }
  window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

function translateDOM(root, lang) {
  if (!root) return;
  const isEn = (lang === 'en');
  const dict = (!isEn && window.translations) ? window.translations[lang] : null;

  const walk = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        const parent = node.parentNode;
        if (parent) {
          const tag = parent.tagName;
          if (
            tag === 'SCRIPT' ||
            tag === 'STYLE' ||
            tag === 'TEXTAREA' ||
            parent.closest('.no-translate') ||
            parent.closest('[contenteditable="true"]') ||
            parent.closest('#notice-preview')
          ) {
            return NodeFilter.FILTER_REJECT;
          }
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    },
    false
  );

  let node;
  while ((node = walk.nextNode())) {
    if (typeof node._origText === 'undefined') {
      node._origText = node.nodeValue;
    }
    const orig = node._origText;
    const trimmed = orig.trim();

    if (isEn) {
      if (node.nodeValue !== orig) {
        node.nodeValue = orig;
      }
      continue;
    }

    if (!dict || !trimmed) continue;

    if (dict[trimmed]) {
      const match = orig.match(/^(\s*)(.*?)(\s*)$/);
      if (match) {
        node.nodeValue = match[1] + dict[trimmed] + match[3];
      }
    } else if (trimmed.startsWith('Welcome back, ') && trimmed.endsWith('!')) {
      const namePart = trimmed.substring('Welcome back, '.length, trimmed.length - 1);
      const prefix = dict['Welcome back, '] || dict['Welcome back'] || 'Welcome back, ';
      node.nodeValue = prefix + namePart + '!';
    } else if (trimmed.includes('State Scope')) {
      const statePart = trimmed.replace(' State Scope', '').trim();
      const scopeWord = dict['State Scope'] || 'State Scope';
      const transState = dict[statePart] || statePart;
      node.nodeValue = `${transState} ${scopeWord}`;
    }
  }

  // Translate placeholders and buttons
  const elements = root.querySelectorAll('input[placeholder], textarea[placeholder], input[type="submit"], input[type="button"]');
  elements.forEach(el => {
    if (el.closest('.no-translate') || el.closest('#notice-preview')) return;
    if (typeof el.dataset.origPlaceholder === 'undefined' && el.placeholder) {
      el.dataset.origPlaceholder = el.placeholder;
    }
    if (typeof el.dataset.origValue === 'undefined' && (el.type === 'submit' || el.type === 'button') && el.value) {
      el.dataset.origValue = el.value;
    }

    if (isEn) {
      if (typeof el.dataset.origPlaceholder !== 'undefined') {
        el.placeholder = el.dataset.origPlaceholder;
      }
      if (typeof el.dataset.origValue !== 'undefined') {
        el.value = el.dataset.origValue;
      }
      return;
    }

    if (!dict) return;
    const ph = el.dataset.origPlaceholder;
    if (ph && dict[ph.trim()]) {
      el.placeholder = dict[ph.trim()];
    }
    const val = el.dataset.origValue;
    if (val && dict[val.trim()]) {
      el.value = dict[val.trim()];
    }
  });

  // Translate select option text contents
  const options = root.querySelectorAll('select:not(.no-translate) option');
  options.forEach(opt => {
    if (opt.closest('.no-translate') || opt.closest('#notice-preview')) return;
    if (typeof opt.dataset.origText === 'undefined') {
      opt.dataset.origText = opt.textContent;
    }

    if (isEn) {
      if (typeof opt.dataset.origText !== 'undefined') {
        opt.textContent = opt.dataset.origText;
      }
      return;
    }

    if (!dict) return;
    const optText = opt.dataset.origText ? opt.dataset.origText.trim() : '';
    if (optText && dict[optText]) {
      opt.textContent = dict[optText];
    }
  });

  // Translate page title
  if (isEn) {
    if (document._origTitle) document.title = document._origTitle;
  } else if (dict) {
    if (!document._origTitle) document._origTitle = document.title;
    let docTitle = document._origTitle;
    for (const key of Object.keys(dict)) {
      if (key.length > 3 && docTitle.includes(key)) {
        docTitle = docTitle.replace(key, dict[key]);
      }
    }
    document.title = docTitle;
  }
}

let translationObserver = null;
let translationDebounceTimer = null;
function startTranslationObserver() {
  if (translationObserver) return;
  translationObserver = new MutationObserver((mutations) => {
    if (translationDebounceTimer) clearTimeout(translationDebounceTimer);
    translationDebounceTimer = setTimeout(() => {
      if (translationObserver) translationObserver.disconnect();
      if (currentLanguage !== 'en') {
        translateDOM(document.body, currentLanguage);
      }
      if (translationObserver) translationObserver.observe(document.body, { childList: true, subtree: true });
    }, 80);
  });
  translationObserver.observe(document.body, { childList: true, subtree: true });
}

function initLanguage() {
  const lang = localStorage.getItem('preferredLanguage') || 'en';
  currentLanguage = lang;

  const setup = () => {
    const langBtn = document.getElementById('lang-selector-btn');
    if (langBtn) {
      langBtn.innerHTML = `🌐 ${getLanguageName(lang)}`;
    }
    const portalSelect = document.getElementById('portal-lang-select');
    if (portalSelect) {
      portalSelect.value = lang;
    }
    translateDOM(document.body, lang);
    if (lang !== 'en') {
      startTranslationObserver();
    }
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
}

// Load translations and initialize
(function() {
  const script = document.createElement('script');
  script.src = 'js/translations.js';
  script.async = false;
  script.onload = initLanguage;
  document.head.appendChild(script);
})();

// ==========================================
// RBAC HELPERS
// ==========================================

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('user') || '{}');
}

function isTier1() {
  const role = getCurrentUser().role;
  return role === 'admin' || role === 'state_coordinator';
}

function isAdmin() {
  return getCurrentUser().role === 'admin';
}

function isStateCoordinator() {
  return getCurrentUser().role === 'state_coordinator';
}

function isTier2() {
  const role = getCurrentUser().role;
  return role === 'district_coordinator' || role === 'taluk_coordinator';
}

function isAuthenticated() {
  return !!localStorage.getItem('token');
}

function getRoleLabel(role) {
  const labels = {
    admin: 'Admin',
    state_coordinator: 'State Coordinator',
    district_coordinator: 'District Coordinator',
    taluk_coordinator: 'Taluk Coordinator'
  };
  return labels[role] || role || 'User';
}

function getStatusBadge(status) {
  const config = {
    approved: { color: 'var(--success)', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.3)', label: '✓ Approved' },
    pending:  { color: '#f59e0b',        bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', label: '⏳ Pending Approval' },
    rejected: { color: 'var(--danger)',  bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.3)',  label: '✗ Rejected' }
  };
  const c = config[status] || config.pending;
  return `<span style="display:inline-block; padding:2px 10px; border-radius:20px; font-size:11px; font-weight:700;
    background:${c.bg}; color:${c.color}; border:1px solid ${c.border}; white-space:nowrap;">${c.label}</span>`;
}

// ==========================================
// API FETCH HELPER
// ==========================================

async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showToast('Session expired. Please login again.', 'error');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 1500);
    return null;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// ==========================================
// AUTHENTICATION
// ==========================================

function checkAuth() {
  const currentPath = window.location.pathname;
  const isLoginPage = currentPath.endsWith('login.html');
  const token = localStorage.getItem('token');

  const publicFiles = ['index.html', 'login.html', 'about.html', 'events.html', 'resources.html', 'gallery.html', 'contact.html'];
  const isPublic = publicFiles.some(file => currentPath.endsWith(file)) || currentPath === '/';

  if (!token && !isPublic) {
    window.location.href = 'login.html';
  } else if (token && isLoginPage) {
    window.location.href = 'dashboard.html';
  }
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '✗'}</span>
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// ==========================================
// HEADER RENDER
// ==========================================

async function renderHeader() {
  const headerPlaceholder = document.getElementById('header-placeholder');
  if (!headerPlaceholder) return;

  const user = getCurrentUser();
  const name = user.username || 'User';
  const initials = name.slice(0, 2).toUpperCase();
  const roleLabel = getRoleLabel(user.role);
  const stateBadge = user.state
    ? `<span style="font-size:10px; padding:2px 8px; background:rgba(16,185,129,0.12); color:#10b981; border-radius:20px; font-weight:700; border:1px solid rgba(16,185,129,0.25); white-space:nowrap;">📍 ${user.state}</span>`
    : '';
  const tierBadge = isTier1()
    ? `<span style="font-size:10px; padding:2px 8px; background:rgba(234,88,12,0.12); color:var(--primary-color); border-radius:20px; font-weight:700; border:1px solid rgba(234,88,12,0.2); white-space:nowrap;">Tier 1 · ${roleLabel}</span>`
    : `<span style="font-size:10px; padding:2px 8px; background:rgba(59,130,246,0.12); color:var(--accent-color); border-radius:20px; font-weight:700; border:1px solid rgba(59,130,246,0.2); white-space:nowrap;">Tier 2 · ${roleLabel}</span>`;

  // Fetch unread notification count for bell icon
  let unreadCount = 0;
  try {
    if (isAuthenticated()) {
      const countData = await apiFetch('/notifications/unread-count');
      if (countData) unreadCount = countData.count;
    }
  } catch (e) { /* ignore */ }

  const bellBadge = unreadCount > 0
    ? `<span style="position:absolute; top:-4px; right:-4px; background:var(--danger); color:white; border-radius:50%; font-size:9px; font-weight:700; padding:1px 5px; min-width:16px; text-align:center; line-height:16px; border:2px solid var(--bg-primary);">${unreadCount > 99 ? '99+' : unreadCount}</span>`
    : '';

  const preferredLang = localStorage.getItem('preferredLanguage') || 'en';
  const langOptions = [
    { code: 'en', name: 'English' },
    { code: 'kn', name: 'ಕನ್ನಡ' },
    { code: 'sa', name: 'संस्कृतम्' }
  ].map(opt => `<option value="${opt.code}" ${preferredLang === opt.code ? 'selected' : ''}>${opt.name}</option>`).join('');

  const langSelectorHtml = `
    <div class="no-translate" style="position:relative; display:flex; align-items:center;">
      <select id="portal-lang-select" onchange="changeLanguage(this.value)" style="padding: 6px 28px 6px 12px; font-size: 12px; width: auto; height: 38px; border-radius: 8px; background: rgba(255, 255, 255, 0.85); color: var(--text-primary); border: 1px solid var(--panel-border); outline: none; cursor: pointer; font-weight: 500; appearance: none; -webkit-appearance: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3D%22www.w3.org%202000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%237c2d12%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 10px top 50%; background-size: 8px auto;">
        ${langOptions}
      </select>
    </div>
  `;

  const stateSubtitleText = user.state ? ` &bull; <strong>${user.state} State Scope</strong>` : '';

  headerPlaceholder.innerHTML = `
    <div class="header-title">
      <h1 id="page-title">${document.title}</h1>
      <p id="page-subtitle">Welcome back, ${name}!${stateSubtitleText}</p>
    </div>
    <div class="header-user">
      ${tierBadge}
      ${stateBadge}
      ${langSelectorHtml}
      <a href="notifications.html" id="header-bell-btn" title="Notifications" style="position:relative; display:flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); cursor:pointer; text-decoration:none; transition:all 0.2s ease; color:var(--text-primary);" onmouseover="this.style.background='rgba(234,88,12,0.12)'" onmouseout="this.style.background='rgba(255,255,255,0.06)'">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        ${bellBadge}
      </a>
      <div class="user-avatar">${initials}</div>
      <button class="btn btn-secondary" onclick="logout()" style="padding: 8px 12px; font-size:12px;">Logout</button>
    </div>
  `;
}

// ==========================================
// SIDEBAR RENDER
// ==========================================

async function renderSidebar() {
  const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
  if (!sidebarPlaceholder) return;

  const user = getCurrentUser();
  const tier1Only = isTier1();

  // Fetch unread notification count
  let unreadCount = 0;
  try {
    if (isAuthenticated()) {
      const countData = await apiFetch('/notifications/unread-count');
      if (countData) unreadCount = countData.count;
    }
  } catch (e) { /* ignore */ }

  const notifBadge = unreadCount > 0
    ? `<span style="margin-left:auto; background:var(--danger); color:white; border-radius:50%; font-size:10px; font-weight:700; padding:1px 6px; min-width:18px; text-align:center;">${unreadCount > 99 ? '99+' : unreadCount}</span>`
    : '';

  const menuItems = [
    { name: 'Dashboard',    file: 'dashboard.html',   icon: '📊', show: true },
    { name: 'Coordinators', file: 'members.html',      icon: '👥', show: true },
    { name: 'Events',       file: 'events.html',       icon: '📅', show: true },
    { name: 'Attendance',   file: 'attendance.html',   icon: '📝', show: true },
    { name: 'Expenses',     file: 'expenses.html',     icon: '💰', show: true },
    { name: 'Sponsors',     file: 'sponsors.html',     icon: '🤝', show: true },
    { name: 'Bhajan Team',  file: 'bhajan-team.html',  icon: '🎵', show: true },
    { name: 'Resources',    file: 'resources.html',    icon: '📁', show: true },
    { name: 'Gallery',      file: 'gallery.html',      icon: '🖼️', show: true },
    { name: 'Memos',        file: 'memo.html',         icon: '📢', show: true },
    { name: 'Calendar',     file: 'calendar.html',     icon: '🗓️', show: true },
    { name: 'Reports',      file: 'reports.html',      icon: '📈', show: tier1Only },
    { name: 'Notifications',file: 'notifications.html',icon: '🔔', show: true, badge: notifBadge },
    { name: 'Settings',     file: 'settings.html',     icon: '⚙️', show: tier1Only },
  ];

  const currentPath = window.location.pathname;

  const menuListHtml = menuItems
    .filter(item => item.show)
    .map(item => {
      const isActive = currentPath.endsWith(item.file) ? 'active' : '';
      const badge = item.badge || '';
      return `
        <li class="sidebar-item ${isActive}">
          <a href="${item.file}" style="display:flex; align-items:center; gap:8px;">
            <span>${item.icon}</span>
            <span>${item.name}</span>
            ${badge}
          </a>
        </li>
      `;
    }).join('');

  const tierLabel = tier1Only ? 'Tier 1 — Full Access' : 'Tier 2 — Coordinator';
  const tierColor = tier1Only ? 'var(--primary-color)' : 'var(--accent-color)';

  sidebarPlaceholder.innerHTML = `
    <div class="sidebar-brand">
      <div class="sidebar-logo">S</div>
      <div class="sidebar-title">SSTPA Portal</div>
    </div>
    <div style="margin: 0 16px 12px; padding: 6px 10px; background:rgba(255,255,255,0.04); border-radius:8px; border:1px solid rgba(255,255,255,0.08);">
      <p style="font-size:10px; color:${tierColor}; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">${tierLabel}</p>
    </div>
    <ul class="sidebar-menu">
      ${menuListHtml}
    </ul>
    <div class="sidebar-footer">
      <p style="font-size: 11px; text-align: center; color: var(--text-muted);">SSTPA Portal v2.0.0 &copy; 2026</p>
    </div>
  `;
}

// ==========================================
// LOGOUT
// ==========================================

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showToast('Logged out successfully', 'success');
  setTimeout(() => {
    window.location.href = 'login.html';
  }, 1000);
}

// ==========================================
// MODAL HELPERS
// ==========================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add('open');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}

// ==========================================
// PUBLIC NAV (guest view)
// ==========================================

function renderPublicNav() {
  const sidebarPlaceholder = document.getElementById('sidebar-placeholder');
  if (!sidebarPlaceholder) return;

  sidebarPlaceholder.className = '';
  const currentLang = localStorage.getItem('preferredLanguage') || 'en';
  const currentLangName = getLanguageName(currentLang);

  sidebarPlaceholder.innerHTML = `
    <nav class="landing-nav">
      <a href="index.html" class="nav-logo">
        <img src="images/logo.png" class="nav-logo-img" alt="SSTPA Logo">
        <span class="nav-logo-text">SSTPA</span>
      </a>
      <ul class="nav-links">
        <li><a href="index.html">Home</a></li>
        <li><a href="about.html">About</a></li>
        <li><a href="events.html">Events</a></li>
        <li class="dropdown">
          <a href="resources.html" class="dropbtn">Resources</a>
          <ul class="dropdown-content">
            <li><a href="https://www.sringeri.net/stotras" target="_blank">STOTRAS</a></li>
            <li><a href="https://www.sringeri.net/benedictory-discourses" target="_blank">BENEDICTORY DISCOURSES</a></li>
            <li><a href="https://www.sringeri.net/panchangam" target="_blank">PANCHANGAM</a></li>
            <li><a href="https://www.sringeri.net/downloads" target="_blank">DOWNLOADS</a></li>
            <li><a href="https://www.sringeri.net/e-books" target="_blank">E-BOOKS</a></li>
            <li><a href="https://www.sringeri.net/bhajans" target="_blank">BHAJANS</a></li>
            <li><a href="https://www.sringeri.net/magazines" target="_blank">MAGAZINES</a></li>
            <li><a href="https://sacredvedamanuscript.sringeri.net/" target="_blank">SACRED VEDA MANUSCRIPT</a></li>
            <li><a href="https://advaitasharada.sringeri.net/" target="_blank">ADVAITA SHARADA</a></li>
            <li><a href="https://puranasharada.sringeri.net/" target="_blank">PURANA SHARADA</a></li>
          </ul>
        </li>
        <li><a href="https://www.sringeri.net/online-services" target="_blank">Online Services</a></li>
        <li><a href="gallery.html">Gallery</a></li>
        <li><a href="contact.html">Contact</a></li>
        <li class="dropdown no-translate">
          <a href="#" class="dropbtn" onclick="return false;">🌐 ${currentLangName}</a>
          <ul class="dropdown-content" style="min-width: 130px;">
            <li><a href="#" onclick="changeLanguage('en'); return false;">English</a></li>
            <li><a href="#" onclick="changeLanguage('kn'); return false;">ಕನ್ನಡ</a></li>
            <li><a href="#" onclick="changeLanguage('sa'); return false;">संस्कृतम्</a></li>
          </ul>
        </li>
        <li><button id="pwa-install-btn" class="btn btn-secondary no-translate" onclick="installPWA()" style="padding: 8px 16px; font-size:13px; border-color:var(--primary-color); color:var(--primary-color);">📱 Install App</button></li>
        <li><a href="login.html" class="btn btn-primary" style="padding: 8px 16px; font-size:13px; color:white;">Portal Login</a></li>
      </ul>
    </nav>
  `;

  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    mainContent.style.marginLeft = '0';
    mainContent.style.width = '100%';
    mainContent.style.paddingTop = '105px';
  }

  const headerPlaceholder = document.getElementById('header-placeholder');
  if (headerPlaceholder) {
    headerPlaceholder.style.display = 'none';
  }
}

// ==========================================
// INITIALIZE
// ==========================================

document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const currentPath = window.location.pathname;

  const publicFiles = ['index.html', 'login.html', 'about.html', 'events.html', 'resources.html', 'gallery.html', 'contact.html'];
  const isPublicFile = publicFiles.some(file => currentPath.endsWith(file)) || currentPath === '/';

  checkAuth();

  if (isPublicFile && !token) {
    renderPublicNav();
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  } else {
    renderSidebar();
    await renderHeader();

    // Hide elements that require Tier 1
    if (!isTier1()) {
      document.querySelectorAll('.tier1-only').forEach(el => el.style.display = 'none');
    }
    // Hide elements that require Tier 2 only (shown only to submitters)
    if (!isTier2()) {
      document.querySelectorAll('.tier2-only').forEach(el => el.style.display = 'none');
    }

    if (currentLanguage !== 'en') {
      translateDOM(document.body, currentLanguage);
    }
  }

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js')
        .then(reg => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
          // Check for service worker updates
          reg.addEventListener('updatefound', () => {
            const installingWorker = reg.installing;
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[PWA] New version available!');
              }
            });
          });
        })
        .catch(err => console.warn('[PWA] Service Worker registration failed:', err));
    });
  }

  initNetworkStatusListeners();
  initFloatingInstallButton();
});

// ==========================================
// PWA NETWORK STATUS MONITOR
// ==========================================
function initNetworkStatusListeners() {
  function updateNetworkBanner(online) {
    let banner = document.getElementById('pwa-network-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'pwa-network-banner';
      banner.style.cssText = `
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(100px);
        z-index: 100000; padding: 12px 24px; border-radius: 30px; font-size: 14px; font-weight: 600;
        box-shadow: 0 10px 35px rgba(0,0,0,0.18); display: flex; align-items: center; gap: 10px;
        transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1); opacity: 0; pointer-events: none;
      `;
      document.body.appendChild(banner);
    }
    if (!online) {
      banner.style.background = 'linear-gradient(135deg, #fee2e2, #fecdd3)';
      banner.style.color = '#9f1239';
      banner.style.border = '1px solid rgba(225, 29, 72, 0.3)';
      banner.innerHTML = '<span>📡</span> You are offline. Browsing in cached offline mode.';
      banner.style.opacity = '1';
      banner.style.transform = 'translateX(-50%) translateY(0)';
      banner.style.pointerEvents = 'auto';
    } else {
      banner.style.background = 'linear-gradient(135deg, #dcfce7, #bbf7d0)';
      banner.style.color = '#14532d';
      banner.style.border = '1px solid rgba(22, 163, 74, 0.3)';
      banner.innerHTML = '<span>⚡</span> Connection restored! Back online.';
      banner.style.opacity = '1';
      banner.style.transform = 'translateX(-50%) translateY(0)';
      setTimeout(() => {
        banner.style.opacity = '0';
        banner.style.transform = 'translateX(-50%) translateY(100px)';
        banner.style.pointerEvents = 'none';
      }, 3500);
    }
  }

  window.addEventListener('offline', () => updateNetworkBanner(false));
  window.addEventListener('online', () => updateNetworkBanner(true));
}

// ==========================================
// PWA INSTALLATION HOOKS & UI
// ==========================================
let deferredPrompt = null;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         window.navigator.standalone || 
         document.referrer.includes('android-app://');
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const installBtns = document.querySelectorAll('.pwa-install-btn, #pwa-install-btn, #floating-pwa-btn');
  installBtns.forEach(btn => {
    btn.style.display = 'inline-flex';
  });
});

window.addEventListener('appinstalled', () => {
  console.log('[PWA] Application installed successfully!');
  deferredPrompt = null;
  const installBtns = document.querySelectorAll('.pwa-install-btn, #pwa-install-btn, #floating-pwa-btn');
  installBtns.forEach(btn => {
    btn.style.display = 'none';
  });
  showToast('SSTPA Portal App installed successfully!', 'success');
});

function initFloatingInstallButton() {
  if (isStandalone()) return; // Already installed / in app mode

  // If already exists or in login page, don't duplicate
  if (document.getElementById('floating-pwa-btn')) return;

  const floatBtn = document.createElement('button');
  floatBtn.id = 'floating-pwa-btn';
  floatBtn.className = 'pwa-install-btn';
  floatBtn.onclick = window.installPWA;
  floatBtn.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    display: inline-flex; align-items: center; gap: 8px;
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    color: #ffffff; border: none; padding: 10px 18px; border-radius: 30px;
    font-size: 13px; font-weight: 700; cursor: pointer;
    box-shadow: 0 8px 24px rgba(234, 88, 12, 0.35);
    transition: all 0.25s ease;
  `;
  floatBtn.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
    <span>Install App</span>
  `;
  floatBtn.onmouseover = () => {
    floatBtn.style.transform = 'translateY(-3px) scale(1.03)';
    floatBtn.style.boxShadow = '0 12px 28px rgba(234, 88, 12, 0.45)';
  };
  floatBtn.onmouseout = () => {
    floatBtn.style.transform = 'translateY(0) scale(1)';
    floatBtn.style.boxShadow = '0 8px 24px rgba(234, 88, 12, 0.35)';
  };
  document.body.appendChild(floatBtn);
}

function openPWAInstructionsModal() {
  let modal = document.getElementById('pwa-instructions-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'pwa-instructions-modal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="glass-panel modal-content" style="max-width: 520px; padding: 0; overflow: hidden; border-radius: var(--border-radius); border: 1px solid var(--panel-border);">
        <div class="modal-header" style="background: var(--glass-gradient); padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--panel-border);">
          <h2 style="font-weight: 700; font-size: 18px; color: var(--text-primary); display: flex; align-items: center; gap: 8px; margin: 0;">
            📱 Install SSTPA Portal App
          </h2>
          <button onclick="closeModal('pwa-instructions-modal')" style="background:none; border:none; color:var(--text-secondary); font-size:24px; cursor:pointer; font-weight:700; line-height:1;">&times;</button>
        </div>
        <div class="modal-body" style="padding: 24px; display: flex; flex-direction: column; gap: 16px;">
          <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.5; margin: 0;">
            Install this portal onto your device for instant offline access, fullscreen experience, and quick launch from your home screen.
          </p>

          <!-- Android / Chrome Guide -->
          <div style="border: 1px solid rgba(234, 88, 12, 0.18); padding: 14px; border-radius: 12px; background: rgba(255,255,255,0.6);">
            <h3 style="font-size: 14px; font-weight: 700; color: var(--primary-color); margin: 0 0 8px 0; display: flex; align-items: center; gap: 6px;">
              🤖 Android & Desktop (Chrome / Edge / Brave)
            </h3>
            <ol style="margin: 0; padding-left: 18px; font-size: 13px; color: var(--text-primary); line-height: 1.5; display: flex; flex-direction: column; gap: 4px;">
              <li>Tap the <strong>three dots (⋮)</strong> or install icon in your browser toolbar.</li>
              <li>Select <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
              <li>Confirm the prompt to install the application.</li>
            </ol>
          </div>

          <!-- iOS / Safari Guide -->
          <div style="border: 1px solid rgba(234, 88, 12, 0.18); padding: 14px; border-radius: 12px; background: rgba(255,255,255,0.6);">
            <h3 style="font-size: 14px; font-weight: 700; color: var(--primary-color); margin: 0 0 8px 0; display: flex; align-items: center; gap: 6px;">
              🍏 Apple iPhone / iPad (Safari)
            </h3>
            <ol style="margin: 0; padding-left: 18px; font-size: 13px; color: var(--text-primary); line-height: 1.5; display: flex; flex-direction: column; gap: 4px;">
              <li>Open this website in <strong>Safari</strong>.</li>
              <li>Tap the <strong>Share</strong> button (box with an upward arrow at the bottom).</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong> in the top-right corner.</li>
            </ol>
          </div>

          <div style="text-align: center; margin-top: 4px;">
            <button onclick="closeModal('pwa-instructions-modal')" class="btn btn-primary" style="width: 100%; padding: 10px; border-radius: 8px;">Got It</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  openModal('pwa-instructions-modal');
}

window.installPWA = async function() {
  if (!deferredPrompt) {
    openPWAInstructionsModal();
    return;
  }
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`[PWA] Install prompt outcome: ${outcome}`);
  if (outcome === 'accepted') {
    showToast('Installing application...', 'success');
  }
  deferredPrompt = null;
  const installBtns = document.querySelectorAll('.pwa-install-btn, #pwa-install-btn, #floating-pwa-btn');
  installBtns.forEach(btn => {
    btn.style.display = 'none';
  });
};

// ==========================================
// UNIVERSAL PHOTO LIGHTBOX & INFO VIEWER
// ==========================================
let _viewerPhotos = [];
let _viewerCurrentIdx = 0;

function openPhotoViewer(photos, initialIdx = 0) {
  if (!photos || photos.length === 0) return;
  _viewerPhotos = photos;
  _viewerCurrentIdx = initialIdx >= 0 && initialIdx < photos.length ? initialIdx : 0;

  let modal = document.getElementById('universal-lightbox');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'universal-lightbox';
    modal.onclick = (e) => {
      if (e.target === modal) closePhotoViewer();
    };
    modal.innerHTML = `
      <div class="lb-content-card" onclick="event.stopPropagation()">
        <button class="lb-close-btn" onclick="closePhotoViewer()" title="Close (Esc)">&times;</button>
        <button id="lb-btn-prev" class="lb-nav-arrow lb-nav-prev" onclick="navPhotoViewer(-1)" title="Previous photo (Left Arrow)">&#8249;</button>
        <button id="lb-btn-next" class="lb-nav-arrow lb-nav-next" onclick="navPhotoViewer(1)" title="Next photo (Right Arrow)">&#8250;</button>
        
        <div class="lb-image-stage">
          <img id="lb-stage-img" src="" alt="Photo">
        </div>

        <div class="lb-info-panel">
          <div class="lb-title-row">
            <div>
              <h3 id="lb-info-title" class="lb-title"></h3>
              <p id="lb-info-desc" class="lb-desc" style="display:none; margin-top:4px;"></p>
            </div>
            <div id="lb-info-counter" style="font-size:12px; font-weight:700; background:rgba(234,88,12,0.25); color:#fef08a; padding:4px 10px; border-radius:20px; white-space:nowrap; border:1px solid rgba(234,88,12,0.4);"></div>
          </div>

          <div class="lb-meta-row">
            <div id="lb-meta-uploader" class="lb-meta-item">
              <span>👤</span> <span id="lb-val-uploader"></span>
            </div>
            <div id="lb-meta-date" class="lb-meta-item">
              <span>📅</span> <span id="lb-val-date"></span>
            </div>
            <div id="lb-meta-event" class="lb-meta-item" style="display:none;">
              <span>🚩</span> <span id="lb-val-event"></span>
            </div>
          </div>

          <div class="lb-actions-row">
            <div style="font-size:12px; color:rgba(255,255,255,0.6);">
              Use ⬅️ ➡️ keys to navigate
            </div>
            <div style="display:flex; gap:8px;">
              <a id="lb-btn-open-full" href="#" target="_blank" class="btn btn-secondary" style="font-size:12px; padding:6px 14px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; color:#fff;">
                <span>🔗 Full Size</span>
              </a>
              <a id="lb-btn-download" href="#" download class="btn btn-primary" style="font-size:12px; padding:6px 14px; text-decoration:none; display:inline-flex; align-items:center; gap:6px; color:#fff;">
                <span>⬇ Download</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    document.addEventListener('keydown', (e) => {
      const lb = document.getElementById('universal-lightbox');
      if (!lb || !lb.classList.contains('active')) return;
      if (e.key === 'Escape') closePhotoViewer();
      if (e.key === 'ArrowLeft') navPhotoViewer(-1);
      if (e.key === 'ArrowRight') navPhotoViewer(1);
    });
  }

  _renderPhotoViewer();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function _renderPhotoViewer() {
  const p = _viewerPhotos[_viewerCurrentIdx];
  if (!p) return;

  const rawUrl = p.file_url || p.url || p.src || '';
  const fullUrl = rawUrl.startsWith('http://') || rawUrl.startsWith('https://') ? rawUrl : `${window.location.origin}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;

  const img = document.getElementById('lb-stage-img');
  img.style.opacity = '0';
  img.src = fullUrl;
  img.alt = p.title || 'Event Photo';
  img.onload = () => {
    img.style.opacity = '1';
  };

  document.getElementById('lb-info-title').textContent = p.title || 'Event Photo';
  
  const descEl = document.getElementById('lb-info-desc');
  if (p.description && p.description.trim()) {
    descEl.textContent = p.description;
    descEl.style.display = 'block';
  } else {
    descEl.style.display = 'none';
  }

  document.getElementById('lb-val-uploader').textContent = p.uploader_name || 'Guest / Member';
  
  const dateStr = p.created_at ? new Date(p.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recent';
  document.getElementById('lb-val-date').textContent = dateStr;

  const eventEl = document.getElementById('lb-meta-event');
  const eventVal = document.getElementById('lb-val-event');
  if (p.event_title) {
    eventVal.textContent = p.event_title;
    eventEl.style.display = 'inline-flex';
  } else {
    eventEl.style.display = 'none';
  }

  document.getElementById('lb-info-counter').textContent = `${_viewerCurrentIdx + 1} / ${_viewerPhotos.length}`;
  document.getElementById('lb-btn-prev').disabled = _viewerCurrentIdx === 0;
  document.getElementById('lb-btn-next').disabled = _viewerCurrentIdx === _viewerPhotos.length - 1;

  document.getElementById('lb-btn-open-full').href = fullUrl;
  const dlBtn = document.getElementById('lb-btn-download');
  dlBtn.href = fullUrl;
  dlBtn.setAttribute('download', (p.title || 'sstpa-photo').replace(/[^a-zA-Z0-9_-]/g, '_') + '.jpg');
}

function navPhotoViewer(direction) {
  const next = _viewerCurrentIdx + direction;
  if (next < 0 || next >= _viewerPhotos.length) return;
  _viewerCurrentIdx = next;
  _renderPhotoViewer();
}

function closePhotoViewer() {
  const modal = document.getElementById('universal-lightbox');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ==========================================
// REALTIME WEBSOCKET LIVE SYNC ENGINE
// ==========================================
let _realtimeWs = null;
let _wsReconnectTimer = null;
let _wsRetryCount = 0;

function initRealtimeSync() {
  if (typeof WebSocket === 'undefined') return;
  if (_realtimeWs && (_realtimeWs.readyState === WebSocket.OPEN || _realtimeWs.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const token = localStorage.getItem('token') || '';
  const wsUrl = `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(token)}`;

  try {
    _realtimeWs = new WebSocket(wsUrl);

    _realtimeWs.onopen = () => {
      _wsRetryCount = 0;
      console.log('⚡ Connected to SSTPA Realtime Event Bus');
    };

    _realtimeWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleRealtimeEvent(data);
      } catch (err) {}
    };

    _realtimeWs.onclose = () => {
      _scheduleWsReconnect();
    };

    _realtimeWs.onerror = () => {
      _realtimeWs?.close();
    };
  } catch (e) {
    _scheduleWsReconnect();
  }
}

function _scheduleWsReconnect() {
  clearTimeout(_wsReconnectTimer);
  const delay = Math.min(1000 * Math.pow(2, _wsRetryCount), 15000);
  _wsRetryCount++;
  _wsReconnectTimer = setTimeout(() => {
    initRealtimeSync();
  }, delay);
}

function handleRealtimeEvent(event) {
  if (!event || !event.type) return;

  // Realtime live alerts
  if (event.type === 'NOTIFICATION_CREATED') {
    const title = event.payload?.title || 'New Notification';
    const message = event.payload?.message || '';
    showToast(`🔔 ${title}: ${message}`, 'info');
    if (typeof updateNotificationBadge === 'function') updateNotificationBadge();
    if (typeof loadNotifications === 'function') loadNotifications();
  } else if (event.type === 'EVENT_CREATED' || event.type === 'EVENT_STATUS_CHANGED' || event.type === 'EVENT_UPDATED') {
    if (typeof loadEvents === 'function') loadEvents();
    if (typeof loadDashboardData === 'function') loadDashboardData();
  } else if (event.type === 'NOTICE_CREATED' || event.type === 'NOTICE_STATUS_CHANGED' || event.type === 'NOTICE_UPDATED') {
    if (typeof loadNotices === 'function') loadNotices();
    if (typeof loadDashboardData === 'function') loadDashboardData();
  } else if (event.type === 'EXPENSE_CREATED' || event.type === 'EXPENSE_STATUS_CHANGED') {
    if (typeof loadExpenses === 'function') loadExpenses();
    if (typeof loadDashboardData === 'function') loadDashboardData();
  } else if (event.type === 'PHOTO_UPLOADED' || event.type === 'PHOTO_STATUS_CHANGED') {
    if (typeof loadPhotos === 'function') loadPhotos();
    if (typeof loadHomeGallery === 'function') loadHomeGallery();
  } else if (event.type === 'MEMBER_CREATED' || event.type === 'MEMBER_UPDATED') {
    if (typeof loadMembers === 'function') loadMembers();
    if (typeof loadDashboardData === 'function') loadDashboardData();
  }
}

// Automatically start realtime live sync on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initRealtimeSync);
} else {
  initRealtimeSync();
}



