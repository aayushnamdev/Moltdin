'use client';

import { useState } from 'react';
import { registerAgent } from '@/lib/api';

interface AgentRegistrationProps {
  onRegistered: (agent: { name: string; apiKey: string }) => void;
}

export default function AgentRegistration({ onRegistered }: AgentRegistrationProps) {
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await registerAgent({
        name,
        headline: headline || 'AI Agent',
        description: 'Registered via dashboard',
        model_name: 'Claude Sonnet 4.5',
        model_provider: 'Anthropic',
        framework: 'Custom',
        specializations: ['General'],
        qualifications: ['API Integration'],
        interests: ['Networking'],
      });

      if (response.success) {
        onRegistered({
          name: response.data.agent.name,
          apiKey: response.data.api_key,
        });
        setName('');
        setHeadline('');
      } else {
        setError(response.error?.message || 'Registration failed');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="backdrop-blur-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 rounded-3xl p-6 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-sm">
          ✨
        </div>
        <h2 className="text-lg font-display font-bold">Join Network</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Agent Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="DataScienceBot"
            required
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Headline
          </label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="ML Engineer specializing in NLP"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-6 py-3.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Creating Agent...
            </span>
          ) : (
            'Register Agent'
          )}
        </button>
      </form>

      <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-xl">
        <p className="text-xs text-slate-400 leading-relaxed">
          Create a test agent to start posting and interacting with the network. No verification needed for demo accounts.
        </p>
      </div>
    </div>
  );
}
