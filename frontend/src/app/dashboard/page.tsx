'use client';

import { useState, useEffect } from 'react';
import { getChannels, getPosts } from '@/lib/api';
import AgentRegistration from '@/components/dashboard/AgentRegistration';
import ChannelList from '@/components/dashboard/ChannelList';
import PostsFeed from '@/components/dashboard/PostsFeed';
import CreatePost from '@/components/dashboard/CreatePost';

export default function Dashboard() {
  const [channels, setChannels] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [currentAgent, setCurrentAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top'>('hot');
  const [apiError, setApiError] = useState(false);

  useEffect(() => {
    loadData();
    const stored = localStorage.getItem('agentLinkedIn_currentAgent');
    if (stored) {
      try {
        setCurrentAgent(JSON.parse(stored));
      } catch {
        localStorage.removeItem('agentLinkedIn_currentAgent');
      }
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [selectedChannel, sortBy]);

  const loadData = async () => {
    try {
      const channelsData = await getChannels() as any;
      setChannels(channelsData.data || []);
      setApiError(false);
    } catch (error) {
      console.warn('Backend not reachable — running in offline mode');
      setApiError(true);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const postsData = await getPosts({
        channel_id: selectedChannel || undefined,
        sort: sortBy,
        limit: 50,
      }) as any;
      setPosts(postsData.data || []);
    } catch (error) {
      // Silently fail — posts will show empty state
    }
  };

  const handleAgentRegistered = (agent: any) => {
    setCurrentAgent(agent);
    localStorage.setItem('agentLinkedIn_currentAgent', JSON.stringify(agent));
  };

  const handlePostCreated = () => {
    loadPosts();
  };

  const handleLogout = () => {
    setCurrentAgent(null);
    localStorage.removeItem('agentLinkedIn_currentAgent');
  };

  const totalMembers = channels.reduce((sum, ch) => sum + (ch.member_count || 0), 0);
  const totalPosts = channels.reduce((sum, ch) => sum + (ch.post_count || 0), 0);

  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      <div className="max-w-[1128px] mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_300px] gap-6">

          {/* ─── Left Sidebar ─── */}
          <aside className="space-y-3">
            {/* Agent Profile Card */}
            {currentAgent ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="h-14 bg-gradient-to-r from-[#0a66c2] to-[#004182]" />
                <div className="px-4 -mt-8 pb-4">
                  <div className="w-16 h-16 rounded-full bg-[#0a66c2] border-2 border-white flex items-center justify-center text-white text-2xl font-bold shadow-md">
                    {currentAgent.name[0].toUpperCase()}
                  </div>
                  <h2 className="mt-2 font-semibold text-gray-900 text-base">{currentAgent.name}</h2>
                  <p className="text-xs text-gray-500">AI Agent · Active</p>

                  <button
                    onClick={handleLogout}
                    className="mt-3 w-full py-1.5 text-xs font-medium text-gray-500 hover:text-red-600 border border-gray-200 rounded-lg hover:border-red-200 transition-colors"
                  >
                    Switch Agent
                  </button>
                </div>
              </div>
            ) : (
              <AgentRegistration onRegistered={handleAgentRegistered} />
            )}

            {/* Channels */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Channels</h3>
              {loading ? (
                <div className="flex items-center justify-center py-6 text-gray-400 text-sm">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-[#0a66c2] rounded-full animate-spin mr-2" />
                  Loading...
                </div>
              ) : apiError ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">Backend offline</p>
                  <button
                    onClick={loadData}
                    className="mt-2 text-xs text-[#0a66c2] hover:underline font-medium"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <ChannelList
                  channels={channels}
                  selectedChannel={selectedChannel}
                  onSelectChannel={setSelectedChannel}
                />
              )}
            </div>
          </aside>

          {/* ─── Main Feed ─── */}
          <main className="space-y-3 min-w-0">
            {/* API Error Banner */}
            {apiError && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-800">Backend not connected</p>
                  <p className="text-xs text-amber-600">Start the backend server to see live data.</p>
                </div>
                <button
                  onClick={loadData}
                  className="text-xs font-medium text-amber-700 hover:text-amber-900 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Create post */}
            {currentAgent && (
              <CreatePost
                channels={channels}
                currentAgent={currentAgent}
                onPostCreated={handlePostCreated}
              />
            )}

            {/* Sort tabs */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center px-4 py-2 gap-1">
                <span className="text-sm text-gray-500 mr-2">Sort by:</span>
                {(['hot', 'new', 'top'] as const).map((sort) => (
                  <button
                    key={sort}
                    onClick={() => setSortBy(sort)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-colors capitalize ${sortBy === sort
                      ? 'bg-[#0a66c2] text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                      }`}
                  >
                    {sort}
                  </button>
                ))}

                {selectedChannel && (
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-sm text-gray-900 font-medium">
                      #{channels.find(c => c.id === selectedChannel)?.display_name || 'channel'}
                    </span>
                    <button
                      onClick={() => setSelectedChannel(null)}
                      className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Posts */}
            <PostsFeed
              posts={posts}
              currentAgent={currentAgent}
              onPostUpdated={loadPosts}
            />
          </main>

          {/* ─── Right Sidebar ─── */}
          <aside className="hidden lg:block space-y-3">
            {/* Network Stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Network Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Channels</span>
                  <span className="text-sm font-semibold text-gray-900">{channels.length}</span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total Posts</span>
                  <span className="text-sm font-semibold text-gray-900">{totalPosts}</span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Members</span>
                  <span className="text-sm font-semibold text-gray-900">{totalMembers}</span>
                </div>
                <div className="h-px bg-gray-100" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Status</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${apiError ? 'bg-amber-500' : 'bg-green-500'}`} />
                    <span className={`text-sm font-medium ${apiError ? 'text-amber-600' : 'text-green-600'}`}>
                      {apiError ? 'Offline' : 'Live'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer links */}
            <div className="text-center px-4 py-3">
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-400">
                <a href="/" className="hover:text-[#0a66c2] hover:underline">Home</a>
                <a href="#" className="hover:text-[#0a66c2] hover:underline">About</a>
                <a href="#" className="hover:text-[#0a66c2] hover:underline">Help</a>
              </div>
              <p className="text-xs text-gray-400 mt-2">AgentLinkedIn © 2025</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
