import { Modal } from "@/components/ui/Modal";
import { menuApi } from "@/features/meal-planner/api/menuApi";
import { useLocale } from "@/shared/i18n/LocaleContext";
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Plus,
  Search,
  Send,
  ShoppingCart,
  Sparkles,
  Trash2,
  UserRoundCog,
  Utensils,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useLocation, useNavigate } from "react-router-dom";
import remarkGfm from "remark-gfm";
import { chatApi } from "../api/chatApi";
import { chatMessages } from "../chat.messages";
import { ChatMessage, ChatSession, ToolState } from "../types/chat";
import MenuDraftWidget from "./MenuDraftWidget";

type SessionGroupKey = "today" | "yesterday" | "previous7Days" | "older";

function ThoughtProcessViewer({
  tools,
  startedAt,
  isDone,
  copy,
}: {
  tools?: ToolState[];
  startedAt?: number;
  isDone: boolean | number;
  copy: {
    process: (seconds: string) => string;
    streaming: (seconds: string) => string;
    runningTool: (toolName: string) => string;
    toolNames: Record<string, string>;
  };
}) {
  const [elapsed, setElapsed] = useState(0);
  const [isOpen, setIsOpen] = useState(isDone === false);

  useEffect(() => {
    if (isDone || !startedAt) return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 100);
    return () => clearInterval(interval);
  }, [isDone, startedAt]);

  if (!startedAt) return null;

  const finalTime = typeof isDone === "number" ? isDone : elapsed;
  const displayTime = (finalTime / 1000).toFixed(1);
  const isActuallyDone = isDone !== false;

  // Don't show if done but practically instant (0.0s) and no tools were run
  if (isActuallyDone && finalTime < 500 && (!tools || tools.length === 0))
    return null;

  return (
    <div className="flex flex-col mb-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-[13px] font-medium text-gray-400 hover:text-gray-600 transition-colors w-fit px-2 py-1 rounded-md hover:bg-gray-100"
      >
        {isActuallyDone ? (
          isOpen ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )
        ) : (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
        )}
        <span className={isActuallyDone ? "text-gray-400" : "text-primary/70"}>
          {isActuallyDone
            ? copy.process(displayTime)
            : copy.streaming(displayTime)}
        </span>
      </button>

      {isOpen && tools && tools.length > 0 && (
        <div className="pl-6 mt-1 flex flex-col gap-2 border-l-2 border-gray-100 ml-3 py-1 bg-white/50">
          {tools.map((t, idx) => (
            <div key={idx} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 text-xs">
                {t.status === "running" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
                )}
                <span
                  className={
                    t.status === "done"
                      ? "text-gray-500"
                      : "text-gray-800 font-medium"
                  }
                >
                  {copy.toolNames[t.name] ||
                    copy.runningTool(t.name.replace(/_/g, " "))}
                </span>
              </div>
              {t.progress_logs && t.progress_logs.length > 0 && (
                <div className="pl-6 flex flex-col gap-1.5 mt-1.5">
                  {t.progress_logs.map((log, lIdx) => (
                    <div key={lIdx} className="flex flex-col text-[11px]">
                      <div className="text-gray-500 font-medium flex gap-1.5 items-center">
                        <span className="w-1 h-1 rounded-full bg-gray-300 flex-shrink-0" />
                        {log.step}
                      </div>
                      {log.preview && (
                        <div className="pl-4 mt-0.5 text-gray-400/90 whitespace-pre-wrap">
                          {log.preview}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {t.status === "done" && t.result_snippet && (
                <div className="pl-6 text-[11px] text-gray-400 italic line-clamp-2 max-w-[95%] mt-1">
                  "{t.result_snippet}"
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SmoothMarkdown({ content, isStreaming }: { content: string, isStreaming: boolean }) {
  const [displayedContent, setDisplayedContent] = useState(content);
  const targetContentRef = useRef(content);
  const currentContentRef = useRef(displayedContent);

  useEffect(() => {
    targetContentRef.current = content;
    if (!isStreaming) {
      setDisplayedContent(content);
      currentContentRef.current = content;
    }
  }, [content, isStreaming]);

  useEffect(() => {
    if (!isStreaming) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = time - lastTime;
      // throttle update to ~60fps for smooth typing
      if (delta > 16) {
        const target = targetContentRef.current;
        const current = currentContentRef.current;
        
        if (current.length < target.length) {
          const gap = target.length - current.length;
          // Dynamically adjust speed based on how far behind we are
          const charsToAdd = Math.max(1, Math.ceil(gap * 0.15));
          currentContentRef.current = target.substring(0, current.length + charsToAdd);
          setDisplayedContent(currentContentRef.current);
          lastTime = time;
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isStreaming]);

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ node, ...props }) => (
          <h1 className="text-lg sm:text-xl font-bold mt-4 mb-2" {...props} />
        ),
        h2: ({ node, ...props }) => (
          <h2 className="text-base sm:text-lg font-bold mt-3 mb-2" {...props} />
        ),
        h3: ({ node, ...props }) => (
          <h3 className="text-sm sm:text-base font-bold mt-2 mb-1" {...props} />
        ),
        p: ({ node, ...props }) => (
          <p className="mb-2 last:mb-0 leading-relaxed" {...props} />
        ),
        ul: ({ node, ...props }) => (
          <ul className="list-disc pl-4 sm:pl-5 mb-2 space-y-1" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className="list-decimal pl-4 sm:pl-5 mb-2 space-y-1" {...props} />
        ),
        li: ({ node, ...props }) => <li className="" {...props} />,
        strong: ({ node, ...props }) => (
          <strong className="font-semibold" {...props} />
        ),
        a: ({ node, ...props }) => (
          <a className="text-blue-500 hover:underline break-all" {...props} />
        ),
        code: ({ node, inline, ...props }: any) =>
          inline ? (
            <code
              className="bg-black/5 rounded px-1 py-0.5 text-xs sm:text-sm font-mono break-all"
              {...props}
            />
          ) : (
            <pre className="bg-black/5 rounded p-3 overflow-x-auto text-xs sm:text-sm font-mono mt-2 mb-2 w-full max-w-full">
              <code {...props} />
            </pre>
          ),
      }}
    >
      {displayedContent}
    </ReactMarkdown>
  );
}

export default function ChatScreen() {
  const { locale } = useLocale();
  const text = chatMessages[locale];

  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarLoading, setIsSidebarLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saveMenuLoadingByMessage, setSaveMenuLoadingByMessage] = useState<
    Record<string, boolean>
  >({});
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Rename state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [modifiedDraftMessageIds, setModifiedDraftMessageIds] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const threadIdRef = useRef<string | undefined>(undefined);
  const abortControllerRef = useRef<AbortController | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return () => {
      // Abort any ongoing stream if component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (toastTimeoutRef.current) {
        window.clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    if (toastTimeoutRef.current) {
      window.clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = window.setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    threadIdRef.current = threadId;
  }, [threadId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [input]);

  const loadSessions = async (showLoading = true) => {
    try {
      if (showLoading) setIsSidebarLoading(true);
      const data = await chatApi.getSessions();

      // Auto-read the currently active session if it gets marked unread (e.g., while streaming)
      const currentId = threadIdRef.current;
      if (currentId) {
        const activeSession = data.find((s) => s.id === currentId);
        if (activeSession?.has_unread) {
          await chatApi.markSessionAsRead(currentId);
          activeSession.has_unread = false;
          // Dispatch event to update Navbar
          window.dispatchEvent(
            new CustomEvent("chatSessionRead", {
              detail: { sessionId: currentId },
            }),
          );
        }
      }

      setSessions(data);
    } catch (error) {
      console.error("Failed to load chat sessions:", error);
    } finally {
      if (showLoading) setIsSidebarLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();

    // Poll for session updates every 5 seconds to catch new unread messages
    const interval = setInterval(() => {
      loadSessions(false);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRenameSession = async (sessionId: string) => {
    if (!editTitle.trim() || editingSessionId !== sessionId) {
      setEditingSessionId(null);
      return;
    }

    try {
      setIsRenaming(true);
      const updatedSession = await chatApi.updateSessionTitle(
        sessionId,
        editTitle.trim(),
      );

      // Update local state
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                title: updatedSession.title,
                updated_at: updatedSession.updated_at,
              }
            : s,
        ),
      );
    } catch (error) {
      console.error("Failed to rename session:", error);
    } finally {
      setIsRenaming(false);
      setEditingSessionId(null);
    }
  };

  const handleRenameKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    sessionId: string,
  ) => {
    if (e.key === "Enter") {
      handleRenameSession(sessionId);
    } else if (e.key === "Escape") {
      setEditingSessionId(null);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    if (sessionId === threadId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setThreadId(sessionId);
    setIsLoading(true);
    setMessages([]); // Clear current messages while loading

    try {
      const msgs = await chatApi.getSessionMessages(sessionId);
      setMessages(msgs);

      // Mark session as read if it was unread
      const session = sessions.find((s) => s.id === sessionId);
      if (session?.has_unread) {
        await chatApi.markSessionAsRead(sessionId);
        setSessions((prev) =>
          prev.map((s) =>
            s.id === sessionId ? { ...s, has_unread: false } : s,
          ),
        );

        // Dispatch event to update Navbar immediately
        window.dispatchEvent(
          new CustomEvent("chatSessionRead", {
            detail: { sessionId },
          }),
        );
      }
    } catch (error) {
      console.error("Failed to load messages for session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setThreadId(undefined);
    setInput("");
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const sendMessage = async (userTextToSubmit: string) => {
    if (!userTextToSubmit.trim() || isLoading) return;

    const userText = userTextToSubmit.trim();
    setInput("");
    const isNewChat = !threadId;
    let resolvedThreadId = threadId;

    // Add optimistic user message
    const tempMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: userText,
      created_at: new Date().toISOString(),
    };

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "", // Starts empty, will be streamed into
      created_at: new Date().toISOString(),
      meal_plan_draft: null,
      started_at: Date.now(),
      tools: [],
    };

    setMessages((prev) => [...prev, tempMsg, assistantMsg]);
    setIsLoading(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      await chatApi.sendStreamMessage(
        userText,
        threadId,
        (event) => {
          if (event.type === "chunk") {
            setMessages((prev) => {
              const newMessages = [...prev];
              for (let i = newMessages.length - 1; i >= 0; i--) {
                if (newMessages[i].role === "assistant") {
                  const msg = newMessages[i];
                  newMessages[i] = {
                    ...msg,
                    content: msg.content + event.content,
                    thinking_time:
                      msg.thinking_time !== undefined
                        ? msg.thinking_time
                        : msg.started_at
                          ? Date.now() - msg.started_at
                          : undefined,
                  };
                  break;
                }
              }
              return newMessages;
            });
            setTimeout(scrollToBottom, 5);
          } else if (event.type === "tool_start") {
            setMessages((prev) => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i--) {
                if (next[i].role === "assistant") {
                  const reqTools = next[i].tools || [];
                  next[i] = {
                    ...next[i],
                    tools: [
                      ...reqTools,
                      { name: event.name, status: "running" },
                    ],
                  };
                  break;
                }
              }
              return next;
            });
            setTimeout(scrollToBottom, 20);
          } else if (event.type === "tool_end") {
            setMessages((prev) => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i--) {
                if (next[i].role === "assistant") {
                  const currentTools = next[i].tools || [];
                  const reqTools = [...currentTools];
                  for (let j = reqTools.length - 1; j >= 0; j--) {
                    if (
                      reqTools[j].name === event.name &&
                      reqTools[j].status === "running"
                    ) {
                      reqTools[j] = {
                        ...reqTools[j],
                        status: "done",
                        result_snippet: event.result_snippet,
                      };
                      break;
                    }
                  }
                  next[i] = {
                    ...next[i],
                    tools: reqTools,
                    meal_plan_draft:
                      event.meal_plan_draft || next[i].meal_plan_draft,
                  };
                  break;
                }
              }
              return next;
            });
          } else if (event.type === "tool_progress") {
            setMessages((prev) => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i--) {
                if (next[i].role === "assistant") {
                  const currentTools = next[i].tools || [];
                  const reqTools = [...currentTools];
                  for (let j = reqTools.length - 1; j >= 0; j--) {
                    if (reqTools[j].status === "running") {
                      const currentLogs = reqTools[j].progress_logs || [];
                      reqTools[j] = {
                        ...reqTools[j],
                        progress_logs: [
                          ...currentLogs,
                          { step: event.step, preview: event.preview },
                        ],
                      };
                      break;
                    }
                  }
                  next[i] = {
                    ...next[i],
                    tools: reqTools,
                  };
                  break;
                }
              }
              return next;
            });
            setTimeout(scrollToBottom, 20);
          } else if (event.type === "message_break") {
            setMessages((prev) => [
              ...prev,
              {
                id:
                  Date.now().toString() +
                  Math.random().toString(36).substring(7),
                role: "assistant",
                content: "",
                created_at: new Date().toISOString(),
                meal_plan_draft: null,
                started_at: Date.now(),
                tools: [],
              },
            ]);
            setTimeout(scrollToBottom, 50);
          } else if (
            event.type === "tool_end" &&
            event.name === "build_new_menu_plan" &&
            event.meal_plan_draft
          ) {
            setMessages((prev) => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i--) {
                if (next[i].role === "assistant") {
                  next[i] = {
                    ...next[i],
                    meal_plan_draft: event.meal_plan_draft,
                  };
                  break;
                }
              }
              return next;
            });
          } else if (
            event.type === "persisted_message" &&
            typeof event.message_id === "string"
          ) {
            setMessages((prev) => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i--) {
                if (next[i].role !== "assistant") continue;
                const draftId = next[i].meal_plan_draft?.draft_id;
                if (
                  (event.draft_id && draftId === event.draft_id) ||
                  !isLikelyUuid(next[i].id)
                ) {
                  next[i] = {
                    ...next[i],
                    id: event.message_id,
                  };
                  break;
                }
              }
              return next;
            });
          } else if (
            event.type === "error" &&
            typeof event.content === "string"
          ) {
            setMessages((prev) => {
              const next = [...prev];
              for (let i = next.length - 1; i >= 0; i--) {
                if (next[i].role !== "assistant") continue;
                const existing = next[i].content?.trim();
                next[i] = {
                  ...next[i],
                  content: existing
                    ? `${next[i].content}\n\n[${text.message.systemTag}] ${event.content}`
                    : `[${text.message.systemTag}] ${event.content}`,
                };
                break;
              }
              return next;
            });
            setTimeout(scrollToBottom, 10);
          }
        },
        (newThreadId) => {
          resolvedThreadId = newThreadId;
          if (isNewChat) {
            setThreadId(newThreadId);
          }
        },
        abortControllerRef.current.signal,
      );

      if (resolvedThreadId) {
        const latestMessages =
          await chatApi.getSessionMessages(resolvedThreadId);
        setMessages((prev) => {
          // Guard against a stale read right after stream close.
          if (latestMessages.length < prev.length) {
            return prev;
          }
          return latestMessages;
        });
      }

      // Refresh sidebar to bump the active chat to the top or show new chat
      loadSessions();
    } catch (error: any) {
      if (error.name === "AbortError") {
        setIsLoading(false);
        return; // Ignore aborted fetch errors
      }
      console.error("Failed to send message:", error);
      // Remove empty assistant message if there was a full error before streaming started
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg.id === assistantMsgId && !lastMsg.content) {
          newMessages.pop();
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const promptSentRef = useRef(false);

  useEffect(() => {
    if (location.state?.initialPrompt && !promptSentRef.current) {
      promptSentRef.current = true;
      const prompt = location.state.initialPrompt;
      // Clear location state immediately
      navigate(location.pathname, { replace: true, state: {} });
      // Auto-send the prompt
      setTimeout(() => {
        sendMessage(prompt);
      }, 50);
    }
  }, [location.state?.initialPrompt, navigate]);

  useEffect(() => {
    if (location.state?.sessionId && location.state.sessionId !== threadId) {
      handleSelectSession(location.state.sessionId);
      // Clear sessionId from state
      const newState = { ...location.state };
      delete newState.sessionId;
      navigate(location.pathname, { replace: true, state: newState });
    }
  }, [location.state?.sessionId, navigate, threadId]);

  // Helper to group sessions by date
  const groupSessions = (sessions: ChatSession[]) => {
    // First, sort sessions by updated_at descending
    const sortedSessions = [...sessions].sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at).getTime() -
        new Date(a.updated_at || a.created_at).getTime(),
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups: Record<SessionGroupKey, ChatSession[]> = {
      today: [],
      yesterday: [],
      previous7Days: [],
      older: [],
    };

    sortedSessions.forEach((session) => {
      // Use updated_at for grouping to match the sorting logic
      const sessionDate = session.updated_at
        ? new Date(session.updated_at)
        : new Date(session.created_at);

      if (sessionDate >= today) {
        groups.today.push(session);
      } else if (sessionDate >= yesterday) {
        groups.yesterday.push(session);
      } else if (sessionDate >= lastWeek) {
        groups.previous7Days.push(session);
      } else {
        groups.older.push(session);
      }
    });

    return groups;
  };

  const groupedSessions = groupSessions(sessions);

  const isLikelyUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    );

  const handleSaveMenu = async (
    messageId: string,
    draftId?: string,
    modifiedDraft?: any,
  ) => {
    let resolvedMessageId = messageId;

    if (!isLikelyUuid(resolvedMessageId)) {
      if (!threadId) {
        showToast("error", text.toast.notSynced);
        return;
      }

      try {
        const latestMessages = await chatApi.getSessionMessages(threadId);
        const currentLocalMessage = messages.find(
          (m) =>
            m.id === messageId ||
            (draftId && m.meal_plan_draft?.draft_id === draftId),
        );
        const persistedDraftMessages = latestMessages.filter(
          (m) =>
            m.role === "assistant" && !!m.meal_plan_draft && isLikelyUuid(m.id),
        );

        let persisted = latestMessages.find(
          (m) =>
            m.role === "assistant" &&
            !!draftId &&
            m.meal_plan_draft?.draft_id === draftId &&
            isLikelyUuid(m.id),
        );

        if (!persisted && currentLocalMessage?.content) {
          persisted = persistedDraftMessages.find(
            (m) =>
              m.content === currentLocalMessage.content &&
              m.meal_plan_draft?.saved !== true,
          );
        }

        if (!persisted && persistedDraftMessages.length === 1) {
          persisted = persistedDraftMessages[0];
        }

        if (!persisted) {
          const unsaved = persistedDraftMessages.filter(
            (m) => m.meal_plan_draft?.saved !== true,
          );
          if (unsaved.length === 1) {
            persisted = unsaved[0];
          }
        }

        if (!persisted && persistedDraftMessages.length > 0) {
          persisted = persistedDraftMessages[persistedDraftMessages.length - 1];
        }

        if (!persisted) {
          showToast("error", text.toast.notSynced);
          return;
        }

        resolvedMessageId = persisted.id;

        // Merge only the matched message to avoid wiping optimistic UI state.
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId || m.meal_plan_draft?.draft_id === draftId
              ? {
                  ...m,
                  id: persisted.id,
                  content: persisted.content || m.content,
                  created_at: persisted.created_at || m.created_at,
                  meal_plan_draft:
                    persisted.meal_plan_draft || m.meal_plan_draft,
                }
              : m,
          ),
        );
      } catch {
        showToast("error", text.toast.cannotSync);
        return;
      }
    }

    setSaveMenuLoadingByMessage((prev) => ({
      ...prev,
      [resolvedMessageId]: true,
      [messageId]: true,
    }));
    try {
      const result = await menuApi.saveMenuFromChat(
        resolvedMessageId,
        modifiedDraft,
      );
      setMessages((prev) =>
        prev.map((m) =>
          m.id === resolvedMessageId ||
          (draftId && m.meal_plan_draft?.draft_id === draftId)
            ? {
                ...m,
                meal_plan_draft: m.meal_plan_draft
                  ? {
                      ...m.meal_plan_draft,
                      saved: true,
                      meal_plan_id: result.meal_plan_id,
                    }
                  : m.meal_plan_draft,
              }
            : m,
        ),
      );

      /*
      const shoppingItems = result.shopping_list || [];
      if (shoppingItems.length > 0) {
        const grouped = shoppingItems.reduce(
          (acc, item) => {
            const key = item.category || "Other";
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
          },
          {} as Record<string, typeof shoppingItems>,
        );

        const lines: string[] = ["🛍️ 🛒:"];
        Object.entries(grouped).forEach(([category, items]) => {
          lines.push(`\n[${category}]`);
          items.forEach((item) => {
            lines.push(`- ${item.name}: ${item.quantity}`);
          });
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-shopping-list`,
            role: "assistant",
            content: lines.join("\n"),
            created_at: new Date().toISOString(),
            meal_plan_draft: null,
          },
        ]);
        setTimeout(scrollToBottom, 10);
      }
      */

      showToast("success", text.toast.saveSuccess);
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        text.toast.saveFailed;
      showToast("error", message);
    } finally {
      setSaveMenuLoadingByMessage((prev) => ({
        ...prev,
        [resolvedMessageId]: false,
        [messageId]: false,
      }));
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isLoading) return;
    sendMessage(prompt);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] relative w-full overflow-hidden">
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Chat History Sidebar */}
      <div
        className={`absolute md:relative z-30 bg-white md:bg-gray-50/30 border-r border-gray-100 flex flex-col h-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden shadow-2xl md:shadow-none ${isSidebarOpen ? "w-[85vw] sm:w-72 md:w-64 translate-x-0" : "w-0 -translate-x-full md:translate-x-0"}`}
      >
        {/* Sidebar Content Wrapper (handles visibility during collapse) */}
        <div
          className={`flex flex-col h-full min-w-[200px] w-full transition-opacity duration-200 ${isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-gray-900 font-serif text-lg">
              {text.sidebar.title}
            </h2>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
              title={text.sidebar.closeSidebar}
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>

          <div className="p-3">
            <button
              onClick={() => {
                handleNewChat();
                if (window.innerWidth < 768) setIsSidebarOpen(false);
              }}
              className="w-full bg-white border border-gray-200 hover:border-primary hover:text-primary text-gray-700 rounded-full px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium transition-colors shadow-sm mb-4"
            >
              <Plus className="w-4 h-4" /> {text.sidebar.newChat}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 pt-0 space-y-1">
            {isSidebarLoading && sessions.length === 0 ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : (
              Object.entries(groupedSessions).map(
                ([groupName, groupSessions]) => {
                  if (groupSessions.length === 0) return null;
                  return (
                    <div key={groupName} className="mb-4 text-left">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 mb-2">
                        {text.sidebar.groups[groupName as SessionGroupKey]}
                      </div>
                      {groupSessions.map((session) => (
                        <div
                          key={session.id}
                          className={`w-full mb-1 px-3 py-2.5 rounded-xl border border-transparent hover:shadow-sm text-sm flex items-center justify-between gap-2 transition-all group ${
                            threadId === session.id
                              ? "bg-primary/5 text-primary font-medium border-primary/20"
                              : "hover:bg-gray-50 text-gray-700"
                          }`}
                        >
                          {editingSessionId === session.id ? (
                            <div className="flex items-center gap-3 truncate grow text-left">
                              <div className="relative flex-shrink-0">
                                <MessageSquare
                                  className={`w-4 h-4 text-primary`}
                                />
                              </div>
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onKeyDown={(e) =>
                                  handleRenameKeyDown(e, session.id)
                                }
                                onBlur={() => handleRenameSession(session.id)}
                                autoFocus
                                disabled={isRenaming}
                                className="w-full bg-white border border-primary/50 rounded px-2 py-0.5 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary h-6"
                              />
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                handleSelectSession(session.id);
                                if (window.innerWidth < 768)
                                  setIsSidebarOpen(false);
                              }}
                              className="flex items-center gap-3 truncate grow text-left"
                            >
                              <div className="relative flex-shrink-0">
                                <MessageSquare
                                  className={`w-4 h-4 ${threadId === session.id ? "text-primary" : "text-gray-400 group-hover:text-primary"}`}
                                />
                                {session.has_unread && (
                                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full border border-white"></span>
                                )}
                              </div>
                              <span
                                className={`truncate ${session.has_unread ? "font-bold text-gray-900 group-hover:text-primary" : ""}`}
                              >
                                {session.title}
                              </span>
                            </button>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!editingSessionId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditTitle(session.title);
                                  setEditingSessionId(session.id);
                                }}
                                className="p-1.5 rounded-md text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                title={text.sidebar.renameChat}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSessionToDelete(session.id);
                              }}
                              className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              title={text.sidebar.deleteChat}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                },
              )
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative h-full w-full max-w-full">
        {/* Toggle Button for Closed Sidebar */}
        {!isSidebarOpen && (
          <div className="absolute top-4 left-4 z-10 transition-all duration-300">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-white/90 backdrop-blur border border-gray-100 shadow-sm rounded-lg text-gray-600 hover:text-primary transition-all hover:shadow-md"
              title={text.sidebar.openSidebar}
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Empty State vs Chat List */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full relative">
          {messages.length === 0 && !isLoading ? (
            <div className="min-h-full flex flex-col items-center justify-center p-4 sm:p-6 pt-16 md:pt-6">
              <div className="w-full max-w-6xl m-auto">
                <div className="relative overflow-hidden rounded-[28px] border border-rose-100/70 bg-gradient-to-br from-rose-50 via-white to-orange-50 shadow-[0_28px_80px_rgba(255,92,92,0.12)]">
                  <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-rose-200/25 blur-3xl" />
                  <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-amber-200/25 blur-3xl" />

                  <div className="relative p-5 sm:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-5 sm:gap-6">
                      <section className="rounded-2xl border border-white/70 bg-white/80 backdrop-blur-sm p-5 sm:p-6 text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-rose-200/70 bg-rose-50 text-rose-500 text-[11px] font-bold uppercase tracking-[0.14em]">
                          <Sparkles className="h-3.5 w-3.5" />
                          {text.empty.badge}
                        </div>

                        <h2 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                          {text.empty.headingMain}
                          <span className="text-primary">
                            {" "}{text.empty.headingAccent}
                          </span>
                        </h2>

                        <p className="mt-3 text-sm sm:text-base text-gray-600 max-w-xl">
                          {text.empty.description}
                        </p>

                        <div className="mt-5 flex flex-wrap gap-2.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickPrompt(
                                text.empty.prompts.weeklyPlan,
                              )
                            }
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                          >
                            {text.empty.primaryCta}
                            <ChevronRight className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickPrompt(
                                text.empty.prompts.reviewProfile,
                              )
                            }
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-gray-700 text-sm font-semibold hover:border-primary/40 hover:text-primary transition-colors"
                          >
                            {text.empty.secondaryCta}
                          </button>
                        </div>

                        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                          <div className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2 text-rose-700">
                            {text.empty.chips.meal}
                          </div>
                          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-blue-700">
                            {text.empty.chips.bmr}
                          </div>
                          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-emerald-700">
                            {text.empty.chips.profile}
                          </div>
                        </div>
                      </section>

                      <section className="rounded-2xl border border-gray-100 bg-white/85 backdrop-blur-sm p-4 sm:p-5 text-left">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-[0.12em] mb-3">
                          {text.empty.quickActionsTitle}
                        </h3>

                        <div className="space-y-3">
                          <div className="rounded-xl border border-rose-100 bg-rose-50/70 p-3">
                            <div className="flex items-center gap-2 text-primary mb-2">
                              <Utensils className="h-4 w-4" />
                              <p className="text-sm font-semibold text-gray-900">
                                {text.empty.cards.mealTitle}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickPrompt(
                                    text.empty.prompts.suggestMeal,
                                  )
                                }
                                className="text-xs px-2.5 py-1.5 rounded-full bg-white text-rose-700 border border-rose-200 hover:bg-rose-100"
                              >
                                {text.empty.cards.mealSuggest}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickPrompt(
                                    text.empty.prompts.twoDayPlan,
                                  )
                                }
                                className="text-xs px-2.5 py-1.5 rounded-full bg-white text-rose-700 border border-rose-200 hover:bg-rose-100"
                              >
                                {text.empty.cards.meal2Day}
                              </button>
                            </div>
                          </div>

                          <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                            <div className="flex items-center gap-2 text-blue-600 mb-2">
                              <Calculator className="h-4 w-4" />
                              <p className="text-sm font-semibold text-gray-900">
                                {text.empty.cards.bmrTitle}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickPrompt(
                                    text.empty.prompts.calculateBmr,
                                  )
                                }
                                className="text-xs px-2.5 py-1.5 rounded-full bg-white text-blue-700 border border-blue-200 hover:bg-blue-100"
                              >
                                {text.empty.cards.bmrCalc}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickPrompt(
                                    text.empty.prompts.predictImpact,
                                  )
                                }
                                className="text-xs px-2.5 py-1.5 rounded-full bg-white text-blue-700 border border-blue-200 hover:bg-blue-100"
                              >
                                {text.empty.cards.bmrPredict}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                              <div className="flex items-center gap-2 text-emerald-600 mb-2">
                                <UserRoundCog className="h-4 w-4" />
                                <p className="text-sm font-semibold text-gray-900">
                                  {text.empty.cards.profileTitle}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickPrompt(
                                    text.empty.prompts.viewProfile,
                                  )
                                }
                                className="text-xs px-2.5 py-1.5 rounded-full bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              >
                                {text.empty.cards.profileView}
                              </button>
                            </div>

                            <div className="rounded-xl border border-amber-100 bg-amber-50/70 p-3">
                              <div className="flex items-center gap-2 text-amber-600 mb-2">
                                <Search className="h-4 w-4" />
                                <p className="text-sm font-semibold text-gray-900">
                                  {text.empty.cards.searchTitle}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickPrompt(
                                    text.empty.prompts.goldPrice,
                                  )
                                }
                                className="text-xs px-2.5 py-1.5 rounded-full bg-white text-amber-700 border border-amber-200 hover:bg-amber-100"
                              >
                                {text.empty.cards.searchGold}
                              </button>
                            </div>
                          </div>
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6 max-w-3xl mx-auto w-full pb-4 pt-10 sm:pt-0">
              {messages
                .filter((m) => m.role !== "tool")
                .map((msg, index, arr) => {
                  const isThisMsgStreaming = isLoading && index === arr.length - 1;
                  return (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`rounded-2xl px-4 sm:px-5 py-3 ${
                          msg.role === "user"
                            ? "max-w-[85%] sm:max-w-[80%] bg-primary text-white rounded-tr-sm"
                            : msg.meal_plan_draft?.days
                              ? "w-full max-w-full bg-white text-gray-800 rounded-tl-sm border border-gray-100 shadow-sm"
                              : "max-w-[85%] sm:max-w-[80%] bg-white text-gray-800 rounded-tl-sm border border-gray-100 shadow-sm"
                        }`}
                      >
                        {msg.role === "assistant" &&
                          msg.started_at &&
                          (!msg.content ? (
                            <ThoughtProcessViewer
                              tools={msg.tools}
                              startedAt={msg.started_at}
                              isDone={msg.thinking_time || false}
                              copy={text.thinking}
                            />
                          ) : (
                            <ThoughtProcessViewer
                              tools={msg.tools}
                              startedAt={msg.started_at}
                              isDone={
                                msg.thinking_time || Date.now() - msg.started_at
                              }
                              copy={text.thinking}
                            />
                          ))}

                        {/* Render Markdown Content if available */}
                        {msg.content && !modifiedDraftMessageIds[msg.id] && !msg.meal_plan_draft?.is_modified && (
                          <div
                            className={`prose prose-sm max-w-none break-words ${msg.role === "user" ? "prose-invert" : ""} ${msg.role === "assistant" && msg.meal_plan_draft?.days && msg.meal_plan_draft.days.length > 0 ? "mb-6" : ""}`}
                          >
                            <SmoothMarkdown 
                              content={msg.content} 
                              isStreaming={isThisMsgStreaming} 
                            />
                          </div>
                        )}

                        {/* Interactive Menu Widget */}
                        {msg.role === "assistant" &&
                          msg.meal_plan_draft?.days &&
                          msg.meal_plan_draft.days.length > 0 &&
                          !isThisMsgStreaming && (
                            <MenuDraftWidget
                              draft={msg.meal_plan_draft}
                              onSave={(modifiedDraft) =>
                                handleSaveMenu(
                                  msg.id,
                                  msg.meal_plan_draft?.draft_id,
                                  modifiedDraft,
                                )
                              }
                              isSaved={!!msg.meal_plan_draft.saved}
                              mealPlanId={msg.meal_plan_draft.meal_plan_id}
                              isSaving={!!saveMenuLoadingByMessage[msg.id]}
                              onModify={() => setModifiedDraftMessageIds(prev => ({...prev, [msg.id]: true}))}
                              onSyncDraft={(newState) => {
                                chatApi.syncDraftToMessage(msg.id, newState).catch(console.error);
                              }}
                            />
                          )}
                      </div>
                      {/* Timestamp */}
                      {msg.created_at && (
                        <span className="text-[11px] text-gray-400 mt-1 px-1">
                          {new Date(msg.created_at).toLocaleString(text.dateLocale, {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}

                      {/* Legacy save button for drafts WITHOUT days data */}
                      {msg.role === "assistant" &&
                        msg.meal_plan_draft &&
                        !msg.meal_plan_draft.days && (
                          <div className="mt-2 px-1">
                            {msg.meal_plan_draft.saved ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  {text.message.savedMenu}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => navigate("/grocery")}
                                  className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
                                >
                                  <ShoppingCart className="w-3.5 h-3.5" />
                                  {text.message.goToShopping}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  handleSaveMenu(
                                    msg.id,
                                    msg.meal_plan_draft?.draft_id,
                                  )
                                }
                                disabled={
                                  !!saveMenuLoadingByMessage[msg.id] ||
                                  (!isLikelyUuid(msg.id) &&
                                    !msg.meal_plan_draft?.draft_id)
                                }
                                className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border border-primary/30 bg-white text-primary hover:bg-primary/5 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {saveMenuLoadingByMessage[msg.id] ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : null}
                                {text.message.saveMenu}
                              </button>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                  );
                })}
              <div ref={messagesEndRef} className="h-2" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="flex-none bg-white border-t p-3 sm:p-6 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-20">
          <form
            onSubmit={handleSend}
            className="max-w-3xl mx-auto relative flex items-end w-full"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() && !isLoading) {
                    handleSend(e as any);
                  }
                }
              }}
              placeholder={text.message.askPlaceholder}
              rows={1}
              className="w-full pl-4 sm:pl-5 pr-12 sm:pr-14 py-3 sm:py-4 bg-gray-50 border border-gray-200 rounded-[24px] focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm text-sm sm:text-base resize-none overflow-y-auto invisible-scrollbar"
              style={{ minHeight: "44px", maxHeight: "150px" }}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-1.5 sm:right-2 bottom-1.5 sm:bottom-2 p-1.5 sm:p-2 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5 ml-0.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-lg border text-sm font-medium ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <Modal
        isOpen={!!sessionToDelete}
        onClose={() => !isDeleting && setSessionToDelete(null)}
        className="max-w-md p-6"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            {text.modal.deleteTitle}
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {text.modal.deleteDescription}
          </p>
          <div className="flex w-full gap-3">
            <button
              onClick={() => setSessionToDelete(null)}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {text.modal.cancel}
            </button>
            <button
              onClick={async () => {
                if (!sessionToDelete) return;
                setIsDeleting(true);
                try {
                  await chatApi.deleteSession(sessionToDelete);
                  if (threadId === sessionToDelete) handleNewChat();
                  await loadSessions();
                } catch (err) {
                  console.error("Failed to delete chat:", err);
                } finally {
                  setIsDeleting(false);
                  setSessionToDelete(null);
                }
              }}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                text.modal.delete
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
