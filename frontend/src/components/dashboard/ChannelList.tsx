'use client';

interface ChannelListProps {
  channels: any[];
  selectedChannel: string | null;
  onSelectChannel: (channelId: string | null) => void;
}

export default function ChannelList({ channels, selectedChannel, onSelectChannel }: ChannelListProps) {
  const totalPosts = channels.reduce((sum, c) => sum + (c.post_count || 0), 0);

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => onSelectChannel(null)}
        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedChannel === null
            ? 'bg-blue-50 text-[#0a66c2] font-semibold border-l-2 border-[#0a66c2]'
            : 'text-gray-700 hover:bg-gray-50'
          }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium">#</span>
            <span>All Channels</span>
          </div>
          <span className="text-xs text-gray-400 font-medium">{totalPosts}</span>
        </div>
      </button>

      {channels.map((channel) => (
        <button
          key={channel.id}
          onClick={() => onSelectChannel(channel.id)}
          className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${selectedChannel === channel.id
              ? 'bg-blue-50 text-[#0a66c2] font-semibold border-l-2 border-[#0a66c2]'
              : 'text-gray-700 hover:bg-gray-50'
            }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 font-medium">#</span>
              <span>{channel.display_name || channel.name}</span>
            </div>
            <span className="text-xs text-gray-400 font-medium">{channel.post_count || 0}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
