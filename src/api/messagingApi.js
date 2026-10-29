import { authFetch } from './auth';
import { API_BASE_URL } from '../config';
import { apiErrorMessage } from './crmApi';

const NO_STORE = { cache: 'no-store' };

async function asJson(res) {
  const data = await res.json();
  if (!res.ok) throw new Error(apiErrorMessage(data));
  return data;
}

// Mirrors ai_ui_react/src/services/messagingApi.js one-for-one -- same
// backend (app/routes/messaging.py), shared cookie session (AI-A task #393,
// 2026-10-24).
const messagingApi = {
  listUsers: async () => {
    const res = await authFetch(`${API_BASE_URL}/api/messaging/users`, NO_STORE);
    return asJson(res);
  },
  getPresence: async () => {
    const data = await asJson(await authFetch(`${API_BASE_URL}/api/messaging/presence`, NO_STORE));
    return data.online_user_ids || [];
  },
  listConversations: async (includeHidden = false) => {
    const qs = includeHidden ? '?include_hidden=true' : '';
    const res = await authFetch(`${API_BASE_URL}/api/messaging/conversations${qs}`, NO_STORE);
    return asJson(res);
  },
  getSelfConversation: async () => {
    const res = await authFetch(`${API_BASE_URL}/api/messaging/self`, NO_STORE);
    return asJson(res);
  },
  createConversation: async ({ type = 'direct', participantIds = [], title = null } = {}) => {
    const res = await authFetch(`${API_BASE_URL}/api/messaging/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, participant_ids: participantIds, title }),
    });
    return asJson(res);
  },
  getMessages: async (conversationId, { beforeId, limit } = {}) => {
    const params = new URLSearchParams();
    if (beforeId != null) params.set('before_id', beforeId);
    if (limit != null) params.set('limit', limit);
    const qs = params.toString();
    const res = await authFetch(
      `${API_BASE_URL}/api/messaging/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`,
      NO_STORE,
    );
    return asJson(res);
  },
  sendMessage: async (conversationId, body, file = null) => {
    const form = new FormData();
    form.append('body', body || '');
    if (file) form.append('file', file);
    const res = await authFetch(`${API_BASE_URL}/api/messaging/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: form,
    });
    return asJson(res);
  },
  getAttachmentBlobUrl: async (conversationId, messageId) => {
    const res = await authFetch(
      `${API_BASE_URL}/api/messaging/conversations/${conversationId}/messages/${messageId}/attachment`,
      NO_STORE,
    );
    if (!res.ok) throw new Error('Failed to load attachment');
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  },
  markRead: async (conversationId, upToMessageId = null) => {
    const res = await authFetch(`${API_BASE_URL}/api/messaging/conversations/${conversationId}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ up_to_message_id: upToMessageId }),
    });
    return asJson(res);
  },
};

export default messagingApi;
