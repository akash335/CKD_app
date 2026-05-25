"use client";

import Image from "next/image";
import type { ChatConversation } from "@/types/chat";
import { cn, timeAgo } from "@/lib/utils";

interface ChatListProps {
  conversations: ChatConversation[];
  activeConversationId?: string | null;
  activeParticipantId?: string;
  loading?: boolean;
  onSelect: (conversation: ChatConversation) => void;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ChatList({
  conversations,
  activeConversationId,
  activeParticipantId,
  loading = false,
  onSelect,
}: ChatListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border-primary)] px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold theme-text">Messages</h2>
          <span className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Online
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {loading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-16 rounded-xl bg-[var(--bg-elevated)]" />
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm theme-text-dimmed">
            No conversations yet.
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => {
              const isActive =
                conversation.id === activeConversationId
                || (!conversation.id && conversation.participant_id === activeParticipantId);

              return (
                <button
                  key={conversation.id ?? conversation.participant_id}
                  onClick={() => onSelect(conversation)}
                  className={cn(
                    "w-full rounded-xl border px-3 py-3 text-left transition-all",
                    isActive
                      ? "border-emerald-500/20 bg-emerald-500/10"
                      : "border-transparent hover:border-[var(--border-primary)] hover:bg-[var(--bg-elevated)]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-violet-500/20 to-sky-500/20">
                      {conversation.participant_image ? (
                        <Image
                          src={conversation.participant_image}
                          alt=""
                          fill
                          unoptimized
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold theme-text">
                          {initials(conversation.participant_name)}
                        </div>
                      )}
                      {conversation.is_online && (
                        <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full border border-[var(--bg-primary)] bg-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold theme-text">
                          {conversation.participant_name}
                        </p>
                        {conversation.last_message_at && (
                          <span className="shrink-0 text-[10px] theme-text-dimmed">
                            {timeAgo(conversation.last_message_at)}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className="truncate text-xs theme-text-muted">
                          {conversation.last_message || "Start the conversation"}
                        </p>
                        {conversation.unread_count > 0 && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 text-[10px] font-bold text-white shadow-lg shadow-emerald-500/20">
                            {conversation.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
