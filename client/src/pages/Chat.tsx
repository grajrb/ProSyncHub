import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  setThreads,
  setActiveThread,
  addMessage,
  setLoading,
  setError,
} from "@/store/slices/chatSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// 1. Type definitions for thread and message
interface ChatParticipant {
  id: string;
  name: string;
  avatar?: string;
}
interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}
interface ChatThread {
  id: string;
  name?: string;
  participants: ChatParticipant[];
  messages: ChatMessage[];
  unreadCount: number;
  lastMessageTimestamp?: string;
  isGroup: boolean;
}

export default function Chat() {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { threads, activeThreadId, loading, error } = useSelector(
    (state: RootState) => state.chat
  );
  const [messageText, setMessageText] = useState("");
  const [searchText, setSearchText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Simulating fetch chat data from API
  useEffect(() => {
    const fetchChatData = async () => {
      try {
        dispatch(setLoading(true));
        
        // This would be an actual API call in a real app
        // const response = await fetch('/api/chat/threads');
        // const data = await response.json();
        
        // For now, we'll use mock data
        const mockThreads: ChatThread[] = [
          {
            id: "thread-1",
            name: "Maintenance Team",
            participants: [
              {
                id: "user1",
                name: "John Smith",
                avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&h=256",
              },
              {
                id: "user2",
                name: "Sarah Johnson",
                avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&h=256",
              },
              {
                id: "user3",
                name: "Mike Williams",
                avatar: "https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&h=256",
              },
            ],
            messages: [
              {
                id: "msg-1-1",
                senderId: "user2",
                senderName: "Sarah Johnson",
                senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&h=256",
                content: "Good morning team! The maintenance report for the cooling system is ready for review.",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
                isRead: true,
              },
              {
                id: "msg-1-2",
                senderId: "user3",
                senderName: "Mike Williams",
                senderAvatar: "https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&h=256",
                content: "Thanks Sarah! I'll take a look at it right away. Did you notice any issues with the compressor unit?",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1.5).toISOString(), // 1.5 hours ago
                isRead: true,
              },
              {
                id: "msg-1-3",
                senderId: "user2",
                senderName: "Sarah Johnson",
                senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&h=256",
                content: "Yes, there were some vibration readings that were slightly above normal. I've highlighted them in section 3 of the report.",
                timestamp: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(), // 1 hour ago
                isRead: true,
              },
              {
                id: "msg-1-4",
                senderId: "user1",
                senderName: "John Smith",
                senderAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&h=256",
                content: "I'll create a work order to inspect the compressor unit. Better to address it now before it becomes a bigger issue.",
                timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
                isRead: true,
              },
            ],
            unreadCount: 0,
            lastMessageTimestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
            isGroup: true,
          },
          {
            id: "thread-2",
            name: undefined,
            participants: [
              {
                id: "user1",
                name: "John Smith",
                avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&h=256",
              },
              {
                id: "user4",
                name: "Alex Chen",
                avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&h=256",
              },
            ],
            messages: [
              {
                id: "msg-2-1",
                senderId: "user4",
                senderName: "Alex Chen",
                senderAvatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&h=256",
                content: "Hi John, I need your input on the new sensor installation for Building B.",
                timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
                isRead: false,
              },
              {
                id: "msg-2-2",
                senderId: "user4",
                senderName: "Alex Chen",
                senderAvatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&h=256",
                content: "The current setup isn't giving us accurate temperature readings for the east wing.",
                timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(), // 14 minutes ago
                isRead: false,
              },
            ],
            unreadCount: 2,
            lastMessageTimestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
            isGroup: false,
          },
        ];
        
        dispatch(setThreads(mockThreads));
        if (mockThreads.length > 0 && !activeThreadId) {
          dispatch(setActiveThread(mockThreads[0].id));
        }
      } catch (err) {
        dispatch(setError("Failed to fetch chat data"));
        toast.error("Failed to load chat data");
      }
    };

    fetchChatData();
  }, [dispatch, activeThreadId]);

  // Scroll to bottom of messages when active thread changes or new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThreadId, threads]);

  const handleSendMessage = () => {
    if (!messageText.trim() || !activeThreadId) return;

    const newMessage: ChatMessage = {
      id: uuidv4(),
      senderId: user?.id || "user1", // Fallback to user1 for demo
      senderName: user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user?.email || "John Smith",
      senderAvatar: user?.profileImageUrl || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&auto=format&fit=crop&w=256&h=256",
      content: messageText,
      timestamp: new Date().toISOString(),
      isRead: true,
    };

    dispatch(addMessage({ threadId: activeThreadId, message: newMessage }));
    setMessageText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Type-safe filteredThreads and activeThread
  const filteredThreads: ChatThread[] = Array.isArray(threads) ? (searchText
    ? threads.filter((thread) => {
        const threadName = thread.name || 
          (Array.isArray(thread.participants) ? thread.participants.find(p => p.id !== (user?.id || "user1"))?.name : "") || "";
        return threadName.toLowerCase().includes(searchText.toLowerCase()) ||
          (Array.isArray(thread.messages) && thread.messages.some(m => 
            m.content.toLowerCase().includes(searchText.toLowerCase())
          ));
      })
    : threads) : [];
  const activeThread: ChatThread | undefined = Array.isArray(threads) ? threads.find((thread) => thread.id === activeThreadId) : undefined;

  const getThreadName = (thread: ChatThread) => {
    if (thread.isGroup && thread.name) {
      return thread.name;
    }
    const otherParticipant = Array.isArray(thread.participants)
      ? thread.participants.find((p) => p.id !== (user?.id || "user1"))
      : undefined;
    return otherParticipant?.name || "Chat";
  };

  const getThreadAvatar = (thread: ChatThread) => {
    if (thread.isGroup) {
      return {
        image: null,
        fallback: thread.name?.charAt(0) || "G",
      };
    }
    const otherParticipant = Array.isArray(thread.participants)
      ? thread.participants.find((p) => p.id !== (user?.id || "user1"))
      : undefined;
    return {
      image: otherParticipant?.avatar,
      fallback: otherParticipant?.name?.charAt(0) || "?",
    };
  };

  if (loading && (!threads || threads.length === 0)) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-3xl">
          <CardContent className="py-6">
            <div className="text-center">
              <i className="fas fa-exclamation-circle text-red-500 text-5xl mb-4"></i>
              <h3 className="text-xl font-medium mb-2">Failed to load chat data</h3>
              <p className="text-neutral-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                <i className="fas fa-redo mr-2"></i>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] overflow-hidden">
      {/* Chat Sidebar */}
      <div className="w-80 border-r border-neutral-200 flex flex-col bg-white">
        <div className="p-4 border-b border-neutral-200">
          <h2 className="font-medium text-lg mb-3">Messages</h2>
          <div className="relative">
            <Input
              type="text"
              placeholder="Search conversations..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-9"
            />
            <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400"></i>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredThreads.length === 0 ? (
            <div className="text-center py-8">
              <i className="fas fa-comment-slash text-neutral-400 text-5xl mb-4"></i>
              <p className="text-neutral-600">No conversations found</p>
            </div>
          ) : (
            filteredThreads.map((thread: ChatThread) => {
              const threadAvatar = getThreadAvatar(thread);
              const lastMessage = Array.isArray(thread.messages) && thread.messages.length > 0 ? thread.messages[thread.messages.length - 1] : undefined;
              
              return (
                <div
                  key={thread.id}
                  className={`flex items-start p-3 hover:bg-neutral-50 cursor-pointer ${
                    thread.id === activeThreadId ? "bg-neutral-100" : ""
                  }`}
                  onClick={() => dispatch(setActiveThread(thread.id))}
                >
                  <Avatar className="h-12 w-12">
                    {threadAvatar.image && (
                      <AvatarImage src={threadAvatar.image} />
                    )}
                    <AvatarFallback className={thread.isGroup ? "bg-primary-100 text-primary-800" : ""}>
                      {threadAvatar.fallback}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-3 flex-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium truncate">
                        {getThreadName(thread)}
                      </h3>
                      <span className="text-xs text-neutral-500">
                        {lastMessage && formatDistanceToNow(new Date(lastMessage.timestamp), { 
                          addSuffix: false,
                          includeSeconds: true,
                        })}
                      </span>
                    </div>
                    {lastMessage && (
                      <p className="text-sm text-neutral-600 truncate">
                        {lastMessage.senderId === (user?.id || "user1") 
                          ? "You: " 
                          : `${lastMessage.senderName.split(' ')[0]}: `}
                        {lastMessage.content}
                      </p>
                    )}
                    <div className="flex justify-between items-center mt-1">
                      {thread.isGroup && (
                        <div className="flex -space-x-2">
                          {Array.isArray(thread.participants) && thread.participants.slice(0, 3).map((participant, index) => (
                            <Avatar key={participant.id} className="h-5 w-5 border border-white">
                              {participant.avatar ? (
                                <AvatarImage src={participant.avatar} />
                              ) : (
                                <AvatarFallback className="text-xs">
                                  {participant.name.charAt(0)}
                                </AvatarFallback>
                              )}
                            </Avatar>
                          ))}
                          {Array.isArray(thread.participants) && thread.participants.length > 3 && (
                            <div className="h-5 w-5 rounded-full bg-neutral-100 border border-white flex items-center justify-center text-[10px] text-neutral-600">
                              +{thread.participants.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {thread.unreadCount > 0 && (
                        <span className="bg-primary-500 text-white text-xs rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Main */}
      {activeThread ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-neutral-200 bg-white flex items-center justify-between">
            <div className="flex items-center">
              <Avatar className="h-10 w-10">
                {getThreadAvatar(activeThread).image && (
                  <AvatarImage src={getThreadAvatar(activeThread).image ?? undefined} />
                )}
                <AvatarFallback className={activeThread.isGroup ? "bg-primary-100 text-primary-800" : ""}>
                  {getThreadAvatar(activeThread).fallback}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3">
                <h3 className="font-medium">{getThreadName(activeThread)}</h3>
                <p className="text-sm text-neutral-500">
                  {activeThread.isGroup 
                    ? `${activeThread.participants.length} members` 
                    : "Online"}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="ghost" size="icon" aria-label="Call">
                <i className="fas fa-phone"></i>
              </Button>
              <Button variant="ghost" size="icon" aria-label="Video call">
                <i className="fas fa-video"></i>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="More options">
                    <i className="fas fa-ellipsis-v"></i>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <i className="fas fa-user-plus mr-2"></i>
                    Add participant
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <i className="fas fa-search mr-2"></i>
                    Search in conversation
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <i className="fas fa-bell-slash mr-2"></i>
                    Mute notifications
                  </DropdownMenuItem>
                  <Separator />
                  <DropdownMenuItem className="text-red-500">
                    <i className="fas fa-trash mr-2"></i>
                    Delete conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto bg-neutral-50">
            <div className="space-y-4">
              {Array.isArray(activeThread.messages) && activeThread.messages.map((message: ChatMessage) => {
                const isOwnMessage = message.senderId === (user?.id || "user1");
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`flex max-w-[70%] ${isOwnMessage ? "flex-row-reverse" : ""}`}>
                      {!isOwnMessage && (
                        <Avatar className="h-8 w-8 mt-1 mx-2">
                          {message.senderAvatar && (
                            <AvatarImage src={message.senderAvatar} />
                          )}
                          <AvatarFallback>
                            {message.senderName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div>
                        {!isOwnMessage && activeThread.isGroup && (
                          <p className="text-xs text-neutral-500 mb-1 ml-1">
                            {message.senderName}
                          </p>
                        )}
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            isOwnMessage
                              ? "bg-primary-500 text-white"
                              : "bg-white border border-neutral-200"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1 ml-1">
                          {formatDistanceToNow(new Date(message.timestamp), { 
                            addSuffix: true,
                            includeSeconds: true,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef}></div>
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-neutral-200 bg-white">
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" aria-label="Attach file">
                <i className="fas fa-paperclip"></i>
              </Button>
              <Input
                type="text"
                placeholder="Type a message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1"
              />
              <Button 
                onClick={handleSendMessage} 
                disabled={!messageText.trim()}
                size="icon" 
                className="rounded-full"
                aria-label="Send message"
              >
                <i className="fas fa-paper-plane"></i>
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-neutral-50">
          <div className="text-center">
            <i className="fas fa-comments text-neutral-300 text-6xl mb-4"></i>
            <h3 className="text-xl font-medium text-neutral-700">Select a conversation</h3>
            <p className="text-neutral-500">Choose a conversation from the sidebar to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
}
