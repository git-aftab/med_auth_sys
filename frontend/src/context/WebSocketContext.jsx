import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { sound } from '../utils/audio';
import confetti from 'canvas-confetti';

const WebSocketContext = createContext(null);

export function WebSocketProvider({ children }) {
  const [status, setStatus] = useState('CONNECTING'); // 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'
  const [lastEvent, setLastEvent] = useState(null);
  const [eventsList, setEventsList] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [reconnectCount, setReconnectCount] = useState(0);

  const wsRef = useRef(null);
  const pingIntervalRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Sync sound utility with state
  useEffect(() => {
    sound.enabled = soundEnabled;
  }, [soundEnabled]);

  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setStatus('CONNECTING');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    // Connect through Vite proxy /ws/dashboard or direct fallback
    const wsUrl = `${protocol}//${host}/ws/dashboard`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log('[WS] Connected to Nurse Dashboard stream');
        setStatus('CONNECTED');
        setReconnectCount(0);

        // Keepalive ping every 15 seconds
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'ping' }));
          }
        }, 15000);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Ignore echo pong / acks
          if (data.type === 'pong') return;

          // Standard Verification Event
          if (data.status) {
            setLastEvent(data);
            setEventsList((prev) => [data, ...prev.slice(0, 49)]);

            // Sound feedback & celebration
            if (data.status === 'VERIFIED') {
              sound.playSuccess();
              try {
                confetti({
                  particleCount: 40,
                  spread: 60,
                  origin: { y: 0.8 },
                  colors: ['#10b981', '#06b6d4', '#3b82f6'],
                });
              } catch (e) {
                // ignore if confetti fails
              }
            } else if (data.status === 'REJECTED') {
              sound.playError();
            }
          }
        } catch (err) {
          console.error('[WS] Failed to parse message:', event.data, err);
        }
      };

      socket.onclose = () => {
        console.warn('[WS] Disconnected, scheduling reconnect...');
        setStatus('DISCONNECTED');
        clearInterval(pingIntervalRef.current);
        
        // Auto reconnect after 3 seconds
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectCount((c) => c + 1);
          connect();
        }, 3000);
      };

      socket.onerror = (err) => {
        console.error('[WS] Error:', err);
        socket.close();
      };
    } catch (err) {
      console.error('[WS] Init failed:', err);
      setStatus('DISCONNECTED');
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearInterval(pingIntervalRef.current);
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  // Method to manually inject / broadcast event (e.g. from simulator if needed)
  const injectEvent = (event) => {
    setLastEvent(event);
    setEventsList((prev) => [event, ...prev.slice(0, 49)]);
    if (event.status === 'VERIFIED') {
      sound.playSuccess();
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#10b981', '#06b6d4', '#3b82f6'],
        });
      } catch (e) {}
    } else {
      sound.playError();
    }
  };

  return (
    <WebSocketContext.Provider
      value={{
        status,
        lastEvent,
        eventsList,
        soundEnabled,
        setSoundEnabled,
        reconnect: connect,
        reconnectCount,
        injectEvent,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
