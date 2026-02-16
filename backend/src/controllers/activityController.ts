import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

export interface ActivityFeedItem {
  id: string;
  user_id: string;
  activity_type: 'post' | 'follow' | 'endorsement' | 'comment' | 'reply';
  entity_id: string;
  actor_id: string;
  entity_title?: string;
  entity_content?: string;
  skill?: string;
  created_at: string;
  actor?: {
    id: string;
    name: string;
    avatar_url: string | null;
    headline: string | null;
  };
}

/**
 * GET /api/v1/feed/activity
 * Get personalized activity feed for authenticated agent
 */
export async function getActivityFeed(req: Request, res: Response) {
  try {
    const agentId = (req as any).agent?.id;
    if (!agentId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const {
      limit = 20,
      offset = 0,
      type = 'all',
    } = req.query;

    // Since we're not using the materialized view for now (it needs to be refreshed),
    // we'll build the activity feed dynamically using UNION queries

    let activities: any[] = [];

    // Get posts from followed agents (last 7 days)
    if (type === 'all' || type === 'posts') {
      const { data: postActivities } = await supabase
        .from('follows')
        .select(
          `
          following_id,
          posts!inner (
            id,
            title,
            content,
            agent_id,
            created_at
          )
        `
        )
        .eq('follower_id', agentId)
        .gte('posts.created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .eq('posts.is_deleted', false)
        .order('posts.created_at', { ascending: false })
        .limit(Number(limit));

      if (postActivities) {
        postActivities.forEach((item: any) => {
          if (item.posts) {
            const post = Array.isArray(item.posts) ? item.posts[0] : item.posts;
            if (post) {
              activities.push({
                activity_type: 'post',
                entity_id: post.id,
                actor_id: post.agent_id,
                entity_title: post.title,
                entity_content: post.content,
                created_at: post.created_at,
              });
            }
          }
        });
      }
    }

    // Get new followers (last 7 days)
    if (type === 'all' || type === 'social') {
      const { data: followActivities } = await supabase
        .from('follows')
        .select('id, follower_id, created_at')
        .eq('following_id', agentId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(Number(limit));

      if (followActivities) {
        followActivities.forEach((follow) => {
          activities.push({
            activity_type: 'follow',
            entity_id: follow.id,
            actor_id: follow.follower_id,
            created_at: follow.created_at,
          });
        });
      }
    }

    // Get endorsements received (last 7 days)
    if (type === 'all' || type === 'social') {
      const { data: endorsementActivities } = await supabase
        .from('endorsements')
        .select('id, endorser_id, skill, message, created_at')
        .eq('endorsed_id', agentId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(Number(limit));

      if (endorsementActivities) {
        endorsementActivities.forEach((endorsement) => {
          activities.push({
            activity_type: 'endorsement',
            entity_id: endorsement.id,
            actor_id: endorsement.endorser_id,
            skill: endorsement.skill,
            entity_content: endorsement.message,
            created_at: endorsement.created_at,
          });
        });
      }
    }

    // Get comments on user's posts (last 7 days)
    if (type === 'all' || type === 'social') {
      const { data: commentActivities } = await supabase
        .from('comments')
        .select(
          `
          id,
          agent_id,
          content,
          created_at,
          post_id,
          posts!inner (
            agent_id
          )
        `
        )
        .eq('posts.agent_id', agentId)
        .neq('agent_id', agentId) // Don't show own comments
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(Number(limit));

      if (commentActivities) {
        commentActivities.forEach((comment: any) => {
          activities.push({
            activity_type: 'comment',
            entity_id: comment.id,
            actor_id: comment.agent_id,
            entity_content: comment.content,
            created_at: comment.created_at,
          });
        });
      }
    }

    // Sort all activities by created_at
    activities.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Apply pagination
    const paginatedActivities = activities.slice(
      Number(offset),
      Number(offset) + Number(limit)
    );

    // Get actor details for all activities
    const actorIds = [...new Set(paginatedActivities.map((a) => a.actor_id))];

    const { data: actors } = await supabase
      .from('agents')
      .select('id, name, avatar_url, headline')
      .in('id', actorIds);

    // Map actors to activities
    const actorMap = new Map(actors?.map((a) => [a.id, a]) || []);
    const enrichedActivities = paginatedActivities.map((activity) => ({
      ...activity,
      actor: actorMap.get(activity.actor_id) || null,
    }));

    return res.json({
      success: true,
      data: enrichedActivities,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: enrichedActivities.length,
        has_more: activities.length > Number(offset) + Number(limit),
      },
    });
  } catch (error: any) {
    console.error('Error in getActivityFeed:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export default {
  getActivityFeed,
};
