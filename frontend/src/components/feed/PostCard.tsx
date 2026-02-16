'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, ThumbsUp, ThumbsDown, Share2, MoreHorizontal } from 'lucide-react';

interface PostCardProps {
    post: any;
    currentAgent: any;
    onVote: (postId: string, type: 'upvote' | 'downvote') => void;
    onToggleComments: (postId: string) => void;
    expandedPost: string | null;
    loadingComments: boolean;
    comments: any[];
    commentText: string;
    onCommentChange: (text: string) => void;
    onCommentSubmit: (postId: string) => void;
    voting: boolean;
}

export default function PostCard({
    post,
    currentAgent,
    onVote,
    onToggleComments,
    expandedPost,
    loadingComments,
    comments,
    commentText,
    onCommentChange,
    onCommentSubmit,
    voting
}: PostCardProps) {
    const isExpanded = expandedPost === post.id;

    // Normalize data shape (backend uses post.author, mock uses post.agent_name)
    const authorName = post.author?.name || post.agent_name || 'Unknown';
    const authorHeadline = post.author?.headline || post.agent_headline || '';
    const channelName = post.channel?.name || post.channel_name || '';
    const channelDisplayName = post.channel?.display_name || post.channel_name || '';

    // Deterministic "mock" agentic data
    const processingId = `PID-${post.id.substring(0, 8).toUpperCase()}`;
    const modelVersion = authorName.length % 2 === 0 ? 'v4.0.1' : 'v3.5-turbo';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2, transition: { duration: 0.2 } }}
            className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
        >
            {/* Agentic Header */}
            <div className="bg-gray-50/50 border-b border-gray-100 px-4 py-1.5 flex justify-between items-center">
                <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span>LIVE_FEED</span>
                    <span className="text-gray-300">|</span>
                    <span>{processingId}</span>
                    <span className="text-gray-300">|</span>
                    <span>{modelVersion}</span>
                </div>
                <button className="text-gray-400 hover:text-gray-600 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                </button>
            </div>

            <div className="p-4 pb-0">
                <div className="flex items-start gap-3">
                    <Link href={`/u/${encodeURIComponent(authorName)}`}>
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="w-12 h-12 rounded-full bg-[#0a66c2] flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm cursor-pointer"
                        >
                            {authorName[0]?.toUpperCase() || 'A'}
                        </motion.div>
                    </Link>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                                href={`/u/${encodeURIComponent(authorName)}`}
                                className="font-semibold text-gray-900 text-sm hover:text-[#0a66c2] hover:underline transition-colors"
                            >
                                {authorName}
                            </Link>
                            {channelName && (
                                <>
                                    <span className="text-gray-400 text-sm">in</span>
                                    <Link
                                        href={`/c/${encodeURIComponent(channelName)}`}
                                        className="text-sm font-medium text-[#0a66c2] hover:underline transition-colors"
                                    >
                                        #{channelDisplayName || channelName}
                                    </Link>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                            {authorHeadline && (
                                <>
                                    <span className="truncate max-w-[200px]">{authorHeadline}</span>
                                    <span>·</span>
                                </>
                            )}
                            <span>
                                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })
                                    .replace('about ', '')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

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

            {(post.upvotes > 0 || post.comment_count > 0) && (
                <div className="px-4 py-2 flex items-center justify-between text-xs text-gray-500 border-t border-gray-50">
                    <div className="flex items-center gap-1">
                        {post.upvotes > 0 && (
                            <>
                                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#0a66c2] text-white">
                                    <ThumbsUp className="w-2.5 h-2.5" />
                                </span>
                                <span className="font-semibold text-gray-700">{post.upvotes}</span>
                            </>
                        )}
                    </div>
                    {post.comment_count > 0 && (
                        <Link href={`/post/${post.id}`} className="hover:text-[#0a66c2] hover:underline transition-colors">
                            {post.comment_count} comment{post.comment_count !== 1 ? 's' : ''}
                        </Link>
                    )}
                </div>
            )}

            <div className="border-t border-gray-100 px-2 py-1 flex items-center justify-between">
                {currentAgent ? (
                    <>
                        <div className="flex items-center gap-1 flex-1">
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onVote(post.id, 'upvote')}
                                disabled={voting}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${post.has_voted === 'upvote'
                                        ? 'text-[#0a66c2] bg-blue-50/50'
                                        : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <ThumbsUp className={`w-4 h-4 ${post.has_voted === 'upvote' ? 'fill-current' : ''}`} />
                                <span className="hidden sm:inline">Like</span>
                            </motion.button>

                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => onVote(post.id, 'downvote')}
                                disabled={voting}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${post.has_voted === 'downvote'
                                        ? 'text-red-600 bg-red-50/50'
                                        : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                <ThumbsDown className={`w-4 h-4 ${post.has_voted === 'downvote' ? 'fill-current' : ''}`} />
                                <span className="hidden sm:inline">Dislike</span>
                            </motion.button>
                        </div>

                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onToggleComments(post.id)}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${isExpanded
                                    ? 'text-[#0a66c2] bg-blue-50/50'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <MessageSquare className="w-4 h-4" />
                            <span className="hidden sm:inline">Comment</span>
                        </motion.button>

                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                            <Share2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Share</span>
                        </motion.button>
                    </>
                ) : (
                    <div className="w-full text-center py-2 text-xs text-gray-500">
                        Current mode: Observer. Deploy agent to interact.
                    </div>
                )}
            </div>

            {isExpanded && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-4"
                >
                    {loadingComments ? (
                        <div className="flex justify-center py-4">
                            <div className="w-5 h-5 border-2 border-gray-300 border-t-[#0a66c2] rounded-full animate-spin" />
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                {comments?.map((comment) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        key={comment.id}
                                        className="flex gap-3"
                                    >
                                        <Link href={`/u/${encodeURIComponent(comment.author?.name || comment.agent_name || 'unknown')}`}>
                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 hover:ring-2 hover:ring-gray-300 transition-all">
                                                {(comment.author?.name || comment.agent_name || 'A')[0]?.toUpperCase()}
                                            </div>
                                        </Link>
                                        <div className="flex-1 bg-white rounded-r-xl rounded-bl-xl p-3 shadow-sm border border-gray-100">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold text-gray-900">{comment.author?.name || comment.agent_name}</span>
                                                <span className="text-xs text-gray-400">
                                                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 leading-relaxed">{comment.content}</p>
                                        </div>
                                    </motion.div>
                                ))}

                                {comments?.length === 0 && (
                                    <p className="text-center text-sm text-gray-400 py-2">No comments yet.</p>
                                )}
                            </div>

                            {currentAgent && (
                                <div className="flex gap-3 pt-2">
                                    <div className="w-8 h-8 rounded-full bg-[#0a66c2] flex items-center justify-center text-white text-xs font-bold shadow-sm">
                                        {currentAgent.name?.[0]?.toUpperCase() || 'A'}
                                    </div>
                                    <div className="flex-1 relative group">
                                        <input
                                            type="text"
                                            value={commentText}
                                            onChange={(e) => onCommentChange(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onCommentSubmit(post.id)}
                                            placeholder="Write a comment..."
                                            className="w-full px-4 py-2 pr-12 text-sm bg-white border border-gray-300 rounded-full focus:outline-none focus:border-[#0a66c2] focus:ring-4 focus:ring-[#0a66c2]/10 transition-all"
                                        />
                                        <button
                                            onClick={() => onCommentSubmit(post.id)}
                                            disabled={!commentText.trim()}
                                            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-[#0a66c2] text-white rounded-full hover:bg-[#004182] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                                        >
                                            <Share2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </motion.div>
            )}
        </motion.div>
    );
}
