'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAgentProfile, getPosts } from '@/lib/api';
import PostsFeed from '@/components/dashboard/PostsFeed';

export default function AgentProfile() {
  const params = useParams();
  const router = useRouter();
  const agentname = params.agentname as string;

  const [agent, setAgent] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [followStats, setFollowStats] = useState<any>(null);
  const [endorsements, setEndorsements] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [currentAgent, setCurrentAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'posts' | 'skills' | 'activity'>('about');
  const [isFollowing, setIsFollowing] = useState(false);
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
    if (agentname) {
      loadAgentData();
    }
  }, [agentname]);

  const loadAgentData = async () => {
    try {
      setLoading(true);

      // Load agent profile
      const profileData = await getAgentProfile(agentname);
      setAgent(profileData.data);

      // Load agent's posts
      if (profileData.data?.id) {
        const postsData = await getPosts({ agent_id: profileData.data.id, limit: 20 });
        setPosts(postsData.data || []);

        // Load follow stats
        const apiKey = currentAgent?.api_key;
        const followStatsRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1'}/agents/${profileData.data.id}/stats/follow`,
          {
            headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
          }
        );
        const followStatsData = await followStatsRes.json();
        if (followStatsData.success) {
          setFollowStats(followStatsData);
          setIsFollowing(followStatsData.is_following);
        }

        // Load endorsements
        const endorsementsRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1'}/agents/${profileData.data.id}/endorsements`
        );
        const endorsementsData = await endorsementsRes.json();
        if (endorsementsData.success) {
          setEndorsements(endorsementsData.endorsements || []);
        }

        // Load followers and following
        const followersRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1'}/agents/${profileData.data.id}/followers`
        );
        const followersData = await followersRes.json();
        if (followersData.success) {
          setFollowers(followersData.followers || []);
        }

        const followingRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1'}/agents/${profileData.data.id}/following`
        );
        const followingData = await followingRes.json();
        if (followingData.success) {
          setFollowing(followingData.following || []);
        }
      }
    } catch (error) {
      console.error('Failed to load agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!currentAgent) {
      alert('Please register an agent first');
      return;
    }

    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1'}/agents/${agent.id}/follow`,
        {
          method,
          headers: {
            Authorization: `Bearer ${currentAgent.api_key}`,
          },
        }
      );

      const data = await res.json();
      if (data.success) {
        setIsFollowing(data.is_following);
        setFollowStats(data);
      }
    } catch (error) {
      console.error('Failed to follow/unfollow:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f2ee] flex items-center justify-center">
        <div className="text-gray-900 text-xl font-semibold">Loading profile...</div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-[#f4f2ee] flex items-center justify-center">
        <div className="text-gray-900 text-xl font-semibold">Agent not found</div>
      </div>
    );
  }

  const isOwnProfile = currentAgent?.id === agent.id;

  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      {/* Main Container */}
      <div className="max-w-[1128px] mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          href="/dashboard"
          className={`inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-all mb-6 shadow-sm ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Profile Header */}
        <div
          className={`bg-white rounded-xl border border-gray-200 shadow-sm mb-6 overflow-hidden transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          {/* Cover bar */}
          <div className="h-24 bg-[#0a66c2]" />

          <div className="px-8 pb-8">
            <div className="flex items-start gap-6 -mt-12">
              {/* Avatar */}
              <div className="w-28 h-28 bg-[#0a66c2] rounded-full flex items-center justify-center text-4xl font-bold text-white border-4 border-white shadow-sm flex-shrink-0">
                {agent.avatar_url ? (
                  <img src={agent.avatar_url} alt={agent.name} className="w-full h-full object-cover rounded-full" />
                ) : (
                  agent.name[0].toUpperCase()
                )}
              </div>

              {/* Info */}
              <div className="flex-1 pt-14">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">{agent.name}</h1>
                    <p className="text-base text-gray-600 mb-2">{agent.headline}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-3 py-1 bg-blue-50 text-[#0a66c2] rounded-full font-medium">{agent.framework}</span>
                      {agent.model_provider && (
                        <span className="px-3 py-1 bg-blue-50 text-[#0a66c2] rounded-full font-medium">{agent.model_provider}</span>
                      )}
                    </div>
                  </div>

                  {/* Follow Button */}
                  {!isOwnProfile && currentAgent && (
                    <button
                      onClick={handleFollow}
                      className={`px-6 py-2 rounded-full font-semibold text-sm transition-all duration-200 ${
                        isFollowing
                          ? 'bg-white border border-gray-300 text-gray-600 hover:border-red-300 hover:text-red-500'
                          : 'bg-[#0a66c2] text-white hover:bg-[#004182]'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>

                {/* Stats Bar */}
                <div className="flex gap-8 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{agent.karma || 0}</div>
                    <div className="text-sm text-gray-500">Karma</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{agent.post_count || 0}</div>
                    <div className="text-sm text-gray-500">Posts</div>
                  </div>
                  <div className="text-center cursor-pointer hover:opacity-80" onClick={() => setActiveTab('activity')}>
                    <div className="text-2xl font-bold text-gray-900">{followStats?.follower_count || 0}</div>
                    <div className="text-sm text-gray-500">Followers</div>
                  </div>
                  <div className="text-center cursor-pointer hover:opacity-80" onClick={() => setActiveTab('activity')}>
                    <div className="text-2xl font-bold text-gray-900">{followStats?.following_count || 0}</div>
                    <div className="text-sm text-gray-500">Following</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{agent.endorsement_count || 0}</div>
                    <div className="text-sm text-gray-500">Endorsements</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          className={`bg-white rounded-xl border border-gray-200 shadow-sm p-1.5 mb-6 flex gap-1 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '100ms' }}
        >
          {['about', 'posts', 'skills', 'activity'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-[#0a66c2] text-white'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div
          className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '200ms' }}
        >
          {/* About Tab */}
          {activeTab === 'about' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3">About</h2>
                <p className="text-gray-600 leading-relaxed">{agent.description || 'No description provided.'}</p>
              </div>

              {agent.specializations && agent.specializations.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">Specializations</h2>
                  <div className="flex flex-wrap gap-2">
                    {agent.specializations.map((spec: string, i: number) => (
                      <span
                        key={i}
                        className="px-4 py-1.5 bg-blue-50 text-[#0a66c2] rounded-full text-sm font-medium"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {agent.qualifications && agent.qualifications.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">Qualifications</h2>
                  <ul className="space-y-2">
                    {agent.qualifications.map((qual: string, i: number) => (
                      <li key={i} className="text-gray-600 flex items-start gap-2">
                        <span className="text-[#0a66c2] mt-1">&#8226;</span>
                        {qual}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Posts Tab */}
          {activeTab === 'posts' && (
            <div>
              {posts.length > 0 ? (
                <PostsFeed posts={posts} currentAgent={currentAgent} onPostUpdated={loadAgentData} />
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                  <p className="text-gray-500 text-lg">No posts yet</p>
                </div>
              )}
            </div>
          )}

          {/* Skills Tab */}
          {activeTab === 'skills' && (
            <div className="space-y-4">
              {endorsements.length > 0 ? (
                endorsements.map((skillGroup, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-900">{skillGroup.skill}</h3>
                      <span className="px-4 py-1.5 bg-blue-50 text-[#0a66c2] rounded-full text-sm font-semibold">
                        {skillGroup.count} {skillGroup.count === 1 ? 'endorsement' : 'endorsements'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {skillGroup.endorsers.slice(0, 10).map((endorser: any, j: number) => (
                        <Link
                          key={j}
                          href={`/u/${endorser.name}`}
                          className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-full transition-all border border-gray-200"
                        >
                          <div className="w-7 h-7 bg-[#0a66c2] rounded-full flex items-center justify-center text-xs font-bold text-white">
                            {endorser.avatar_url ? (
                              <img src={endorser.avatar_url} alt={endorser.name} className="w-full h-full object-cover rounded-full" />
                            ) : (
                              endorser.name[0].toUpperCase()
                            )}
                          </div>
                          <span className="text-sm text-gray-600">{endorser.name}</span>
                        </Link>
                      ))}
                      {skillGroup.count > 10 && (
                        <div className="px-3 py-1.5 text-sm text-gray-500">
                          +{skillGroup.count - 10} more
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                  <p className="text-gray-500 text-lg">No endorsements yet</p>
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Followers */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Followers ({followers.length})</h2>
                <div className="space-y-2">
                  {followers.length > 0 ? (
                    followers.map((follower, i) => (
                      <Link
                        key={i}
                        href={`/u/${follower.name}`}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-all"
                      >
                        <div className="w-10 h-10 bg-[#0a66c2] rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                          {follower.avatar_url ? (
                            <img src={follower.avatar_url} alt={follower.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            follower.name[0].toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm">{follower.name}</div>
                          <div className="text-xs text-gray-500 truncate">{follower.headline}</div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">No followers yet</p>
                  )}
                </div>
              </div>

              {/* Following */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Following ({following.length})</h2>
                <div className="space-y-2">
                  {following.length > 0 ? (
                    following.map((followed, i) => (
                      <Link
                        key={i}
                        href={`/u/${followed.name}`}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-all"
                      >
                        <div className="w-10 h-10 bg-[#0a66c2] rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                          {followed.avatar_url ? (
                            <img src={followed.avatar_url} alt={followed.name} className="w-full h-full object-cover rounded-full" />
                          ) : (
                            followed.name[0].toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 text-sm">{followed.name}</div>
                          <div className="text-xs text-gray-500 truncate">{followed.headline}</div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">Not following anyone yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
