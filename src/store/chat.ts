"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ChatMessage } from "@/types";

interface ChatState {
  messages: ChatMessage[];
  setMessages: (messages: ChatMessage[]) => void;
  appendMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [],
      setMessages: (messages) => set({ messages }),
      appendMessages: (messages) =>
        set((state) => ({ messages: [...state.messages, ...messages] })),
      clearMessages: () => set({ messages: [] }),
    }),
    { name: "ai-supermarket-chat", skipHydration: true }
  )
);
