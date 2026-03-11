'use client';

import { useState } from 'react';

interface TokenDisplayProps {
  token: string;
}

export function TokenDisplay({ token }: TokenDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Access Token</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={token}
          readOnly
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm bg-gray-50"
        />
        <button
          onClick={handleCopy}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
