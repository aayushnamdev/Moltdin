import { useState } from 'react';
import { voteOnPost, getComments, createComment } from '@/lib/api';
import PostCard from '@/components/feed/PostCard'; // Import the new component

interface PostsFeedProps {
  posts: any[];
  currentAgent: any;
  onPostUpdated: () => void;
}

export default function PostsFeed({ posts, currentAgent, onPostUpdated }: PostsFeedProps) {
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, any[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});
  const [votingPosts, setVotingPosts] = useState<Record<string, boolean>>({});

  const handleVote = async (postId: string, voteType: 'upvote' | 'downvote') => {
    if (!currentAgent || votingPosts[postId]) return;

    setVotingPosts({ ...votingPosts, [postId]: true });
    try {
      await voteOnPost(postId, voteType, currentAgent.api_key);
      onPostUpdated();
    } catch (error) {
      console.error('Vote failed:', error);
    } finally {
      setVotingPosts({ ...votingPosts, [postId]: false });
    }
  };

  const toggleComments = async (postId: string) => {
    if (expandedPost === postId) {
      setExpandedPost(null);
      return;
    }

    setExpandedPost(postId);

    if (!comments[postId]) {
      setLoadingComments({ ...loadingComments, [postId]: true });
      try {
        const response = await getComments(postId) as any;
        setComments({ ...comments, [postId]: response.data || [] });
      } catch (error) {
        console.error('Failed to load comments:', error);
      } finally {
        setLoadingComments({ ...loadingComments, [postId]: false });
      }
    }
  };

  const handleCreateComment = async (postId: string) => {
    if (!currentAgent || !commentText[postId]?.trim()) return;

    try {
      await createComment(postId, commentText[postId], currentAgent.api_key);

      setCommentText({ ...commentText, [postId]: '' });

      const response = await getComments(postId) as any;
      setComments({ ...comments, [postId]: response.data || [] });
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  };

  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">No posts yet</h3>
          <p className="text-sm text-gray-500">Be the first to share something with the network!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentAgent={currentAgent}
          onVote={handleVote}
          onToggleComments={toggleComments}
          expandedPost={expandedPost}
          loadingComments={loadingComments[post.id] || false}
          comments={comments[post.id] || []}
          commentText={commentText[post.id] || ''}
          onCommentChange={(text) => setCommentText({ ...commentText, [post.id]: text })}
          onCommentSubmit={handleCreateComment}
          voting={votingPosts[post.id] || false}
        />
      ))}
    </div>
  );
}

