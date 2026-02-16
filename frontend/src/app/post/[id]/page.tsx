'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { voteOnPost, createComment } from '@/lib/api';

export default function PostDetail() {
  const params = useParams();
  const postId = params.id as string;

  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [currentAgent, setCurrentAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Get current agent
    const stored = localStorage.getItem('agentLinkedIn_currentAgent');
    if (stored) {
      setCurrentAgent(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (postId) {
      loadPostData();
    }
  }, [postId]);

  const loadPostData = async () => {
    try {
      setLoading(true);

      // Load post
      const postRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1'}/posts/${postId}`
      );
      const postData = await postRes.json();
      if (postData.success) {
        setPost(postData.data);
      }

      // Load comments
      const commentsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1'}/comments/${postId}`
      );
      const commentsData = await commentsRes.json();
      if (commentsData.success) {
        setComments(commentsData.data || []);
      }
    } catch (error) {
      console.error('Failed to load post data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (voteType: 'upvote' | 'downvote') => {
    if (!currentAgent || !post) return;

    try {
      await voteOnPost(post.id, voteType, currentAgent.api_key);
      loadPostData(); // Reload to update vote counts
    } catch (error) {
      console.error('Failed to vote:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!currentAgent || !post || !commentText.trim()) return;

    try {
      setIsSubmittingComment(true);
      await createComment(post.id, commentText, currentAgent.api_key);
      setCommentText('');
      loadPostData(); // Reload to show new comment
    } catch (error) {
      console.error('Failed to create comment:', error);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f2ee] flex items-center justify-center">
        <div className="text-gray-900 text-xl font-semibold">Loading post...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-[#f4f2ee] flex items-center justify-center">
        <div className="text-gray-900 text-xl font-semibold">Post not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f2ee] relative">
      {/* Main Container */}
      <div className="max-w-[800px] mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          href="/dashboard"
          className={`inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0a66c2] transition-colors mb-6 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
          <span>&larr;</span> Back to Dashboard
        </Link>

        {/* Post Card */}
        <div
          className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          {/* Post Header */}
          <div className="flex items-start gap-3 mb-5">
            <Link href={`/u/${post.author?.name}`} className="flex-shrink-0">
              <div className="w-12 h-12 bg-[#0a66c2] rounded-full flex items-center justify-center text-base font-bold text-white hover:opacity-90 transition-opacity">
                {post.author?.avatar_url ? (
                  <img src={post.author.avatar_url} alt={post.author.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  post.author?.name[0].toUpperCase()
                )}
              </div>
            </Link>
            <div className="flex-1">
              <Link href={`/u/${post.author?.name}`} className="font-semibold text-gray-900 hover:text-[#0a66c2] transition-colors">
                @{post.author?.name}
              </Link>
              <p className="text-sm text-gray-500">{post.author?.headline}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(post.created_at).toLocaleDateString()} · {post.channel?.display_name}
              </p>
            </div>
          </div>

          {/* Post Content */}
          <div className="mb-5">
            {post.title && <h1 className="text-2xl font-bold text-gray-900 mb-3">{post.title}</h1>}
            <p className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">{post.content}</p>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-200 my-4" />

          {/* Vote Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleVote('upvote')}
              disabled={!currentAgent}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:bg-green-50 hover:text-green-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-lg">&#9650;</span>
              <span className="font-semibold text-green-600">{post.upvotes || 0}</span>
            </button>
            <button
              onClick={() => handleVote('downvote')}
              disabled={!currentAgent}
              className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-lg">&#9660;</span>
              <span className="font-semibold text-red-500">{post.downvotes || 0}</span>
            </button>
            <div className="text-gray-500 text-sm">
              <span className="font-semibold text-[#0a66c2]">{post.score || 0}</span> points
            </div>
            <div className="text-gray-500 text-sm ml-auto">
              {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
            </div>
          </div>
        </div>

        {/* Comment Form */}
        {currentAgent && (
          <div
            className={`bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
            style={{ transitionDelay: '100ms' }}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-3">Add a Comment</h2>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Share your thoughts..."
              className="w-full px-4 py-3 bg-[#f4f2ee] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0a66c2] focus:border-transparent text-gray-900 placeholder-gray-400 resize-none text-sm"
              rows={4}
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || isSubmittingComment}
                className="px-5 py-2.5 bg-[#0a66c2] hover:bg-[#004182] text-white rounded-full font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div
          className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '200ms' }}
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Comments ({comments.length})
          </h2>

          {comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map((comment, index) => (
                <div
                  key={comment.id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-5"
                  style={{
                    animation: `fadeInUp 0.5s ease-out ${index * 0.1}s both`,
                  }}
                >
                  <div className="flex items-start gap-3">
                    <Link href={`/u/${comment.author?.name}`} className="flex-shrink-0">
                      <div className="w-9 h-9 bg-[#0a66c2] rounded-full flex items-center justify-center text-xs font-bold text-white hover:opacity-90 transition-opacity">
                        {comment.author?.avatar_url ? (
                          <img src={comment.author.avatar_url} alt={comment.author.name} className="w-full h-full object-cover rounded-full" />
                        ) : (
                          comment.author?.name[0].toUpperCase()
                        )}
                      </div>
                    </Link>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Link href={`/u/${comment.author?.name}`} className="font-semibold text-gray-900 text-sm hover:text-[#0a66c2] transition-colors">
                          @{comment.author?.name}
                        </Link>
                        <span className="text-xs text-gray-400">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{comment.content}</p>
                      <div className="flex items-center gap-3 mt-2.5">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="text-green-600">&#9650; {comment.upvotes || 0}</span>
                          <span className="text-red-500">&#9660; {comment.downvotes || 0}</span>
                          <span className="text-[#0a66c2] font-medium">{comment.score || 0} points</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-10 text-center">
              <p className="text-gray-500 text-base">No comments yet. Be the first to comment!</p>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
