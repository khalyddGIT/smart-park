/* ============================================================
   SMART-PARK — app.js
   Router simple: carga HTML/CSS/JS de cada módulo dinámicamente
   Gestión de perfiles, sidebar, navegación
   ============================================================ */

window.currentRole = null; // 'user' | 'local' | 'platform'

const SmartParkApp = (() => {
  'use strict';

  const loadedCSS = new Set();
  const loadedJS = new Set();
  const ASSET_VERSION = 'v7';
  let currentModule = null;

  /* ── NAV CONFIG POR PERFIL ─────────────────────────────── */
  const NAV_CONFIG = {
    user: [
      { section: 'Principal', items: [
        { icon: 'dashboard', label: 'Dashboard', module: 'dashboard' },
        { icon: 'search', label: 'Buscar Estacionamiento', module: 'busqueda-geolocalizacion' },
        { icon: 'bookmark', label: 'Mis Reservas', module: 'reservas', badge: 2 },
        { icon: 'local_parking', label: 'Mi Espacio', module: 'gestion-espacios' },
        { icon: 'home_repair_service', label: 'Servicios', module: 'detalle-estacionamiento' },
      ]},
      { section: 'Actividad', items: [
        { icon: 'payments', label: 'Pagos', module: 'pagos-electronicos' },
        { icon: 'history', label: 'Historial', module: 'historial' },
        { icon: 'reviews', label: 'Reseñas', module: 'resenas-calificaciones' },
        { icon: 'notifications', label: 'Notificaciones', module: 'notificaciones', badge: 3 },
      ]},
      { section: 'Cuenta', items: [
        { icon: 'person', label: 'Mi Cuenta', module: 'auth' },
        { icon: 'security', label: 'Seguridad', module: 'auth' },
        { icon: 'description', label: 'Términos y Condiciones', module: 'terminos-condiciones' },
      ]}
    ],
    local: [
      { section: 'Principal', items: [
        { icon: 'dashboard', label: 'Dashboard', module: 'dashboard' },
        { icon: 'grid_view', label: 'Gestión de Espacios', module: 'gestion-espacios' },
        { icon: 'event', label: 'Reservas del Local', module: 'reservas' },
      ]},
      { section: 'Operaciones', items: [
        { icon: 'visibility', label: 'Visión IA / ANPR', module: 'vision-artificial' },
        { icon: 'monitor_heart', label: 'Monitoreo en Vivo', module: 'monitoreo-tiempo-real' },
        { icon: 'directions_car', label: 'Registro Vehículos', module: 'registro-vehiculos' },
        { icon: 'group', label: 'Mi Personal', module: 'mi-personal' },
        { icon: 'receipt_long', label: 'Cobro Automático', module: 'cobro-automatico' },
      ]},
      { section: 'Análisis', items: [
        { icon: 'bar_chart', label: 'Reportes', module: 'reportes-estadisticas' },
        { icon: 'history', label: 'Historial', module: 'historial' },
        { icon: 'reviews', label: 'Reseñas', module: 'resenas-calificaciones' },
      ]},
      { section: 'Configuración', items: [
        { icon: 'settings', label: 'Configuración', module: 'configuracion' },
        { icon: 'store', label: 'Mi Local', module: 'mi-local' },
        { icon: 'security', label: 'Seguridad', module: 'auth' },
      ]}
    ],
    platform: [
      { section: 'Principal', items: [
        { icon: 'dashboard', label: 'Dashboard', module: 'dashboard' },
        { icon: 'apartment', label: 'Gestión de Locales', module: 'estacionamientos-afiliados' },
      ]},
      { section: 'Análisis', items: [
        { icon: 'analytics', label: 'Reportes Consolidados', module: 'reportes-estadisticas' },
        { icon: 'history', label: 'Historial', module: 'historial' },
      ]},
      { section: 'Administración', items: [
        { icon: 'rate_review', label: 'Moderación Reseñas', module: 'resenas-calificaciones' },
        { icon: 'admin_panel_settings', label: 'Seguridad y Roles', module: 'auth' },
        { icon: 'gavel', label: 'Términos y Políticas', module: 'terminos-condiciones' },
        { icon: 'notifications', label: 'Notificaciones', module: 'notificaciones' },
      ]}
    ]
  };

  /* ── PROFILE LABELS ────────────────────────────────────── */
  function getProfileLabel(role) {
    return { user: 'Usuario Final', local: 'Administrador de Local', platform: 'Administrador de Plataforma' }[role] || role;
  }

  /* ── SELECT PROFILE ────────────────────────────────────── */
  function selectProfile(role, userId = null) {
    window.currentRole = role;
    currentModule = null;

    // Set current user based on role or specific user ID
    if (userId) {
      window.mockData.currentUser = window.mockData.users.find(u => u.id === userId);
    } else {
      const userMap = { user: 1, local: 2, platform: 3 };
      window.mockData.currentUser = window.mockData.users.find(u => u.id === userMap[role]);
    }

    // Hide profile selection and auth flow, show app
    const profileSel = document.getElementById('profile-selection');
    if(profileSel) profileSel.style.display = 'none';
    const authFlow = document.getElementById('auth-flow');
    if(authFlow) authFlow.style.display = 'none';
    
    const app = document.getElementById('app-layout');
    app.classList.add('active');

    // Update UI
    document.getElementById('topbar-user-name').textContent = window.mockData.currentUser.name;
    document.getElementById('topbar-user-role').textContent = getProfileLabel(role);
    document.getElementById('topbar-avatar').textContent = window.mockData.currentUser.avatar;
    document.getElementById('sidebar-user-name').textContent = window.mockData.currentUser.name;
    document.getElementById('sidebar-user-role').textContent = getProfileLabel(role);
    document.getElementById('sidebar-avatar').textContent = window.mockData.currentUser.avatar;
    document.getElementById('profile-switcher').value = role;

    // Update notification count
    updateNotifCount();

    // Build sidebar
    buildSidebar(role);

    // Navigate to dashboard
    loadModule('dashboard');

    SP_Components.showToast('success', 'Bienvenido', `Has ingresado como ${getProfileLabel(role)}`);
  }

  /* ── SWITCH PROFILE ────────────────────────────────────── */
  function switchProfile(role) {
    window.currentRole = role;
    const userMap = { user: 1, local: 2, platform: 3 };
    window.mockData.currentUser = window.mockData.users.find(u => u.id === userMap[role]);

    document.getElementById('topbar-user-name').textContent = window.mockData.currentUser.name;
    document.getElementById('topbar-user-role').textContent = getProfileLabel(role);
    document.getElementById('topbar-avatar').textContent = window.mockData.currentUser.avatar;
    document.getElementById('sidebar-user-name').textContent = window.mockData.currentUser.name;
    document.getElementById('sidebar-user-role').textContent = getProfileLabel(role);
    document.getElementById('sidebar-avatar').textContent = window.mockData.currentUser.avatar;

    updateNotifCount();
    buildSidebar(role);
    loadModule('dashboard');

    SP_Components.showToast('info', 'Perfil cambiado', `Ahora estás como ${getProfileLabel(role)}`);
  }

  /* ── BUILD SIDEBAR ─────────────────────────────────────── */
  function buildSidebar(role) {
    const nav = document.getElementById('sidebar-nav');
    const config = NAV_CONFIG[role] || [];
    let html = '';

    config.forEach(section => {
      html += `<div class="sidebar-section-title">${section.section}</div>`;
      section.items.forEach(item => {
        html += `
          <button class="sidebar-link" data-module="${item.module}" onclick="SmartParkApp.loadModule('${item.module}')" aria-label="${item.label}">
            <span class="material-symbols-outlined">${item.icon}</span>
            <span class="sl-label">${item.label}</span>
            ${item.badge ? `<span class="sl-badge">${item.badge}</span>` : ''}
          </button>`;
      });
    });

    nav.innerHTML = html;
  }

  /* ── UPDATE NOTIFICATION COUNT ──────────────────────────── */
  function updateNotifCount() {
    const userId = window.mockData.currentUser?.id;
    if (!userId) return;
    const unread = window.mockData.getUnreadNotifications(userId).length;
    const el = document.getElementById('notif-count');
    if (el) {
      el.textContent = unread;
      el.style.display = unread > 0 ? 'flex' : 'none';
    }
  }

  /* ── ROUTER: deep-links #/module ────────────────────────── */
  function moduleFromHash() {
    const m = (window.location.hash || '').replace(/^#\//, '').trim();
    return m || null;
  }

  function updateHash(moduleName) {
    const expected = '#/' + moduleName;
    if (window.location.hash !== expected) {
      try { history.replaceState(null, '', expected); } catch (e) {}
    }
  }

  function navigateFromHash() {
    const m = moduleFromHash();
    if (!m) return;
    if (m === 'dashboard') { loadModule('dashboard'); return; }
    if (m === 'auth') { loadModule('auth'); return; }
    loadModule(m);
  }

  /* ── LOAD MODULE ────────────────────────────────────────── */
  async function loadModule(moduleName) {
    // Dashboard is a special case — render inline
    if (moduleName === 'dashboard') {
      renderDashboard();
      updateSidebarActive('dashboard');
      currentModule = 'dashboard';
      updateHash('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      closeMobileSidebar();
      return;
    }

    const container = document.getElementById('module-container');
    
    try {
      // Load HTML
      const response = await fetch(`modules/${moduleName}/${moduleName}.html?v=${new Date().getTime()}`);
      if (!response.ok) throw new Error(`Module ${moduleName} not found`);
      const html = await response.text();
      
      // Inject HTML with fade animation
      container.style.opacity = '0';
      container.style.transform = 'translateY(12px)';
      
      setTimeout(() => {
        container.innerHTML = html;
        container.style.transition = 'all .3s ease-out';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
        
        applyLazyLoading(container);

        setTimeout(() => {
          container.style.transform = '';
        }, 350);
      }, 150);

      // Load CSS
      loadModuleCSS(moduleName);

      // Load JS
      await loadModuleJS(moduleName);

      // Update state
      currentModule = moduleName;
      updateHash(moduleName);
      updateSidebarActive(moduleName);
      closeMobileSidebar();
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      console.error(`[Smart-Park] Error loading module ${moduleName}:`, error);
      
      let errorMsg = `<p>El módulo "${moduleName}" no se pudo cargar. Verifica que los archivos existen.</p>`;
      if (window.location.protocol === 'file:') {
        errorMsg = `
          <div style="background:var(--color-warning-bg);padding:16px;border-radius:var(--radius);text-align:left;margin-top:16px;border:1px solid var(--color-warning)">
            <h4 style="color:var(--color-warning);margin-bottom:8px;display:flex;align-items:center;gap:8px"><span class="material-symbols-outlined">warning</span> Bloqueo de Seguridad del Navegador (CORS)</h4>
            <p style="font-size:0.9rem;color:var(--color-text-secondary);margin-bottom:12px">Estás abriendo el archivo directamente (<strong>file://</strong>). Por seguridad, los navegadores modernos (Chrome, Edge) bloquean la carga de archivos modulares (.html) locales.</p>
            <p style="font-size:0.9rem;color:var(--color-text-secondary);font-weight:600">Para solucionarlo, debes usar un servidor local:</p>
            <ul style="font-size:0.85rem;color:var(--color-text-secondary);margin:8px 0 16px 24px;list-style:disc">
              <li>Si usas <strong>VSCode</strong>: Instala la extensión <em>Live Server</em> y dale clic a "Go Live".</li>
              <li>Si tienes <strong>Node.js</strong>: Abre la terminal en la carpeta <em>smart-park</em> y ejecuta: <code style="background:#fff;padding:2px 6px;border-radius:4px;color:var(--c4)">npx serve .</code></li>
              <li>Si tienes <strong>Python</strong>: Abre la terminal en la carpeta <em>smart-park</em> y ejecuta: <code style="background:#fff;padding:2px 6px;border-radius:4px;color:var(--c4)">python -m http.server</code></li>
            </ul>
          </div>
        `;
      }

      container.innerHTML = `
        <div class="empty-state" style="max-width:600px;margin:0 auto">
          <span class="material-symbols-outlined" style="font-size:3rem;color:var(--color-danger)">error_outline</span>
          <h3 style="margin-top:16px">Módulo no disponible</h3>
          ${errorMsg}
          <button class="btn btn-primary mt-md" onclick="SmartParkApp.loadModule('dashboard')">
            <span class="material-symbols-outlined">home</span> Volver al Dashboard
          </button>
        </div>`;
    }
  }

  /* ── LAZY-LOAD IMAGES ───────────────────────────────────── */
  function applyLazyLoading(root) {
    if (!root) return;
    // Skip internal inline-SVG/data URLs; lazily load real remote/local <img>
    root.querySelectorAll('img').forEach(img => {
      if (img.loading === 'lazy' || img.loading === 'eager') return;
      if (/^data:|^blob:/.test(img.getAttribute('src') || '')) return;
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
    });
  }

  /* ── LOAD MODULE CSS ────────────────────────────────────── */
  // Módulos que usan las clases globales de base.css/components.css
  // y por tanto no tienen stylesheet propio.
  const MODULES_NO_CSS = new Set([
    'pagos-electronicos', 'historial', 'resenas-calificaciones', 'notificaciones',
    'terminos-condiciones', 'monitoreo-tiempo-real', 'registro-vehiculos',
    'cobro-automatico', 'configuracion', 'estacionamientos-afiliados',
    'reconocimiento-placas'
  ]);

  function loadModuleCSS(moduleName) {
    const cssId = `css-${moduleName}`;
    if (loadedCSS.has(cssId)) return;
    if (MODULES_NO_CSS.has(moduleName)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `modules/${moduleName}/${moduleName}.css?v=${ASSET_VERSION}`;
    link.id = cssId;
    document.head.appendChild(link);
    loadedCSS.add(cssId);
  }

  /* ── LOAD MODULE JS ─────────────────────────────────────── */
  function loadModuleJS(moduleName) {
    return new Promise((resolve) => {
      const jsId = `js-${moduleName}`;
      if (loadedJS.has(jsId)) {
        // Already loaded, just call init
        callModuleInit(moduleName);
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `modules/${moduleName}/${moduleName}.js?v=${ASSET_VERSION}`;
      script.id = jsId;
      script.onload = () => {
        loadedJS.add(jsId);
        callModuleInit(moduleName);
        resolve();
      };
      script.onerror = () => {
        console.warn(`[Smart-Park] JS for ${moduleName} not found, continuing...`);
        resolve();
      };
      document.body.appendChild(script);
    });
  }

  /* ── CALL MODULE INIT ───────────────────────────────────── */
  function callModuleInit(moduleName) {
    // Convert module-name to initModuleName
    const initName = 'init' + moduleName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    if (typeof window[initName] === 'function') {
      setTimeout(() => window[initName](), 200);
    }
  }

  /* ── RENDER DASHBOARD (inline, no separate file needed) ── */
  function renderDashboard() {
    const container = document.getElementById('module-container');
    const role = window.currentRole;
    const { formatCurrency, renderBadge, renderStars, timeAgo } = SP_Components;

    if (role === 'user') {
      renderUserDashboard(container);
    } else if (role === 'local') {
      renderLocalDashboard(container);
    } else {
      renderPlatformDashboard(container);
    }
  }

  function renderUserDashboard(container) {
    const d = window.mockData;
    const user = d.currentUser;
    const myReservations = d.reservations.filter(r => r.userId === user.id);
    const activeRes = myReservations.filter(r => ['active','occupied'].includes(r.status));
    const myVehicles = d.vehicles.filter(v => v.userId === user.id);
    const myTransactions = d.transactions.filter(t => t.userId === user.id);
    const totalSpent = myTransactions.filter(t => t.status === 'completed').reduce((s,t) => s + t.amount, 0);
    const myReviews = d.reviews.filter(r => r.userId === user.id);
    const nextArrival = activeRes[0] ? Date.parse(activeRes[0].arrival) : null;

    container.innerHTML = `
      <div class="dash-hero">
        <div class="dash-hero-main">
          <h1>Hola, ${SP_Components.escapeHtml(user.name)} 👋</h1>
          <p>¿A dónde vamos hoy? Encuentra el estacionamiento seguro e ideal para tu vehículo en segundos.</p>
          <div class="quick-actions">
            <button class="btn btn-primary" onclick="SmartParkApp.loadModule('busqueda-geolocalizacion')">
              <span class="material-symbols-outlined">search</span> Buscar Estacionamiento
            </button>
            <button class="btn btn-secondary" onclick="SmartParkApp.loadModule('reservas')">
              <span class="material-symbols-outlined">event</span> Mis Reservas
            </button>
            <button class="btn btn-secondary" onclick="SmartParkApp.loadModule('registro-vehiculos')">
              <span class="material-symbols-outlined">directions_car</span> Mis Vehículos
            </button>
          </div>
        </div>
      </div>
      ${activeRes.length ? `
        <div class="res-active-banner">
          <div class="rab-left">
            <span class="material-symbols-outlined rab-icon">local_parking</span>
            <div>
              <div class="rab-title">Reserva activa en ${SP_Components.escapeHtml(d.getLocalName(activeRes[0].localId))}</div>
              <div class="rab-sub">Espacio ${activeRes[0].spaceId} · Placa ${SP_Components.escapeHtml(activeRes[0].plate)} · Código ${activeRes[0].code}</div>
            </div>
          </div>
          <div class="rab-timer">
            <div id="rsv-dash-timer" class="rab-time" data-arrival="${nextArrival}">--:--</div>
            <div class="text-xs">${activeRes[0].status === 'occupied' ? 'en uso' : 'para llegar'}</div>
          </div>
          <button class="btn btn-sm btn-primary" onclick="SmartParkApp.loadModule('reservas')">Ver reserva</button>
        </div>` : `
        <div class="dash-cta">
          <span class="material-symbols-outlined">local_parking</span>
          <div>
            <div class="fw-600">No tienes reservas activas</div>
            <div class="text-xs text-muted">Reserva tu espacio y llégalo reservado.</div>
          </div>
          <button class="btn btn-sm btn-primary" onclick="SmartParkApp.loadModule('busqueda-geolocalizacion')">Buscar ahora</button>
        </div>`}
      <div class="stats-grid">
        <div class="stat-card">
          <div class="sc-top">
            <div class="sc-icon" style="background:rgba(var(--c3-rgb),.1);color:var(--c3)"><span class="material-symbols-outlined">bookmark</span></div>
            <span class="sc-trend up">Activas</span>
          </div>
          <div class="sc-value">${activeRes.length}</div>
          <div class="sc-label">Reservas Activas</div>
        </div>
        <div class="stat-card">
          <div class="sc-top">
            <div class="sc-icon" style="background:rgba(var(--c5-rgb),.1);color:var(--c5)"><span class="material-symbols-outlined">directions_car</span></div>
          </div>
          <div class="sc-value">${myVehicles.length}</div>
          <div class="sc-label">Vehículos Registrados</div>
        </div>
        <div class="stat-card">
          <div class="sc-top">
            <div class="sc-icon" style="background:var(--color-success-bg);color:var(--color-success)"><span class="material-symbols-outlined">payments</span></div>
          </div>
          <div class="sc-value">${SP_Components.formatCurrency(totalSpent)}</div>
          <div class="sc-label">Gastado este mes</div>
        </div>
        <div class="stat-card">
          <div class="sc-top">
            <div class="sc-icon" style="background:var(--color-info-bg);color:var(--color-info)"><span class="material-symbols-outlined">star</span></div>
          </div>
          <div class="sc-value">${myReviews.length}</div>
          <div class="sc-label">Reseñas Enviadas</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>Reservas Recientes</h3><button class="btn btn-ghost btn-sm" onclick="SmartParkApp.loadModule('reservas')">Ver todas</button></div>
          <div class="card-body">
            ${myReservations.length ? myReservations.slice(0,4).map(r => `
              <div class="list-row">
                <div class="list-main">
                  <div class="list-title">${r.code} — ${SP_Components.escapeHtml(d.getLocalName(r.localId))}</div>
                  <div class="list-sub">${r.spaceId} · ${r.plate}</div>
                </div>
                ${SP_Components.renderBadge(r.status)}
              </div>
            `).join('') : '<p class="text-sm text-muted">Aún no tienes reservas. Encuentra un estacionamiento y reserva tu espacio.</p>'}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Estacionamientos Cercanos</h3><button class="btn btn-ghost btn-sm" onclick="SmartParkApp.loadModule('busqueda-geolocalizacion')">Ver mapa</button></div>
          <div class="card-body">
            ${d.locales.filter(l => l.status === 'Activo').slice(0,3).map(l => {
              const counts = d.countSpaces(l.id);
              return `
              <div class="list-row" style="cursor:pointer" onclick="SmartParkApp.loadModule('busqueda-geolocalizacion')">
                <div class="list-main">
                  <div class="list-title">${SP_Components.escapeHtml(l.name)}</div>
                  <div class="list-sub">${l.distance} km · <span style="color:var(--color-success);font-weight:600">${counts.available} disponibles</span> de ${counts.total}</div>
                </div>
                <div class="list-meta">
                  <div class="text-sm">${SP_Components.renderStars(Math.round(l.rating))}</div>
                  <div class="text-xs text-muted">${l.rating}</div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;

    if (nextArrival) startDashTimer(nextArrival);
  }

  function startDashTimer(arrivalMs) {
    const el = document.getElementById('rsv-dash-timer');
    if (!el) return;
    if (window._dashTimer) clearInterval(window._dashTimer);
    window._dashTimer = setInterval(() => {
      const diff = arrivalMs - Date.now();
      if (!document.getElementById('rsv-dash-timer')) { clearInterval(window._dashTimer); return; }
      if (diff <= 0) {
        el.textContent = 'EN CURSO';
        el.style.color = 'var(--color-success)';
        clearInterval(window._dashTimer);
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
      if (diff < 5 * 60000) el.style.color = 'var(--color-danger)';
    }, 1000);
  }

  function renderLocalDashboard(container) {
    const d = window.mockData;
    const localId = d.currentUser.localId || 1;
    const local = d.locales.find(l => l.id === localId);
    const counts = d.countSpaces(localId);
    const localRes = d.reservations.filter(r => r.localId === localId);
    const activeRes = localRes.filter(r => ['active','occupied'].includes(r.status));
    const todayTxn = d.transactions.filter(t => t.localId === localId && t.status === 'completed');
    const todayRevenue = todayTxn.reduce((s,t) => s + t.amount, 0);
    const occupancy = counts.total > 0 ? Math.round(((counts.occupied + counts.reserved) / counts.total) * 100) : 0;

    container.innerHTML = `
      <div class="page-header">
        <h1><span class="material-symbols-outlined">dashboard</span> Dashboard — ${local?.name || 'Mi Local'}</h1>
        <span class="badge badge-success">En línea</span>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="sc-top">
            <div class="sc-icon" style="background:rgba(var(--c3-rgb),.1);color:var(--c3)"><span class="material-symbols-outlined">donut_large</span></div>
            <span class="sc-trend ${occupancy > 80 ? 'up' : ''}">${occupancy > 80 ? '↑ Alta' : 'Normal'}</span>
          </div>
          <div class="sc-value">${occupancy}%</div>
          <div class="sc-label">Ocupación Actual</div>
        </div>
        <div class="stat-card">
          <div class="sc-top">
            <div class="sc-icon" style="background:rgba(var(--c2-rgb),.1);color:var(--c3)"><span class="material-symbols-outlined">event</span></div>
          </div>
          <div class="sc-value">${activeRes.length}</div>
          <div class="sc-label">Reservas Hoy</div>
        </div>
        <div class="stat-card">
          <div class="sc-top">
            <div class="sc-icon" style="background:rgba(var(--c5-rgb),.1);color:var(--c5)"><span class="material-symbols-outlined">attach_money</span></div>
          </div>
          <div class="sc-value">${SP_Components.formatCurrency(todayRevenue)}</div>
          <div class="sc-label">Ingresos Hoy</div>
        </div>
        <div class="stat-card">
          <div class="sc-top">
            <div class="sc-icon" style="background:var(--color-info-bg);color:var(--color-info)"><span class="material-symbols-outlined">local_parking</span></div>
          </div>
          <div class="sc-value">${counts.available}/${counts.total}</div>
          <div class="sc-label">Espacios Disponibles</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>Estado de Espacios</h3></div>
          <div class="card-body">
            <div id="dashboard-space-grid">
              ${SP_Components.renderInteractiveMap(d.spaces.filter(s => s.localId === localId), localId, {
                onClickAttr: 'onclick=""' // No click action in dashboard
              })}
            </div>
            <div class="space-legend">
              <span class="legend-item"><span class="legend-dot available"></span> Disponible</span>
              <span class="legend-item"><span class="legend-dot occupied"></span> Ocupado</span>
              <span class="legend-item"><span class="legend-dot reserved"></span> Reservado</span>
              <span class="legend-item"><span class="legend-dot blocked"></span> Bloqueado</span>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Últimas Reservas</h3></div>
          <div class="card-body">
            ${localRes.slice(0,5).map(r => {
              const user = d.users.find(u => u.id === r.userId);
              return `
              <div class="list-row">
                <div class="list-main">
                  <div class="list-title">${r.code}</div>
                  <div class="list-sub">${SP_Components.escapeHtml(user?.name || 'Usuario')} · ${r.plate} · ${r.spaceId}</div>
                </div>
                ${SP_Components.renderBadge(r.status)}
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
  }

  function renderPlatformDashboard(container) {
    const d = window.mockData;
    const totalLocales = d.locales.length;
    const activeLocales = d.locales.filter(l => l.status === 'Activo').length;
    const totalSpaces = d.spaces.length;
    const totalRes = d.reservations.length;
    const completedRes = d.reservations.filter(r => r.status === 'completed').length;
    const totalRevenue = d.transactions.filter(t => t.status === 'completed').reduce((s,t) => s + t.amount, 0);

    container.innerHTML = `
      <div class="page-header">
        <h1><span class="material-symbols-outlined">dashboard</span> Dashboard de Plataforma</h1>
        <span class="badge badge-info">Admin Global</span>
      </div>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="sc-top">
            <div class="sc-icon" style="background:rgba(var(--c3-rgb),.1);color:var(--c3)"><span class="material-symbols-outlined">apartment</span></div>
          </div>
          <div class="sc-value">${totalLocales}</div>
          <div class="sc-label">Locales Registrados</div>
        </div>
        <div class="stat-card">
          <div class="sc-top">
            <div class="sc-icon" style="background:rgba(var(--c2-rgb),.1);color:var(--c3)"><span class="material-symbols-outlined">local_parking</span></div>
          </div>
          <div class="sc-value">${totalSpaces}</div>
          <div class="sc-label">Total Espacios</div>
        </div>
        <div class="stat-card">
          <div class="sc-top">
            <div class="sc-icon" style="background:rgba(var(--c5-rgb),.1);color:var(--c5)"><span class="material-symbols-outlined">event_available</span></div>
            <span class="sc-trend up">${Math.round((completedRes/totalRes)*100)}%</span>
          </div>
          <div class="sc-value">${totalRes}</div>
          <div class="sc-label">Reservas Totales</div>
        </div>
        <div class="stat-card">
          <div class="sc-top">
            <div class="sc-icon" style="background:var(--color-success-bg);color:var(--color-success)"><span class="material-symbols-outlined">monetization_on</span></div>
          </div>
          <div class="sc-value">${SP_Components.formatCurrency(totalRevenue)}</div>
          <div class="sc-label">Ingresos Consolidados</div>
        </div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3>Locales por Estado</h3></div>
          <div class="card-body">
            ${d.locales.map(l => `
              <div class="list-row">
                <div class="list-main">
                  <div class="list-title">${SP_Components.escapeHtml(l.name)}</div>
                  <div class="list-sub">${SP_Components.escapeHtml(l.address)}</div>
                </div>
                ${SP_Components.renderBadge(l.status)}
              </div>
            `).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3>Actividad Reciente</h3></div>
          <div class="card-body">
            ${d.notifications.slice(0,5).map(n => `
              <div class="list-row" style="justify-content:flex-start;gap:8px">
                <span class="material-symbols-outlined text-sm" style="color:var(--c3);margin-top:2px">circle_notifications</span>
                <div class="list-main">
                  <div class="list-title">${SP_Components.escapeHtml(n.title)}</div>
                  <div class="list-sub">${SP_Components.timeAgo(n.date)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>`;
  }

  /* ── UPDATE SIDEBAR ACTIVE ──────────────────────────────── */
  function updateSidebarActive(moduleName) {
    document.querySelectorAll('.sidebar-link').forEach(l => {
      l.classList.toggle('active', l.dataset.module === moduleName);
    });
  }

  /* ── TOGGLE SIDEBAR ────────────────────────────── */
  function toggleSidebar() {
    if (window.innerWidth >= 1024) {
      document.getElementById('sidebar').classList.toggle('collapsed');
      document.querySelector('.main-content').classList.toggle('expanded');
    } else {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('sidebar-backdrop').classList.toggle('active');
    }
  }

  function closeMobileSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-backdrop')?.classList.remove('active');
  }

  /* ── GO HOME ────────────────────────────────────────────── */
  function goHome() {
    loadModule('dashboard');
  }

  /* ── LOGOUT ─────────────────────────────────────────────── */
  function logout() {
    window.currentRole = null;
    window.mockData.currentUser = null;
    currentModule = null;
    document.getElementById('app-layout').classList.remove('active');
    document.getElementById('auth-flow').style.display = 'flex';
    switchAuthScreen('auth-login');
    document.getElementById('module-container').innerHTML = '';
    try { history.replaceState(null, '', '#/'); } catch (e) {}
    SP_Components.showToast('info', 'Sesión cerrada', 'Has cerrado sesión exitosamente.');
  }

  /* ── INIT ───────────────────────────────────────────────── */
  function init() {
    // Profile switcher
    document.getElementById('profile-switcher')?.addEventListener('change', (e) => {
      switchProfile(e.target.value);
    });

    // Close modals on backdrop click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
      }
    });

    // Keyboard: Escape closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') SP_Components.closeAllModals();
    });

    // Router: deep-links #/module (back/forward + manual URL)
    window.addEventListener('hashchange', () => {
      const appActive = document.getElementById('app-layout').classList.contains('active');
      if (appActive) navigateFromHash();
    });

    // Initial hash (e.g. reloading on #/reservas while logged in)
    if (moduleFromHash() && document.getElementById('app-layout').classList.contains('active')) {
      navigateFromHash();
    }

    console.log('[Smart-Park] App initialized');
  }

  document.addEventListener('DOMContentLoaded', init);

  /* ── PUBLIC API ─────────────────────────────────────────── */
  return {
    selectProfile, switchProfile, loadModule,
    toggleSidebar, closeMobileSidebar,
    goHome, logout, getProfileLabel, updateNotifCount
  };
})();

/* ── AUTH FLOW LOGIC ────────────────────────────────────── */
function switchAuthScreen(screenId) {
  document.querySelectorAll('.auth-screen').forEach(el => el.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

function handleAuthLogin(e) {
  e.preventDefault();
  const emailInput = document.getElementById('login-email').value.trim();
  const user = window.mockData.users.find(u => u.email === emailInput || u.name === emailInput);
  
  if (user) {
    SmartParkApp.selectProfile(user.role, user.id);
  } else {
    // Si no existe, simulamos un login genérico
    SmartParkApp.selectProfile('user');
    setTimeout(() => {
      if(window.SP_Components) window.SP_Components.showToast('info', 'Aviso', 'Usuario no encontrado. Se inició sesión como invitado genérico.');
    }, 500);
  }
}

let tempRegData = {};

function handleAuthRegister(e) {
  e.preventDefault();
  tempRegData = {
    name: document.getElementById('reg-name').value + ' ' + document.getElementById('reg-surname').value,
    phone: document.getElementById('reg-phone').value,
    email: document.getElementById('reg-email').value,
    dni: document.getElementById('reg-dni').value
  };
  document.getElementById('sms-phone-display').textContent = tempRegData.phone;
  switchAuthScreen('auth-sms');
}

function handleAuthSms(e) {
  e.preventDefault();
  const code = document.getElementById('sms-code').value;
  if(code.length === 6) {
    // Create new user
    const newId = Math.max(...window.mockData.users.map(u => u.id)) + 1;
    window.mockData.users.push({
      id: newId,
      name: tempRegData.name,
      email: tempRegData.email,
      role: 'user',
      avatar: tempRegData.name.substring(0, 2).toUpperCase(),
      phone: tempRegData.phone,
      registered: new Date().toISOString().split('T')[0]
    });
    // Set current user
    window.mockData.currentUser = window.mockData.users.find(u => u.id === newId);
    window.currentRole = 'user';
    
    // Hide auth, show app
    document.getElementById('auth-flow').style.display = 'none';
    const app = document.getElementById('app-layout');
    app.classList.add('active');

    // Manually trigger the profile setup
    document.getElementById('topbar-user-name').textContent = window.mockData.currentUser.name;
    document.getElementById('topbar-user-role').textContent = SmartParkApp.getProfileLabel('user');
    document.getElementById('topbar-avatar').textContent = window.mockData.currentUser.avatar;
    document.getElementById('sidebar-user-name').textContent = window.mockData.currentUser.name;
    document.getElementById('sidebar-user-role').textContent = SmartParkApp.getProfileLabel('user');
    document.getElementById('sidebar-avatar').textContent = window.mockData.currentUser.avatar;
    document.getElementById('profile-switcher').value = 'user';

    SmartParkApp.updateNotifCount();
    
    // Hack to call buildSidebar (not exposed publicly) -> switchProfile does it, so let's just call switchProfile
    SmartParkApp.switchProfile('user');
    SP_Components.showToast('success', 'Registro completado', 'Bienvenido a Smart-Park');
  }
}

function handleAuthAdminLookup(e) {
  e.preventDefault();
  const emailInput = document.getElementById('lookup-email').value.trim();
  const user = window.mockData.users.find(u => u.email === emailInput && u.role === 'local');

  if (user) {
    SmartParkApp.selectProfile(user.role, user.id);
    SP_Components.showToast('success', 'Credenciales Válidas', 'Accediendo al panel de administración de su local.');
  } else {
    // Simulate admin login
    SmartParkApp.selectProfile('local');
    SP_Components.showToast('success', 'Credenciales Válidas', 'Accediendo al panel de administración de su local (Simulación).');
  }
}
