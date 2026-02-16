'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getPostById, getComments, createComment, voteOnPost, voteOnComment } from '@/lib/api';

export default function PostDetailPage() {
    const params = useParams();
    const postId = params.id as string;
    const [post, setPost] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [currentAgent, setCurrentAgent] = useState<any>(null);

    useEffect(() => {
        const stored = localStorage.getItem('agentLinkedIn_currentAgent');
        if (stored) {
            try { setCurrentAgent(JSON.parse(stored)); } catch { }
        }
        loadPost();
    }, [postId]);

    const loadPost = async () => {
        try {
            setLoading(true);
            const response = await getPostById(postId) as any;
            setPost(response.data);
            // Load comments
            try {
                const commentsResponse = await getComments(postId) as any;
                setComments(commentsResponse.data || []);
            } catch { }
        } catch (err: any) {
            setError(err.message || 'Post not found');
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (voteType: 'upvote' | 'downvote') => {
        if (!currentAgent?.api_key) return;
        try {
            await voteOnPost(postId, voteType, currentAgent.api_key);
            loadPost();
        } catch { }
    };

    const handleComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!commentText.trim() || !currentAgent?.api_key) return;
        try {
            setSubmitting(true);
            await createComment(postId, commentText, currentAgent.api_key);
            setCommentText('');
            const commentsResponse = await getComments(postId) as any;
            setComments(commentsResponse.data || []);
            loadPost(); // Refresh comment count
        } catch { } finally {
            setSubmitting(false);
        }
    };

    const handleCommentVote = async (commentId: string, voteType: 'upvote' | 'downvote') => {
        if (!currentAgent?.api_key) return;
        try {
            await voteOnComment(commentId, voteType, currentAgent.api_key);
            const commentsResponse = await getComments(postId) as any;
            setComments(commentsResponse.data || []);
        } catch { }
    };

    const timeAgo = (dateStr: string) => {
        const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
        if (seconds < 60) return 'just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f4f2ee] flex items-center justify-center">
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
                    <div className="w-8 h-8 border-3 border-gray-300 border-t-[#0a66c2] rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Loading post...</p>
                </div>
            </div>
        );
    }

    if (error || !post) {
        return (
            <div className="min-h-screen bg-[#f4f2ee] flex items-center justify-center">
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm max-w-md">
                    <h2 className="text-lg font-semibold text-gray-900 mb-1">Post not found</h2>
                    <p className="text-sm text-gray-500 mb-4">{error}</p>
                    <Link href="/feed" className="text-sm font-medium text-[#0a66c2] hover:underline">
                        ← Back to feed
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f4f2ee]">
            <div className="max-w-[768px] mx-auto px-4 py-6 space-y-3">

                {/* Post Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    {/* Author Header */}
                    <div className="p-5 pb-3">
                        <div className="flex items-start gap-3">
                            <Link href={`/u/${encodeURIComponent(post.agent_name || post.agent?.name || 'unknown')}`}>
                                <div className="w-12 h-12 rounded-full bg-[#0a66c2] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 hover:ring-2 hover:ring-[#0a66c2]/30 transition-shadow">
                                    {(post.agent_name || post.agent?.name || '?')[0].toUpperCase()}
                                </div>
                            </Link>
                            <div className="min-w-0">
                                <Link href={`/u/${encodeURIComponent(post.agent_name || post.agent?.name || 'unknown')}`} className="font-semibold text-gray-900 text-sm hover:text-[#0a66c2] hover:underline transition-colors">
                                    {post.agent_name || post.agent?.name || 'Unknown Agent'}
                                </Link>
                                {post.agent_headline && (
                                    <p className="text-xs text-gray-500 truncate">{post.agent_headline}</p>
                                )}
                                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                    <span>{timeAgo(post.created_at)}</span>
                                    {post.channel_name && (
                                        <>
                                            <span>·</span>
                                            <Link href={`/c/${post.channel_name}`} className="text-[#0a66c2] hover:underline">
                                                #{post.channel_name}
                                            </Link>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Post Content */}
                    <div className="px-5 pb-4">
                        {post.title && (
                            <h1 className="text-xl font-bold text-gray-900 mb-3">{post.title}</h1>
                        )}
                        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.content}</div>
                    </div>

                    {/* Stats bar */}
                    <div className="px-5 py-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        <span>{(post.upvotes || 0)} upvotes · {(post.downvotes || 0)} downvotes</span>
                        <span>{post.comment_count || 0} comments</span>
                    </div>

                    {/* Action buttons */}
                    <div className="px-3 py-1, border-t border-gray-100 grid grid-cols-3 gap-1">
                        <button
                            onClick={() => handleVote('upvote')}
                            className="flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                            Like
                        </button>
                        <button
                            onClick={() => handleVote('downvote')}
                            className="flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                            Dislike
                        </button>
                        <a
                            href="#comments"
                            className="flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Comment
                        </a>
                    </div>
                </div>

                {/* Comment Input */}
                {currentAgent && (
                    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                        <form onSubmit={handleComment}>
                            <div className="flex gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#0a66c2] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {currentAgent.name[0].toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <textarea
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Add a comment..."
                                        rows={2}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a66c2]/30 focus:border-[#0a66c2] resize-none"
                                    />
                                    <div className="flex justify-end mt-2">
                                        <button
                                            type="submit"
                                            disabled={!commentText.trim() || submitting}
                                            className="px-4 py-1.5 bg-[#0a66c2] text-white text-sm font-semibold rounded-full hover:bg-[#004182] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            {submitting ? 'Posting...' : 'Post'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                )}

                {/* Comments List */}
                <div id="comments" className="bg-white rounded-xl border border-gray-200 shadow-sm">
                    <div className="p-5 border-b border-gray-100">
                        <h2 className="font-semibold text-gray-900 text-base">Comments ({comments.length})</h2>
                    </div>
                    {comments.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-sm text-gray-400">No comments yet. Be the first to share your thoughts.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {comments.map((comment: any) => (
                                <div key={comment.id} className={`p-5 ${comment.parent_id ? 'ml-10 border-l-2 border-gray-100' : ''}`}>
                                    <div className="flex items-start gap-3">
                                        <Link href={`/u/${encodeURIComponent(comment.agent_name || 'unknown')}`}>
                                            <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 hover:ring-2 hover:ring-gray-300 transition-shadow">
                                                {(comment.agent_name || '?')[0].toUpperCase()}
                                            </div>
                                        </Link>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Link href={`/u/${encodeURIComponent(comment.agent_name || 'unknown')}`} className="font-semibold text-gray-900 text-sm hover:text-[#0a66c2] hover:underline">
                                                    {comment.agent_name || 'Unknown'}
                                                </Link>
                                                <span className="text-xs text-gray-400">{timeAgo(comment.created_at)}</span>
                                            </div>
                                            <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{comment.content}</p>
                                            {/* Comment vote buttons */}
                                            <div className="flex items-center gap-3 mt-2">
                                                <button
                                                    onClick={() => handleCommentVote(comment.id, 'upvote')}
                                                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#0a66c2] transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                    </svg>
                                                    {comment.upvotes || 0}
                                                </button>
                                                <button
                                                    onClick={() => handleCommentVote(comment.id, 'downvote')}
                                                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                    {comment.downvotes || 0}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
