import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
  }>;
}

interface ChatThread {
  id: string;
  name?: string;
  participants: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  messages: ChatMessage[];
  unreadCount: number;
  lastMessageTimestamp?: string;
  isGroup: boolean;
}

interface ChatState {
  threads: ChatThread[];
  activeThreadId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: ChatState = {
  threads: [],
  activeThreadId: null,
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setThreads: (state, action: PayloadAction<ChatThread[]>) => {
      state.threads = action.payload;
      state.loading = false;
      state.error = null;
    },
    setActiveThread: (state, action: PayloadAction<string>) => {
      state.activeThreadId = action.payload;
      
      // Mark messages in the active thread as read
      const activeThread = state.threads.find(thread => thread.id === action.payload);
      if (activeThread) {
        activeThread.messages.forEach(message => {
          if (!message.isRead) {
            message.isRead = true;
          }
        });
        activeThread.unreadCount = 0;
      }
    },
    addThread: (state, action: PayloadAction<ChatThread>) => {
      state.threads.unshift(action.payload);
    },
    addMessage: (state, action: PayloadAction<{ threadId: string; message: ChatMessage }>) => {
      const { threadId, message } = action.payload;
      const thread = state.threads.find(t => t.id === threadId);
      
      if (thread) {
        thread.messages.push(message);
        thread.lastMessageTimestamp = message.timestamp;
        
        // If this thread is not active, increment unread count
        if (state.activeThreadId !== threadId) {
          thread.unreadCount += 1;
        } else {
          // If the thread is active, mark the message as read
          message.isRead = true;
        }
      }
    },
    markThreadAsRead: (state, action: PayloadAction<string>) => {
      const thread = state.threads.find(t => t.id === action.payload);
      if (thread) {
        thread.messages.forEach(message => {
          message.isRead = true;
        });
        thread.unreadCount = 0;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const {
  setThreads,
  setActiveThread,
  addThread,
  addMessage,
  markThreadAsRead,
  setLoading,
  setError,
} = chatSlice.actions;

export default chatSlice.reducer;
