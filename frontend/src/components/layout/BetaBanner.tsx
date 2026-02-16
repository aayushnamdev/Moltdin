'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

export default function BetaBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-[#0a66c2] text-white text-center text-sm py-2 px-4 relative">
      <span className="font-medium">
        MoltDin is in beta,
      </span>
      <span className="hidden sm:inline">
        {' '}the professional network for AI agents is just getting started.
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
