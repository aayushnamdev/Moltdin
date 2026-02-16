import { useState, useEffect, useCallback } from 'react';
import { initializeWebSocket, getSocket, sendTypingIndicator } from '@/lib/websocket';
import { getConversations, getMessages, sendMessage as sendMessageAPI } from '@/lib/api';

export interface DirectMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    name: string;
    avatar_url: string | null;
    headline: string | null;
  };
  recipient?: {
    id: string;
    name: string;
    avatar_url: string | null;
    headline: string | null;
  };
}

export interface Conversation {
  participant_id: string;
  participant_name: string;
  participant_avatar?: string | null;
  participant_headline?: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_online?: boolean;
}

export function useMessages(apiKey: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    if (!apiKey) return;

    try {
      setLoading(true);
      const response = await getConversations(apiKey);

      if (response.success) {
        setConversations(response.conversations || []);
      } else {
        setError(response.error || 'Failed to fetch conversations');
      }
    } catch (err: any) {
      console.error('Error fetching conversations:', err);
      setError(err.message || 'Failed to fetch conversations');
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  // Fetch messages with a specific agent
  const fetchMessages = useCallback(
    async (agentId: string) => {
      if (!apiKey) return;

      try {
        setLoading(true);
        const response = await getMessages(apiKey, agentId);

        if (response.success) {
          setMessages(response.data || []);
          setSelectedConversation(agentId);
        } else {
          setError(response.error || 'Failed to fetch messages');
        }
      } catch (err: any) {
        console.error('Error fetching messages:', err);
        setError(err.message || 'Failed to fetch messages');
      } finally {
        setLoading(false);
      }
    },
    [apiKey]
  );

  // Send a message
  const sendMessage = useCallback(
    async (recipientId: string, content: string) => {
      if (!apiKey) return;

      try {
        const response = await sendMessageAPI(apiKey, recipientId, content);

        if (response.success) {
          // Add message to local state
          setMessages((prev) => [...prev, response.message]);

          // Update conversation list
          fetchConversations();

          return response.message;
        } else {
          setError(response.error || 'Failed to send message');
          return null;
        }
      } catch (err: any) {
        console.error('Error sending message:', err);
        setError(err.message || 'Failed to send message');
        return null;
      }
    },
    [apiKey, fetchConversations]
  );

  // Set typing indicator
  const setTyping = useCallback(
    (recipientId: string, isTyping: boolean) => {
      sendTypingIndicator(recipientId, isTyping);
    },
    []
  );

  // Initialize WebSocket for real-time messages
  useEffect(() => {
    if (!apiKey) return;

    // Fetch initial conversations
    fetchConversations();

    // Initialize WebSocket
    const socket = initializeWebSocket(apiKey, {
      onMessage: (message: DirectMessage) => {
        console.log('💬 Message received via WebSocket:', message);

        // If the message is for the currently selected conversation, add it to messages
        if (
          selectedConversation &&
          (message.sender_id === selectedConversation ||
            message.recipient_id === selectedConversation)
        ) {
          setMessages((prev) => [...prev, message]);
        }

        // Update conversation list
        fetchConversations();

        // Show browser notification if supported
        if (
          'Notification' in window &&
          Notification.permission === 'granted' &&
          message.sender?.name
        ) {
          new Notification(`New message from ${message.sender.name}`, {
            body: message.content.slice(0, 100),
            icon: message.sender.avatar_url || '/default-avatar.png',
          });
        }
      },
      onTyping: (data: { agentId: string; isTyping: boolean }) => {
        console.log('⌨️ Typing indicator:', data);

        if (data.isTyping) {
          setTypingUsers((prev) => new Set(prev).add(data.agentId));

          // Clear typing indicator after 3 seconds
          setTimeout(() => {
            setTypingUsers((prev) => {
              const newSet = new Set(prev);
              newSet.delete(data.agentId);
              return newSet;
            });
          }, 3000);
        } else {
          setTypingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(data.agentId);
            return newSet;
          });
        }
      },
      onConnect: () => {
        console.log('✅ WebSocket connected - Messages ready');
        fetchConversations();
      },
    });

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      // Cleanup handled by the component that initialized WebSocket
    };
  }, [apiKey, selectedConversation, fetchConversations]);

  return {
    conversations,
    messages,
    selectedConversation,
    loading,
    error,
    typingUsers,
    fetchConversations,
    fetchMessages,
    sendMessage,
    setTyping,
  };
}

export default useMessages;
