import { authFetch } from './auth';
import { API_BASE_URL } from '../config';

/** CRM GETs must not use cached responses (mirrors ai_ui_react's CRM pages). */
const NO_STORE = { cache: 'no-store' };

export function apiErrorMessage(data) {
  if (!data) return 'Request failed';
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map((d) => (typeof d === 'string' ? d : d.msg || JSON.stringify(d))).join('; ');
  }
  return 'Request failed';
}

async function asJson(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(apiErrorMessage(data));
  return data;
}

export async function listParties(params = {}) {
  const qs = new URLSearchParams(params);
  const res = await authFetch(`${API_BASE_URL}/api/crm/parties?${qs}`, NO_STORE);
  return asJson(res);
}

export async function getParty(partyId) {
  const res = await authFetch(`${API_BASE_URL}/api/crm/parties/${partyId}`, NO_STORE);
  return asJson(res);
}

export async function listContacts(params = {}) {
  const qs = new URLSearchParams(params);
  const res = await authFetch(`${API_BASE_URL}/api/crm/contacts?${qs}`, NO_STORE);
  return asJson(res);
}

export async function listTasks(params = {}) {
  const qs = new URLSearchParams(params);
  const res = await authFetch(`${API_BASE_URL}/api/crm/tasks?${qs}`, NO_STORE);
  return asJson(res);
}

export async function listAssignmentUsers() {
  const res = await authFetch(`${API_BASE_URL}/api/crm/users-for-assignment`, NO_STORE);
  return asJson(res);
}

export async function createActivity(partyId, body) {
  const res = await authFetch(`${API_BASE_URL}/api/crm/parties/${partyId}/activities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return asJson(res);
}

export async function patchActivity(partyId, activityId, body) {
  const res = await authFetch(`${API_BASE_URL}/api/crm/parties/${partyId}/activities/${activityId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return asJson(res);
}

export async function previewChatGptImport(csvText) {
  const res = await authFetch(`${API_BASE_URL}/api/crm/import/chatgpt/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv_text: csvText }),
  });
  return asJson(res);
}

export async function commitChatGptImport(csvText, rowOverrides = []) {
  const res = await authFetch(`${API_BASE_URL}/api/crm/import/chatgpt/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ csv_text: csvText, row_overrides: rowOverrides }),
  });
  return asJson(res);
}
