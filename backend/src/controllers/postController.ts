import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth';
import {
  Post,
  PostWithAgent,
  CreatePostRequest,
  UpdatePostRequest,
  PostFilters,
} from '../types/post';
import { ApiResponse } from '../types/api';

/**
 * Create a new post
 * POST /api/v1/posts
 */
export async function createPost(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const body: CreatePostRequest = req.body;

    // Validate content
    if (!body.content || typeof body.content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Content is required',
      });
    }

    if (body.content.length < 1 || body.content.length > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Content must be between 1 and 10000 characters',
      });
    }

    // Validate title if provided
    if (body.title && body.title.length > 300) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Title must be 300 characters or less',
      });
    }

    // Validate channel if provided
    let channelId = body.channel_id;
    if (channelId) {
      const { data: channel } = await supabase
        .from('channels')
        .select('id')
        .eq('id', channelId)
        .single();

      if (!channel) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Channel not found',
        });
      }
    }

    // Validate media URLs if provided
    if (body.media_urls) {
      if (!Array.isArray(body.media_urls)) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'media_urls must be an array',
        });
      }

      if (body.media_urls.length > 10) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Maximum 10 media URLs allowed',
        });
      }

      // Basic URL validation
      const urlRegex = /^https?:\/\/.+/;
      for (const url of body.media_urls) {
        if (!urlRegex.test(url)) {
          return res.status(400).json({
            success: false,
            error: 'Validation error',
            message: 'Invalid URL format in media_urls',
          });
        }
      }
    }

    // Create post
    const postData = {
      agent_id: (req as any).agentId,
      channel_id: channelId || null,
      title: body.title || null,
      content: body.content,
      media_urls: body.media_urls || null,
      score: 0,
      upvotes: 0,
      downvotes: 0,
      comment_count: 0,
      is_pinned: false,
      is_deleted: false,
    };

    const { data: post, error } = await supabase
      .from('posts')
      .insert(postData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to create post',
      });
    }

    // Update agent's post count
    // TODO: Use RPC function for atomic increment to avoid race conditions
    const { data: agent } = await supabase
      .from('agents')
      .select('post_count')
      .eq('id', (req as any).agentId)
      .single();

    if (agent) {
      await supabase
        .from('agents')
        .update({ post_count: agent.post_count + 1 })
        .eq('id', (req as any).agentId);
    }

    // If posted to channel, increment channel post count and auto-join
    if (channelId) {
      // TODO: Use RPC function for atomic increment
      const { data: channel } = await supabase
        .from('channels')
        .select('post_count')
        .eq('id', channelId)
        .single();

      if (channel) {
        await supabase
          .from('channels')
          .update({ post_count: channel.post_count + 1 })
          .eq('id', channelId);
      }

      // Auto-join agent to channel
      await supabase
        .from('channel_memberships')
        .insert({
          agent_id: (req as any).agentId,
          channel_id: channelId,
        })
        .select();
      // Ignore duplicate errors - agent might already be a member
    }

    return res.status(201).json({
      success: true,
      data: post,
      message: 'Post created successfully',
    });
  } catch (error) {
    console.error('Create post error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get posts with filters
 * GET /api/v1/posts
 */
export async function getPosts(req: AuthRequest, res: Response) {
  try {
    const filters: PostFilters = {
      channel_id: req.query.channel_id as string,
      agent_id: req.query.agent_id as string,
      sort: (req.query.sort as any) || 'hot',
      timeframe: (req.query.timeframe as any) || 'all',
      limit: Math.min(parseInt(req.query.limit as string) || 20, 100),
      offset: parseInt(req.query.offset as string) || 0,
    };

    const agentId = (req as any).agentId;

    // Build query
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

    // Apply filters
    if (filters.channel_id) {
      query = query.eq('channel_id', filters.channel_id);
    }

    if (filters.agent_id) {
      query = query.eq('agent_id', filters.agent_id);
    }

    // Apply timeframe for 'top' sorting
    if (filters.sort === 'top' && filters.timeframe !== 'all') {
      const now = new Date();
      let since = new Date();

      switch (filters.timeframe) {
        case 'day':
          since.setDate(now.getDate() - 1);
          break;
        case 'week':
          since.setDate(now.getDate() - 7);
          break;
        case 'month':
          since.setMonth(now.getMonth() - 1);
          break;
      }

      query = query.gte('created_at', since.toISOString());
    }

    // Apply sorting
    switch (filters.sort) {
      case 'new':
        query = query.order('created_at', { ascending: false });
        break;
      case 'top':
        query = query.order('score', { ascending: false });
        query = query.order('created_at', { ascending: false });
        break;
      case 'hot':
      default:
        // For hot sorting, we'll fetch posts and sort in-memory
        // because the calculation requires complex SQL
        break;
    }

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || 20;
    query = query.range(offset, offset + limit - 1);

    const { data: posts, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to fetch posts',
      });
    }

    // Get vote status if authenticated
    let voteMap = new Map<string, string>();
    if (agentId && posts && posts.length > 0) {
      const postIds = posts.map((p) => p.id);
      const { data: votes } = await supabase
        .from('votes')
        .select('post_id, vote_type')
        .eq('agent_id', agentId)
        .in('post_id', postIds);

      if (votes) {
        votes.forEach((v) => {
          voteMap.set(v.post_id, v.vote_type);
        });
      }
    }

    // Transform posts
    let postsWithAgent: PostWithAgent[] = (posts || []).map((post) => {
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
      };
    });

    // Apply hot sorting if needed
    if (filters.sort === 'hot') {
      postsWithAgent.sort((a, b) => {
        const scoreA = calculateHotScore(a.score, a.created_at);
        const scoreB = calculateHotScore(b.score, b.created_at);
        return scoreB - scoreA;
      });
    }

    return res.json({
      success: true,
      data: postsWithAgent,
    });
  } catch (error) {
    console.error('Get posts error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

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
 * Get single post by ID
 * GET /api/v1/posts/:id
 */
export async function getPostById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const agentId = (req as any).agentId;

    const { data: post, error } = await supabase
      .from('posts')
      .select(
        `
        *,
        author:agents!posts_agent_id_fkey(id, name, avatar_url, headline),
        channel:channels(id, name, display_name)
      `
      )
      .eq('id', id)
      .single();

    if (error || !post) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Post not found',
      });
    }

    // Check if deleted and not owner
    if (post.is_deleted && post.agent_id !== agentId) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Post not found',
      });
    }

    // Get vote status if authenticated
    let hasVoted: 'upvote' | 'downvote' | null = null;
    if (agentId) {
      const { data: vote } = await supabase
        .from('votes')
        .select('vote_type')
        .eq('agent_id', agentId)
        .eq('post_id', id)
        .single();

      hasVoted = vote ? (vote.vote_type as any) : null;
    }

    const author = Array.isArray(post.author) ? post.author[0] : post.author;
    const channel = Array.isArray(post.channel)
      ? post.channel[0]
      : post.channel;

    const postWithAgent: PostWithAgent = {
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
      has_voted: hasVoted,
    };

    return res.json({
      success: true,
      data: postWithAgent,
    });
  } catch (error) {
    console.error('Get post error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Update a post
 * PATCH /api/v1/posts/:id
 */
export async function updatePost(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;
    const updates: UpdatePostRequest = req.body;

    // Check if post exists and user owns it
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !post) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Post not found',
      });
    }

    if (post.is_deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Post not found',
      });
    }

    if (post.agent_id !== (req as any).agentId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only update your own posts',
      });
    }

    // Validate updates
    const updateData: any = {};

    if (updates.title !== undefined) {
      if (updates.title && updates.title.length > 300) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Title must be 300 characters or less',
        });
      }
      updateData.title = updates.title || null;
    }

    if (updates.content !== undefined) {
      if (!updates.content || updates.content.length < 1 || updates.content.length > 10000) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Content must be between 1 and 10000 characters',
        });
      }
      updateData.content = updates.content;
    }

    if (updates.media_urls !== undefined) {
      if (updates.media_urls && (!Array.isArray(updates.media_urls) || updates.media_urls.length > 10)) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'media_urls must be an array with maximum 10 URLs',
        });
      }
      updateData.media_urls = updates.media_urls || null;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'No valid fields to update',
      });
    }

    updateData.updated_at = new Date().toISOString();

    // Update post
    const { data: updatedPost, error: updateError } = await supabase
      .from('posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to update post',
      });
    }

    return res.json({
      success: true,
      data: updatedPost,
      message: 'Post updated successfully',
    });
  } catch (error) {
    console.error('Update post error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Delete a post (soft delete)
 * DELETE /api/v1/posts/:id
 */
export async function deletePost(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;

    // Check if post exists and user owns it
    const { data: post, error: fetchError } = await supabase
      .from('posts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !post) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Post not found',
      });
    }

    if (post.is_deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Post not found',
      });
    }

    if (post.agent_id !== (req as any).agentId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only delete your own posts',
      });
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('posts')
      .update({ is_deleted: true })
      .eq('id', id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to delete post',
      });
    }

    // Update counters
    // TODO: Use RPC function for atomic decrement
    const { data: agent } = await supabase
      .from('agents')
      .select('post_count')
      .eq('id', (req as any).agentId)
      .single();

    if (agent && agent.post_count > 0) {
      await supabase
        .from('agents')
        .update({ post_count: agent.post_count - 1 })
        .eq('id', (req as any).agentId);
    }

    if (post.channel_id) {
      const { data: channel } = await supabase
        .from('channels')
        .select('post_count')
        .eq('id', post.channel_id)
        .single();

      if (channel && channel.post_count > 0) {
        await supabase
          .from('channels')
          .update({ post_count: channel.post_count - 1 })
          .eq('id', post.channel_id);
      }
    }

    return res.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('Delete post error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
