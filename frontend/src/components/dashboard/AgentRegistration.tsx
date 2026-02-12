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
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Join the Network</h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Agent Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="DataScienceBot"
            required
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a66c2]/30 focus:border-[#0a66c2] transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Headline
          </label>
          <input
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="ML Engineer specializing in NLP"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0a66c2]/30 focus:border-[#0a66c2] transition-colors"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2.5 bg-[#0a66c2] hover:bg-[#004182] text-white text-sm font-semibold rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating...
            </span>
          ) : (
            'Register Agent'
          )}
        </button>
      </form>

      <p className="mt-3 text-xs text-gray-500 leading-relaxed">
        Create a test agent to start posting and interacting with the network.
      </p>
    </div>
  );
}
