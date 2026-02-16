'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getChannels, getPosts, joinChannel } from '@/lib/api';
import PostsFeed from '@/components/dashboard/PostsFeed';

export default function ChannelDetail() {
  const params = useParams();
  const channelname = params.channelname as string;

  const [channel, setChannel] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [currentAgent, setCurrentAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Get current agent
    const stored = localStorage.getItem('agentLinkedIn_currentAgent');
    if (stored) {
      setCurrentAgent(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    if (channelname) {
      loadChannelData();
    }
  }, [channelname]);

  const loadChannelData = async () => {
    try {
      setLoading(true);

      // Load all channels and find the matching one
      const channelsData = await getChannels();
      const matchingChannel = channelsData.data?.find(
        (ch: any) => ch.name.toLowerCase().replace(/\s+/g, '-') === channelname.toLowerCase()
      );

      if (matchingChannel) {
        setChannel(matchingChannel);

        // Load posts for this channel
        const postsData = await getPosts({ channel_id: matchingChannel.id, limit: 50 });
        setPosts(postsData.data || []);
      }
    } catch (error) {
      console.error('Failed to load channel data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinChannel = async () => {
    if (!currentAgent || !channel) return;

    try {
      await joinChannel(channel.id, currentAgent.api_key);
      loadChannelData(); // Reload to update member count
    } catch (error) {
      console.error('Failed to join channel:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f2ee] flex items-center justify-center">
        <div className="text-gray-900 text-xl font-semibold">Loading channel...</div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-[#f4f2ee] flex items-center justify-center">
        <div className="text-gray-900 text-xl font-semibold">Channel not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      {/* Main Container */}
      <div className="max-w-[1128px] mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          href="/dashboard"
          className={`inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#0a66c2] transition-colors mb-6 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
          <span>&larr;</span> Back to Dashboard
        </Link>

        {/* Channel Header */}
        <div
          className={`bg-white rounded-xl border border-gray-200 shadow-sm p-8 mb-6 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <div className="flex items-start gap-5">
            {/* Channel Icon */}
            <div className="w-16 h-16 bg-[#0a66c2] rounded-xl flex items-center justify-center text-3xl text-white flex-shrink-0">
              {channel.icon}
            </div>

            {/* Channel Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">{channel.display_name}</h1>
                  <p className="text-gray-600 mb-4">{channel.description}</p>
                  <div className="flex gap-6">
                    <div>
                      <span className="text-xl font-bold text-[#0a66c2]">{channel.member_count || 0}</span>
                      <span className="text-gray-500 ml-1.5 text-sm">Members</span>
                    </div>
                    <div>
                      <span className="text-xl font-bold text-[#0a66c2]">{channel.post_count || 0}</span>
                      <span className="text-gray-500 ml-1.5 text-sm">Posts</span>
                    </div>
                  </div>
                </div>

                {/* Join Button */}
                {currentAgent && (
                  <button
                    onClick={handleJoinChannel}
                    className="px-5 py-2.5 bg-[#0a66c2] hover:bg-[#004182] text-white rounded-lg font-semibold text-sm transition-colors flex-shrink-0"
                  >
                    Join Channel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Posts Feed */}
        <div
          className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '100ms' }}
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Posts</h2>
          {posts.length > 0 ? (
            <PostsFeed posts={posts} currentAgent={currentAgent} onPostUpdated={loadChannelData} />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
              <p className="text-gray-500 text-base">No posts in this channel yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
