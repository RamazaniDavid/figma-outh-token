/**
 * Custom hook for unified React project generation
 *
 * Handles the complete workflow of generating a React project from a Figma URL:
 * - API communication (synchronous response with full section data)
 * - Real-time progress tracking via Firestore
 * - Error handling
 * - Section data storage
 * - ZIP file download (optional)
 *
 * Usage:
 *   const { generate, isGenerating, error, progress, sections } = useReactProjectGeneration();
 *   await generate('https://www.figma.com/design/xxx?node-id=1-2');
 */

import { useState, useCallback } from 'react';
import type { Section, GenerateReactProjectSyncResponse } from './types';

export interface GenerationMetadata {
  generationTime: string;
  sectionsCount: number;
  screenshot: string;
}

export interface GenerationProgress {
  step: string;
  message: string;
  percentage: number;
  timestamp: number;
}

export interface UseReactProjectGenerationResult {
  generate: (figmaUrl: string, accessToken?: string, backendUrl?: string, domainId?: string, backendApiKey?: string) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
  progress: GenerationProgress[];
  metadata: GenerationMetadata | null;
  sections: Section[];
  clearError: () => void;
  reset: () => void;
}

export function useReactProjectGeneration(): UseReactProjectGenerationResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<GenerationProgress[]>([]);
  const [metadata, setMetadata] = useState<GenerationMetadata | null>(null);
  const [sections, setSections] = useState<Section[]>([]);

  const addProgress = useCallback((step: string, message: string, percentage: number = 0) => {
    setProgress(prev => [
      ...prev,
      {
        step,
        message,
        percentage,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setProgress([]);
    setMetadata(null);
    setSections([]);
  }, []);


  const generate = useCallback(
    async (figmaUrl: string, accessToken?: string, backendUrl?: string, domainId?: string, backendApiKey?: string) => {
      // Reset state
      setIsGenerating(true);
      setError(null);
      setProgress([]);
      setMetadata(null);
      setSections([]);

      // Capture start time
      const startTime = Date.now();

      addProgress('start', 'Starting React project generation...', 0);

      try {
        // Validate URL format
        if (!figmaUrl || !figmaUrl.trim()) {
          throw new Error('Figma URL is required');
        }

        if (!figmaUrl.includes('figma.com')) {
          throw new Error('Invalid Figma URL format');
        }

        if (!figmaUrl.includes('node-id=')) {
          throw new Error('Figma URL must include a node-id parameter (e.g., ?node-id=123-456)');
        }

        if (domainId) {
          console.log(`[DEBUG] Domain-based request: ${domainId}`);
          addProgress('domain', `Using domain-based storage: ${domainId}`, 5);
        }

        addProgress('request', 'Sending request to backend...', 10);

        // Determine API endpoint (external backend or Next.js route)
        const apiUrl = backendUrl
          ? `${backendUrl}/api/generate`
          : '/api/figma/generate-react-project';

        // Build headers
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        // Build request body
        const requestBody: any = {
          figmaUrl,
        };

        // Add domainId if provided
        if (domainId) {
          requestBody.domainId = domainId;
          console.log(`[DEBUG] Adding domainId to request: ${domainId}`);
        }

        // For external backend, we need to include figmaToken
        if (backendUrl) {
          if (!accessToken) {
            throw new Error('Figma access token is required for external backend');
          }
          requestBody.figmaToken = accessToken;
          const apiKey = backendApiKey || process.env.NEXT_PUBLIC_BACKEND_API_KEY || 'your-backend-api-key';
          headers['Authorization'] = `Bearer ${apiKey}`;
          addProgress('auth', 'Using external backend authentication', 10);
        } else {
          // For Next.js route, use existing auth logic
          if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
            addProgress('auth', 'Using header-based authentication', 10);
          } else {
            addProgress('auth', 'Using session-based authentication', 10);
          }
        }

        // Make API request with jobId (synchronous response)
        console.log('[DEBUG] Sending request to:', apiUrl);
        console.log('[DEBUG] Request body:', requestBody);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          credentials: backendUrl || accessToken ? 'omit' : 'include',
          body: JSON.stringify(requestBody),
        });

        console.log('[DEBUG] Response received:', response.status, response.ok);

        // Handle error responses
        if (!response.ok) {
          let errorMessage = 'Failed to generate React project';

          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            errorMessage = `${response.status}: ${response.statusText}`;
          }

          throw new Error(errorMessage);
        }

        // Parse synchronous response (includes full section data!)
        console.log('[DEBUG] Parsing response JSON...');
        const result: GenerateReactProjectSyncResponse = await response.json();
        console.log('[DEBUG] Parsed result:', result);
        console.log('[DEBUG] Sections count:', result.sections?.length);
        console.log('[DEBUG] Screenshot URL:', result.screenshot);

        addProgress('response', 'Received section data from server', 100);

        // Store sections
        console.log('[DEBUG] Setting sections state...');
        setSections(result.sections);
        console.log('[DEBUG] Sections state updated');

        // Set metadata
        const generationTime = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('[DEBUG] Setting metadata...');
        setMetadata({
          generationTime,
          sectionsCount: result.sections.length,
          screenshot: result.screenshot,
        });
        console.log('[DEBUG] Metadata state updated');

        addProgress(
          'complete',
          `Successfully generated ${result.sections.length} sections! (${generationTime}s)`,
          100
        );

        console.log('[DEBUG] Generation completed successfully');

        // Success - clear error state
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('[React Project Generation] Error:', err);
        console.error('[DEBUG] Error stack:', err instanceof Error ? err.stack : 'No stack trace');

        setError(errorMessage);
        addProgress('error', `Error: ${errorMessage}`, 0);

        // Re-throw to allow caller to handle
        throw err;
      } finally {
        console.log('[DEBUG] Finally block executing...');
        console.log('[DEBUG] Setting isGenerating to false');
        setIsGenerating(false);
        console.log('[DEBUG] Finally block complete');
      }
    },
    [addProgress]
  );

  return {
    generate,
    isGenerating,
    error,
    progress,
    metadata,
    sections,
    clearError,
    reset,
  };
}
