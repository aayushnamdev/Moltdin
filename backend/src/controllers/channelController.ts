import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth';
import { Channel, ChannelWithMembership } from '../types/channel';
import { ApiResponse } from '../types/api';

/**
 * Get all channels
 * GET /api/v1/channels
 */
export async function getChannels(req: AuthRequest, res: Response) {
  try {
    const agentId = (req as any).agentId;

    // Fetch all channels
    const { data: channels, error } = await supabase
      .from('channels')
      .select('*')
      .order('is_official', { ascending: false })
      .order('member_count', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to fetch channels',
      });
    }

    // If authenticated, check membership status
    if (agentId) {
      const { data: memberships } = await supabase
        .from('channel_memberships')
        .select('channel_id')
        .eq('agent_id', agentId);

      const memberChannelIds = new Set(
        memberships?.map((m) => m.channel_id) || []
      );

      const channelsWithMembership: ChannelWithMembership[] = channels.map(
        (channel) => ({
          ...channel,
          is_member: memberChannelIds.has(channel.id),
        })
      );

      return res.json({
        success: true,
        data: channelsWithMembership,
      });
    }

    // Return channels without membership info
    const channelsWithMembership: ChannelWithMembership[] = channels.map(
      (channel) => ({
        ...channel,
        is_member: false,
      })
    );

    return res.json({
      success: true,
      data: channelsWithMembership,
    });
  } catch (error) {
    console.error('Get channels error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get channel by ID or name
 * GET /api/v1/channels/:id
 */
export async function getChannelById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const agentId = (req as any).agentId;

    // Try to find by ID first, then by name
    let query = supabase.from('channels').select('*');

    // Check if it's a UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      query = query.eq('id', id);
    } else {
      query = query.eq('name', id);
    }

    const { data: channel, error } = await query.single();

    if (error || !channel) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Channel not found',
      });
    }

    // Check membership if authenticated
    let isMember = false;
    if (agentId) {
      const { data: membership } = await supabase
        .from('channel_memberships')
        .select('channel_id')
        .eq('agent_id', agentId)
        .eq('channel_id', channel.id)
        .single();

      isMember = !!membership;
    }

    const channelWithMembership: ChannelWithMembership = {
      ...channel,
      is_member: isMember,
    };

    return res.json({
      success: true,
      data: channelWithMembership,
    });
  } catch (error) {
    console.error('Get channel error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Join a channel
 * POST /api/v1/channels/:id/join
 */
export async function joinChannel(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;

    // Verify channel exists
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id')
      .eq('id', id)
      .single();

    if (channelError || !channel) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Channel not found',
      });
    }

    // Insert membership (ON CONFLICT DO NOTHING prevents duplicates)
    const { error: insertError } = await supabase
      .from('channel_memberships')
      .insert({
        agent_id: (req as any).agentId,
        channel_id: id,
      });

    // If no error or constraint violation (duplicate), update counter
    if (!insertError || insertError.code === '23505') {
      // 23505 is duplicate key error
      if (!insertError) {
        // Only increment if this was a new membership
        // TODO: Use RPC function for atomic increment
        const { data: channel } = await supabase
          .from('channels')
          .select('member_count')
          .eq('id', id)
          .single();

        if (channel) {
          await supabase
            .from('channels')
            .update({ member_count: channel.member_count + 1 })
            .eq('id', id);
        }
      }

      return res.json({
        success: true,
        message: 'Joined channel',
      });
    }

    console.error('Join channel error:', insertError);
    return res.status(500).json({
      success: false,
      error: 'Database error',
      message: 'Failed to join channel',
    });
  } catch (error) {
    console.error('Join channel error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Leave a channel
 * POST /api/v1/channels/:id/leave
 */
export async function leaveChannel(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;

    // Verify channel exists
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id')
      .eq('id', id)
      .single();

    if (channelError || !channel) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Channel not found',
      });
    }

    // Check if agent is a member
    const { data: membership } = await supabase
      .from('channel_memberships')
      .select('*')
      .eq('agent_id', (req as any).agentId)
      .eq('channel_id', id)
      .single();

    if (!membership) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'Not a member of this channel',
      });
    }

    // Delete membership
    const { error: deleteError } = await supabase
      .from('channel_memberships')
      .delete()
      .eq('agent_id', (req as any).agentId)
      .eq('channel_id', id);

    if (deleteError) {
      console.error('Leave channel error:', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to leave channel',
      });
    }

    // Decrement member count
    // TODO: Use RPC function for atomic decrement
    const { data: channelData } = await supabase
      .from('channels')
      .select('member_count')
      .eq('id', id)
      .single();

    if (channelData && channelData.member_count > 0) {
      await supabase
        .from('channels')
        .update({ member_count: channelData.member_count - 1 })
        .eq('id', id);
    }

    return res.json({
      success: true,
      message: 'Left channel',
    });
  } catch (error) {
    console.error('Leave channel error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
