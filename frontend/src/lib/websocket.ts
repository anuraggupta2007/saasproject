import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccessToken } from '@/lib/apiClient';
import type { WSEvent, WSEventType, WSProgressPayload } from '@/types';

type WSCallback<T = unknown> = (payload: T) => void;

interface WSClientOptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

interface WSClient {
  connect: () => void;
  disconnect: () => void;
  subscribe: <T = unknown>(event: WSEventType, callback: WSCallback<T>) => () => void;
  send: (event: string, data?: unknown) => void;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
}

function createWSClient(options: WSClientOptions = {}): WSClient {
  const {
    url = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000/ws',
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
    heartbeatInterval = 30_000,
  } = options;

  let ws: WebSocket | null = null;
  let reconnectAttempts = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let statusListeners: Array<(status: WSClient['status']) => void> = [];
  let currentStatus: WSClient['status'] = 'disconnected';

  const subscriptions = new Map<string, Set<WSCallback>>();

  function setStatus(s: WSClient['status']) {
    currentStatus = s;
    statusListeners.forEach((fn) => fn(s));
  }

  function notifyListeners(event: string, data: unknown) {
    subscriptions.get(event)?.forEach((cb) => {
      try { cb(data); } catch (e) { console.error('WS callback error:', e); }
    });
    subscriptions.get('*')?.forEach((cb) => {
      try { cb({ type: event, payload: data }); } catch (e) { console.error('WS callback error:', e); }
    });
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, heartbeatInterval);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function scheduleReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
      setStatus('error');
      return;
    }
    const delay = Math.min(reconnectInterval * 2 ** reconnectAttempts, 30_000);
    reconnectTimer = setTimeout(() => {
      reconnectAttempts++;
      connect();
    }, delay);
  }

  function connect() {
    if (ws?.readyState === WebSocket.OPEN) return;

    const token = getAccessToken();
    const wsUrl = token ? `${url}?token=${token}` : url;

    try {
      setStatus('connecting');
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setStatus('connected');
        reconnectAttempts = 0;
        startHeartbeat();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSEvent;
          notifyListeners(data.type, data.payload);
        } catch {
          // Non-JSON message
        }
      };

      ws.onclose = () => {
        stopHeartbeat();
        setStatus('disconnected');
        scheduleReconnect();
      };

      ws.onerror = () => {
        setStatus('error');
      };
    } catch {
      setStatus('error');
      scheduleReconnect();
    }
  }

  function disconnect() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectAttempts = maxReconnectAttempts; // prevent reconnect
    stopHeartbeat();
    ws?.close();
    ws = null;
    setStatus('disconnected');
  }

  function subscribe<T = unknown>(event: WSEventType | '*', callback: WSCallback<T>): () => void {
    if (!subscriptions.has(event)) subscriptions.set(event, new Set());
    subscriptions.get(event)!.add(callback as WSCallback);
    return () => { subscriptions.get(event)?.delete(callback as WSCallback); };
  }

  function send(event: string, data?: unknown) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: event, data }));
    }
  }

  return { connect, disconnect, subscribe, send, get status() { return currentStatus; } };
}

// Singleton instance
let clientInstance: WSClient | null = null;

export function getWSClient(): WSClient {
  if (!clientInstance) clientInstance = createWSClient();
  return clientInstance;
}

// ─── React Hook ──────────────────────────────────────────────────────────────

export function useWebSocket(options?: WSClientOptions) {
  const clientRef = useRef<WSClient | null>(null);
  const [status, setStatus] = useState<WSClient['status']>('disconnected');

  if (!clientRef.current) {
    clientRef.current = createWSClient(options);
  }

  useEffect(() => {
    const client = clientRef.current!;

    const listener = (s: WSClient['status']) => setStatus(s);
    statusListeners.push(listener);

    client.connect();

    return () => {
      client.disconnect();
      statusListeners = statusListeners.filter((fn) => fn !== listener);
    };
  }, []);

  const subscribe = useCallback(<T = unknown>(event: WSEventType, callback: WSCallback<T>) => {
    return clientRef.current!.subscribe<T>(event, callback);
  }, []);

  return { status, subscribe, send: clientRef.current!.send };
}

// ─── React Hook: Progress Subscription ───────────────────────────────────────

export function useJobProgress(jobId: string, type: 'backup' | 'conversion') {
  const [progress, setProgress] = useState<WSProgressPayload | null>(null);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsub = subscribe<WSProgressPayload>(`${type}.progress`, (payload) => {
      if (payload.jobId === jobId) setProgress(payload);
    });
    return unsub;
  }, [jobId, type, subscribe]);

  return progress;
}

// Keep a module-level reference for the status listeners array
let statusListeners: Array<(status: WSClient['status']) => void> = [];
