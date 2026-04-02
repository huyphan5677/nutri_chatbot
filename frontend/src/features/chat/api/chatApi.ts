import { api, getApiUrl } from "@/shared/api/client";
import { ChatMessage, ChatResponse, ChatSession } from "../types/chat";

export interface UnreadSession {
  id: string;
  title: string;
}

export interface UnreadResponse {
  count: number;
  sessions: UnreadSession[];
}

export const chatApi = {
  sendMessage: async (
    message: string,
    thread_id?: string,
  ): Promise<ChatResponse> => {
    const response = await api.post("/chat", { message, thread_id });
    return response.data;
  },

  getSessions: async (): Promise<ChatSession[]> => {
    const response = await api.get("/chat/sessions");
    return response.data;
  },

  getSessionMessages: async (sessionId: string): Promise<ChatMessage[]> => {
    const response = await api.get(`/chat/${sessionId}/messages`);
    return response.data;
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/chat/${sessionId}`);
  },

  updateSessionTitle: async (
    sessionId: string,
    title: string,
  ): Promise<ChatSession> => {
    const response = await api.patch(`/chat/${sessionId}`, { title });
    return response.data;
  },

  getUnreadCount: async (): Promise<UnreadResponse> => {
    const response = await api.get("/chat/unread");
    return response.data;
  },

  markSessionAsRead: async (sessionId: string): Promise<void> => {
    await api.post(`/chat/${sessionId}/read`);
  },

  sendStreamMessage: async (
    message: string,
    thread_id: string | undefined,
    onEvent: (event: any) => void,
    onInit: (threadId: string) => void,
    signal?: AbortSignal,
  ): Promise<void> => {
    const token = localStorage.getItem("nutri_token");

    const baseUrl = getApiUrl();

    const response = await fetch(`${baseUrl}/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message, thread_id: thread_id || null }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) throw new Error("No reader available");

    let buffer = "";

    const processEventBlock = (block: string) => {
      const trimmed = block.trim();
      if (!trimmed) return;

      // Support SSE blocks with one or more data: lines.
      const payload = trimmed
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");

      if (!payload || payload === "[DONE]") return;

      try {
        const data = JSON.parse(payload);
        if (data.type === "init") {
          onInit(data.thread_id);
        } else {
          onEvent(data);
        }
      } catch (e) {
        console.error("Error parsing stream data", e, payload);
      }
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          // Flush the final partial SSE block if the stream ends without a trailing blank line.
          processEventBlock(buffer);
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        const normalized = buffer.replace(/\r\n/g, "\n");
        const eventBlocks = normalized.split("\n\n");
        buffer = eventBlocks.pop() || "";

        for (const block of eventBlocks) {
          processEventBlock(block);
        }
      }
    } finally {
      reader.releaseLock();
    }
  },
};
