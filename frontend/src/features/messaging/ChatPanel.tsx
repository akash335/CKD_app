"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ChatConversation, ChatMessage, ChatPeer } from "@/types/chat";
import {
  deleteChatMessage,
  fetchChatMessages,
  fetchConversations,
  getChatWebSocketUrl,
  sendChatMessage,
} from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { ChatList } from "./ChatList";
import { MessageBubble } from "./MessageBubble";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  initialPeer?: ChatPeer | null;
}

function pendingConversation(peer: ChatPeer): ChatConversation {
  return {
    id: null,
    participant_id: peer.id,
    participant_name: peer.name,
    participant_image: peer.image,
    unread_count: 0,
    is_online: false,
  };
}

function formatHeaderTime(iso?: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    error
    && typeof error === "object"
    && "message" in error
    && typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return fallback;
}

export function ChatPanel({ isOpen, onClose, currentUserId, initialPeer }: ChatPanelProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const syncConversationPreview = useCallback((
    conversationId: string,
    lastMessage: string | null,
    lastMessageAt: string | null,
    updatedAt: string,
  ) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              last_message: lastMessage,
              last_message_at: lastMessageAt,
              updated_at: updatedAt,
            }
          : conversation
      )
    );

    setActiveConversation((prev) =>
      prev && prev.id === conversationId
        ? {
            ...prev,
            last_message: lastMessage,
            last_message_at: lastMessageAt,
            updated_at: updatedAt,
          }
        : prev
    );
  }, []);

  const openConversation = useCallback(
    async (conversation: ChatConversation) => {
      setActiveConversation({ ...conversation, unread_count: 0 });
      setError("");

      if (!conversation.id) {
        setMessages([]);
        return;
      }

      setLoadingMessages(true);
      try {
        const data = await fetchChatMessages(conversation.id, currentUserId);
        setMessages(data);
        setConversations((prev) =>
          prev.map((item) =>
            item.id === conversation.id ? { ...item, unread_count: 0 } : item
          )
        );
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Failed to load messages."));
      } finally {
        setLoadingMessages(false);
      }
    },
    [currentUserId]
  );

  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    let cancelled = false;

    async function loadConversations() {
      setLoadingConversations(true);
      setError("");
      try {
        const data = await fetchConversations(currentUserId);
        if (cancelled) return;

        setConversations(data);
        const peerConversation = initialPeer
          ? data.find((conversation) => conversation.participant_id === initialPeer.id)
          : null;
        const nextConversation = peerConversation
          ?? (initialPeer ? pendingConversation(initialPeer) : data[0] ?? null);

        if (nextConversation) {
          await openConversation(nextConversation);
        } else {
          setActiveConversation(null);
          setMessages([]);
        }
      } catch (err: unknown) {
        if (!cancelled) setError(getErrorMessage(err, "Failed to load conversations."));
      } finally {
        if (!cancelled) setLoadingConversations(false);
      }
    }

    loadConversations();

    return () => {
      cancelled = true;
    };
  }, [currentUserId, initialPeer, isOpen, openConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isOpen || !activeConversation?.id) return;

    const socket = new WebSocket(getChatWebSocketUrl(activeConversation.id, currentUserId));

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "message") {
          const incoming = payload.message as ChatMessage;
          setMessages((prev) =>
            prev.some((message) => message.id === incoming.id) ? prev : [...prev, incoming]
          );
          setConversations((prev) =>
            prev.map((conversation) =>
              conversation.id === incoming.conversation_id
                ? {
                    ...conversation,
                    last_message: incoming.message_text,
                    last_message_at: incoming.created_at,
                    unread_count:
                      incoming.receiver_id === currentUserId
                        && incoming.conversation_id !== activeConversation.id
                        ? conversation.unread_count + 1
                        : conversation.unread_count,
                  }
                : conversation
            )
          );
          return;
        }

        if (payload.type === "message_deleted") {
          const removedId = String(payload.message_id);
          setMessages((prev) => prev.filter((message) => message.id !== removedId));
          syncConversationPreview(
            String(payload.conversation_id),
            payload.last_message as string | null,
            payload.last_message_at as string | null,
            String(payload.updated_at),
          );
        }
      } catch {
        // Ignore non-chat control frames.
      }
    };

    return () => socket.close();
  }, [activeConversation?.id, currentUserId, isOpen, syncConversationPreview]);

  const displayedConversations = useMemo(() => {
    if (!activeConversation || activeConversation.id) return conversations;
    return [
      activeConversation,
      ...conversations.filter(
        (conversation) => conversation.participant_id !== activeConversation.participant_id
      ),
    ];
  }, [activeConversation, conversations]);

  const handleSend = async (textOverride?: string) => {
    const trimmed = (textOverride ?? messageText).trim();
    if (!trimmed || !activeConversation || sending) return;

    // ── Optimistic insert ──────────────────────────────────────────────────
    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();
    const optimistic: ChatMessage = {
      id: tempId,
      conversation_id: activeConversation.id ?? "",
      sender_id: currentUserId,
      receiver_id: activeConversation.participant_id,
      message_text: trimmed,
      created_at: now,
      status: "sending",
    };

    // Show message + clear input immediately
    if (!textOverride) setMessageText("");
    setMessages((prev) =>
      prev.some((m) => m.id === tempId) ? prev : [...prev, optimistic]
    );

    setSending(true);
    setError("");
    try {
      const sentMessage = await sendChatMessage({
        sender_id: currentUserId,
        receiver_id: activeConversation.participant_id,
        message_text: trimmed,
      });

      const confirmedMessage: ChatMessage = { ...sentMessage, status: "sent" };

      const updatedConversation: ChatConversation = {
        ...activeConversation,
        id: sentMessage.conversation_id,
        last_message: sentMessage.message_text,
        last_message_at: sentMessage.created_at,
        updated_at: sentMessage.created_at,
        unread_count: 0,
      };

      // Replace temp message with the confirmed one.
      // Guard: if the WebSocket already added the real message before the API
      // response arrived, just drop the temp bubble to avoid a duplicate key.
      setMessages((prev) => {
        const alreadyAdded = prev.some((m) => m.id === sentMessage.id);
        if (alreadyAdded) {
          // WebSocket beat us — remove temp, tag the real one as "sent"
          return prev
            .filter((m) => m.id !== tempId)
            .map((m) => (m.id === sentMessage.id ? confirmedMessage : m));
        }
        // Normal path — swap temp → confirmed
        return prev.map((m) => (m.id === tempId ? confirmedMessage : m));
      });
      setActiveConversation(updatedConversation);
      setConversations((prev) => {
        const withoutCurrent = prev.filter(
          (c) =>
            c.id !== sentMessage.conversation_id &&
            c.participant_id !== activeConversation.participant_id
        );
        return [updatedConversation, ...withoutCurrent];
      });
    } catch (err: unknown) {
      // Mark as failed so user can retry
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" as const } : m))
      );
      setError(getErrorMessage(err, "Failed to send message."));
    } finally {
      setSending(false);
    }
  };

  const handleRetry = (failedMessage: ChatMessage) => {
    // Remove the failed bubble and re-send its text
    setMessages((prev) => prev.filter((m) => m.id !== failedMessage.id));
    void handleSend(failedMessage.message_text);
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!activeConversation?.id || deletingMessageId) return;

    setDeletingMessageId(messageId);
    setError("");
    try {
      const result = await deleteChatMessage(messageId, currentUserId);
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
      syncConversationPreview(
        result.conversation_id,
        result.last_message,
        result.last_message_at,
        result.updated_at,
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Failed to delete message."));
    } finally {
      setDeletingMessageId(null);
    }
  };

  if (!isOpen) return null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-2xl dark:bg-black/35 animate-in fade-in duration-200" />
      <div className="fixed inset-0 z-[41] bg-gradient-to-b from-white/35 via-white/25 to-white/20 dark:from-slate-950/70 dark:via-slate-950/60 dark:to-black/75 animate-in fade-in duration-200" />

      <div className="fixed inset-0 z-[60] flex items-stretch justify-center p-0 sm:items-center sm:p-4 animate-in fade-in duration-200">
        <div
          className="flex h-[100dvh] w-full flex-col overflow-hidden border border-[var(--border-input)] bg-[var(--bg-primary)] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl sm:h-[min(84vh,780px)] sm:max-w-6xl sm:rounded-2xl sm:bg-[var(--bg-card)] sm:pt-0 sm:pb-0"
          style={{ boxShadow: "var(--shadow-card-hover)" }}
        >
        <div className="flex items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-5 py-4 sm:bg-[var(--bg-elevated)]">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider theme-text-dimmed">Secure chat</p>
            <h2 className="text-lg font-bold theme-text">Messages</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 theme-text-muted transition-all hover:bg-[var(--shimmer)] hover:theme-text"
            aria-label="Close chat"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[320px_1fr]">
          <div
            className={cn(
              "min-h-0 border-r border-[var(--border-primary)]",
              activeConversation ? "hidden md:block" : "block"
            )}
          >
            <ChatList
              conversations={displayedConversations}
              activeConversationId={activeConversation?.id ?? null}
              activeParticipantId={activeConversation?.participant_id}
              loading={loadingConversations}
              onSelect={openConversation}
            />
          </div>

          <div
            className={cn(
              "min-h-0 flex-col",
              activeConversation ? "flex" : "hidden md:flex"
            )}
          >
            {activeConversation ? (
              <>
                <div className="flex items-center justify-between border-b border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 py-3 sm:bg-[var(--bg-elevated)] sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      onClick={() => setActiveConversation(null)}
                      className="rounded-lg p-2 theme-text-muted hover:bg-[var(--shimmer)] md:hidden"
                      aria-label="Back to conversations"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                      </svg>
                    </button>
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-violet-500/20 to-sky-500/20">
                      {activeConversation.participant_image ? (
                        <Image
                          src={activeConversation.participant_image}
                          alt=""
                          fill
                          unoptimized
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold theme-text">
                          {activeConversation.participant_name
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold theme-text">
                        {activeConversation.participant_name}
                      </h3>
                      <p className="flex items-center gap-1.5 text-xs theme-text-muted">
                        {activeConversation.is_online ? (
                          <>
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            Online
                          </>
                        ) : (
                          formatHeaderTime(activeConversation.last_message_at) || "Conversation ready"
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-black/[0.03] dark:bg-black/[0.08] px-4 py-5 custom-scrollbar sm:px-6">
                  {loadingMessages ? (
                    <div className="space-y-3 animate-pulse">
                      <div className="h-16 w-2/3 rounded-2xl bg-[var(--bg-elevated)]" />
                      <div className="ml-auto h-16 w-1/2 rounded-2xl bg-emerald-500/10" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center text-sm theme-text-dimmed">
                      No messages yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <MessageBubble
                          key={message.id}
                          message={message}
                          currentUserId={currentUserId}
                          onDelete={handleDeleteMessage}
                          deleting={deletingMessageId === message.id}
                          onRetry={handleRetry}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                <div className="border-t border-[var(--border-primary)] bg-[var(--bg-primary)] p-3 sm:bg-[var(--bg-elevated)] sm:p-4">
                  {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      handleSend();
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
                      placeholder="Type your message..."
                      className="min-w-0 flex-1 rounded-xl border border-[var(--border-input)] bg-[var(--bg-input)] px-4 py-3 text-sm theme-text placeholder:theme-text-faint outline-none transition-all focus:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <button
                      type="submit"
                      disabled={!messageText.trim() || sending}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Send message"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.126A59.768 59.768 0 0 1 21.485 12 59.77 59.77 0 0 1 3.27 20.876L6 12Zm0 0h7.5" />
                      </svg>
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-sm theme-text-dimmed">
                Select a conversation.
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </>,
    document.body
  );
}
