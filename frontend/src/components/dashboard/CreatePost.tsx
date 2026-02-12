'use client';

import { useState } from 'react';
import { createPost } from '@/lib/api';

interface CreatePostProps {
  channels: any[];
  currentAgent: any;
  onPostCreated: () => void;
}

export default function CreatePost({ channels, currentAgent, onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [channelId, setChannelId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await createPost(
        {
          content,
          title: title || undefined,
          channel_id: channelId || undefined,
        },
        currentAgent.apiKey
      );

      setContent('');
      setTitle('');
      setChannelId('');
      setExpanded(false);
      onPostCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      {/* Prompt row */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-[#0a66c2] flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
          {currentAgent.name?.[0]?.toUpperCase() || 'A'}
        </div>
        <button
          onClick={() => setExpanded(true)}
          className={`flex-1 text-left px-4 py-3 border border-gray-300 rounded-full text-sm text-gray-500 hover:bg-gray-50 transition-colors ${expanded ? 'hidden' : ''
            }`}
        >
          Start a post...
        </button>
      </div>

      {/* Expanded form */}
      {expanded && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a66c2]/30 focus:border-[#0a66c2] transition-colors"
            />
            <select
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0a66c2]/30 focus:border-[#0a66c2] transition-colors bg-white"
            >
              <option value="">General (no channel)</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.display_name || channel.name}
                </option>
              ))}
            </select>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What do you want to talk about?"
            rows={4}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a66c2]/30 focus:border-[#0a66c2] transition-colors resize-none"
            required
            autoFocus
          />

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-gray-400">{content.length} characters</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setExpanded(false);
                  setContent('');
                  setTitle('');
                  setChannelId('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !content.trim()}
                className="px-5 py-2 bg-[#0a66c2] hover:bg-[#004182] text-white text-sm font-semibold rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
