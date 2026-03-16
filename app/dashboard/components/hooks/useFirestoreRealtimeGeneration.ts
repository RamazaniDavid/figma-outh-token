/**
 * Custom hook for React project generation with real-time Firestore updates
 *
 * Replaces polling-based architecture with Firebase Firestore real-time listeners
 * for instant progress updates (<100ms latency vs 30-second polling delays).
 *
 * Architecture:
 * 1. Submit job → POST /api/generate (returns jobId)
 * 2. Listen to Firestore → onSnapshot(jobDoc) [REAL-TIME UPDATES]
 * 3. Download from S3 signed URL when complete
 *
 * Benefits:
 * - Instant updates (no polling delay)
 * - Reduced server load (no repeated API calls)
 * - Persistent job state (survives server restarts)
 * - Multi-instance support (Firestore coordinates state)
 *
 * Usage:
 *   const { generate, isGenerating, error, progress, metadata } = useFirestoreRealtimeGeneration();
 *   await generate('https://figma.com/file/xxx?node-id=1-2', 'figma-token', 'backend-token');
 */

import { useState, useCallback, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { firestore } from '@/lib/firebase-client';

export interface GenerationMetadata {
  generationTime: string;
  sectionsCount: string;
  filesCount: string;
  filename: string;
  jobId: string;
  downloadUrl?: string;
}

export interface GenerationProgress {
  step: string;
  message: string;
  timestamp: number;
  percentage?: number;
}

export interface UseFirestoreRealtimeGenerationResult {
  generate: (figmaUrl: string, figmaToken: string, backendToken: string, backendUrl?: string) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
  progress: GenerationProgress[];
  metadata: GenerationMetadata | null;
  clearError: () => void;
  reset: () => void;
}

export function useFirestoreRealtimeGeneration(): UseFirestoreRealtimeGenerationResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<GenerationProgress[]>([]);
  const [metadata, setMetadata] = useState<GenerationMetadata | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number>(0);

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
    setCurrentJobId(null);
  }, []);

  const downloadZipFile = useCallback((url: string, filename: string) => {
    // Open S3 signed URL in new tab for download
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.target = '_blank'; // Open in new tab for S3 redirects
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  // Real-time Firestore listener effect
  useEffect(() => {
    if (!currentJobId) return;

    console.log(`[Firestore] Subscribing to job updates: ${currentJobId}`);

    const jobRef = doc(firestore, 'jobs', currentJobId);

    // Subscribe to real-time updates
    const unsubscribe = onSnapshot(
      jobRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          console.error(`[Firestore] Job not found: ${currentJobId}`);
          setError('Job not found in database');
          setIsGenerating(false);
          return;
        }

        const jobData = snapshot.data();
        console.log(`[Firestore] Job update received:`, jobData.status, jobData.progress);

        // Update progress in real-time!
        if (jobData.progress) {
          addProgress(
            jobData.progress.currentStep,
            `${jobData.progress.currentStep} (${jobData.progress.percentage}%)`,
            jobData.progress.percentage
          );
        }

        // Handle completion
        if (jobData.status === 'completed' && jobData.downloadUrl) {
          console.log(`[Firestore] Job completed! Download URL: ${jobData.downloadUrl}`);

          const endTime = Date.now();
          const generationTime = ((endTime - startTime) / 1000).toFixed(2);

          // Set metadata
          setMetadata({
            generationTime,
            sectionsCount: jobData.progress?.sectionsDetected?.toString() || 'N/A',
            filesCount: 'N/A',
            filename: `react-project-${currentJobId}.zip`,
            jobId: currentJobId,
            downloadUrl: jobData.downloadUrl,
          });

          // Auto-download from S3
          downloadZipFile(jobData.downloadUrl, `react-project-${currentJobId}.zip`);

          addProgress('complete', `Successfully generated React project! (${generationTime}s)`);

          setIsGenerating(false);
          setError(null);
        }

        // Handle failure
        if (jobData.status === 'failed') {
          console.error(`[Firestore] Job failed:`, jobData.error);
          const errorMessage = jobData.error || 'Job failed';
          setError(errorMessage);
          addProgress('error', `Error: ${errorMessage}`);
          setIsGenerating(false);
        }
      },
      (error) => {
        console.error('[Firestore] Listener error:', error);
        setError(`Failed to listen to job updates: ${error.message}`);
        setIsGenerating(false);
      }
    );

    // Cleanup subscription on unmount or job change
    return () => {
      console.log(`[Firestore] Unsubscribing from job: ${currentJobId}`);
      unsubscribe();
    };
  }, [currentJobId, startTime, addProgress, downloadZipFile]);

  const generate = useCallback(
    async (figmaUrl: string, figmaToken: string, backendToken: string, backendUrl: string = 'http://localhost:8283') => {
      // Reset state
      setIsGenerating(true);
      setError(null);
      setProgress([]);
      setMetadata(null);
      setCurrentJobId(null);

      addProgress('start', 'Starting React project generation...');

      const jobStartTime = Date.now();
      setStartTime(jobStartTime);

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

        // Submit job to backend
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

        console.log(`[Job] Created: ${jobId}`);

        // Set job ID to start Firestore real-time listener
        setCurrentJobId(jobId);

        addProgress('listening', `Listening for real-time updates (Job: ${jobId})...`);

        // Firestore listener will handle the rest automatically!
        // No polling needed - updates are pushed in real-time via onSnapshot

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('[External Backend Generation] Error:', err);

        setError(errorMessage);
        addProgress('error', `Error: ${errorMessage}`);
        setIsGenerating(false);

        // Re-throw to allow caller to handle
        throw err;
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
    clearError,
    reset,
  };
}
