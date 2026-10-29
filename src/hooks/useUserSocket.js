import { useState, useEffect, useRef, useCallback } from 'react';
import { WS_BASE_URL } from '../config';

// Minimal port of ai_ui_react's useWebSocket hook (authenticated=true branch
// only -- crm_mobile has no page-type rooms to subscribe to, just this one
// personal channel for the messaging module). Backend derives the user from
// the httpOnly access-token cookie on the handshake (app/main.py's
// /ws/user), which carries over automatically since this app rides the same
// AIW session cookie on a sibling port (see src/api/auth.js) -- no token
// handling needed here. AI-A task #393, 2026-10-24.
export default function useUserSocket(enabled, onMessage) {
  const [connected, setConnected] = useState(false);
  const ws = useRef(null);
  const reconnectTimer = useRef(null);
  const attemptsRef = useRef(0);
  const onMessageRef = useRef(onMessage);
  const isConnecting = useRef(false);

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);

  const connect = useCallback(() => {
    if (isConnecting.current || (ws.current && ws.current.readyState === WebSocket.CONNECTING)) return;
    try {
      if (ws.current) { ws.current.close(1000, 'Reconnecting'); ws.current = null; }
      isConnecting.current = true;
      ws.current = new WebSocket(`${WS_BASE_URL}/ws/user`);

      ws.current.onopen = () => {
        isConnecting.current = false;
        setConnected(true);
        attemptsRef.current = 0;
      };
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current && onMessageRef.current(data);
        } catch { /* ignore malformed frame */ }
      };
      ws.current.onclose = (event) => {
        isConnecting.current = false;
        setConnected(false);
        if (event.code !== 1000) {
          const delay = Math.min(1000 * 2 ** attemptsRef.current, 30000);
          attemptsRef.current += 1;
          reconnectTimer.current = setTimeout(connect, delay);
        }
      };
      ws.current.onerror = () => { isConnecting.current = false; };
    } catch {
      isConnecting.current = false;
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
    if (ws.current) { ws.current.close(1000, 'Component unmounting'); ws.current = null; }
    isConnecting.current = false;
    setConnected(false);
    attemptsRef.current = 0;
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    connect();
    return disconnect;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { connected };
}
