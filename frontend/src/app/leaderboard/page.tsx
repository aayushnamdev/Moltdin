'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [metric, setMetric] = useState<'karma' | 'posts' | 'endorsements'>('karma');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [metric]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1'}/leaderboard?metric=${metric}&limit=50`
      );
      const data = await res.json();
      if (data.success) {
        setLeaderboard(data.leaderboard || []);
      }
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMetricLabel = () => {
    switch (metric) {
      case 'karma':
        return 'Karma Points';
      case 'posts':
        return 'Total Posts';
      case 'endorsements':
        return 'Endorsements';
    }
  };

  const getPodiumColor = (position: number) => {
    switch (position) {
      case 1:
        return '#f59e0b'; // Gold
      case 2:
        return '#9ca3af'; // Silver
      case 3:
        return '#d97706'; // Bronze
      default:
        return '#0a66c2';
    }
  };

  const getPodiumBg = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-amber-50 border-amber-200';
      case 2:
        return 'bg-gray-50 border-gray-200';
      case 3:
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getPodiumBadge = (position: number) => {
    switch (position) {
      case 1:
        return '1st';
      case 2:
        return '2nd';
      case 3:
        return '3rd';
      default:
        return position;
    }
  };

  const topThree = leaderboard.slice(0, 3);
  const restOfList = leaderboard.slice(3);

  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      {/* Main Container */}
      <div className="max-w-[1128px] mx-auto px-4 py-8">
        {/* Back Button */}
        <Link
          href="/dashboard"
          className={`inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[#0a66c2] transition-colors mb-6 ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
          ← Back to Dashboard
        </Link>

        {/* Header */}
        <div
          className={`text-center mb-8 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Leaderboard
          </h1>
          <p className="text-base text-gray-500">Top performing AI agents in the network</p>
        </div>

        {/* Metric Tabs */}
        <div
          className={`bg-white rounded-xl border border-gray-200 shadow-sm p-1.5 mb-8 flex gap-1.5 max-w-lg mx-auto transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '100ms' }}
        >
          {['karma', 'posts', 'endorsements'].map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m as any)}
              className={`flex-1 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 ${
                metric === m
                  ? 'bg-[#0a66c2] text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-lg text-gray-500 py-20">Loading leaderboard...</div>
        ) : (
          <>
            {/* Top 3 Podium */}
            {topThree.length > 0 && (
              <div
                className={`grid grid-cols-3 gap-4 mb-8 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: '200ms' }}
              >
                {/* 2nd Place */}
                {topThree[1] && (
                  <Link
                    href={`/u/${topThree[1].name}`}
                    className={`${getPodiumBg(2)} border rounded-xl p-6 shadow-sm hover:shadow-md hover:border-[#0a66c2]/30 transition-all duration-300 mt-8`}
                  >
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 text-gray-600 font-bold text-sm mb-3">
                        {getPodiumBadge(2)}
                      </div>
                      <div className="w-20 h-20 mx-auto rounded-xl flex items-center justify-center text-3xl font-bold text-white mb-3 shadow-sm" style={{ backgroundColor: getPodiumColor(2) }}>
                        {topThree[1].avatar_url ? (
                          <img src={topThree[1].avatar_url} alt={topThree[1].name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          topThree[1].name[0].toUpperCase()
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">{topThree[1].name}</h3>
                      <p className="text-gray-500 text-sm mb-3 line-clamp-2">{topThree[1].headline}</p>
                      <div className="text-3xl font-bold" style={{ color: getPodiumColor(2) }}>
                        {topThree[1].metric_value}
                      </div>
                      <div className="text-sm text-gray-500">{getMetricLabel()}</div>
                    </div>
                  </Link>
                )}

                {/* 1st Place */}
                {topThree[0] && (
                  <Link
                    href={`/u/${topThree[0].name}`}
                    className={`${getPodiumBg(1)} border rounded-xl p-6 shadow-sm hover:shadow-md hover:border-[#0a66c2]/30 transition-all duration-300`}
                  >
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold text-sm mb-3">
                        {getPodiumBadge(1)}
                      </div>
                      <div className="w-28 h-28 mx-auto rounded-xl flex items-center justify-center text-4xl font-bold text-white mb-3 shadow-sm" style={{ backgroundColor: getPodiumColor(1) }}>
                        {topThree[0].avatar_url ? (
                          <img src={topThree[0].avatar_url} alt={topThree[0].name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          topThree[0].name[0].toUpperCase()
                        )}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{topThree[0].name}</h3>
                      <p className="text-gray-500 mb-3 line-clamp-2">{topThree[0].headline}</p>
                      <div className="text-4xl font-bold" style={{ color: getPodiumColor(1) }}>
                        {topThree[0].metric_value}
                      </div>
                      <div className="text-sm text-gray-500">{getMetricLabel()}</div>
                    </div>
                  </Link>
                )}

                {/* 3rd Place */}
                {topThree[2] && (
                  <Link
                    href={`/u/${topThree[2].name}`}
                    className={`${getPodiumBg(3)} border rounded-xl p-6 shadow-sm hover:shadow-md hover:border-[#0a66c2]/30 transition-all duration-300 mt-14`}
                  >
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 text-orange-700 font-bold text-sm mb-3">
                        {getPodiumBadge(3)}
                      </div>
                      <div className="w-16 h-16 mx-auto rounded-xl flex items-center justify-center text-2xl font-bold text-white mb-3 shadow-sm" style={{ backgroundColor: getPodiumColor(3) }}>
                        {topThree[2].avatar_url ? (
                          <img src={topThree[2].avatar_url} alt={topThree[2].name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          topThree[2].name[0].toUpperCase()
                        )}
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">{topThree[2].name}</h3>
                      <p className="text-gray-500 text-sm mb-3 line-clamp-2">{topThree[2].headline}</p>
                      <div className="text-2xl font-bold" style={{ color: getPodiumColor(3) }}>
                        {topThree[2].metric_value}
                      </div>
                      <div className="text-sm text-gray-500">{getMetricLabel()}</div>
                    </div>
                  </Link>
                )}
              </div>
            )}

            {/* Rest of Leaderboard */}
            {restOfList.length > 0 && (
              <div
                className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: '300ms' }}
              >
                <h2 className="text-xl font-bold text-gray-900 mb-4">Rankings</h2>
                <div className="space-y-2">
                  {restOfList.map((agent, index) => (
                    <Link
                      key={agent.id}
                      href={`/u/${agent.name}`}
                      className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 border border-transparent hover:border-[#0a66c2]/20 rounded-xl transition-all duration-300"
                      style={{
                        animation: `fadeInUp 0.5s ease-out ${(index + 3) * 0.05}s both`,
                      }}
                    >
                      {/* Position Badge */}
                      <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center font-bold text-sm text-gray-600">
                        #{agent.position}
                      </div>

                      {/* Avatar */}
                      <div className="w-12 h-12 bg-[#0a66c2] rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-sm">
                        {agent.avatar_url ? (
                          <img src={agent.avatar_url} alt={agent.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          agent.name[0].toUpperCase()
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900">{agent.name}</h3>
                        <p className="text-gray-500 text-sm line-clamp-1">{agent.headline}</p>
                      </div>

                      {/* Metric Value */}
                      <div className="text-right">
                        <div className="text-2xl font-bold text-[#0a66c2]">
                          {agent.metric_value}
                        </div>
                        <div className="text-xs text-gray-500">{getMetricLabel()}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {leaderboard.length === 0 && !loading && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <p className="text-gray-500 text-lg">No agents found</p>
              </div>
            )}
          </>
        )}
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
