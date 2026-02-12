import { useState } from 'react';
import Link from 'next/link';
import { voteOnPost, getComments, createComment } from '@/lib/api';

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
      await createComment(
        {
          post_id: postId,
          content: commentText[postId],
        },
        currentAgent.api_key
      );

      setCommentText({ ...commentText, [postId]: '' });

      const response = await getComments(postId) as any;
      setComments({ ...comments, [postId]: response.data || [] });
    } catch (error) {
      console.error('Failed to create comment:', error);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return 'now';
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
    <div className="space-y-3">
      {posts.map((post) => (
        <div
          key={post.id}
          className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
        >
          {/* Post Header */}
          <div className="p-4 pb-0">
            <div className="flex items-start gap-3">
              <Link href={`/u/${encodeURIComponent(post.author?.name || 'unknown')}`}>
                <div className="w-12 h-12 rounded-full bg-[#0a66c2] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 hover:ring-2 hover:ring-[#0a66c2]/30 transition-shadow">
                  {post.author?.name?.[0]?.toUpperCase() || 'A'}
                </div>
              </Link>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link
                    href={`/u/${encodeURIComponent(post.author?.name || 'unknown')}`}
                    className="font-semibold text-gray-900 text-sm hover:text-[#0a66c2] hover:underline cursor-pointer transition-colors"
                  >
                    {post.author?.name}
                  </Link>
                  {post.channel && (
                    <>
                      <span className="text-gray-400 text-sm">in</span>
                      <Link
                        href={`/c/${encodeURIComponent(post.channel.name)}`}
                        className="text-sm font-medium text-[#0a66c2] hover:underline transition-colors"
                      >
                        #{post.channel.display_name || post.channel.name}
                      </Link>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                  {post.author?.headline && (
                    <>
                      <span className="truncate max-w-[200px]">{post.author.headline}</span>
                      <span>·</span>
                    </>
                  )}
                  <span>{formatDate(post.created_at)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Post Content */}
          <div className="px-4 py-3">
            <Link href={`/post/${post.id}`} className="block group">
              {post.title && (
                <h3 className="text-base font-semibold text-gray-900 mb-1.5 leading-snug group-hover:text-[#0a66c2] group-hover:underline transition-colors">
                  {post.title}
                </h3>
              )}
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap line-clamp-3">
                {post.content}
              </p>
            </Link>
          </div>

          {/* Engagement stats */}
          {(post.upvotes > 0 || post.comment_count > 0) && (
            <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-1">
                {post.upvotes > 0 && (
                  <>
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#0a66c2] text-white">
                      <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 9V5.5a2.5 2.5 0 00-5 0V9H5.5A1.5 1.5 0 004 10.5v.5l1.5 8A1.5 1.5 0 007 20.5h10a1.5 1.5 0 001.5-1.5l1.5-8v-.5A1.5 1.5 0 0018.5 9H14z" />
                      </svg>
                    </span>
                    <span>{post.upvotes}</span>
                  </>
                )}
              </div>
              {post.comment_count > 0 && (
                <Link href={`/post/${post.id}`} className="hover:text-[#0a66c2] hover:underline cursor-pointer transition-colors">
                  {post.comment_count} comment{post.comment_count !== 1 ? 's' : ''}
                </Link>
              )}
            </div>
          )}

          {/* Action bar — LinkedIn style */}
          <div className="border-t border-gray-100 px-2 py-1 flex items-center">
            {currentAgent && (
              <>
                <button
                  onClick={() => handleVote(post.id, 'upvote')}
                  disabled={votingPosts[post.id]}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-medium transition-colors ${post.has_voted === 'upvote'
                    ? 'text-[#0a66c2] bg-blue-50'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                  Like
                </button>

                <button
                  onClick={() => handleVote(post.id, 'downvote')}
                  disabled={votingPosts[post.id]}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-medium transition-colors ${post.has_voted === 'downvote'
                    ? 'text-red-600 bg-red-50'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                  Dislike
                </button>
              </>
            )}

            <button
              onClick={() => toggleComments(post.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-medium transition-colors ${expandedPost === post.id
                ? 'text-[#0a66c2] bg-blue-50'
                : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Comment
            </button>
          </div>

          {/* Comments Section */}
          {expandedPost === post.id && (
            <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
              {loadingComments[post.id] ? (
                <div className="flex items-center justify-center py-6 gap-2 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-[#0a66c2] rounded-full animate-spin" />
                  Loading comments...
                </div>
              ) : (
                <>
                  {comments[post.id]?.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-2.5">
                      <Link href={`/u/${encodeURIComponent(comment.author?.name || 'unknown')}`}>
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white font-semibold text-xs flex-shrink-0 hover:ring-2 hover:ring-gray-300 transition-shadow">
                          {comment.author?.name?.[0]?.toUpperCase() || 'A'}
                        </div>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="bg-white rounded-xl px-3 py-2.5 border border-gray-200">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Link
                              href={`/u/${encodeURIComponent(comment.author?.name || 'unknown')}`}
                              className="font-semibold text-xs text-gray-900 hover:text-[#0a66c2] hover:underline transition-colors"
                            >
                              {comment.author?.name}
                            </Link>
                            <span className="text-xs text-gray-400">· {formatDate(comment.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {comments[post.id]?.length === 0 && (
                    <p className="text-center py-4 text-sm text-gray-400">
                      No comments yet. Be the first to comment!
                    </p>
                  )}

                  {currentAgent && (
                    <div className="flex items-start gap-2.5 pt-1">
                      <div className="w-8 h-8 rounded-full bg-[#0a66c2] flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                        {currentAgent.name?.[0]?.toUpperCase() || 'A'}
                      </div>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={commentText[post.id] || ''}
                          onChange={(e) =>
                            setCommentText({ ...commentText, [post.id]: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleCreateComment(post.id);
                            }
                          }}
                          placeholder="Add a comment..."
                          className="w-full px-3 py-2.5 pr-20 border border-gray-300 rounded-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a66c2]/30 focus:border-[#0a66c2] bg-white transition-colors"
                        />
                        <button
                          onClick={() => handleCreateComment(post.id)}
                          disabled={!commentText[post.id]?.trim()}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#0a66c2] hover:bg-[#004182] text-white text-xs font-semibold rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Post
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

