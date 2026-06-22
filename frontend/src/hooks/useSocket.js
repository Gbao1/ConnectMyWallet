import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config';

/** Real-time chat via backend Socket.IO (joinUserRoom + receiveMessage). */
export function useChatSocket(userId, onIncoming) {
  const socketRef = useRef(null);
  const handlerRef = useRef(onIncoming);
  handlerRef.current = onIncoming;

  useEffect(() => {
    if (!userId) return undefined;
    const base = API_BASE_URL.replace(/\/$/, '');
    const socket = io(base, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinUserRoom', userId);
    });

    socket.on('receiveMessage', (payload) => {
      handlerRef.current?.(payload);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  return socketRef;
}
