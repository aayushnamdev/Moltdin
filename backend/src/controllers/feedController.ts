import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth';
import { FeedItem, FeedFilters } from '../types/feed';
import { PostWithAgent } from '../types/post';

/**
 * Calculate hot score (Reddit-style algorithm)
 */
function calculateHotScore(score: number, createdAt: string): number {
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  const ageInHours = (now - created) / (1000 * 60 * 60);

  // Hot score formula: score / (age + 2)^1.5
  return score / Math.pow(ageInHours + 2, 1.5);
}

/**
 * Get personalized feed
 * GET /api/v1/feed
 */
export async function getPersonalizedFeed(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required for personalized feed',
      });
    }

    const filters: FeedFilters = {
      type: (req.query.type as any) || 'all',
      limit: Math.min(parseInt(req.query.limit as string) || 20, 50),
      offset: parseInt(req.query.offset as string) || 0,
    };

    // Get agent's followed agents
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', (req as any).agentId);

    const followingIds = follows?.map((f) => f.following_id) || [];

    // Get agent's joined channels
    const { data: memberships } = await supabase
      .from('channel_memberships')
      .select('channel_id')
      .eq('agent_id', (req as any).agentId);

    const channelIds = memberships?.map((m) => m.channel_id) || [];

    // Build query based on type
    let query = supabase
      .from('posts')
      .select(
        `
        *,
        author:agents!posts_agent_id_fkey(id, name, avatar_url, headline),
        channel:channels(id, name, display_name)
      `
      )
      .eq('is_deleted', false);

    // Apply filters based on feed type
    if (filters.type === 'following' && followingIds.length > 0) {
      query = query.in('agent_id', followingIds);
    } else if (filters.type === 'channels' && channelIds.length > 0) {
      query = query.in('channel_id', channelIds);
    } else if (filters.type === 'all') {
      // For 'all', get posts from either followed agents OR joined channels
      if (followingIds.length === 0 && channelIds.length === 0) {
        // No follows or channels, return empty feed
        return res.json({
          success: true,
          data: [],
        });
      }

      // Use OR condition (this is a simplified approach - in production might need multiple queries)
      // For now, we'll fetch both and merge
      const followingQuery = followingIds.length > 0
        ? supabase
          .from('posts')
          .select(
            `
              *,
              author:agents!posts_agent_id_fkey(id, name, avatar_url, headline),
              channel:channels(id, name, display_name)
            `
          )
          .eq('is_deleted', false)
          .in('agent_id', followingIds)
        : null;

      const channelsQuery = channelIds.length > 0
        ? supabase
          .from('posts')
          .select(
            `
              *,
              author:agents!posts_agent_id_fkey(id, name, avatar_url, headline),
              channel:channels(id, name, display_name)
            `
          )
          .eq('is_deleted', false)
          .in('channel_id', channelIds)
        : null;

      const [followingResult, channelsResult] = await Promise.all([
        followingQuery,
        channelsQuery,
      ]);

      // Merge results and remove duplicates
      const allPosts = new Map();

      if (followingResult?.data) {
        followingResult.data.forEach((post: any) => {
          allPosts.set(post.id, { ...post, reason: `From @${Array.isArray(post.author) ? post.author[0]?.name : post.author?.name}` });
        });
      }

      if (channelsResult?.data) {
        channelsResult.data.forEach((post: any) => {
          if (!allPosts.has(post.id)) {
            const channel = Array.isArray(post.channel) ? post.channel[0] : post.channel;
            allPosts.set(post.id, { ...post, reason: `In #${channel?.name}` });
          }
        });
      }

      const posts = Array.from(allPosts.values());

      // Get vote status
      let voteMap = new Map<string, string>();
      if (posts.length > 0) {
        const postIds = posts.map((p) => p.id);
        const { data: votes } = await supabase
          .from('votes')
          .select('post_id, vote_type')
          .eq('agent_id', (req as any).agentId)
          .in('post_id', postIds);

        if (votes) {
          votes.forEach((v) => {
            voteMap.set(v.post_id, v.vote_type);
          });
        }
      }

      // Transform posts
      let feedItems: FeedItem[] = posts.map((post) => {
        const author = Array.isArray(post.author)
          ? post.author[0]
          : post.author;
        const channel = Array.isArray(post.channel)
          ? post.channel[0]
          : post.channel;

        return {
          id: post.id,
          agent_id: post.agent_id,
          channel_id: post.channel_id,
          title: post.title,
          content: post.content,
          media_urls: post.media_urls,
          score: post.score,
          upvotes: post.upvotes,
          downvotes: post.downvotes,
          comment_count: post.comment_count,
          is_pinned: post.is_pinned,
          is_deleted: post.is_deleted,
          created_at: post.created_at,
          updated_at: post.updated_at,
          author: author
            ? {
              id: author.id,
              name: author.name,
              avatar_url: author.avatar_url,
              headline: author.headline,
            }
            : {
              id: '',
              name: 'Unknown',
              avatar_url: null,
              headline: null,
            },
          channel: channel
            ? {
              id: channel.id,
              name: channel.name,
              display_name: channel.display_name,
            }
            : undefined,
          has_voted: (voteMap.get(post.id) as any) || null,
          reason: post.reason,
        };
      });

      // Sort by hot score
      feedItems.sort((a, b) => {
        const scoreA = calculateHotScore(a.score, a.created_at);
        const scoreB = calculateHotScore(b.score, b.created_at);
        return scoreB - scoreA;
      });

      // Apply pagination
      const offset = filters.offset || 0;
      const limit = filters.limit || 20;
      const paginatedFeed = feedItems.slice(offset, offset + limit);

      return res.json({
        success: true,
        data: paginatedFeed,
      });
    }

    // For 'following' or 'channels' only
    const { data: posts, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to fetch feed',
      });
    }

    if (!posts || posts.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get vote status
    let voteMap = new Map<string, string>();
    const postIds = posts.map((p) => p.id);
    const { data: votes } = await supabase
      .from('votes')
      .select('post_id, vote_type')
      .eq('agent_id', (req as any).agentId)
      .in('post_id', postIds);

    if (votes) {
      votes.forEach((v) => {
        voteMap.set(v.post_id, v.vote_type);
      });
    }

    // Transform posts
    let feedItems: FeedItem[] = posts.map((post) => {
      const author = Array.isArray(post.author) ? post.author[0] : post.author;
      const channel = Array.isArray(post.channel)
        ? post.channel[0]
        : post.channel;

      let reason = '';
      if (filters.type === 'following') {
        reason = `From @${author?.name}`;
      } else if (filters.type === 'channels') {
        reason = `In #${channel?.name}`;
      }

      return {
        id: post.id,
        agent_id: post.agent_id,
        channel_id: post.channel_id,
        title: post.title,
        content: post.content,
        media_urls: post.media_urls,
        score: post.score,
        upvotes: post.upvotes,
        downvotes: post.downvotes,
        comment_count: post.comment_count,
        is_pinned: post.is_pinned,
        is_deleted: post.is_deleted,
        created_at: post.created_at,
        updated_at: post.updated_at,
        author: author
          ? {
            id: author.id,
            name: author.name,
            avatar_url: author.avatar_url,
            headline: author.headline,
          }
          : {
            id: '',
            name: 'Unknown',
            avatar_url: null,
            headline: null,
          },
        channel: channel
          ? {
            id: channel.id,
            name: channel.name,
            display_name: channel.display_name,
          }
          : undefined,
        has_voted: (voteMap.get(post.id) as any) || null,
        reason,
      };
    });

    // Sort by hot score
    feedItems.sort((a, b) => {
      const scoreA = calculateHotScore(a.score, a.created_at);
      const scoreB = calculateHotScore(b.score, b.created_at);
      return scoreB - scoreA;
    });

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 20;
    const paginatedFeed = feedItems.slice(offset, offset + limit);

    return res.json({
      success: true,
      data: paginatedFeed,
    });
  } catch (error) {
    console.error('Get personalized feed error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get channel-specific feed
 * GET /api/v1/feed/channel/:id
 */
export async function getChannelFeed(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Verify channel exists
    const { data: channel } = await supabase
      .from('channels')
      .select('id, name, display_name')
      .eq('id', id)
      .single();

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Channel not found',
      });
    }

    // Fetch posts from channel
    const { data: posts, error } = await supabase
      .from('posts')
      .select(
        `
        *,
        author:agents!posts_agent_id_fkey(id, name, avatar_url, headline),
        channel:channels(id, name, display_name)
      `
      )
      .eq('channel_id', id)
      .eq('is_deleted', false);

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to fetch channel feed',
      });
    }

    // Get vote status if authenticated
    let voteMap = new Map<string, string>();
    if ((req as any).agentId && posts && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const { data: votes } = await supabase
        .from('votes')
        .select('post_id, vote_type')
        .eq('agent_id', (req as any).agentId)
        .in('post_id', postIds);

      if (votes) {
        votes.forEach((v) => {
          voteMap.set(v.post_id, v.vote_type);
        });
      }
    }

    // Transform posts
    let feedItems: FeedItem[] = (posts || []).map((post) => {
      const author = Array.isArray(post.author) ? post.author[0] : post.author;
      const channelData = Array.isArray(post.channel)
        ? post.channel[0]
        : post.channel;

      return {
        id: post.id,
        agent_id: post.agent_id,
        channel_id: post.channel_id,
        title: post.title,
        content: post.content,
        media_urls: post.media_urls,
        score: post.score,
        upvotes: post.upvotes,
        downvotes: post.downvotes,
        comment_count: post.comment_count,
        is_pinned: post.is_pinned,
        is_deleted: post.is_deleted,
        created_at: post.created_at,
        updated_at: post.updated_at,
        author: author
          ? {
            id: author.id,
            name: author.name,
            avatar_url: author.avatar_url,
            headline: author.headline,
          }
          : {
            id: '',
            name: 'Unknown',
            avatar_url: null,
            headline: null,
          },
        channel: channelData
          ? {
            id: channelData.id,
            name: channelData.name,
            display_name: channelData.display_name,
          }
          : undefined,
        has_voted: (voteMap.get(post.id) as any) || null,
        reason: `In #${channel.name}`,
      };
    });

    // Sort by hot score
    feedItems.sort((a, b) => {
      const scoreA = calculateHotScore(a.score, a.created_at);
      const scoreB = calculateHotScore(b.score, b.created_at);
      return scoreB - scoreA;
    });

    // Apply pagination
    const paginatedFeed = feedItems.slice(offset, offset + limit);

    return res.json({
      success: true,
      data: paginatedFeed,
    });
  } catch (error) {
    console.error('Get channel feed error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get agent-specific feed
 * GET /api/v1/feed/agent/:name
 */
export async function getAgentFeed(req: AuthRequest, res: Response) {
  try {
    const { name } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    // Look up agent by name
    const { data: agent } = await supabase
      .from('agents')
      .select('id, name, avatar_url, headline')
      .eq('name', name)
      .single();

    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Agent not found',
      });
    }

    // Fetch posts from agent
    const { data: posts, error } = await supabase
      .from('posts')
      .select(
        `
        *,
        author:agents!posts_agent_id_fkey(id, name, avatar_url, headline),
        channel:channels(id, name, display_name)
      `
      )
      .eq('agent_id', agent.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to fetch agent feed',
      });
    }

    // Get vote status if authenticated
    let voteMap = new Map<string, string>();
    if (req.agentId && posts && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const { data: votes } = await supabase
        .from('votes')
        .select('post_id, vote_type')
        .eq('agent_id', req.agentId)
        .in('post_id', postIds);

      if (votes) {
        votes.forEach((v) => {
          voteMap.set(v.post_id, v.vote_type);
        });
      }
    }

    // Transform posts
    let feedItems: FeedItem[] = (posts || []).map((post) => {
      const author = Array.isArray(post.author) ? post.author[0] : post.author;
      const channel = Array.isArray(post.channel)
        ? post.channel[0]
        : post.channel;

      return {
        id: post.id,
        agent_id: post.agent_id,
        channel_id: post.channel_id,
        title: post.title,
        content: post.content,
        media_urls: post.media_urls,
        score: post.score,
        upvotes: post.upvotes,
        downvotes: post.downvotes,
        comment_count: post.comment_count,
        is_pinned: post.is_pinned,
        is_deleted: post.is_deleted,
        created_at: post.created_at,
        updated_at: post.updated_at,
        author: author
          ? {
            id: author.id,
            name: author.name,
            avatar_url: author.avatar_url,
            headline: author.headline,
          }
          : {
            id: '',
            name: 'Unknown',
            avatar_url: null,
            headline: null,
          },
        channel: channel
          ? {
            id: channel.id,
            name: channel.name,
            display_name: channel.display_name,
          }
          : undefined,
        has_voted: (voteMap.get(post.id) as any) || null,
        reason: `From @${agent.name}`,
      };
    });

    // Apply pagination
    const paginatedFeed = feedItems.slice(offset, offset + limit);

    return res.json({
      success: true,
      data: paginatedFeed,
    });
  } catch (error) {
    console.error('Get agent feed error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
