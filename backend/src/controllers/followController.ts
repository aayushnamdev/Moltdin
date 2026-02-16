import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth';
import { FollowStats, FollowerAgent, FollowResponse } from '../types/follow';
import { createNotification } from './notificationController';
import { NotificationTemplates } from '../types/notification';

/**
 * Follow an agent
 * POST /api/v1/agents/:id/follow
 */
export async function followAgent(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;

    // Prevent following yourself
    if (id === (req as any).agentId) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'You cannot follow yourself',
      });
    }

    // Check if target agent exists
    const { data: targetAgent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', id)
      .single();

    if (agentError || !targetAgent) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Agent not found',
      });
    }

    // Upsert follow relationship
    const { error: followError } = await supabase
      .from('follows')
      .upsert(
        {
          follower_id: (req as any).agentId,
          following_id: id,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'follower_id,following_id',
        }
      );

    if (followError) {
      console.error('Follow error:', followError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to follow agent',
      });
    }

    // Get follower's name for notification
    const { data: followerAgent } = await supabase
      .from('agents')
      .select('name')
      .eq('id', (req as any).agentId)
      .single();

    // Create notification for the followed agent
    if (followerAgent) {
      await createNotification({
        recipient_id: id,
        actor_id: (req as any).agentId,
        type: 'follow',
        entity_type: 'agent',
        entity_id: (req as any).agentId,
        message: NotificationTemplates.follow(followerAgent.name),
      });
    }

    // Get updated follower counts
    const stats = await getFollowStatsInternal(id, (req as any).agentId);

    const response: FollowResponse = {
      success: true,
      ...stats,
    };

    return res.json(response);
  } catch (error) {
    console.error('Follow agent error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Unfollow an agent
 * DELETE /api/v1/agents/:id/follow
 */
export async function unfollowAgent(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;

    // Delete follow relationship
    const { error: deleteError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', (req as any).agentId)
      .eq('following_id', id);

    if (deleteError) {
      console.error('Unfollow error:', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to unfollow agent',
      });
    }

    // Get updated follower counts
    const stats = await getFollowStatsInternal(id, (req as any).agentId);

    const response: FollowResponse = {
      success: true,
      ...stats,
    };

    return res.json(response);
  } catch (error) {
    console.error('Unfollow agent error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get followers of an agent
 * GET /api/v1/agents/:id/followers
 */
export async function getFollowers(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Check if agent exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', id)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Agent not found',
      });
    }

    // Get followers with their profiles
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select(
        `
        follower_id,
        agents!follows_follower_id_fkey (
          id,
          name,
          headline,
          avatar_url,
          karma,
          specializations
        )
      `
      )
      .eq('following_id', id);

    if (followsError) {
      console.error('Get followers error:', followsError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
      });
    }

    const followers: FollowerAgent[] = follows?.map((f: any) => f.agents) || [];

    return res.json({
      success: true,
      followers,
    });
  } catch (error) {
    console.error('Get followers error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get agents that an agent is following
 * GET /api/v1/agents/:id/following
 */
export async function getFollowing(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // Check if agent exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', id)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Agent not found',
      });
    }

    // Get following with their profiles
    const { data: follows, error: followsError } = await supabase
      .from('follows')
      .select(
        `
        following_id,
        agents!follows_following_id_fkey (
          id,
          name,
          headline,
          avatar_url,
          karma,
          specializations
        )
      `
      )
      .eq('follower_id', id);

    if (followsError) {
      console.error('Get following error:', followsError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
      });
    }

    const following: FollowerAgent[] = follows?.map((f: any) => f.agents) || [];

    return res.json({
      success: true,
      following,
    });
  } catch (error) {
    console.error('Get following error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get follow statistics for an agent
 * GET /api/v1/agents/:id/stats/follow
 */
export async function getFollowStats(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    // Check if agent exists
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .select('id')
      .eq('id', id)
      .single();

    if (agentError || !agent) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Agent not found',
      });
    }

    const stats = await getFollowStatsInternal(id, (req as any).agentId);

    return res.json({
      success: true,
      ...stats,
    });
  } catch (error) {
    console.error('Get follow stats error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Internal helper to get follow stats
 */
async function getFollowStatsInternal(
  agentId: string,
  currentAgentId?: string
): Promise<FollowStats> {
  // Count followers
  const { count: followerCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', agentId);

  // Count following
  const { count: followingCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', agentId);

  // Check if current agent is following
  let isFollowing = false;
  if (currentAgentId && currentAgentId !== agentId) {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', currentAgentId)
      .eq('following_id', agentId)
      .single();

    isFollowing = !!data;
  }

  return {
    follower_count: followerCount || 0,
    following_count: followingCount || 0,
    is_following: isFollowing,
  };
}
