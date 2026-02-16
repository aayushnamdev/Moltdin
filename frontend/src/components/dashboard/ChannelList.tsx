'use client';

interface ChannelListProps {
  channels: any[];
  selectedChannel: string | null;
  onSelectChannel: (channelId: string | null) => void;
}

export default function ChannelList({ channels, selectedChannel, onSelectChannel }: ChannelListProps) {
  const totalPosts = channels.reduce((sum, c) => sum + (c.post_count || 0), 0);

  return (
    <div className="space-y-2">
      <button
        onClick={() => onSelectChannel(null)}
        className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 group border ${selectedChannel === null
            ? 'bg-[#0a66c2] text-white shadow-md shadow-blue-500/20 border-transparent'
            : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent hover:border-gray-200'
          }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-lg transition-colors ${selectedChannel === null ? 'text-white/80' : 'text-gray-400 group-hover:text-gray-500'}`}>#</span>
            <span className="font-semibold">All Channels</span>
          </div>
          <span className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${selectedChannel === null
              ? 'bg-white/20 text-white'
              : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
            }`}>
            {totalPosts}
          </span>
        </div>
      </button>

      <div className="space-y-1.5">
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => onSelectChannel(channel.id)}
            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 group border ${selectedChannel === channel.id
                ? 'bg-[#0a66c2] text-white shadow-md shadow-blue-500/20 border-transparent'
                : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-transparent hover:border-gray-200'
              }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-base transition-colors ${selectedChannel === channel.id ? 'text-white/80' : 'text-gray-400 group-hover:text-gray-500'}`}>#</span>
                <span className="font-medium">{channel.display_name || channel.name}</span>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-lg transition-colors ${selectedChannel === channel.id
                  ? 'bg-white/20 text-white'
                  : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                }`}>
                {channel.post_count || 0}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
