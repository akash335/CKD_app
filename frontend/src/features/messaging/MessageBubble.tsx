"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@/types/chat";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/hooks/useClickOutside";

const URL_PATTERN = /((https?:\/\/|www\.)[^\s]+)/gi;

function stripTrailingPunctuation(value: string) {
  return value.replace(/[),.;!?]+$/, "");
}

function normalizeUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function formatMessageTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}


export function MessageBubble({
  message,
  currentUserId,
  onDelete,
  deleting,
  onRetry,
}: {
  message: ChatMessage;
  currentUserId: string;
  onDelete?: (messageId: string) => void;
  deleting?: boolean;
  onRetry?: (message: ChatMessage) => void;
}) {
  const isSender = message.sender_id === currentUserId;
  const canDelete = Boolean(isSender && onDelete);
  const linksInMessage = useMemo(() => {
    const matches = Array.from(message.message_text.matchAll(URL_PATTERN));
    return matches
      .map((match) => stripTrailingPunctuation(match[0]))
      .filter((url) => url.length > 0);
  }, [message.message_text]);
  const primaryLink = linksInMessage[0] ? normalizeUrl(linksInMessage[0]) : null;
  const hasActions = Boolean(primaryLink || canDelete);

  const messageSegments = useMemo(() => {
    const segments: Array<{ type: "text" | "link"; value: string }> = [];
    const matches = Array.from(message.message_text.matchAll(URL_PATTERN));

    if (matches.length === 0) {
      return [{ type: "text", value: message.message_text }];
    }

    let cursor = 0;
    for (const match of matches) {
      const index = match.index ?? 0;
      const rawValue = match[0];
      const cleanedValue = stripTrailingPunctuation(rawValue);
      const trailingText = rawValue.slice(cleanedValue.length);

      if (cursor < index) {
        segments.push({ type: "text", value: message.message_text.slice(cursor, index) });
      }

      if (cleanedValue) {
        segments.push({ type: "link", value: cleanedValue });
      }

      if (trailingText) {
        segments.push({ type: "text", value: trailingText });
      }

      cursor = index + rawValue.length;
    }

    if (cursor < message.message_text.length) {
      segments.push({ type: "text", value: message.message_text.slice(cursor) });
    }

    return segments;
  }, [message.message_text]);

  const [showActions, setShowActions] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setShowActions(false);
    setCopiedLink(false);
  }, [message.id]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const startLongPress = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!hasActions || deleting) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      setShowActions(true);
    }, 500);
  }, [clearLongPressTimer, deleting, hasActions]);

  const endLongPress = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  useClickOutside(containerRef, () => {
    setShowActions(false);
    clearLongPressTimer();
  });

  useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer]);

  const handleDelete = () => {
    if (!onDelete || !isSender || deleting) return;
    onDelete(message.id);
    setShowActions(false);
  };

  const handleOpenLink = useCallback((url: string) => {
    const normalizedUrl = normalizeUrl(url);
    const shouldOpen = window.confirm(`Open this link?\n\n${normalizedUrl}`);
    if (!shouldOpen) return;
    window.open(normalizedUrl, "_blank", "noopener,noreferrer");
    setShowActions(false);
  }, []);

  const handleCopyPrimaryLink = async () => {
    if (!primaryLink) return;
    try {
      await navigator.clipboard.writeText(primaryLink);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 1200);
    } catch {
      window.prompt("Copy this link:", primaryLink);
    }
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!hasActions || deleting) return;
    event.preventDefault();
    clearLongPressTimer();
    setShowActions(true);
  };

  return (
    <div className={cn("flex animate-in fade-in duration-200", isSender ? "justify-end" : "justify-start")}>
      <div
        ref={containerRef}
        className={cn(
          "relative max-w-[82%] rounded-2xl px-4 py-3 shadow-lg sm:max-w-[68%] transition-opacity duration-300",
          isSender
            ? "rounded-br-md theme-text border border-[var(--border-primary)]"
            : "rounded-bl-md theme-text border border-[var(--border-primary)]",
          message.status === "sending" && "opacity-60",
        )}
        style={{ background: "var(--bg-elevated)" }}
        onPointerDown={startLongPress}
        onPointerUp={endLongPress}
        onPointerLeave={endLongPress}
        onPointerCancel={endLongPress}
        onContextMenu={handleContextMenu}
      >
        {showActions && hasActions && (
          <div className="absolute bottom-full right-0 z-10 mb-2 flex min-w-28 flex-col rounded-xl border border-[var(--border-input)] bg-[var(--bg-card)] p-1 shadow-xl backdrop-blur-xl">
            {primaryLink && (
              <button
                type="button"
                onClick={handleCopyPrimaryLink}
                className="rounded-lg px-3 py-1.5 text-left text-xs font-medium theme-text transition-colors hover:bg-[var(--shimmer)]"
              >
                {copiedLink ? "Copied" : "Copy Link"}
              </button>
            )}
            {primaryLink && (
              <button
                type="button"
                onClick={() => handleOpenLink(primaryLink)}
                className="rounded-lg px-3 py-1.5 text-left text-xs font-medium theme-text transition-colors hover:bg-[var(--shimmer)]"
              >
                Open Link
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg px-3 py-1.5 text-left text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        )}
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {messageSegments.map((segment, index) => (
            segment.type === "link" ? (
              <a
                key={`${segment.value}-${index}`}
                href={normalizeUrl(segment.value)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => {
                  event.preventDefault();
                  handleOpenLink(segment.value);
                }}
                className={cn(
                  "underline decoration-current/60 underline-offset-2 transition-opacity hover:opacity-80 text-sky-400"
                )}
              >
                {segment.value}
              </a>
            ) : (
              <span key={`${segment.value}-${index}`}>{segment.value}</span>
            )
          ))}
        </p>
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-[10px] theme-text-dimmed",
            isSender ? "justify-end" : "justify-start"
          )}
        >
          {message.status === "failed" && onRetry && (
            <button
              type="button"
              onClick={() => onRetry(message)}
              className="mr-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Failed · Retry
            </button>
          )}
          <span>{formatMessageTime(message.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
