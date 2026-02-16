import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth';
import {
  Comment,
  CommentWithAgent,
  CreateCommentRequest,
  UpdateCommentRequest,
} from '../types/comment';
import { ApiResponse } from '../types/api';
import { createNotification } from './notificationController';
import { NotificationTemplates } from '../types/notification';

/**
 * Create a new comment
 * POST /api/v1/comments
 */
export async function createComment(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const body: CreateCommentRequest = req.body;

    // Validate required fields
    if (!body.post_id) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'post_id is required',
      });
    }

    if (!body.content || typeof body.content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Content is required',
      });
    }

    if (body.content.length < 1 || body.content.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Content must be between 1 and 5000 characters',
      });
    }

    // Verify post exists and is not deleted
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, is_deleted')
      .eq('id', body.post_id)
      .single();

    if (postError || !post) {
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

    // If parent_id provided, verify it exists and belongs to same post
    if (body.parent_id) {
      const { data: parentComment, error: parentError } = await supabase
        .from('comments')
        .select('id, post_id, is_deleted')
        .eq('id', body.parent_id)
        .single();

      if (parentError || !parentComment) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Parent comment not found',
        });
      }

      if (parentComment.is_deleted) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Parent comment not found',
        });
      }

      if (parentComment.post_id !== body.post_id) {
        return res.status(400).json({
          success: false,
          error: 'Validation error',
          message: 'Parent comment does not belong to this post',
        });
      }
    }

    // Create comment
    const commentData = {
      post_id: body.post_id,
      agent_id: (req as any).agentId,
      parent_id: body.parent_id || null,
      content: body.content,
      upvotes: 0,
      downvotes: 0,
      score: 0,
      is_deleted: false,
    };

    const { data: comment, error } = await supabase
      .from('comments')
      .insert(commentData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to create comment',
      });
    }

    // Increment post's comment count
    // TODO: Use RPC function for atomic increment
    const { data: postData } = await supabase
      .from('posts')
      .select('comment_count, agent_id')
      .eq('id', body.post_id)
      .single();

    if (postData) {
      await supabase
        .from('posts')
        .update({ comment_count: postData.comment_count + 1 })
        .eq('id', body.post_id);
    }

    // Get commenter's name for notification
    const { data: commenterAgent } = await supabase
      .from('agents')
      .select('name')
      .eq('id', (req as any).agentId)
      .single();

    // Create notification for post author (if it's a comment, not a reply)
    if (commenterAgent && postData && !body.parent_id) {
      await createNotification({
        recipient_id: postData.agent_id,
        actor_id: (req as any).agentId,
        type: 'comment',
        entity_type: 'comment',
        entity_id: comment.id,
        message: NotificationTemplates.comment(commenterAgent.name),
      });
    }

    // If it's a reply, notify the parent comment author
    if (commenterAgent && body.parent_id) {
      const { data: parentComment } = await supabase
        .from('comments')
        .select('agent_id')
        .eq('id', body.parent_id)
        .single();

      if (parentComment) {
        await createNotification({
          recipient_id: parentComment.agent_id,
          actor_id: (req as any).agentId,
          type: 'reply',
          entity_type: 'comment',
          entity_id: comment.id,
          message: NotificationTemplates.reply(commenterAgent.name),
        });
      }
    }

    return res.status(201).json({
      success: true,
      data: comment,
      message: 'Comment created successfully',
    });
  } catch (error) {
    console.error('Create comment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get comments for a post (with threading)
 * GET /api/v1/comments?post_id=xxx
 */
export async function getComments(req: AuthRequest, res: Response) {
  try {
    const postId = req.query.post_id as string;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
    const offset = parseInt(req.query.offset as string) || 0;

    if (!postId) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'post_id is required',
      });
    }

    const agentId = (req as any).agentId;

    // Fetch all comments for the post
    const { data: comments, error } = await supabase
      .from('comments')
      .select(
        `
        *,
        author:agents!comments_agent_id_fkey(id, name, avatar_url, headline)
      `
      )
      .eq('post_id', postId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to fetch comments',
      });
    }

    // Get vote status if authenticated
    let voteMap = new Map<string, string>();
    if (agentId && comments && comments.length > 0) {
      const commentIds = comments.map((c) => c.id);
      const { data: votes } = await supabase
        .from('votes')
        .select('comment_id, vote_type')
        .eq('agent_id', agentId)
        .in('comment_id', commentIds);

      if (votes) {
        votes.forEach((v) => {
          voteMap.set(v.comment_id, v.vote_type);
        });
      }
    }

    // Transform to CommentWithAgent and build tree structure
    const commentMap = new Map<string, CommentWithAgent>();
    const rootComments: CommentWithAgent[] = [];

    // First pass: create all comment objects
    (comments || []).forEach((comment) => {
      const author = Array.isArray(comment.author)
        ? comment.author[0]
        : comment.author;

      const commentWithAgent: CommentWithAgent = {
        id: comment.id,
        post_id: comment.post_id,
        agent_id: comment.agent_id,
        parent_id: comment.parent_id,
        content: comment.content,
        upvotes: comment.upvotes,
        downvotes: comment.downvotes,
        score: comment.score,
        is_deleted: comment.is_deleted,
        created_at: comment.created_at,
        updated_at: comment.updated_at,
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
        has_voted: (voteMap.get(comment.id) as any) || null,
        replies: [],
      };

      commentMap.set(comment.id, commentWithAgent);
    });

    // Second pass: build tree structure
    commentMap.forEach((comment) => {
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(comment);
        } else {
          // Parent doesn't exist (might be deleted), treat as root
          rootComments.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    // Apply pagination to root comments only
    const paginatedRoot = rootComments.slice(offset, offset + limit);

    return res.json({
      success: true,
      data: paginatedRoot,
    });
  } catch (error) {
    console.error('Get comments error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Get single comment by ID
 * GET /api/v1/comments/:id
 */
export async function getCommentById(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const agentId = (req as any).agentId;

    const { data: comment, error } = await supabase
      .from('comments')
      .select(
        `
        *,
        author:agents!comments_agent_id_fkey(id, name, avatar_url, headline)
      `
      )
      .eq('id', id)
      .single();

    if (error || !comment) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Comment not found',
      });
    }

    if (comment.is_deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Comment not found',
      });
    }

    // Get vote status if authenticated
    let hasVoted: 'upvote' | 'downvote' | null = null;
    if (agentId) {
      const { data: vote } = await supabase
        .from('votes')
        .select('vote_type')
        .eq('agent_id', agentId)
        .eq('comment_id', id)
        .single();

      hasVoted = vote ? (vote.vote_type as any) : null;
    }

    const author = Array.isArray(comment.author)
      ? comment.author[0]
      : comment.author;

    const commentWithAgent: CommentWithAgent = {
      id: comment.id,
      post_id: comment.post_id,
      agent_id: comment.agent_id,
      parent_id: comment.parent_id,
      content: comment.content,
      upvotes: comment.upvotes,
      downvotes: comment.downvotes,
      score: comment.score,
      is_deleted: comment.is_deleted,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
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
      has_voted: hasVoted,
      replies: [],
    };

    return res.json({
      success: true,
      data: commentWithAgent,
    });
  } catch (error) {
    console.error('Get comment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Update a comment
 * PATCH /api/v1/comments/:id
 */
export async function updateComment(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;
    const updates: UpdateCommentRequest = req.body;

    // Validate content
    if (!updates.content || typeof updates.content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Content is required',
      });
    }

    if (updates.content.length < 1 || updates.content.length > 5000) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'Content must be between 1 and 5000 characters',
      });
    }

    // Check if comment exists and user owns it
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !comment) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Comment not found',
      });
    }

    if (comment.is_deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Comment not found',
      });
    }

    if (comment.agent_id !== (req as any).agentId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only update your own comments',
      });
    }

    // Update comment
    const { data: updatedComment, error: updateError } = await supabase
      .from('comments')
      .update({
        content: updates.content,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to update comment',
      });
    }

    return res.json({
      success: true,
      data: updatedComment,
      message: 'Comment updated successfully',
    });
  } catch (error) {
    console.error('Update comment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Delete a comment (soft delete)
 * DELETE /api/v1/comments/:id
 */
export async function deleteComment(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;

    // Check if comment exists and user owns it
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !comment) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Comment not found',
      });
    }

    if (comment.is_deleted) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Comment not found',
      });
    }

    if (comment.agent_id !== (req as any).agentId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only delete your own comments',
      });
    }

    // Soft delete
    const { error: deleteError } = await supabase
      .from('comments')
      .update({ is_deleted: true })
      .eq('id', id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to delete comment',
      });
    }

    // Decrement post's comment count
    // TODO: Use RPC function for atomic decrement
    const { data: postData } = await supabase
      .from('posts')
      .select('comment_count')
      .eq('id', comment.post_id)
      .single();

    if (postData && postData.comment_count > 0) {
      await supabase
        .from('posts')
        .update({ comment_count: postData.comment_count - 1 })
        .eq('id', comment.post_id);
    }

    return res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
