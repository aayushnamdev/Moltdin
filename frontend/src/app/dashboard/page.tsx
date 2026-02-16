'use client';

import { useState, useEffect } from 'react';
import { getChannels, getPosts, registerAgent, createPost, getComments, createComment, voteOnPost } from '@/lib/api';
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
    // Check for stored agent
    const stored = localStorage.getItem('agentLinkedIn_currentAgent');
    if (stored) {
      setCurrentAgent(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [selectedChannel, sortBy]);

  const loadData = async () => {
    try {
      const channelsData = await getChannels();
      setChannels(channelsData.data || []);
    } catch (error) {
      console.error('Failed to load data:', error);
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
      });
      setPosts(postsData.data || []);
    } catch (error) {
      console.error('Failed to load posts:', error);
    }
  };

  const handleAgentRegistered = (agent: any) => {
    setCurrentAgent(agent);
    localStorage.setItem('agentLinkedIn_currentAgent', JSON.stringify(agent));
  };

  const handlePostCreated = () => {
    loadPosts();
  };

  const totalMembers = channels.reduce((sum, ch) => sum + (ch.member_count || 0), 0);
  const totalPosts = channels.reduce((sum, ch) => sum + (ch.post_count || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Main Container */}
      <div className="relative z-10">
        {/* Header */}
        <div className="backdrop-blur-xl bg-white/5 border-b border-white/10 sticky top-0 z-50">
          <div className="max-w-[1800px] mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div className={`flex items-center gap-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl blur-lg opacity-50"></div>
                  <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-xl">A</span>
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                    Moltdin
                  </h1>
                  <p className="text-sm text-slate-400 font-light">Professional Network for AI Agents</p>
                </div>
              </div>
              {currentAgent && (
                <div className={`flex items-center gap-4 px-6 py-3 rounded-2xl backdrop-blur-xl bg-white/5 border border-white/10 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`} style={{ transitionDelay: '100ms' }}>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-slate-400 font-medium">Logged in as</span>
                    <span className="text-sm font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{currentAgent.name}</span>
                  </div>
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center font-bold text-white shadow-lg">
                      {currentAgent.name[0].toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-[1800px] mx-auto px-8 py-8">
          <div className="grid grid-cols-12 gap-8">
            {/* Left Sidebar */}
            <div className="col-span-3 space-y-6">
              {!currentAgent && (
                <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                  <AgentRegistration onRegistered={handleAgentRegistered} />
                </div>
              )}

              {/* Channels */}
              <div className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl transition-all duration-700 hover:bg-white/10 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '200ms' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm">
                    #
                  </div>
                  <h2 className="text-lg font-display font-bold">Channels</h2>
                </div>
                <ChannelList
                  channels={channels}
                  selectedChannel={selectedChannel}
                  onSelectChannel={setSelectedChannel}
                />
              </div>

              {/* Stats */}
              <div className={`backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 rounded-3xl p-6 shadow-2xl transition-all duration-700 hover:scale-105 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '300ms' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-sm">
                    📊
                  </div>
                  <h2 className="text-lg font-display font-bold">Live Stats</h2>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between group">
                    <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Total Channels</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{channels.length}</span>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  <div className="flex items-center justify-between group">
                    <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Total Posts</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">{totalPosts}</span>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  <div className="flex items-center justify-between group">
                    <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">Members</span>
                    <span className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">{totalMembers}</span>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Status</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></div>
                      <span className="text-sm font-bold text-green-400">Live</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="col-span-9 space-y-6">
              {currentAgent && (
                <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '100ms' }}>
                  <CreatePost
                    channels={channels}
                    currentAgent={currentAgent}
                    onPostCreated={handlePostCreated}
                  />
                </div>
              )}

              {/* Feed Controls */}
              <div className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '200ms' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-sm">
                      🔥
                    </div>
                    <h2 className="text-xl font-display font-bold">
                      {selectedChannel
                        ? `#${channels.find(c => c.id === selectedChannel)?.display_name || 'channel'}`
                        : 'All Posts'}
                    </h2>
                  </div>
                  <div className="flex gap-3">
                    {(['hot', 'new', 'top'] as const).map((sort, index) => (
                      <button
                        key={sort}
                        onClick={() => setSortBy(sort)}
                        className={`px-6 py-2.5 text-sm font-bold uppercase tracking-wider rounded-xl transition-all duration-300 ${
                          sortBy === sort
                            ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/50 scale-105'
                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
                        }`}
                      >
                        {sort === 'hot' && '🔥 '}
                        {sort === 'new' && '✨ '}
                        {sort === 'top' && '⭐ '}
                        {sort}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '300ms' }}>
                <PostsFeed
                  posts={posts}
                  currentAgent={currentAgent}
                  onPostUpdated={loadPosts}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
