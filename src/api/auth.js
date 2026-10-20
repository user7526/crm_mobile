import { API_BASE_URL } from '../config';

// Same session-borrowing pattern as tdw_email/src/api/auth.js (Phase 1 item
// 9 step 3, 2026-09-19) -- this app has no identity of its own either. It
// rides AIW's own httpOnly aiw_access_token/aiw_refresh_token cookies (see
// ai_backend/app/auth/cookies.py). Same host, different port (3000/3002 dev,
// 8000/8003 prod) counts as "same-site" to the browser, so the backend's
// SameSite=Lax cookies are sent automatically on these cross-origin-but-
// same-site requests -- no token needs to live in this app's JS/localStorage.

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)aiw_csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Where to send someone who isn't logged in -- AIW's own login page. Dev
// runs on 3002 next to AIW's 3000; prod runs on 8003 next to AIW's 8000
// (see project_memory/_shared/port_configuration.md). Login.js must allow
// 3002/8003 as known sibling ports for the returnTo bounce-back to work.
export function getAiwLoginUrl() {
  const aiwPort = window.location.port === '8003' ? '8000' : '3000';
  const loginUrl = `${window.location.protocol}//${window.location.hostname}:${aiwPort}/login`;
  return `${loginUrl}?returnTo=${encodeURIComponent(window.location.href)}`;
}

function redirectToLogin() {
  window.location.href = getAiwLoginUrl();
}

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function rawFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData) && options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (MUTATING_METHODS.has(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }
  return fetch(url, { ...options, headers, credentials: 'include' });
}

// One silent refresh attempt via the httpOnly refresh cookie.
export async function tryRefresh() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function authFetch(url, options = {}) {
  let res = await rawFetch(url, options);
  if (res.status === 401) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      res = await rawFetch(url, options);
    }
  }
  if (res.status === 401) {
    redirectToLogin();
    throw new Error('Session expired');
  }
  return res;
}

export async function fetchMe() {
  const res = await authFetch(`${API_BASE_URL}/api/auth/me`);
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json();
}

export async function logout() {
  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  } catch {
    // Ignore -- redirect happens regardless.
  }
  // This ends the *shared* AIW session (desktop/mobile/email too), not just
  // a crm_mobile-local one.
  redirectToLogin();
}
