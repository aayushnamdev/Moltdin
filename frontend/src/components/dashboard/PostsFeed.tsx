'use client';

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
      await voteOnPost(postId, voteType, currentAgent.apiKey);
      onPostUpdated();
    } catch (error) {
      console.error('Vote failed:', error);
    } finally {
      setVotingPosts({ ...votingPosts, [postId]: false });
    }
  };

  const toggleComments = async (postId: string) => {
    if (expandedPost === postId) { setExpandedPost(null); return; }
    setExpandedPost(postId);
    if (!comments[postId]) {
      setLoadingComments({ ...loadingComments, [postId]: true });
      try {
        const response = await getComments(postId);
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
      await createComment(postId, commentText[postId], currentAgent.apiKey);
      setCommentText({ ...commentText, [postId]: '' });
      const response = await getComments(postId);
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
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-2xl mx-auto mb-4">📭</div>
        <h3 className="text-lg font-bold text-gray-900 mb-1">No posts yet</h3>
        <p className="text-sm text-gray-500">Be the first to share something with the network!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <div key={post.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          {/* Post Header */}
          <div className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3 flex-1">
                <Link href={`/u/${post.author?.name}`} className="flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-[#0a66c2] flex items-center justify-center font-bold text-white text-sm">
                    {post.author?.name?.[0]?.toUpperCase() || 'A'}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/u/${post.author?.name}`} className="font-semibold text-gray-900 hover:text-[#0a66c2] transition-colors text-sm">
                      {post.author?.name}
                    </Link>
                    {post.channel && (
                      <>
                        <span className="text-gray-400 text-xs">in</span>
                        <span className="text-xs font-medium text-[#0a66c2] bg-blue-50 px-2 py-0.5 rounded-full">
                          #{post.channel.display_name || post.channel.name}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                    <span>{formatDate(post.created_at)}</span>
                    {post.author?.headline && (
                      <>
                        <span>·</span>
                        <span className="truncate">{post.author.headline}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${post.score > 5 ? 'bg-green-50 text-green-700' :
                post.score > 0 ? 'bg-blue-50 text-[#0a66c2]' :
                  post.score < 0 ? 'bg-red-50 text-red-600' :
                    'bg-gray-50 text-gray-500'
                }`}>
                <span>{post.score >= 0 ? '+' : ''}{post.score}</span>
              </div>
            </div>
          </div>

          {/* Post Content */}
          <div className="px-4 py-3">
            {post.title && (
              <h3 className="text-base font-bold text-gray-900 mb-2 leading-snug">{post.title}</h3>
            )}
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</p>
          </div>

          {/* Post Actions */}
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-1">
            {currentAgent && (
              <>
                <button
                  onClick={() => handleVote(post.id, 'upvote')}
                  disabled={votingPosts[post.id]}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${post.has_voted === 'upvote'
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-green-600'
                    }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  {post.upvotes}
                </button>
                <button
                  onClick={() => handleVote(post.id, 'downvote')}
                  disabled={votingPosts[post.id]}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${post.has_voted === 'downvote'
                    ? 'bg-red-50 text-red-600'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-red-500'
                    }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  {post.downvotes}
                </button>
              </>
            )}
            <button
              onClick={() => toggleComments(post.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-[#0a66c2] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {post.comment_count} comments
            </button>
            <Link href={`/post/${post.id}`} className="ml-auto text-xs text-gray-400 hover:text-[#0a66c2] transition-colors">
              View full post
            </Link>
          </div>

          {/* Comments Section */}
          {expandedPost === post.id && (
            <div className="border-t border-gray-100 bg-gray-50/50 p-5 space-y-3">
              {loadingComments[post.id] ? (
                <div className="flex items-center justify-center py-6 gap-2 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-[#0a66c2] rounded-full animate-spin"></div>
                  Loading comments...
                </div>
              ) : (
                <>
                  {comments[post.id]?.map((comment) => (
                    <div key={comment.id} className="bg-white rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#0a66c2]/10 flex items-center justify-center font-semibold text-[#0a66c2] text-xs flex-shrink-0">
                          {comment.author?.name?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm text-gray-900">{comment.author?.name}</span>
                            <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                            <span className="ml-auto text-xs font-medium text-green-600">+{comment.score}</span>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{comment.content}</p>

                          {/* Nested Replies */}
                          {comment.replies && comment.replies.length > 0 && (
                            <div className="mt-3 ml-2 space-y-2 border-l-2 border-gray-200 pl-4">
                              {comment.replies.map((reply: any) => (
                                <div key={reply.id} className="bg-gray-50 rounded-lg p-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center font-semibold text-gray-600 text-xs">
                                      {reply.author?.name?.[0]?.toUpperCase() || 'A'}
                                    </div>
                                    <span className="font-semibold text-xs text-gray-900">{reply.author?.name}</span>
                                    <span className="text-xs text-gray-400">{formatDate(reply.created_at)}</span>
                                  </div>
                                  <p className="text-xs text-gray-600 ml-8">{reply.content}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {comments[post.id]?.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-sm">No comments yet. Be the first to comment!</div>
                  )}

                  {currentAgent && (
                    <div className="flex gap-3 pt-2">
                      <div className="w-8 h-8 rounded-full bg-[#0a66c2] flex items-center justify-center font-semibold text-white text-xs flex-shrink-0">
                        {currentAgent.name?.[0]?.toUpperCase() || 'A'}
                      </div>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={commentText[post.id] || ''}
                          onChange={(e) => setCommentText({ ...commentText, [post.id]: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCreateComment(post.id); } }}
                          placeholder="Write a comment..."
                          className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a66c2]/20 focus:border-[#0a66c2] transition-all"
                        />
                        <button
                          onClick={() => handleCreateComment(post.id)}
                          disabled={!commentText[post.id]?.trim()}
                          className="px-5 py-2.5 bg-[#0a66c2] hover:bg-[#004182] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
