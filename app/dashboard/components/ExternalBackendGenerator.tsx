/**
 * External Backend React Project Generator Component
 *
 * Component for generating complete React projects from Figma URLs using
 * the standalone Fastify backend service.
 *
 * Features:
 * - Synchronous API with full section data
 * - Real-time Firestore updates (instant progress, no polling!)
 * - Error handling with retry
 * - Display generated sections with TSX code
 * - Configurable backend URL
 */

'use client';

import { useState, useEffect } from 'react';
import { useReactProjectGeneration } from './hooks/useReactProjectGeneration';

interface ExternalBackendGeneratorProps {
  /** Initial Figma URL (optional) */
  initialUrl?: string;
  /** Figma access token (required) */
  figmaToken: string;
  /** Show compact version */
  compact?: boolean;
  /** Callback when generation completes */
  onComplete?: (sectionsCount: number) => void;
  /** Callback when generation fails */
  onError?: (error: string) => void;
  /** Domain ID for multi-tenant storage (optional) */
  domainId?: string;
}

export default function ExternalBackendGenerator({
  initialUrl = '',
  figmaToken,
  compact = false,
  onComplete,
  onError,
  domainId,
}: ExternalBackendGeneratorProps) {
  const [figmaUrl, setFigmaUrl] = useState(initialUrl);
  const [showProgress, setShowProgress] = useState(false);

  // Get backend URL from environment
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8283';

  const { generate, isGenerating, error, progress, metadata, sections, clearError, reset } =
    useReactProjectGeneration();

  // Update URL when initialUrl changes
  useEffect(() => {
    if (initialUrl) {
      setFigmaUrl(initialUrl);
    }
  }, [initialUrl]);

  // Call callbacks
  useEffect(() => {
    if (metadata?.sectionsCount && onComplete) {
      onComplete(metadata.sectionsCount);
    }
  }, [metadata, onComplete]);

  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  const handleGenerate = async () => {
    console.log('[EXTERNAL] Starting generation...');
    console.log('[EXTERNAL] Figma URL:', figmaUrl);
    console.log('[EXTERNAL] Figma Token:', figmaToken ? 'provided' : 'missing');
    console.log('[EXTERNAL] Backend URL:', backendUrl);
    console.log('[EXTERNAL] Domain ID:', domainId || 'not provided');

    clearError();
    setShowProgress(true);

    try {
      await generate(figmaUrl, figmaToken, backendUrl, domainId);
      console.log('[EXTERNAL] Generation completed successfully');
    } catch (err) {
      // Error is already handled by the hook
      console.error('[EXTERNAL] Generation failed:', err);
    }
  };

  const handleReset = () => {
    reset();
    setShowProgress(false);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3,
    });
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <svg
              className="w-6 h-6 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            External Backend Generator
          </h3>
          {metadata && (
            <span className="text-xs text-green-400 font-mono bg-green-500/10 px-2 py-1 rounded">
              ✓ Complete
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400">
          Generate React projects using the standalone Fastify backend
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Backend: <code className="bg-slate-700 px-1 rounded">{backendUrl}</code>
        </p>
      </div>

      {/* Input Section */}
      <div className="p-6 space-y-4">
        {/* Figma URL Input */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Figma URL
          </label>
          <input
            type="text"
            value={figmaUrl}
            onChange={(e) => setFigmaUrl(e.target.value)}
            placeholder="https://www.figma.com/design/...?node-id=..."
            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
            disabled={isGenerating}
          />
          <p className="mt-1 text-xs text-slate-500">
            Must include <code className="bg-slate-700 px-1 rounded">node-id</code> parameter
          </p>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !figmaUrl.trim()}
          className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Generate React Project
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">Generation Failed</p>
              <p className="text-sm text-red-300 mt-1">{error}</p>
            </div>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Progress Section */}
      {showProgress && progress.length > 0 && (
        <div className="border-t border-slate-700">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-slate-300">Progress</h4>
              {!isGenerating && !error && (
                <button
                  onClick={handleReset}
                  className="text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {progress.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 text-sm ${
                    item.step === 'error' ? 'text-red-400' : 'text-slate-300'
                  }`}
                >
                  <span className="text-xs text-slate-500 font-mono w-20 flex-shrink-0">
                    {formatTimestamp(item.timestamp)}
                  </span>
                  <div className="flex-1">
                    <p>{item.message}</p>
                    {item.percentage !== undefined && (
                      <div className="mt-1 w-full bg-slate-700 rounded-full h-1.5">
                        <div
                          className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    )}
                  </div>
                  {item.step === 'complete' && (
                    <svg
                      className="w-5 h-5 text-green-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                  {item.step === 'error' && (
                    <svg
                      className="w-5 h-5 text-red-500 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sections Display */}
      {sections && sections.length > 0 && (
        <div className="border-t border-slate-700 p-6 bg-slate-900/50">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Generated Sections</h4>
          <div className="space-y-2">
            {sections.map((section, idx) => (
              <div
                key={section.id}
                className="p-3 bg-slate-800 rounded-lg border border-slate-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {idx + 1}. {section.name}
                    </span>
                    <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded">
                      {section.type}
                    </span>
                    {section.hasForm && (
                      <span className="text-xs text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded">
                        Form
                      </span>
                    )}
                    {section.hasMenu && (
                      <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                        Menu
                      </span>
                    )}
                  </div>
                  <code className="text-xs text-green-400 font-mono">
                    {section.generated.componentName}
                  </code>
                </div>
                {section.menuItems && section.menuItems.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-slate-500 mb-1">Menu Items:</p>
                    <div className="flex flex-wrap gap-1">
                      {section.menuItems.map((item, i) => (
                        <span
                          key={i}
                          className="text-xs text-slate-300 bg-slate-700 px-2 py-0.5 rounded"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata Section */}
      {metadata && (
        <div className="border-t border-slate-700 p-6 bg-slate-900/50">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Generation Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Sections:</span>
              <p className="text-white font-mono mt-1">{metadata.sectionsCount}</p>
            </div>
            <div>
              <span className="text-slate-500">Time:</span>
              <p className="text-white font-mono mt-1">{metadata.generationTime}s</p>
            </div>
            {metadata.screenshot && (
              <div className="col-span-2">
                <span className="text-slate-500">Screenshot:</span>
                <img
                  src={metadata.screenshot}
                  alt="Design preview"
                  className="mt-2 w-full rounded-lg border border-slate-700"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
