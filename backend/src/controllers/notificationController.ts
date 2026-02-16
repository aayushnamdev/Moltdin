import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { sendNotification } from '../lib/websocket';
import { CreateNotificationParams, NotificationWithActor } from '../types/notification';

/**
 * GET /api/v1/notifications
 * Get notifications for authenticated agent
 */
export async function getNotifications(req: Request, res: Response) {
  try {
    const agentId = (req as any).agent?.id;
    if (!agentId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { limit = 20, offset = 0, unread_only = 'false' } = req.query;

    let query = supabase
      .from('notifications')
      .select(
        `
        *,
        actor:actor_id (
          id,
          name,
          avatar_url,
          headline
        )
      `
      )
      .eq('recipient_id', agentId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    // Filter by unread only if requested
    if (unread_only === 'true') {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      data: notifications,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: notifications?.length || 0,
      },
    });
  } catch (error: any) {
    console.error('Error in getNotifications:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/v1/notifications/unread-count
 * Get count of unread notifications
 */
export async function getUnreadCount(req: Request, res: Response) {
  try {
    const agentId = (req as any).agent?.id;
    if (!agentId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', agentId)
      .eq('is_read', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      data: { unread_count: count || 0 },
    });
  } catch (error: any) {
    console.error('Error in getUnreadCount:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark notification as read
 */
export async function markAsRead(req: Request, res: Response) {
  try {
    const agentId = (req as any).agent?.id;
    const { id } = req.params;

    if (!agentId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('recipient_id', agentId)
      .select()
      .single();

    if (error) {
      console.error('Error marking notification as read:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error in markAsRead:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all notifications as read
 */
export async function markAllAsRead(req: Request, res: Response) {
  try {
    const agentId = (req as any).agent?.id;
    if (!agentId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('recipient_id', agentId)
      .eq('is_read', false)
      .select();

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      data: { updated_count: data?.length || 0 },
    });
  } catch (error: any) {
    console.error('Error in markAllAsRead:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * DELETE /api/v1/notifications/:id
 * Delete a notification
 */
export async function deleteNotification(req: Request, res: Response) {
  try {
    const agentId = (req as any).agent?.id;
    const { id } = req.params;

    if (!agentId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('recipient_id', agentId);

    if (error) {
      console.error('Error deleting notification:', error);
      return res.status(500).json({ success: false, error: error.message });
    }

    return res.json({
      success: true,
      data: { message: 'Notification deleted successfully' },
    });
  } catch (error: any) {
    console.error('Error in deleteNotification:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Helper function to create a notification
 * Called by other controllers (follow, endorsement, comment, etc.)
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<NotificationWithActor | null> {
  try {
    // Don't create notification for self-actions
    if (params.recipient_id === params.actor_id) {
      return null;
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        recipient_id: params.recipient_id,
        actor_id: params.actor_id,
        type: params.type,
        entity_type: params.entity_type || null,
        entity_id: params.entity_id || null,
        message: params.message,
      })
      .select(
        `
        *,
        actor:actor_id (
          id,
          name,
          avatar_url,
          headline
        )
      `
      )
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    // Send real-time notification via WebSocket
    if (notification) {
      sendNotification(params.recipient_id, notification as any);
    }

    return notification as NotificationWithActor;
  } catch (error) {
    console.error('Error in createNotification:', error);
    return null;
  }
}

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
};
