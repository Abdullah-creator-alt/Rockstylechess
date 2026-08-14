import { useEffect, useRef, useState } from 'react';

import { getSocket } from '@/lib/socket';
import type { ChatMessagePayload } from '@/lib/onlineMatch';
import type { GameMode, OnlineMatchInfo } from './useChessGame';

export interface ChatMessageWithId extends ChatMessagePayload {
  id: string;
}

// Mirrors server/src/chat.ts's own constants -- the server enforces this
// authoritatively and drops over-limit messages silently (no rejection
// event), so this is a best-effort local approximation purely to give the
// player visible feedback (a disabled send button) instead of messages
// vanishing with no explanation. Keep in sync with the server if it changes.
const RATE_LIMIT_WINDOW_MS = 10_000;
const RATE_LIMIT_MAX_MESSAGES = 8;
const MAX_MESSAGE_LENGTH = 200;

interface UseMatchChatOptions {
  mode: GameMode;
  online?: OnlineMatchInfo;
  /** Whether the chat panel is currently open -- drives unread-count reset. */
  isOpen: boolean;
}

// Owns the in-match chat socket listener, message list, and unread count.
// Kept separate from useChessGame (chess-domain-only) the same way
// StockfishEngine is already a sibling concern rather than folded in --
// chat has its own open/closed/unread lifecycle that has nothing to do
// with board state.
export function useMatchChat({ mode, online, isOpen }: UseMatchChatOptions) {
  const [messages, setMessages] = useState<ChatMessageWithId[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toastMessage, setToastMessage] = useState<ChatMessageWithId | null>(null);
  const [canSend, setCanSend] = useState(true);
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  const sendTimestampsRef = useRef<number[]>([]);
  const nextIdRef = useRef(0);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      // A toast still showing is redundant once the panel is open and the
      // message is visible inline -- dismiss it immediately.
      setToastMessage(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (mode !== 'online' || !online) return;
    const socket = getSocket();
    const myColor = online.playerColor;

    function handleChatMessage(payload: ChatMessagePayload) {
      nextIdRef.current += 1;
      const messageWithId = { ...payload, id: `${payload.sentAt}-${nextIdRef.current}` };
      setMessages((prev) => [...prev, messageWithId]);
      if (!isOpenRef.current) {
        setUnreadCount((prev) => prev + 1);
        // Opponent-only -- a player who sends a message right as they close
        // the panel shouldn't see a toast for their own echoed-back text.
        // Overwriting (not appending to a queue) gives "latest replaces
        // whatever's showing" for free -- ChatToast is keyed by message id
        // in match.tsx, so a new value here remounts it, restarting both
        // the animation and its auto-dismiss timer.
        if (payload.color !== myColor) setToastMessage(messageWithId);
      }
    }

    socket.on('match:chat:message', handleChatMessage);
    return () => {
      socket.off('match:chat:message', handleChatMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, online?.matchId]);

  function send(text: string) {
    if (mode !== 'online' || !online) return;
    const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!trimmed) return;

    const now = Date.now();
    const recent = sendTimestampsRef.current.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (recent.length >= RATE_LIMIT_MAX_MESSAGES) {
      sendTimestampsRef.current = recent;
      setCanSend(false);
      return;
    }
    recent.push(now);
    sendTimestampsRef.current = recent;
    setCanSend(true);

    // No optimistic local insert -- the server broadcasts match:chat:message
    // to the whole match room, which includes the sender's own socket, so
    // this message will render once it comes back through the listener above.
    getSocket().emit('match:chat:send', { matchId: online.matchId, text: trimmed });
  }

  // Re-check the soft rate limit on a short interval so `canSend` flips back
  // to true once the sliding window ages out, even if the player isn't
  // actively sending (i.e. just sitting on a disabled button).
  useEffect(() => {
    if (canSend) return;
    const interval = setInterval(() => {
      const now = Date.now();
      sendTimestampsRef.current = sendTimestampsRef.current.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
      if (sendTimestampsRef.current.length < RATE_LIMIT_MAX_MESSAGES) setCanSend(true);
    }, 500);
    return () => clearInterval(interval);
  }, [canSend]);

  return {
    messages,
    unreadCount,
    toastMessage,
    dismissToast: () => setToastMessage(null),
    send,
    canSend: mode === 'online' && !!online && canSend,
  };
}
