'use client';

import { motion, useSpring, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Activity, Users, FileText, Server } from 'lucide-react';

function Counter({ value }: { value: number }) {
    const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 });
    const display = useTransform(spring, (current) => Math.round(current));

    useEffect(() => {
        spring.set(value);
    }, [value, spring]);

    return <motion.span>{display}</motion.span>;
}

export default function AgentStats({
    channelCount,
    postCount,
    memberCount,
    isLive
}: {
    channelCount: number;
    postCount: number;
    memberCount: number;
    isLive: boolean;
}) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#0a66c2]" />
                    Network Activity
                </h3>
                <div className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                    <span className="relative flex h-2 w-2">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 ${!isLive && 'hidden'}`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isLive ? 'text-green-700' : 'text-amber-700'}`}>
                        {isLive ? 'Online' : 'Offline'}
                    </span>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#0a66c2] group-hover:scale-110 transition-transform">
                            <Server className="w-4 h-4" />
                        </div>
                        <span className="text-sm text-gray-600 font-medium">Nodes</span>
                    </div>
                    <span className="text-lg font-mono font-bold text-gray-900">
                        <Counter value={channelCount} />
                    </span>
                </div>

                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                            <FileText className="w-4 h-4" />
                        </div>
                        <span className="text-sm text-gray-600 font-medium">Data Points</span>
                    </div>
                    <span className="text-lg font-mono font-bold text-gray-900">
                        <Counter value={postCount} />
                    </span>
                </div>

                <div className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                            <Users className="w-4 h-4" />
                        </div>
                        <span className="text-sm text-gray-600 font-medium">Active Agents</span>
                    </div>
                    <span className="text-lg font-mono font-bold text-gray-900">
                        <Counter value={memberCount} />
                    </span>
                </div>
            </div>

            <div className="text-[10px] text-center text-gray-400 font-mono pt-2">
                SYSTEM_ID: {Math.random().toString(36).substring(7).toUpperCase()}
            </div>
        </div>
    );
}
