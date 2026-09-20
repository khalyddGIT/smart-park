/** Rutas persistentes por rol para producción (refresh / deep-link / SPA fallback). */

export const ROLE_PREFIX = {
  user: 'app',
  local: 'local',
  platform: 'platform',
};

export const PREFIX_TO_ROLE = {
  app: 'user',
  local: 'local',
  platform: 'platform',
};

/** Aliases históricos → tab canónico */
export const TAB_ALIASES = {
  editor: 'dashboard',
  garita: 'anpr',
};

export const VALID_TABS_BY_ROLE = {
  user: ['dashboard', 'reservations', 'profile', 'vehicles', 'payments', 'incidents', 'history', 'reviews'],
  local: [
    'dashboard',
    'editor',
    'reservations',
    'profile',
    'anpr',
    'garita',
    'cameras',
    'incidents',
    'staff',
    'reports',
    'audit',
    'reviews',
    'resiliency',
  ],
  platform: [
    'dashboard',
    'profile',
    'finances',
    'settings',
    'affiliates',
    'analytics',
    'incidents',
    'audit',
    'users',
    'resiliency',
  ],
};

export function canonicalizeTab(tab) {
  if (!tab) return 'dashboard';
  return TAB_ALIASES[tab] || tab;
}

export function isValidTabForRole(role, tab) {
  const list = VALID_TABS_BY_ROLE[role];
  if (!list) return false;
  const raw = tab || 'dashboard';
  return list.includes(raw) || list.includes(canonicalizeTab(raw));
}

export function rolePath(role, tab = 'dashboard', parkingId = null) {
  const prefix = ROLE_PREFIX[role] || 'app';
  const safeTab = canonicalizeTab(isValidTabForRole(role, tab) ? tab : 'dashboard');
  const base = `/${prefix}/${safeTab}`;
  if (parkingId) {
    return `${base}?parking=${encodeURIComponent(String(parkingId))}`;
  }
  return base;
}

/**
 * Lee pathname (+ search) y extrae vista.
 * @returns {{ roleHint: string|null, tab: string, parkingId: string|null, matched: boolean }}
 */
export function parseRoleLocation(pathname = '/', search = '') {
  const clean = (pathname || '/').split('?')[0].replace(/\/+$/, '') || '/';
  const parts = clean.split('/').filter(Boolean);
  const params = new URLSearchParams(search || (typeof window !== 'undefined' ? window.location.search : ''));
  const parkingId = params.get('parking');

  if (parts.length >= 2 && PREFIX_TO_ROLE[parts[0]]) {
    const roleHint = PREFIX_TO_ROLE[parts[0]];
    const tab = canonicalizeTab(parts[1] || 'dashboard');
    return { roleHint, tab, parkingId, matched: true };
  }

  if (parts.length === 1 && PREFIX_TO_ROLE[parts[0]]) {
    return { roleHint: PREFIX_TO_ROLE[parts[0]], tab: 'dashboard', parkingId, matched: true };
  }

  return { roleHint: null, tab: 'dashboard', parkingId, matched: false };
}

export function readInitialTab(role) {
  if (typeof window === 'undefined') return 'dashboard';
  const parsed = parseRoleLocation(window.location.pathname, window.location.search);
  if (!parsed.matched) return 'dashboard';
  // Si la URL es de otro rol, aún restauramos el tab si es válido para el rol actual
  if (isValidTabForRole(role || parsed.roleHint || 'user', parsed.tab)) {
    return canonicalizeTab(parsed.tab);
  }
  return 'dashboard';
}

export function readInitialParkingId() {
  if (typeof window === 'undefined') return null;
  const parsed = parseRoleLocation(window.location.pathname, window.location.search);
  return parsed.parkingId || null;
}

/**
 * Actualiza la URL real (persistencia en producción) sin recargar.
 * @param {'push'|'replace'} mode
 */
export function syncRoleUrl(role, tab, parkingId = null, mode = 'push') {
  if (typeof window === 'undefined' || !role) return;
  const next = rolePath(role, tab, parkingId);
  const current = `${window.location.pathname}${window.location.search}`;
  if (current === next) return;
  const state = { appTab: canonicalizeTab(tab), parkingId: parkingId || null, role };
  try {
    if (mode === 'replace') window.history.replaceState(state, '', next);
    else window.history.pushState(state, '', next);
  } catch {
    /* ignore */
  }
}

export function clearRoleUrl(mode = 'replace') {
  if (typeof window === 'undefined') return;
  const next = '/';
  if (`${window.location.pathname}${window.location.search}` === next) return;
  try {
    if (mode === 'replace') window.history.replaceState({}, '', next);
    else window.history.pushState({}, '', next);
  } catch {
    /* ignore */
  }
}
