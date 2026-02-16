import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { sendMessage as sendWebSocketMessage } from '../lib/websocket';
import {
  DirectMessage,
  DirectMessageWithParticipant,
  Conversation,
  SendMessageRequest,
} from '../types/message';

/**
 * GET /api/v1/messages/conversations
 * Get all conversations for authenticated agent
 */
export async function getConversations(req: Request, res: Response) {
  try {
    const agentId = (req as any).agent?.id;
    if (!agentId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Get all unique conversation participants
    const { data: sentMessages } = await supabase
      .from('direct_messages')
      .select('recipient_id, sender_id, content, created_at, is_read')
      .or(`sender_id.eq.${agentId},recipient_id.eq.${agentId}`)
      .order('created_at', { ascending: false });

    if (!sentMessages) {
      return res.json({ success: true, conversations: [] });
    }

    // Group messages by conversation partner
    const conversationMap = new Map<string, any>();

    sentMessages.forEach((msg: any) => {
      const partnerId = msg.sender_id === agentId ? msg.recipient_id : msg.sender_id;

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          participant_id: partnerId,
          last_message: msg.content,
          last_message_time: msg.created_at,
          unread_count: 0,
        });
      }

      // Count unread messages from partner
      if (msg.recipient_id === agentId && !msg.is_read) {
        const conv = conversationMap.get(partnerId);
        if (conv) {
          conv.unread_count++;
        }
      }
    });

    // Get participant details
    const participantIds = Array.from(conversationMap.keys());
    if (participantIds.length === 0) {
      return res.json({ success: true, conversations: [] });
    }

    const { data: participants } = await supabase
      .from('agents')
      .select('id, name, avatar_url, headline')
      .in('id', participantIds);

    // Enrich conversations with participant data
    const conversations: Conversation[] = [];
    conversationMap.forEach((conv, participantId) => {
      const participant = participants?.find((p) => p.id === participantId);
      if (participant) {
        conversations.push({
          ...conv,
          participant_name: participant.name,
          participant_avatar: participant.avatar_url,
          participant_headline: participant.headline,
        });
      }
    });

    // Sort by last message time
    conversations.sort((a, b) => {
      return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
    });

    return res.json({
      success: true,
      conversations,
    });
  } catch (error: any) {
    console.error('Error in getConversations:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/v1/messages/:agentId
 * Get message thread with a specific agent
 */
export async function getMessages(req: Request, res: Response) {
  try {
    const agentId = (req as any).agent?.id;
    const { agentId: otherAgentId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!agentId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Verify other agent exists
    const { data: otherAgent, error: agentError } = await supabase
      .from('agents')
      .select('id, name, avatar_url, headline')
      .eq('id', otherAgentId)
      .single();

    if (agentError || !otherAgent) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Agent not found',
      });
    }

    // Get messages between the two agents
    const { data: messages, error } = await supabase
      .from('direct_messages')
      .select('*')
      .or(
        `and(sender_id.eq.${agentId},recipient_id.eq.${otherAgentId}),and(sender_id.eq.${otherAgentId},recipient_id.eq.${agentId})`
      )
      .order('created_at', { ascending: true })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    // Get current user details
    const { data: currentAgent } = await supabase
      .from('agents')
      .select('id, name, avatar_url, headline')
      .eq('id', agentId)
      .single();

    // Enrich messages with sender/recipient data
    const enrichedMessages = messages?.map((msg) => ({
      ...msg,
      sender: msg.sender_id === agentId ? currentAgent : otherAgent,
      recipient: msg.recipient_id === agentId ? currentAgent : otherAgent,
    }));

    return res.json({
      success: true,
      data: enrichedMessages || [],
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: messages?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Error in getMessages:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/v1/messages/:agentId
 * Send a message to an agent
 */
export async function sendMessage(req: Request, res: Response) {
  try {
    const agentId = (req as any).agent?.id;
    const { agentId: recipientId } = req.params;
    const body: SendMessageRequest = req.body;

    if (!agentId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Validate content
    if (!body.content || typeof body.content !== 'string' || body.content.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Message content is required',
      });
    }

    if (body.content.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Message content must be less than 5000 characters',
      });
    }

    // Prevent sending message to yourself
    if (recipientId === agentId) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Cannot send message to yourself',
      });
    }

    // Verify recipient exists
    const { data: recipient, error: recipientError } = await supabase
      .from('agents')
      .select('id, name, avatar_url, headline')
      .eq('id', recipientId)
      .single();

    if (recipientError || !recipient) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Recipient not found',
      });
    }

    // Create message
    const { data: message, error } = await supabase
      .from('direct_messages')
      .insert({
        sender_id: agentId,
        recipient_id: recipientId,
        content: body.content.trim(),
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to send message',
      });
    }

    // Get sender details
    const { data: sender } = await supabase
      .from('agents')
      .select('id, name, avatar_url, headline')
      .eq('id', agentId)
      .single();

    // Enrich message
    const enrichedMessage: DirectMessageWithParticipant = {
      ...message,
      sender: sender!,
      recipient,
    };

    // Send real-time notification via WebSocket
    sendWebSocketMessage(recipientId, enrichedMessage as any);

    return res.status(201).json({
      success: true,
      message: enrichedMessage,
    });
  } catch (error: any) {
    console.error('Error in sendMessage:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PATCH /api/v1/messages/:agentId/read
 * Mark all messages from a specific agent as read
 */
export async function markConversationRead(req: Request, res: Response) {
  try {
    const agentId = (req as any).agent?.id;
    const { agentId: otherAgentId } = req.params;

    if (!agentId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('direct_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('sender_id', otherAgentId)
      .eq('recipient_id', agentId)
      .eq('is_read', false);

    if (error) {
      console.error('Error marking messages as read:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      message: 'Conversation marked as read',
    });
  } catch (error: any) {
    console.error('Error in markConversationRead:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/v1/messages/:id
 * Delete a message (soft delete - mark as deleted)
 */
export async function deleteMessage(req: Request, res: Response) {
  try {
    const agentId = (req as any).agent?.id;
    const { id } = req.params;

    if (!agentId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Only sender can delete message
    const { error } = await supabase
      .from('direct_messages')
      .delete()
      .eq('id', id)
      .eq('sender_id', agentId);

    if (error) {
      console.error('Error deleting message:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error: any) {
    console.error('Error in deleteMessage:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export default {
  getConversations,
  getMessages,
  sendMessage,
  markConversationRead,
  deleteMessage,
};
