/**
 * Custom hook for React project generation using external Fastify backend
 *
 * Handles the complete workflow of generating a React project via external backend:
 * - Job submission (POST /api/generate)
 * - Progress polling (GET /api/status/:jobId)
 * - ZIP file download (GET /api/download/:jobId)
 * - Error handling
 *
 * Usage:
 *   const { generate, isGenerating, error, progress, metadata } = useExternalBackendGeneration();
 *   await generate('https://www.figma.com/design/xxx?node-id=1-2', 'figma-token', 'backend-token');
 */

import { useState, useCallback } from 'react';

export interface GenerationMetadata {
  generationTime: string;
  sectionsCount: string;
  filesCount: string;
  filename: string;
  jobId: string;
}

export interface GenerationProgress {
  step: string;
  message: string;
  timestamp: number;
  percentage?: number;
}

export interface UseExternalBackendGenerationResult {
  generate: (figmaUrl: string, figmaToken: string, backendToken: string, backendUrl?: string) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
  progress: GenerationProgress[];
  metadata: GenerationMetadata | null;
  clearError: () => void;
  reset: () => void;
}

export function useExternalBackendGeneration(): UseExternalBackendGenerationResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<GenerationProgress[]>([]);
  const [metadata, setMetadata] = useState<GenerationMetadata | null>(null);

  const addProgress = useCallback((step: string, message: string, percentage?: number) => {
    setProgress(prev => [
      ...prev,
      {
        step,
        message,
        timestamp: Date.now(),
        percentage,
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
  }, []);

  const downloadZipFile = useCallback((blob: Blob, filename: string) => {
    // Create a download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Cleanup
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, []);

  const pollJobStatus = useCallback(
    async (jobId: string, backendUrl: string, backendToken: string): Promise<void> => {
      const pollInterval = 30 * 1000; // 30 seconds
      const maxAttempts = 300; // 10 minutes max
      let attempts = 0;

      return new Promise((resolve, reject) => {
        const poll = async () => {
          attempts++;

          if (attempts > maxAttempts) {
            reject(new Error('Job polling timeout - generation took too long'));
            return;
          }

          try {
            const response = await fetch(`${backendUrl}/api/status/${jobId}`, {
              headers: {
                'Authorization': `Bearer ${backendToken}`,
              },
            });

            if (!response.ok) {
              throw new Error(`Status check failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();

            // Update progress
            addProgress(
              data.progress.currentStep,
              `${data.progress.currentStep} (${data.progress.percentage}%)`,
              data.progress.percentage
            );

            if (data.status === 'completed') {
              resolve();
            } else if (data.status === 'failed') {
              reject(new Error(data.error || 'Job failed'));
            } else {
              // Continue polling
              setTimeout(poll, pollInterval);
            }
          } catch (err) {
            reject(err);
          }
        };

        poll();
      });
    },
    [addProgress]
  );

  const generate = useCallback(
    async (figmaUrl: string, figmaToken: string, backendToken: string, backendUrl: string = 'http://localhost:8283') => {
      // Reset state
      setIsGenerating(true);
      setError(null);
      setProgress([]);
      setMetadata(null);

      addProgress('start', 'Starting React project generation...');

      const startTime = Date.now();

      try {
        // Validate inputs
        if (!figmaUrl || !figmaUrl.trim()) {
          throw new Error('Figma URL is required');
        }

        if (!figmaUrl.includes('figma.com')) {
          throw new Error('Invalid Figma URL format');
        }

        if (!figmaUrl.includes('node-id=')) {
          throw new Error('Figma URL must include a node-id parameter (e.g., ?node-id=123-456)');
        }

        if (!figmaToken || !figmaToken.trim()) {
          throw new Error('Figma access token is required');
        }

        if (!backendToken || !backendToken.trim()) {
          throw new Error('Backend authentication token is required');
        }

        addProgress('submit', `Submitting job to external backend (${backendUrl})...`);

        // Step 1: Submit job
        const submitResponse = await fetch(`${backendUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${backendToken}`,
          },
          body: JSON.stringify({
            figmaUrl,
            figmaToken,
          }),
        });

        if (!submitResponse.ok) {
          let errorMessage = 'Failed to submit generation job';
          try {
            const errorData = await submitResponse.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = `${submitResponse.status}: ${submitResponse.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const submitData = await submitResponse.json();
        const jobId = submitData.jobId;

        addProgress('queued', `Job created: ${jobId}. Waiting for processing...`);

        // Step 2: Poll job status
        await pollJobStatus(jobId, backendUrl, backendToken);

        const endTime = Date.now();
        const generationTime = ((endTime - startTime) / 1000).toFixed(2);

        addProgress('downloading', 'Job completed! Downloading ZIP file...');

        // Step 3: Download result
        const downloadResponse = await fetch(`${backendUrl}/api/download/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${backendToken}`,
          },
        });

        if (!downloadResponse.ok) {
          throw new Error(`Failed to download result: ${downloadResponse.status} ${downloadResponse.statusText}`);
        }

        // Extract filename from Content-Disposition header
        const contentDisposition = downloadResponse.headers.get('Content-Disposition');
        const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
        const filename = filenameMatch?.[1] || `react-project-${jobId}.zip`;

        // Get ZIP file as blob
        const blob = await downloadResponse.blob();

        // Trigger download
        downloadZipFile(blob, filename);

        // Set metadata
        setMetadata({
          generationTime,
          sectionsCount: 'N/A', // External backend doesn't expose this yet
          filesCount: 'N/A', // External backend doesn't expose this yet
          filename,
          jobId,
        });

        addProgress('complete', `Successfully generated React project! (${generationTime}s)`);

        // Success - clear error state
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('[External Backend Generation] Error:', err);

        setError(errorMessage);
        addProgress('error', `Error: ${errorMessage}`);

        // Re-throw to allow caller to handle
        throw err;
      } finally {
        setIsGenerating(false);
      }
    },
    [addProgress, downloadZipFile, pollJobStatus]
  );

  return {
    generate,
    isGenerating,
    error,
    progress,
    metadata,
    clearError,
    reset,
  };
}
