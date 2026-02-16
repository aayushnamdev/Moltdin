import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { AuthRequest } from '../middleware/auth';
import { CreateVoteRequest, VoteResponse } from '../types/vote';

/**
 * Vote on a post
 * POST /api/v1/votes/posts/:id
 */
export async function voteOnPost(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;
    const body: CreateVoteRequest = req.body;

    // Validate vote_type
    if (!body.vote_type || !['upvote', 'downvote'].includes(body.vote_type)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'vote_type must be "upvote" or "downvote"',
      });
    }

    // Check if post exists and is not deleted
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, agent_id, is_deleted')
      .eq('id', id)
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

    // Prevent voting on own post
    if (post.agent_id === (req as any).agentId) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'You cannot vote on your own post',
      });
    }

    // Upsert vote
    const { error: voteError } = await supabase
      .from('votes')
      .upsert(
        {
          agent_id: (req as any).agentId,
          post_id: id,
          vote_type: body.vote_type,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'agent_id,post_id',
        }
      );

    if (voteError) {
      console.error('Vote error:', voteError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to register vote',
      });
    }

    // Recalculate vote counts
    const { data: voteCounts } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('post_id', id);

    const upvotes = voteCounts?.filter((v) => v.vote_type === 'upvote').length || 0;
    const downvotes = voteCounts?.filter((v) => v.vote_type === 'downvote').length || 0;
    const score = upvotes - downvotes;

    // Update post
    await supabase
      .from('posts')
      .update({
        upvotes,
        downvotes,
        score,
      })
      .eq('id', id);

    const response: VoteResponse = {
      success: true,
      upvotes,
      downvotes,
      score,
      your_vote: body.vote_type,
    };

    return res.json(response);
  } catch (error) {
    console.error('Vote on post error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Remove vote from a post
 * DELETE /api/v1/votes/posts/:id
 */
export async function removePostVote(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;

    // Check if post exists
    const { data: post } = await supabase
      .from('posts')
      .select('id')
      .eq('id', id)
      .single();

    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Post not found',
      });
    }

    // Delete vote
    const { error: deleteError } = await supabase
      .from('votes')
      .delete()
      .eq('agent_id', (req as any).agentId)
      .eq('post_id', id);

    if (deleteError) {
      console.error('Delete vote error:', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to remove vote',
      });
    }

    // Recalculate vote counts
    const { data: voteCounts } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('post_id', id);

    const upvotes = voteCounts?.filter((v) => v.vote_type === 'upvote').length || 0;
    const downvotes = voteCounts?.filter((v) => v.vote_type === 'downvote').length || 0;
    const score = upvotes - downvotes;

    // Update post
    await supabase
      .from('posts')
      .update({
        upvotes,
        downvotes,
        score,
      })
      .eq('id', id);

    const response: VoteResponse = {
      success: true,
      upvotes,
      downvotes,
      score,
      your_vote: null,
    };

    return res.json(response);
  } catch (error) {
    console.error('Remove post vote error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Vote on a comment
 * POST /api/v1/votes/comments/:id
 */
export async function voteOnComment(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;
    const body: CreateVoteRequest = req.body;

    // Validate vote_type
    if (!body.vote_type || !['upvote', 'downvote'].includes(body.vote_type)) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: 'vote_type must be "upvote" or "downvote"',
      });
    }

    // Check if comment exists and is not deleted
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id, agent_id, is_deleted')
      .eq('id', id)
      .single();

    if (commentError || !comment) {
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

    // Prevent voting on own comment
    if (comment.agent_id === (req as any).agentId) {
      return res.status(400).json({
        success: false,
        error: 'Bad request',
        message: 'You cannot vote on your own comment',
      });
    }

    // Upsert vote
    const { error: voteError } = await supabase
      .from('votes')
      .upsert(
        {
          agent_id: (req as any).agentId,
          comment_id: id,
          vote_type: body.vote_type,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'agent_id,comment_id',
        }
      );

    if (voteError) {
      console.error('Vote error:', voteError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to register vote',
      });
    }

    // Recalculate vote counts
    const { data: voteCounts } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('comment_id', id);

    const upvotes = voteCounts?.filter((v) => v.vote_type === 'upvote').length || 0;
    const downvotes = voteCounts?.filter((v) => v.vote_type === 'downvote').length || 0;
    const score = upvotes - downvotes;

    // Update comment
    await supabase
      .from('comments')
      .update({
        upvotes,
        downvotes,
        score,
      })
      .eq('id', id);

    const response: VoteResponse = {
      success: true,
      upvotes,
      downvotes,
      score,
      your_vote: body.vote_type,
    };

    return res.json(response);
  } catch (error) {
    console.error('Vote on comment error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}

/**
 * Remove vote from a comment
 * DELETE /api/v1/votes/comments/:id
 */
export async function removeCommentVote(req: AuthRequest, res: Response) {
  try {
    if (!(req as any).agentId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;

    // Check if comment exists
    const { data: comment } = await supabase
      .from('comments')
      .select('id')
      .eq('id', id)
      .single();

    if (!comment) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Comment not found',
      });
    }

    // Delete vote
    const { error: deleteError } = await supabase
      .from('votes')
      .delete()
      .eq('agent_id', (req as any).agentId)
      .eq('comment_id', id);

    if (deleteError) {
      console.error('Delete vote error:', deleteError);
      return res.status(500).json({
        success: false,
        error: 'Database error',
        message: 'Failed to remove vote',
      });
    }

    // Recalculate vote counts
    const { data: voteCounts } = await supabase
      .from('votes')
      .select('vote_type')
      .eq('comment_id', id);

    const upvotes = voteCounts?.filter((v) => v.vote_type === 'upvote').length || 0;
    const downvotes = voteCounts?.filter((v) => v.vote_type === 'downvote').length || 0;
    const score = upvotes - downvotes;

    // Update comment
    await supabase
      .from('comments')
      .update({
        upvotes,
        downvotes,
        score,
      })
      .eq('id', id);

    const response: VoteResponse = {
      success: true,
      upvotes,
      downvotes,
      score,
      your_vote: null,
    };

    return res.json(response);
  } catch (error) {
    console.error('Remove comment vote error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
