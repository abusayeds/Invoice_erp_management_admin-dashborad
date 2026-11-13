import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Send, MessagesSquare } from "lucide-react";
import { api } from "../lib/api";
import { getChatSocket } from "../lib/chatSocket";
import { Card, Center, PageHeader, Spinner, inputCls } from "../components/ui";
import { cn } from "../lib/cn";

interface Conversation {
  _id: string;
  user_id: string;
  userName: string | null;
  userEmail: string | null;
  lastMessageText: string | null;
  lastMessageAt: string | null;
  lastSender: "user" | "admin" | "bot" | null;
  unreadForAdmin: number;
  status: "open" | "closed";
}

interface ChatMessage {
  _id: string;
  conversation_id: string;
  sender: "user" | "admin" | "bot";
  text: string;
  createdAt: string;
}

const initials = (name: string | null, email: string | null) => {
  const src = (name || email || "?").trim();
  return src.slice(0, 2).toUpperCase();
};

const timeLabel = (v: string | null) => {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime())
    ? ""
    : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

export function LiveChat() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: conversations = [], isLoading: loadingList } = useQuery({
    queryKey: ["chat-conversations"],
    queryFn: () => api.get<Conversation[]>("/live-chat/conversations"),
    refetchInterval: 20000,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        (c.userName ?? "").toLowerCase().includes(q) ||
        (c.userEmail ?? "").toLowerCase().includes(q) ||
        (c.lastMessageText ?? "").toLowerCase().includes(q),
    );
  }, [conversations, search]);

  const selected = conversations.find((c) => c._id === selectedId) ?? null;

  // Live updates: refresh the list on any conversation change; the thread pane
  // listens separately for message frames.
  useEffect(() => {
    const socket = getChatSocket();
    const onConversation = () =>
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    socket.on("chat:conversation", onConversation);
    socket.on("chat:message", onConversation);
    return () => {
      socket.off("chat:conversation", onConversation);
      socket.off("chat:message", onConversation);
    };
  }, [qc]);

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col p-6">
      <PageHeader
        title="Live Chat"
        subtitle="Reply to companies chatting from the app"
      />
      <Card className="flex min-h-0 flex-1 overflow-hidden">
        {/* Conversation list */}
        <div className="flex w-72 shrink-0 flex-col border-r border-slate-800">
          <div className="border-b border-slate-800 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations"
                className={cn(inputCls, "pl-9")}
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loadingList ? (
              <Center>
                <Spinner />
              </Center>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No conversations yet.</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setSelectedId(c._id)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-slate-800/60 px-3 py-3 text-left transition-colors hover:bg-slate-800/40",
                    selectedId === c._id && "bg-slate-800/60",
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-semibold text-indigo-300">
                    {initials(c.userName, c.userEmail)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-slate-100">
                        {c.userName || c.userEmail || "Unknown"}
                      </span>
                      <span className="shrink-0 text-[10px] text-slate-500">
                        {timeLabel(c.lastMessageAt)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-slate-500">
                        {c.lastSender === "admin" ? "You: " : ""}
                        {c.lastMessageText || "—"}
                      </span>
                      {c.unreadForAdmin > 0 && (
                        <span className="ml-1 inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-indigo-500 px-1 text-[10px] font-semibold text-white">
                          {c.unreadForAdmin}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Thread */}
        <div className="flex min-w-0 flex-1 flex-col">
          {selected ? (
            <Thread conversation={selected} />
          ) : (
            <Center>
              <div className="flex flex-col items-center gap-2 text-slate-500">
                <MessagesSquare className="h-8 w-8" />
                <p className="text-sm">Select a conversation to reply</p>
              </div>
            </Center>
          )}
        </div>
      </Card>
    </div>
  );
}

function Thread({ conversation }: { conversation: Conversation }) {
  const qc = useQueryClient();
  const convId = conversation._id;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seen = useRef<Set<string>>(new Set());

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  };

  const append = (m: ChatMessage) => {
    if (seen.current.has(m._id)) return;
    seen.current.add(m._id);
    setMessages((prev) => [...prev, m]);
  };

  // Load history + mark the thread read whenever the selected conversation changes.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    seen.current = new Set();
    setMessages([]);
    (async () => {
      const res = await api.get<{ messages: ChatMessage[] }>(
        `/live-chat/conversations/${convId}/messages`,
      );
      if (!alive) return;
      const list = res.messages ?? [];
      list.forEach((m) => seen.current.add(m._id));
      setMessages(list);
      setLoading(false);
      scrollToBottom();
      api
        .post(`/live-chat/conversations/${convId}/read`)
        .then(() => qc.invalidateQueries({ queryKey: ["chat-conversations"] }))
        .catch(() => {});
    })();
    return () => {
      alive = false;
    };
  }, [convId, qc]);

  // Live incoming messages for this conversation.
  useEffect(() => {
    const socket = getChatSocket();
    const onMessage = (data: ChatMessage) => {
      if (data && data.conversation_id === convId) {
        append(data);
        scrollToBottom();
        if (data.sender === "user") {
          api.post(`/live-chat/conversations/${convId}/read`).catch(() => {});
        }
      }
    };
    socket.on("chat:message", onMessage);
    return () => {
      socket.off("chat:message", onMessage);
    };
  }, [convId]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    setSending(true);
    try {
      const msg = await api.post<ChatMessage>(
        `/live-chat/conversations/${convId}/messages`,
        { text },
      );
      if (msg && msg._id) append(msg);
      scrollToBottom();
      qc.invalidateQueries({ queryKey: ["chat-conversations"] });
    } catch {
      alert("Could not send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-500/15 text-xs font-semibold text-indigo-300">
          {initials(conversation.userName, conversation.userEmail)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-100">
            {conversation.userName || "Unknown"}
          </p>
          <p className="truncate text-xs text-slate-500">
            {conversation.userEmail || ""}
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {loading ? (
          <Center>
            <Spinner />
          </Center>
        ) : (
          messages.map((m) => {
            const mine = m.sender === "admin";
            return (
              <div
                key={m._id}
                className={cn("flex flex-col", mine ? "items-end" : "items-start")}
              >
                {!mine && (
                  <span className="mb-0.5 px-1 text-[10px] text-slate-500">
                    {m.sender === "bot" ? "Qyad Assistant" : "Customer"}
                  </span>
                )}
                <div
                  className={cn(
                    "max-w-[70%] rounded-2xl px-3 py-2 text-sm",
                    mine
                      ? "rounded-br-sm bg-indigo-600 text-white"
                      : m.sender === "bot"
                        ? "rounded-bl-sm bg-slate-800 text-slate-300"
                        : "rounded-bl-sm bg-slate-800 text-slate-100",
                  )}
                >
                  {m.text}
                  <span
                    className={cn(
                      "mt-1 block text-[10px]",
                      mine ? "text-indigo-200" : "text-slate-500",
                    )}
                  >
                    {timeLabel(m.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-slate-800 p-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a reply…"
          className={cn(inputCls, "flex-1")}
        />
        <button
          onClick={send}
          disabled={sending || !draft.trim()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}
