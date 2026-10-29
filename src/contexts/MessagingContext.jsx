import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../App';
import useUserSocket from '../hooks/useUserSocket';
import messagingApi from '../api/messagingApi';

// Mobile counterpart to ai_ui_react/src/contexts/MessagingContext.js, trimmed
// to what the mobile UI needs (no overlay geometry/mode, no rename/hide --
// those stay desktop-only for now). Still shares the exact same backend
// conversations/messages so a thread started on either side shows up on both
// (AI-A task #393, 2026-10-24).
const MessagingContext = createContext(null);

export function MessagingProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id || null;
  const isAuthenticated = !!userId;

  const [conversations, setConversations] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [onlineUserIds, setOnlineUserIds] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  const activeConversationIdRef = useRef(null);
  const messageListenersRef = useRef({}); // conversationId -> Set<fn(message)>

  const refreshConversations = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingConversations(true);
    try {
      const data = await messagingApi.listConversations(false);
      setConversations(data.conversations || []);
      setTotalUnread(data.total_unread || 0);
    } catch {
      /* keep whatever was last loaded */
    } finally {
      setLoadingConversations(false);
    }
  }, [isAuthenticated]);

  const refreshPresence = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setOnlineUserIds(await messagingApi.getPresence());
    } catch { /* WS deltas still apply */ }
  }, [isAuthenticated]);

  // Lets ChatThread subscribe to live messages for the conversation it has
  // open without this context needing to know about "active" screen state.
  const subscribeToMessages = useCallback((conversationId, fn) => {
    const set = messageListenersRef.current[conversationId] || new Set();
    set.add(fn);
    messageListenersRef.current[conversationId] = set;
    return () => set.delete(fn);
  }, []);

  const setActiveConversationId = useCallback((id) => { activeConversationIdRef.current = id; }, []);

  const handleEvent = useCallback((evt) => {
    if (!evt || !evt.type) return;
    if (evt.type === 'chat_message') {
      const { conversation_id, message } = evt.data || {};
      if (conversation_id && message) {
        const listeners = messageListenersRef.current[conversation_id];
        if (listeners) listeners.forEach((fn) => fn(message));
        if (conversation_id === activeConversationIdRef.current) {
          messagingApi.markRead(conversation_id, message.message_id).catch(() => {});
        }
      }
      refreshConversations();
    } else if (evt.type === 'chat_conversation') {
      refreshConversations();
    } else if (evt.type === 'presence_snapshot') {
      setOnlineUserIds((evt.data && evt.data.online_user_ids) || []);
    } else if (evt.type === 'presence') {
      const { user_id, online } = evt.data || {};
      if (user_id != null) {
        setOnlineUserIds((prev) => {
          const set = new Set(prev);
          if (online) set.add(user_id); else set.delete(user_id);
          return Array.from(set);
        });
      }
    }
  }, [refreshConversations]);

  const { connected } = useUserSocket(isAuthenticated, handleEvent);

  useEffect(() => {
    if (!isAuthenticated) {
      setConversations([]);
      setTotalUnread(0);
      setOnlineUserIds([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try { await messagingApi.getSelfConversation(); } catch { /* soft-fail */ }
      if (cancelled) return;
      refreshConversations();
      refreshPresence();
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, refreshConversations, refreshPresence]);

  useEffect(() => { if (connected) refreshPresence(); }, [connected, refreshPresence]);

  const value = useMemo(() => ({
    conversations,
    totalUnread,
    onlineUserIds,
    loadingConversations,
    connected,
    currentUserId: userId,
    refreshConversations,
    subscribeToMessages,
    setActiveConversationId,
  }), [
    conversations, totalUnread, onlineUserIds, loadingConversations, connected, userId,
    refreshConversations, subscribeToMessages, setActiveConversationId,
  ]);

  return <MessagingContext.Provider value={value}>{children}</MessagingContext.Provider>;
}

export function useMessaging() {
  const ctx = useContext(MessagingContext);
  if (!ctx) throw new Error('useMessaging must be used within a MessagingProvider');
  return ctx;
}
